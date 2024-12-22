// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    // Можно редиректить или показать заглушку
    return <div>Please log in</div>;
  }

  const { user } = session;

  return (
    <div className="container">
      {/* <h1 className="text-2xl font-bold">
        Добро пожаловать, {user.firstName} {user.lastName}!
      </h1>
      <p className="text-muted-foreground">
        Telegram ID: {user.telegramId}
      </p>
      {user.isAdmin && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Администратор
        </p>
      )} */}
    </div>
  );
}
