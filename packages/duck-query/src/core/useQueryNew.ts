/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wait } from "./utils";
import { useFullQueryClient } from "./observerSubscriptions";

export type QueryKey = ReadonlyArray<any>;

type QueryOptions<T> = {
    queryKey: QueryKey;
    queryFn: (...args: any[]) => Promise<T>;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
    gcTime?: number;
    enabled?: boolean;
    retry?: boolean | number;
    retryDelay?: number;
    initialData?: T;
};

export function useQueryNew<T>(options: QueryOptions<T>) {
    const {
        queryKey,
        queryFn,
        staleTime = 0,
        gcTime = 5 * 60 * 1000,
        retry = 4,
        retryDelay = 1000,
        refetchOnWindowFocus = true,
    } = options as QueryOptions<T>;

    // State
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isError, setIsError] = useState<boolean>(false);
    const [isStale, setIsStale] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const staleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const gcTimeRef = useRef<NodeJS.Timeout | null>(null);
    const retriesRef = useRef(0);
    const hasFetchedOnce = useRef(false);
    const key = useMemo(() => queryKey[0] as string, [queryKey]);
    const params = useMemo(() => queryKey[1] || {}, [queryKey]);
    const queryKeyParam = useMemo(() => [key, params], [key, params]);
    const { data, setData, queryCache } = useFullQueryClient();

    // Methods
    const refetch = useCallback(() => {
        if (hasFetchedOnce.current) {
            setIsLoading(true);
            setIsError(false);
            setIsStale(true);
            fetcher();
        }
    }, []);

    const checkIsStale = useCallback(() => {
        const currentTime = Date.now();
        const lastFetchedTime = queryCache.get(key)?.timestamp;
        const isStaleData =
            !lastFetchedTime || currentTime - lastFetchedTime > staleTime;
        setIsStale(isStaleData);
        return isStaleData;
    }, [key, queryCache, staleTime]);

    const fetcher = useCallback(async () => {
        const existingEntry = queryCache.get(key);

        if (!existingEntry?.promise || existingEntry?.args !== queryKeyParam) {
            const promise = queryFn({ queryKey: queryKeyParam })
                .then((result) => {
                    queryCache.build(key, {
                        result,
                        timestamp: Date.now(),
                        queryFn,
                        args: queryKeyParam,
                    });
                    setData(key, {
                        result,
                        timestamp: Date.now(),
                        queryFn,
                        args: queryKeyParam,
                    });
                    setIsLoading(false);
                })
                .catch((err) => {
                    setIsError(true);
                    setIsLoading(false);
                    setError(err);
                });

            queryCache.build(key, {
                ...existingEntry,
                promise,
                queryFn,
                args: queryKeyParam,
            });
        }

        return queryCache.get(key)?.promise;
    }, [key, queryCache, queryFn, queryKeyParam, setData]);

    const retryFetch = useCallback(async () => {
        if (retriesRef.current < (typeof retry === "number" ? retry : 4)) {
            await wait(retryDelay);
            retriesRef.current += 1;

            try {
                await queryFn({ queryKey: queryKeyParam });
                setIsError(false);
            } catch (err) {
                retryFetch();
                throw err;
            }
        } else {
            console.error("Max retries reached.");
            setIsError(true);
        }
    }, [queryFn, retry, retryDelay]);

    useEffect(() => {
        if (queryKeyParam) {
            const cachedQuery = queryCache.get(key);
            queryCache.build(key, {
                ...cachedQuery,
                args: queryKeyParam,
            });
        }
    }, [queryKeyParam]);

    useEffect(() => {
        if (isError) {
            retryFetch();
        }
    }, [isError]);

    useEffect(() => {
        const cachedEntry = queryCache.get(key);
        const shouldFetch = !cachedEntry || checkIsStale();

        if (shouldFetch) {
            if (!cachedEntry?.result) {
                setIsLoading(true);
            } else {
                setIsLoading(false);
            }

            if (!hasFetchedOnce.current || queryKeyParam !== cachedEntry?.args) {
                fetcher();
                hasFetchedOnce.current = true;
            }
        } else if (cachedEntry?.result && data[key]?.result !== cachedEntry.result) {
            setData(key, {
                result: cachedEntry.result as T,
                timestamp: Date.now(),
                queryFn,
                args: queryKeyParam || {},
            });
            setIsLoading(false);
        }

        if (staleTime > 0) {
            staleTimeoutRef.current = setTimeout(() => {
                checkIsStale();
            }, staleTime);
        }

        if (gcTime) {
            gcTimeRef.current = setTimeout(() => {
                queryCache.remove(key, gcTime);
            }, gcTime);
        }
        return () => {
            if (staleTimeoutRef.current) clearTimeout(staleTimeoutRef.current);
            if (gcTimeRef.current) clearTimeout(gcTimeRef.current);
        };
    }, [gcTime, key, staleTime, queryCache]);

    useEffect(() => {
        const cachedQuery = queryCache.get(key);
        queryCache.remove(key, gcTime);
        if (cachedQuery?.args !== queryKeyParam) {
            queryCache.build(key, {
                ...cachedQuery,
                args: queryKeyParam,
            });
            fetcher();
        }
    }, [queryKeyParam, fetcher, queryCache, key]);

    useEffect(() => {
        if (refetchOnWindowFocus) {
            const handleVisibilityChange = () => {
                if (
                    document.visibilityState === "visible" &&
                    isStale &&
                    navigator.onLine
                ) {
                    queryFn({ queryKey: queryKeyParam });
                }
            };

            document.addEventListener("visibilitychange", handleVisibilityChange);
            return () => {
                document.removeEventListener("visibilitychange", handleVisibilityChange);
            };
        }
    }, [key, refetchOnWindowFocus, isStale, queryFn, queryKeyParam]);

    return {
        data: data[key] as T | undefined,
        isLoading,
        isError,
        isStale,
        refetch,
        error,
    } as const;
}
