"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import TonConnect from "@tonconnect/sdk";

interface WalletInfo {
  account: {
    address: string;
    chain: string;
    balance?: string;
  };
}

export default function TonWallet() {
  const [connector, setConnector] = useState<TonConnect | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const initConnector = async () => {
      try {
        const tc = new TonConnect({
          manifestUrl: "/tonconnect-manifest.json",
        });
        setConnector(tc);

        // Восстанавливаем предыдущее подключение
        await tc.restoreConnection();

        // Подписываемся на изменения состояния
        tc.onStatusChange((wallet) => {
          setWalletInfo(wallet);
        });
      } catch (error) {
        console.error("Error initializing connector:", error);
      }
    };

    initConnector();
  }, []);

  const handleConnect = async () => {
    if (!connector) return;
    setIsConnecting(true);

    try {
      // Получаем список доступных кошельков
      const walletsList = await connector.getWallets();
      
      // Проверяем наличие встроенного кошелька
      const embeddedWallet = walletsList.find(wallet => wallet.embedded);
      
      if (embeddedWallet) {
        // Если есть встроенный кошелек (например, в браузере Telegram), используем его
        await connector.connect({ jsBridgeKey: embeddedWallet.jsBridgeKey });
      } else {
        // Иначе используем Tonkeeper
        const universalLink = connector.connect({
          universalLink: "https://app.tonkeeper.com/ton-connect",
          bridgeUrl: "https://bridge.tonapi.io/bridge"
        });

        window.open(universalLink, "_blank");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connector) return;
    try {
      await connector.disconnect();
      setWalletInfo(null);
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  if (!walletInfo) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Telegram Wallet</h1>
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please connect your TON wallet to continue:</p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect TON Wallet"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Telegram Wallet</h1>
      <Card>
        <CardHeader>
          <CardTitle>Wallet Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Address:</strong> {walletInfo.account.address}</p>
            <p><strong>Chain:</strong> {walletInfo.account.chain}</p>
            {walletInfo.account.balance && (
              <p><strong>Balance:</strong> {walletInfo.account.balance} TON</p>
            )}
            <div className="mt-4">
              <Button onClick={handleDisconnect} variant="outline" className="w-full">
                <Wallet className="mr-2 h-4 w-4" />
                Disconnect Wallet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}