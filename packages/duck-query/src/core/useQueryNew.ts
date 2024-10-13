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
        enabled = true,
    } = options as QueryOptions<T>;

    // State
    const [isLoading, setIsLoading] = useState<boolean>(enabled ? true : false);
    const [isError, setIsError] = useState<boolean>(false);
    const [isStale, setIsStale] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const staleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const gcTimeRef = useRef<NodeJS.Timeout | null>(null);
    const retriesRef = useRef(0);
    const hasFetchedOnce = useRef(false);
    const key = useMemo(() => queryKey[0] as string, [queryKey]);
    const params = useMemo(() => queryKey[1] || {}, [JSON.stringify(queryKey)]);
    const { data, setData, queryCache } = useFullQueryClient();


    // Methods
    const refetch = useCallback(async () => {
        if (hasFetchedOnce.current) {
            setIsLoading(true);
            await queryFn({ queryKey: [key, params] }).then((result) => {
                queryCache.build(key, {
                    result,
                    timestamp: Date.now(),
                    queryFn,
                    args: [key, params],
                });
                setData(key, {
                    result,
                    timestamp: Date.now(),
                    queryFn,
                    args: [key, params],
                });
            });
            setIsLoading(false);
            setIsError(false);
            setIsStale(true);
        }
    }, [key, params, queryFn]);

    const checkIsStale = useCallback(() => {
        if (!enabled) return;
        const currentTime = Date.now();
        const lastFetchedTime = queryCache.get(key)?.timestamp;
        const isStaleData =
            !lastFetchedTime || currentTime - lastFetchedTime > staleTime;
        setIsStale(isStaleData);
        return isStaleData;
    }, [enabled, key, queryCache, staleTime]);


    const fetcher = useCallback(async () => {
        const existingEntry = queryCache.get(key);
        if (!existingEntry?.promise) {
            const promise = queryFn({ queryKey: [key, params] })
                .then((result) => {
                    queryCache.build(key, {
                        result,
                        timestamp: Date.now(),
                        queryFn,
                        args: [key, params],
                    });
                    setData(key, {
                        result,
                        timestamp: Date.now(),
                        queryFn,
                        args: [key, params],
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
                args: [key, params],
            });
        }

        return queryCache.get(key)?.promise;
    }, [key, params, queryCache, queryFn, setData]);

    const retryFetch = useCallback(async () => {
        if (!enabled) return;
        if (retriesRef.current < (typeof retry === "number" ? retry : 4)) {
            await wait(retryDelay);
            retriesRef.current += 1;

            try {
                await queryFn({ queryKey: [key, params] });
                setIsError(false);
            } catch (err) {
                retryFetch();
                throw err;
            }
        } else {
            setIsError(true);
        }
    }, [enabled, key, params, queryFn, retry, retryDelay]);


    useEffect(() => {
        if (isError) {
            retryFetch();
        }
    }, [isError]);

    useEffect(() => {
        if (!enabled) return;

        const cachedEntry = queryCache.get(key);
        const shouldFetch = !cachedEntry || checkIsStale();

        if (shouldFetch) {
            if (!cachedEntry?.result) {
                setIsLoading(true);
            } else {
                setIsLoading(false);
            }

            if (!hasFetchedOnce.current) {
                fetcher();
                hasFetchedOnce.current = true;
            }
        } else if (cachedEntry?.result && data[key]?.result !== cachedEntry.result) {
            setData(key, {
                result: cachedEntry.result as T,
                timestamp: Date.now(),
                queryFn,
                args: [key, params],
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
                queryCache.remove(key);
            }, gcTime);
        }
        return () => {
            if (staleTimeoutRef.current) clearTimeout(staleTimeoutRef.current);
            if (gcTimeRef.current) clearTimeout(gcTimeRef.current);
        };
    }, [gcTime, key, staleTime, queryCache, enabled]);



    useEffect(() => {
        if (refetchOnWindowFocus) {
            const handleVisibilityChange = () => {
                if (
                    document.visibilityState === "visible" &&
                    isStale &&
                    navigator.onLine
                ) {
                    queryFn({ queryKey: [key, params] });
                }
            };

            document.addEventListener("visibilitychange", handleVisibilityChange);
            return () => {
                document.removeEventListener("visibilitychange", handleVisibilityChange);
            };
        }
    }, [key, refetchOnWindowFocus, isStale, queryFn, [key, params]]);

    return {
        data: data[key] as T | undefined,
        isLoading,
        isError,
        isStale,
        refetch,
        error,
    } as const;
}