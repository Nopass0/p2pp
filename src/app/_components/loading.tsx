// src/app/_components/loading.tsx
"use client";

import { Loader2 } from "lucide-react";

export function LoadingPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function LoadingSpinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}
