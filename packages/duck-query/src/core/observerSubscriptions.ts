import { useContext } from "react";
import { FullQueryClient, FullQueryClientContext, QueryClient, QueryClientContext } from "./QueryClientProvider";

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