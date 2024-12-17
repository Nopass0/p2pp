"use client";

import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "@/app/_components/theme-provider";
import { AuthProvider } from "@/app/_components/auth-provider";
import { TonConnectProvider } from "@/components/providers/ton-connect-provider";

export function Providers({
  children,
  cookies,
}: {
  children: React.ReactNode;
  cookies: string;
}) {
  return (
    <TRPCReactProvider>
      <ThemeProvider>
        <TonConnectProvider>{children}</TonConnectProvider>
      </ThemeProvider>
    </TRPCReactProvider>
  );
}
