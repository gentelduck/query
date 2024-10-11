/* eslint-disable @typescript-eslint/no-explicit-any */


export type CacheEntry<T> = {
    result?: T;
    timestamp?: number;
    promise?: Promise<T>;
    queryFn?: (...args: any[]) => Promise<T>
}

interface QueryCacheType<T> {
    get(key: string): CacheEntry<T> | null;
    set(key: string, value: CacheEntry<T>): void;
    delete(key: string, gcTime: number): void;
    clear(): void;
}

export class QueryCache<T> implements QueryCacheType<T> {
    private queries: Map<string, CacheEntry<T>> = new Map();

    public get(key: string): CacheEntry<T> | null {
        return this.queries.get(key) || null;
    }

    public set(key: string, value: CacheEntry<T>) {
        this.queries.set(key, value);
    }

    public delete(key: string, gcTime: number) {
        const entry = this.queries.get(key);
        if (entry && Date.now() - entry.timestamp! > gcTime) {
            this.queries.delete(key);
        }
    }

    public clear() {
        this.queries.clear();
    }
}