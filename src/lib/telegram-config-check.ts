import { env } from "@/env";

export async function checkTelegramConfig() {
  try {
    // Проверяем токен бота
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`,
    );
    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram bot check failed:", data);
      return {
        isValid: false,
        error: data.description || "Failed to validate bot token",
      };
    }

    // Проверяем, совпадает ли username бота с тем, что в конфигурации
    const botUsername = data.result.username;
    if (botUsername !== env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) {
      console.error("Bot username mismatch:", {
        configUsername: env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
        actualUsername: botUsername,
      });
      return {
        isValid: false,
        error: `Bot username mismatch. Expected: ${env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}, Got: ${botUsername}`,
      };
    }

    return {
      isValid: true,
      botInfo: data.result,
    };
  } catch (error) {
    console.error("Failed to check Telegram configuration:", error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
