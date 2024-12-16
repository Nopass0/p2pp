// src/app/dashboard/statistics/page.tsx
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";

export default async function StatisticsPage() {
  const session = await getServerAuthSession();
  
  if (!session) {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Статистика</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Здесь будут компоненты статистики */}
      </div>
    </div>
  );
}