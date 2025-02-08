"use client";

import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";
import { WorkStatus } from "@/components/dashboard/WorkStatus";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: sessionData, isLoading: isSessionLoading } = api.auth.getSession.useQuery();

  if (isSessionLoading) {
    return <Skeleton className="h-12 w-full" />;
  }

  if (!sessionData?.user) {
    redirect("/auth");
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-3xl font-bold">
        Добро пожаловать, {sessionData.user.login}! #{sessionData.user.id}
      </h1>
      <DashboardStats />
      <WorkStatus />
    </div>
  );
}
