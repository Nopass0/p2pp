import { createHash, createHmac } from "crypto";
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

export function verifyTelegramAuth(data: TelegramUser): boolean {
  const { hash, ...userData } = data;

  // Создаем строку для проверки
  const checkString = Object.entries(userData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Создаем секретный ключ
  const secretKey = createHash("sha256")
    .update(env.TELEGRAM_BOT_TOKEN)
    .digest();

  // Вычисляем хэш
  const calculatedHash = createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  return calculatedHash === hash;
}

export function validateAuthDate(authDate: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const maxAge = 24 * 60 * 60; // 24 часа
  return now - authDate < maxAge;
}
