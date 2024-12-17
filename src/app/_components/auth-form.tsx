"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { env } from "@/env";
import { type TelegramUser } from "@/lib/telegram-widget";

export function AuthForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTelegramAuth = async (user: TelegramUser) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Attempting authentication with:", user);

      // First, try to fetch with credentials included
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      // Log the raw response for debugging
      const responseText = await response.text();
      console.log("Raw response:", responseText);

      // Try to parse the response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response:", e);
        throw new Error("Server returned invalid JSON");
      }

      // Check for errors
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Process successful response
      console.log("Authentication successful:", data);

      if (data.token) {
        localStorage.setItem("token", data.token);
        await router.push("/dashboard");
      } else {
        throw new Error("No token received");
      }
    } catch (err) {
      console.error("Telegram auth error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initTelegramAuth = () => {
      try {
        const container = document.getElementById("telegram-login-container");
        if (!container) return;
        container.innerHTML = "";

        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.async = true;

        const attrs = {
          "data-telegram-login": env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
          "data-size": "large",
          "data-onauth": "onTelegramAuth(user)",
          "data-request-access": "write",
          "data-radius": "8",
          "data-lang": "ru",
        };

        Object.entries(attrs).forEach(([key, value]) => {
          script.setAttribute(key, value);
        });
        //@ts-ignore
        window.onTelegramAuth = handleTelegramAuth;

        container.appendChild(script);
      } catch (err) {
        console.error("Widget initialization error:", err);
        setError("Error initializing Telegram login");
      }
    };

    initTelegramAuth();

    return () => {
      //@ts-ignore
      delete window.onTelegramAuth;
      const container = document.getElementById("telegram-login-container");
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <Card className="w-full p-6">
      <div className="flex flex-col items-center space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Добро пожаловать в P2PP
          </h1>
          <p className="text-sm text-muted-foreground">
            Войдите с помощью своего аккаунта Telegram, чтобы продолжить
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Выполняется вход...</span>
          </div>
        ) : (
          <div id="telegram-login-container" className="flex justify-center" />
        )}
      </div>
    </Card>
  );
}
