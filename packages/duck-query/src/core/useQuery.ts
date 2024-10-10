import { useEffect, useRef, useState } from "react";

type Query<T> = {
    queryKey: string;
    queryFn: () => Promise<T>;
    staleTime?: number;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
    gcTime?: number;
    enabled?: boolean
};

type CacheEntry<T> = {
    data: T;
    timestamp: number;
};

type FetchStatus = "fetching" | "idle" | "paused"

type QueryOptions<T> = {
    data: T | null;
    isLoading: boolean;
    isError: boolean;
    error: any;
    refetch: () => void;
    isStale: boolean
    isFetched: boolean
    isSuccess: boolean
    fetchStatus: FetchStatus
};

const cache: Record<string, CacheEntry<unknown>> = {};

// TODO make paused after doing retries

export function useQueryNew<T>({
    queryKey,
    queryFn,
    staleTime = 0,
    refetchInterval = 0,
    refetchOnWindowFocus = false,
    gcTime,
    enabled = true
}: Query<T>): QueryOptions<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);
    const [error, setError] = useState<any>(null)
    const [isStale, setIsStale] = useState<boolean>(false)
    const [isFetched, setIsFetched] = useState<boolean>(false)
    const [isSuccess, setIsSuccess] = useState<boolean>(false)
    const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle")
    const key = JSON.stringify(queryKey);
    const intervalRef = useRef<number | null>(null);
    const staleCheckRef = useRef<number | null>(null);

    const checkStale = () => {
        const cachedData = cache[key];

        if (cachedData && Date.now() - cachedData.timestamp > staleTime) {
            fetcher();
        }
    };

    const clearUnusedCache = (key: string, gcTime: number) => {
        if (gcTime && cache[key] && Date.now() - cache[key].timestamp > gcTime) {
            delete cache[key];
        }
    };

    const fetcher = async () => {
        if (!enabled) return;
        setIsLoading(true);
        setFetchStatus("fetching")
        setIsError(false);
        try {
            const result = await queryFn();
            cache[key] = { data: result, timestamp: Date.now() };
            setData(result);
            setIsSuccess(true)
        } catch (err) {
            console.log(err)
            setIsError(true);
            setIsSuccess(false)
            setError(err)
            setFetchStatus("fetching")
        } finally {
            setIsLoading(false);
            setIsFetched(true)
            setFetchStatus("idle")
        }
    };

    const refetch = () => fetcher();

    useEffect(() => {
        if (refetchOnWindowFocus) {
            const handleVisibilityChange = () => {
                const cachedData = cache[key];
                const isStale = !cachedData || (Date.now() - cachedData.timestamp > staleTime);
                if (document.visibilityState === "visible" && isStale) {
                    fetcher();
                }
            };
            document.addEventListener("visibilitychange", handleVisibilityChange);
            return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, staleTime, refetchOnWindowFocus]);

    useEffect(() => {
        const cachedData = cache[key];
        const isStale = cachedData && Date.now() - cachedData.timestamp > staleTime;

        if (gcTime) clearUnusedCache(key, gcTime);

        if (staleTime > 0 && !staleCheckRef.current) {
            staleCheckRef.current = window.setInterval(checkStale, staleTime);
        }

        if (refetchInterval > 0 && !intervalRef.current) {
            intervalRef.current = window.setInterval(fetcher, refetchInterval);
        }

        if (cachedData && !isStale) {
            setData(cachedData.data as T);
            setIsStale(true)
        } else {
            fetcher();
            setIsStale(false)
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (staleCheckRef.current) clearInterval(staleCheckRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, staleTime, refetchInterval, gcTime]);

    return {
        data,
        isLoading,
        isError,
        refetch,
        error,
        isStale,
        isFetched,
        isSuccess,
        fetchStatus
    };
}