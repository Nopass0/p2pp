"use client";

import { useEffect, useState, type ReactNode } from "react";

interface TonConnectWrapperProps {
  children: ReactNode;
}

export default function TonConnectProviderWrapper({
  children
}: TonConnectWrapperProps) {
  const [Provider, setProvider] = useState<React.ComponentType<{children: ReactNode}>>();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const loadProvider = async () => {
      try {
        const { TonConnectUIProvider } = await import("@tonconnect/ui-react");
        setProvider(() => ({children}: {children: ReactNode}) => (
          <TonConnectUIProvider
            manifestUrl="/tonconnect-manifest.json"
            walletsListConfiguration={{
              includeWallets: ["tonkeeper", "tonhub"],
            }}
          >
            {children}
          </TonConnectUIProvider>
        ));
      } catch (error) {
        console.error("Failed to load TonConnectUIProvider:", error);
      }
    };

    loadProvider();
    setHasMounted(true);
  }, []);

  if (!hasMounted || !Provider) {
    return <>{children}</>;
  }

  return <Provider>{children}</Provider>;
}