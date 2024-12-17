import { env } from "@/env";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export function initTelegramWidget(onAuth: (user: TelegramUser) => void): void {
  // Очищаем предыдущий виджет если он есть
  const existingContainer = document.getElementById("telegram-login-container");
  if (existingContainer) {
    existingContainer.innerHTML = "";
  }

  // Create script element
  const script = document.createElement("script");
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.setAttribute(
    "data-telegram-login",
    env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  );
  script.setAttribute("data-size", "large");
  script.setAttribute("data-onauth", "onTelegramAuth(user)");
  script.setAttribute("data-request-access", "write");
  script.setAttribute("data-radius", "8");
  script.async = true;

  // Define global callback
  //@ts-ignore
  window.onTelegramAuth = onAuth;

  // Add script to container
  if (existingContainer) {
    existingContainer.appendChild(script);
  }
  //@ts-ignore
  return () => {
    if (existingContainer) {
      existingContainer.innerHTML = "";
    }
    //@ts-ignore
    delete window.onTelegramAuth;
  };
}
