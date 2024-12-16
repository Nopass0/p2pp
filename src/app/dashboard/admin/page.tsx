// src/app/dashboard/admin/page.tsx
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";

export default async function AdminPage() {
  const session = await getServerAuthSession();
  
  if (!session) {
    redirect("/");
  }

  // Здесь нужно добавить проверку на админа
  // if (!session.user.isAdmin) {
  //   redirect("/dashboard");
  // }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Админ панель</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Здесь будут компоненты админ-панели */}
      </div>
    </div>
  );
}