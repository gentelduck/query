/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";

type Query<T> = {
    queryKey: string;
    queryFn: () => Promise<T>;
    staleTime?: number;
    refetchInterval?: number;
};

type CacheEntry<T> = {
    data: T;
    timestamp: number;
};

const cache: Record<string, CacheEntry<unknown>> = {};

export function useQueryNew<T>({ queryKey, queryFn, staleTime = 0, refetchInterval = 0 }: Query<T>) {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);
    const key = JSON.stringify(queryKey);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
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

        const cachedData = cache[key];
        const isStale = cachedData && Date.now() - cachedData.timestamp > staleTime;

        if (refetchInterval !== 0) {
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
        };
    }, [key, staleTime, refetchInterval]);

    return {
        data,
        isLoading,
        isError,
    };
}
