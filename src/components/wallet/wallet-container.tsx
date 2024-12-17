"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TonWallet = dynamic(
  () => import("./ton-wallet"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Telegram Wallet</h1>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  }
);

export default function WalletContainer() {
  return <TonWallet />;
}