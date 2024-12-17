"use client";

import { type ReactNode } from "react";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

const manifestUrl = "https://raw.githubusercontent.com/ton-community/tutorials/main/03-wallet/test/public/tonconnect-manifest.json";

export function TonConnectProvider({ children }: { children: ReactNode }) {
  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      widgetConfiguration={{
        enableBackButton: true,
      }}
    >
      {children}
    </TonConnectUIProvider>
  );
}