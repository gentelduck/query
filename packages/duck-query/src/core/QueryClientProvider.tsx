/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext, createContext, useState, useCallback } from "react";
import { CacheEntry, QueryCache } from "./QueryCache";
import { QueryClientConfig } from "./QueryClient";
import { QueryKey } from "./useQueryNew";

export type QueryClient = {
    invalidateQueries: ({ queryKey }: { queryKey: QueryKey }) => void;
};

export interface FullQueryClient extends QueryClient {
    data: any;
    setData: (queryKey: string, result: any) => void;
    invalidateQueries: ({ queryKey }: { queryKey: QueryKey }) => void;
    queryCache: QueryCache;
}

interface QueryClientProviderProps {
    children?: React.ReactNode;
    client: QueryClientConfig;
}

const QueryClientContext = createContext<QueryClient | undefined>(undefined);
export const FullQueryClientContext = createContext<FullQueryClient | undefined>(undefined);

export function QueryClientProvider({ children, client }: QueryClientProviderProps) {

    if (!client) throw new Error("No QueryClient set, use QueryClientProvider to set one");

    const [data, setQueryData] = useState<Record<string, any>>({});
    const queryCache = client.queryCache;
    const setData = (queryKey: string, cachedEntry: CacheEntry) => {
        setQueryData(prev => ({ ...prev, [queryKey]: cachedEntry.result }));
        queryCache.build(queryKey, {
            result: cachedEntry.result,
            timestamp: Date.now(),
            queryFn: cachedEntry.queryFn,
            args: cachedEntry.args
        });
    };



    const invalidateQueries = useCallback(({ queryKey }: { queryKey?: QueryKey } = { queryKey: [] }) => {
        if (queryKey) {
            queryKey.forEach(key => {
                const cachedEntry = queryCache.get(key as string);
                const queryFn = cachedEntry?.queryFn;
                if (queryFn && typeof queryFn === "function") {
                    queryFn({ queryKey: cachedEntry?.args }).then(res => {
                        queryCache.build(key as string, {
                            ...cachedEntry,
                            result: res
                        });
                        setQueryData(prev => ({ ...prev, [key as string]: res }));
                    });
                }
                queryCache.remove(key as string);
            });
        }
    }, [queryCache, setQueryData]);


    const fullQueryClient: FullQueryClient = {
        data,
        setData,
        invalidateQueries,
        queryCache
    };

    return (
        <QueryClientContext.Provider value={{ invalidateQueries }}>
            <FullQueryClientContext.Provider value={fullQueryClient}>
                {children}
            </FullQueryClientContext.Provider>
        </QueryClientContext.Provider>
    );
}
