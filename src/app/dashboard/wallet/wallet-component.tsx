"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/trpc/react";
import TonConnectButton from "@/components/ton-connect-button";

interface Wallet {
  address: string;
  network: string;
  balance: string;
}

export default function WalletComponent() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const handleWalletConnect = (connectedWallet: any) => {
    setWallet({
      address: connectedWallet.address,
      network: connectedWallet.network,
      balance: connectedWallet.balance,
    });
  };

  useEffect(() => {
    // Проверяем состояние кошелька при загрузке
    const checkWalletState = async () => {
      try {
        // @ts-ignore
        if (window.ton && window.ton.isTonWallet) {
          // @ts-ignore
          const isConnected = await window.ton.isConnected();
          if (isConnected) {
            // @ts-ignore
            const walletInfo = await window.ton.send('ton_requestAccounts');
            setWallet({
              address: walletInfo[0],
              network: 'mainnet',
              balance: '0',
            });
          }
        }
      } catch (error) {
        console.error("Error checking wallet state:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    checkWalletState();
  }, []);

  const { data: transactions, isLoading: isLoadingTransactions } = api.wallet.getTransactions.useQuery(
    { address: wallet?.address ?? "" },
    { enabled: !!wallet?.address }
  );

  const formatTonAmount = (amount: string) => {
    const value = parseInt(amount) / 1e9;
    return `${value.toFixed(2)} TON`;
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Telegram Wallet</h1>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Telegram Wallet</h1>
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">To use this feature, you need to connect your TON wallet:</p>
            <ol className="mb-6 list-decimal pl-6">
              <li>Install the TON Wallet browser extension or mobile app</li>
              <li>Create or import a wallet</li>
              <li>Click the Connect button below</li>
            </ol>
            <TonConnectButton onConnect={handleWalletConnect} />
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
            <p><strong>Address:</strong> {wallet.address}</p>
            <p><strong>Network:</strong> {wallet.network}</p>
            <p><strong>Balance:</strong> {formatTonAmount(wallet.balance)}</p>
            <div className="mt-4">
              <TonConnectButton onConnect={handleWalletConnect} />
            </div>
          </div>
        </CardContent>
      </Card>

      {transactions && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="rounded-lg border p-4 hover:bg-muted/50">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                        {tx.in_msg.source && (
                          <div className="text-sm text-muted-foreground">
                            From: {tx.in_msg.source}
                            <Badge variant="outline" className="ml-2">
                              {formatTonAmount(tx.in_msg.value)}
                            </Badge>
                          </div>
                        )}
                        {tx.out_msgs.map((msg: any, idx: number) => (
                          <div key={idx} className="text-sm text-muted-foreground">
                            To: {msg.destination}
                            <Badge variant="outline" className="ml-2">
                              {formatTonAmount(msg.value)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(tx.timestamp * 1000), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}