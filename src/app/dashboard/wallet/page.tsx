import { Suspense } from "react";
import WalletContainer from "@/components/wallet/wallet-container";

export default function WalletPage() {
  return (
    <Suspense>
      <WalletContainer />
    </Suspense>
  );
}