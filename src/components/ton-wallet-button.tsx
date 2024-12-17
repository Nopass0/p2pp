"use client";

import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";

export function TonWalletButton() {
  const wallet = useTonWallet();

  return (
    <div className="flex items-center gap-2">
      <TonConnectButton />
      {wallet && (
        <div className="text-sm">Connected: {wallet.account.address}</div>
      )}
    </div>
  );
}