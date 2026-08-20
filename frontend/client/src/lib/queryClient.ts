import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds — data is served from cache but re-fetched in background after 30s
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
