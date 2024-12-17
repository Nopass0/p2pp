"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from 'lucide-react';
import TonConnect from '@tonconnect/sdk';

declare global {
  interface Window {
    tonconnect?: any;
  }
}

export function TonWalletButton({ onConnect }: { onConnect?: (wallet: any) => void }) {
  const [connector, setConnector] = useState<TonConnect | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const initConnector = async () => {
      const tc = new TonConnect({
        manifestUrl: "/tonconnect-manifest.json"
      });

      setConnector(tc);
      await tc.restoreConnection();

      tc.onStatusChange((wallet) => {
        setConnected(!!wallet);
        if (wallet && onConnect) {
          onConnect(wallet);
        }
      });
    };

    initConnector();
  }, [onConnect]);

  const handleConnect = async () => {
    if (!connector) return;

    try {
      // Получаем список доступных кошельков
      const walletsList = await connector.getWallets();
      
      // Проверяем наличие встроенного кошелька
      const embeddedWallet = walletsList.find(wallet => wallet.embedded);
      
      if (embeddedWallet) {
        // Если есть встроенный кошелек (например, в браузере Telegram), используем его
        await connector.connect({ jsBridgeKey: embeddedWallet.jsBridgeKey });
      } else {
        // Иначе используем универсальную ссылку для Tonkeeper
        const universalLink = connector.connect({
          universalLink: 'https://app.tonkeeper.com/ton-connect',
          bridgeUrl: 'https://bridge.tonapi.io/bridge'
        });

        window.open(universalLink, '_blank');
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const handleDisconnect = async () => {
    if (!connector) return;
    await connector.disconnect();
  };

  return connected ? (
    <Button onClick={handleDisconnect} variant="outline" className="w-full">
      <Wallet className="mr-2 h-4 w-4" />
      Disconnect Wallet
    </Button>
  ) : (
    <Button onClick={handleConnect} className="w-full">
      <Wallet className="mr-2 h-4 w-4" />
      Connect Wallet
    </Button>
  );
}