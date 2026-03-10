"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // One QueryClient per browser session (never shared across requests in SSR)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered stale after 30 s
            staleTime: 30_000,
            // Retry failed requests once before showing error
            retry: 1,
            // Re-fetch on window focus for live price data
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
