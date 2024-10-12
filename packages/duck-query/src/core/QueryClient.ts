import { QueryCache } from "./QueryCache"

export type QueryClientConfig = {
    queryCache: QueryCache
}

export class QueryClient implements QueryClientConfig {
    public queryCache: QueryCache = new QueryCache();
}