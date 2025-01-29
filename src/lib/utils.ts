import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0 USDT";
  return `${amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDT`;
}

export function calculateWorkTime(firstMatchTime: Date | null, lastMatchTime: Date | null): string {
  if (!firstMatchTime || !lastMatchTime) return "0ч";
  
  const diffInHours = Math.round(
    (lastMatchTime.getTime() - firstMatchTime.getTime()) / (1000 * 60 * 60)
  );
  
  return `${diffInHours}ч`;
}

export function generateRandomString(length: number): string {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}