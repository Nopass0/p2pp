import { type User } from "@prisma/client";
import { db } from "@/server/db";

export type AuthSession = {
  user: User;
} | null;

export async function getServerAuthSession(): Promise<AuthSession> {
  try {
    // Пока просто мок авторизации
    const user = await db.user.findFirst();
    
    return user ? { user } : null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}