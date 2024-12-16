import React from "react";
import { Loader2 } from "lucide-react";

export function AuthLoading() {
  return (
    <div className="flex items-center space-x-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Авторизация через Telegram...</span>
    </div>
  );
}
