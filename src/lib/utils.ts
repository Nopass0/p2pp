import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined, currency: 'USDT' | 'RUB' = 'USDT'): string {
  if (amount === null || amount === undefined) return currency === 'USDT' ? '0 USDT' : '0 ₽';
  
  const formatter = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: currency === 'USDT' ? 2 : 0,
    maximumFractionDigits: currency === 'USDT' ? 2 : 0,
  });

  return currency === 'USDT' 
    ? `${formatter.format(amount)} USDT`
    : `${formatter.format(amount)} ₽`;
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