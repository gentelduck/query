/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFullQueryClient } from "./QueryClientProvider";

type QueryKey = string | { [key: string]: any } | QueryKey[];

type Query<T> = {
    queryKey: QueryKey[];
    queryFn: (...args: any[]) => Promise<T>;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
    gcTime?: number;
    enabled?: boolean;
    retry?: boolean | number;
    retryDelay?: number;
    initialData?: T;
};

// const deepEqual = (obj1: any, obj2: any) => {
//     return JSON.stringify(obj) === JSON.stringify(obj2)
// }

export function useQueryNew<T>({
    queryKey,
    queryFn,
    staleTime = 0,
    gcTime = 5 * 60 * 1000,
}: Query<T>) {

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isError, setIsError] = useState<boolean>(false);
    const [isStale, setIsStale] = useState<boolean>(true);
    const staleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const gcTimeRef = useRef<NodeJS.Timeout | null>(null);
    const hasFetchedOnce = useRef(false);
    const key = useMemo(() => queryKey[0] as string, [queryKey]);
    const { data, setData, queryCache } = useFullQueryClient()

    const checkIsStale = useCallback(() => {
        const currentTime = Date.now();
        const lastFetchedTime = queryCache.get(key)?.timestamp;
        const isStaleData = !lastFetchedTime || currentTime - lastFetchedTime > staleTime;
        setIsStale(isStaleData);
        return isStaleData;
    }, [key, staleTime]);


    const fetcher = useCallback(async () => {
        const existingEntry = queryCache.get(key);
        if (!existingEntry?.promise) {
            queryCache.set(key, {
                ...existingEntry,
                queryFn,
                promise: queryFn()
                    .then(result => {

                        queryCache.set(key, { result, timestamp: Date.now(), queryFn });
                        setData(key, { result: result as T, timestamp: Date.now(), queryFn });
                        setIsLoading(false);
                    })
                    .catch(() => {
                        setIsError(true);
                        setIsLoading(false);
                    }),
            });

        }
        return queryCache.get(key)?.promise;
    }, [key, queryFn, setData]);

    useEffect(() => {
        const cachedEntry = queryCache.get(key);
        const shouldFetch = !cachedEntry || checkIsStale();

        if (shouldFetch) {
            if (!cachedEntry?.result) {
                setIsLoading(true);

            } else {
                setIsLoading(false);
            }
            fetcher();
            hasFetchedOnce.current = true;
        } else if (cachedEntry?.result) {
            setData(key, { result: cachedEntry.result as T, timestamp: Date.now(), queryFn });
            setIsLoading(false);
        }

        if (staleTime > 0) {
            staleTimeoutRef.current = setTimeout(() => {
                checkIsStale();
            }, staleTime);
        }

        if (gcTime) {
            gcTimeRef.current = setTimeout(() => {
                queryCache.delete(key, gcTime);
            }, gcTime);
        }

        return () => {
            if (staleTimeoutRef.current) clearTimeout(staleTimeoutRef.current);
            if (gcTimeRef.current) clearTimeout(gcTimeRef.current);
        };
    }, [checkIsStale, key, staleTime]);

    useEffect(() => {
        if (queryCache.get(key)?.result) {
            setData(key, {
                result: queryCache.get(key)?.result as T, timestamp: Date.now(), queryFn
            });
        }
    }, [key])

    return {
        data: data[key] as T | undefined,
        isLoading,
        isError,
        isStale,
    } as const;
}