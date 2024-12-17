"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "@/app/_components/theme-provider";
import { AuthProvider } from "@/app/_components/auth-provider";
import dynamic from "next/dynamic";
import { api } from "@/trpc/react";
import superjson from "superjson";
import { httpBatchLink } from "@trpc/client";

const TonConnectProviderWrapper = dynamic(
  () => import("@/components/providers/ton-connect-wrapper"),
  {
    ssr: false,
    loading: () => <div>Loading TON Connect...</div>,
  }
);

export default function ClientProviders({ 
  children,
  cookies,
}: { 
  children: React.ReactNode;
  cookies: string;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5000 } },
      })
  );

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          headers() {
            return {
              cookie: cookies,
            };
          },
        }),
      ],
      transformer: superjson,
    })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <TonConnectProviderWrapper>
              {children}
            </TonConnectProviderWrapper>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </api.Provider>
  );
}