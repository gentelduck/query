/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext, createContext, useState } from "react";
import { CacheEntry, QueryCache } from "./QueryCache";


type QueryClient = {
    invalidateQueries: ({ queryKey }: { queryKey: string[] }) => void;
};

export interface FullQueryClient extends QueryClient {
    data: any;
    setData: (queryKey: string, result: any) => void;
    invalidateQueries: ({ queryKey }: { queryKey: string[] }) => void;
    queryCache: QueryCache<any>;
}

interface QueryClientProviderProps {
    children?: React.ReactNode;
}

const QueryClientContext = createContext<QueryClient | undefined>(undefined);

export const FullQueryClientContext = createContext<FullQueryClient | undefined>(undefined);
const queryCache = new QueryCache<any>();

export function QueryClientProvider({ children }: QueryClientProviderProps) {
    const [data, setQueryData] = useState({});


    const setData = (queryKey: string, cachedEntry: CacheEntry<any>) => {
        const cacheEntry: CacheEntry<any> = {
            result: cachedEntry.result,
            timestamp: Date.now(),
            queryFn: cachedEntry.queryFn,
        };
        setQueryData(prev => ({ ...prev, [queryKey]: cachedEntry.result }));
        queryCache.set(queryKey, cacheEntry);
    };

    const invalidateQueries = ({ queryKey }: { queryKey?: string[] } = { queryKey: [] }) => {
        if (queryKey?.length === 0) {
            return;
        }
        queryKey?.forEach(key => {
            const queryFn = queryCache.get(key)?.queryFn;

            queryCache.delete(key, 0);
            if (queryFn) {
                queryFn().then(res => {
                    setQueryData(prev => ({ ...prev, [key]: res }))
                    queryCache.set(key, { result: res, queryFn, timestamp: Date.now() });
                });
            }
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

export const useQueryClient = (): QueryClient => {
    const context = useContext(QueryClientContext);

    if (!context) {
        throw new Error("useQueryClient must be used within a QueryClientProvider");
    }

    return context;
};

export const useFullQueryClient = (): FullQueryClient => {
    const context = useContext(FullQueryClientContext);

    if (!context) {
        throw new Error("useFullQueryClient must be used within a QueryClientProvider");
    }

    return context;
};