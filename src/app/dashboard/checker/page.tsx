// src/app/dashboard/checker/page.tsx
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";

export default async function CheckerPage() {
  const session = await getServerAuthSession();
  
  if (!session) {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Чекер</h1>
      <div className="rounded-lg border p-6">
        {/* Здесь будет форма чекера */}
      </div>
    </div>
  );
}