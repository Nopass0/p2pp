// src/types/index.ts
export interface User {
  id: number;
  telegramId: string;
  firstName: string;
  lastName?: string | null;
  username?: string | null; // Telegram username может быть null
  photoUrl?: string | null;
  isAdmin: boolean;
}

export interface Session {
  user: User;
}
