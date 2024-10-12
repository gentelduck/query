import { useContext } from "react";
import { FullQueryClient, FullQueryClientContext, QueryClient, QueryClientContext } from "./QueryClientProvider";

export const useQueryClient = (): QueryClient => {
    const context = useContext(QueryClientContext);

    if (!context) {
        throw new Error("No QueryClient set, use QueryClientProvider to set one");
    }

    return context;
};

export const useFullQueryClient = (): FullQueryClient => {
    const context = useContext(FullQueryClientContext);

    if (!context) {
        throw new Error("No QueryClient set, use QueryClientProvider to set one");
    }

    return context;
};