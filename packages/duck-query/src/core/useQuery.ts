import { useEffect, useRef, useState } from "react";

type Query<T> = {
    queryKey: string;
    queryFn: () => Promise<T>;
    staleTime?: number;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
    gcTime?: number;
};

type CacheEntry<T> = {
    data: T;
    timestamp: number;
};

type QueryOptions<T> = {
    data: T | null;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
};

// global cache cuz when i add it inside the hook it will rebuild everytime cuz the component destroys every hook when unmount
const cache: Record<string, CacheEntry<unknown>> = {};

export function useQueryNew<T>({
    queryKey,
    queryFn,
    staleTime = 0,
    refetchInterval = 0,
    refetchOnWindowFocus = false,
    gcTime,
}: Query<T>): QueryOptions<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);
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
        if (cache[key]) {
            if (Date.now() - cache[key].timestamp > gcTime) {
                delete cache[key];
            }
        }
    };

    const fetcher = async () => {
        setIsLoading(true);
        setIsError(false);
        try {
            const result = await queryFn();
            setIsLoading(false);
            cache[key] = {
                data: result,
                timestamp: Date.now(),
            };
            setData(result);
        } catch (err) {
            setIsError(true);
            throw new Error(err as string);
        } finally {
            setIsLoading(false);
        }
    };

    const refetch = () => {
        fetcher();
    };

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

            return () => {
                document.removeEventListener("visibilitychange", handleVisibilityChange);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, staleTime, queryFn, refetchOnWindowFocus]);

    useEffect(() => {
        const cachedData = cache[key];
        const isStale = cachedData && Date.now() - cachedData.timestamp > staleTime;

        clearUnusedCache(key, gcTime as number);

        if (staleTime > 0 && staleCheckRef.current === null) {
            staleCheckRef.current = window.setInterval(() => {
                checkStale();
            }, staleTime);
        }

        if (refetchInterval !== 0 && intervalRef.current === null) {
            intervalRef.current = window.setInterval(() => {
                fetcher();
            }, refetchInterval);
        }

        if (cachedData && !isStale) {
            setData(cachedData.data as T);
            return;
        }

        fetcher();

        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
            }
            if (staleCheckRef.current !== null) {
                clearInterval(staleCheckRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, staleTime, refetchInterval, gcTime]);



    return {
        data,
        isLoading,
        isError,
        refetch,
    };
}
