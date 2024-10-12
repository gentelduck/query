/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext, createContext, useState } from "react";
import { CacheEntry, QueryCache } from "./QueryCache";
import { QueryKey } from "./useQueryNew";
import { QueryClientConfig } from "./QueryClient";

export type QueryClient = {
    invalidateQueries: ({ queryKey }: { queryKey: QueryKey }) => void;
};

export interface FullQueryClient extends QueryClient {
    data: any;
    setData: (queryKey: string, result: any) => void;
    invalidateQueries: ({ queryKey }: { queryKey: QueryKey }) => void;
    queryCache: QueryCache;
}

export interface QueryClientProviderProps {
    children?: React.ReactNode;
    client: QueryClientConfig
}

export const QueryClientContext = createContext<QueryClient | undefined>(undefined);
export const FullQueryClientContext = createContext<FullQueryClient | undefined>(undefined);


export function QueryClientProvider({ children, client }: QueryClientProviderProps) {

    if (!client) throw new Error("No QueryClient set, use QueryClientProvider to set one")

    const [data, setQueryData] = useState({});

    const queryCache = client.queryCache

    const setData = (queryKey: string, cachedEntry: CacheEntry) => {
        setQueryData(prev => ({ ...prev, [queryKey]: cachedEntry.result }));
        queryCache.build(queryKey, {
            result: cachedEntry.result,
            timestamp: Date.now(),
            queryFn: cachedEntry.queryFn,
            args: cachedEntry.args
        });
    };

    const invalidateQueries = ({ queryKey }: { queryKey?: QueryKey } = { queryKey: [] }) => {
        if (!queryKey || queryKey.length === 0) {
            return;
        }
        queryKey.forEach(key => {
            const cachedEntry = queryCache.get(key as string);
            const queryFn = cachedEntry?.queryFn;

            if (queryFn && queryKey && typeof queryFn === "function") {
                queryFn({ queryKey }).then(res => {
                    setQueryData(prev => ({ ...prev, [key as string]: res }));
                    queryCache.build(key as string, { result: res, queryFn, args: queryKey as any, timestamp: Date.now() });
                });
            }

            queryCache.remove(queryKey[0] as string, 0)
        });
    };

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

