import { useState, useMemo, useRef, useCallback, useEffect } from "react";

type Query<T> = {
    queryKey: string;
    queryFn: () => Promise<T>;
    staleTime?: number;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
    gcTime?: number;
    enabled?: boolean;
    retry?: boolean | number;
    retryDelay?: number;
    initialData?: any;
};

type CacheEntry<T> = {
    data: T;
    timestamp: number;
};

type FetchStatus = "fetching" | "idle" | "paused";

type QueryOptions<T> = {
    data: T | null;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
    isStale: boolean;
    isFetched: boolean;
    isSuccess: boolean;
    fetchStatus: FetchStatus;
};

const cache: Record<string, CacheEntry<unknown>> = {};

export function useQueryNew<T>({
    queryKey,
    queryFn,
    staleTime = 0,
    refetchInterval = 0,
    refetchOnWindowFocus = false,
    gcTime,
    enabled = true,
    retry = 4,
    retryDelay = 2000,
    initialData,
}: Query<T>): QueryOptions<T> {
    const [queryState, setQueryState] = useState({
        data: initialData || (null as T | null),
        isLoading: false,
        isError: false,
        error: null as unknown,
        isStale: false,
        isFetched: false,
        isSuccess: false,
        fetchStatus: "idle" as FetchStatus,
    });

    const key = useMemo(() => JSON.stringify(queryKey), [queryKey]);
    const intervalRef = useRef<number | null>(null);
    const staleCheckRef = useRef<number | null>(null);
    const retriesRef = useRef(0);
    const retryTimeoutRef = useRef<number | null>(null);

    const fetcher = useCallback(async () => {
        const isStale =
            !cache[key] || Date.now() - cache[key].timestamp > staleTime;

        if (!enabled && !cache[key]) return;

        if (isStale) {
            setQueryState((prev) => ({ ...prev, isLoading: true }));
        }

        setQueryState((prev) => ({
            ...prev,
            fetchStatus: "fetching",
            isError: false,
        }));

        try {
            const result = await queryFn();
            cache[key] = { data: result, timestamp: Date.now() };

            setQueryState((prev) => ({
                ...prev,
                data: result,
                isSuccess: true,
                isError: false,
                error: null,
            }));
        } catch (err) {
            setQueryState((prev) => ({
                ...prev,
                isError: true,
                error: err,
                isSuccess: false,
            }));
        } finally {
            setQueryState((prev) => ({
                ...prev,
                isLoading: false,
                isFetched: true,
                fetchStatus: "idle",
            }));
        }
    }, [enabled, key, queryFn, staleTime]);

    const clearUnusedCache = useCallback((key: string, gcTime: number) => {
        if (gcTime && cache[key] && Date.now() - cache[key].timestamp > gcTime) {
            delete cache[key];
        }
    }, []);

    const refetch = useCallback(() => fetcher(), [fetcher]);

    useEffect(() => {
        if (refetchOnWindowFocus) {
            const handleVisibilityChange = () => {
                const cachedData = cache[key];
                const isStale =
                    !cachedData || Date.now() - cachedData.timestamp > staleTime;

                if (document.visibilityState === "visible" && isStale) {
                    fetcher();
                }
            };

            document.addEventListener("visibilitychange", handleVisibilityChange);
            return () =>
                document.removeEventListener("visibilitychange", handleVisibilityChange);
        }
    }, [key, staleTime, refetchOnWindowFocus, fetcher]);

    useEffect(() => {
        const cachedData = cache[key];
        const isStale = cachedData && Date.now() - cachedData.timestamp > staleTime;

        if (gcTime) clearUnusedCache(key, gcTime);

        if (staleTime > 0 && !staleCheckRef.current) {
            staleCheckRef.current = window.setInterval(() => {
                if (cachedData && Date.now() - cachedData.timestamp > staleTime) {
                    fetcher();
                }
            }, staleTime);
        }

        if (refetchInterval > 0 && !intervalRef.current) {
            intervalRef.current = window.setInterval(fetcher, refetchInterval);
        }

        if (cachedData && !isStale) {
            setQueryState((prev) => ({
                ...prev,
                data: cachedData.data as T,
                isStale: false,
                isSuccess: true,
            }));
        } else if (!cachedData || isStale) {
            if (!queryState.isLoading) {
                fetcher();
                setQueryState((prev) => ({ ...prev, isStale: true }));
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (staleCheckRef.current) {
                clearInterval(staleCheckRef.current);
                staleCheckRef.current = null;
            }
        };
    }, [key, staleTime, refetchInterval, gcTime, enabled]);

    useEffect(() => {
        if (!queryState.isError || retriesRef.current >= (retry as number)) return;

        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

        retriesRef.current += 1;

        retryTimeoutRef.current = window.setTimeout(() => {
            fetcher();
        }, retryDelay);

        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [queryState.isError, retry, retryDelay, fetcher]);

    const safeData = queryState.data || ({} as T);

    return {
        data: safeData,
        isLoading: queryState.isLoading,
        isError: queryState.isError,
        refetch,
        error: queryState.error,
        isStale: queryState.isStale,
        isFetched: queryState.isFetched,
        isSuccess: queryState.isSuccess,
        fetchStatus: queryState.fetchStatus,
    };
}
