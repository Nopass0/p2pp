"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { type ReactNode } from "react";

const manifestUrl = "/tonconnect-manifest.json";

export function TonConnectUIComponent({ children }: { children: ReactNode }) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}