// p2pp\p2pp\src\services\telegramBotService.ts
import TelegramBot from "node-telegram-bot-api";
import { env } from "@/env";

const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN);

export async function sendTelegramMessage(chatId: string, message: string) {
  try {
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error(`Error sending Telegram message to ${chatId}:`, error);
  }
}
