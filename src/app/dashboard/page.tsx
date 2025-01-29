import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";
import { WorkStatus } from "@/components/dashboard/WorkStatus";
import { DashboardStats } from "@/components/dashboard/DashboardStats";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return redirect("/login");
  }

  const { user } = session;

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-3xl font-bold">
        Добро пожаловать, {user.firstName} {user.lastName}!
      </h1>
      <DashboardStats />
      <WorkStatus />
    </div>
  );
}
