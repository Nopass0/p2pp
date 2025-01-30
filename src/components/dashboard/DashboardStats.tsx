'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, DollarSign, Clock } from "lucide-react";
import { api } from "@/trpc/react";
import { formatCurrency } from "@/lib/utils";

export function DashboardStats() {
  const { data: workTime } = api.user.getWorkTime.useQuery();
  const { data: todayStats } = api.user.getTodayStats.useQuery();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card> 
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Количество заказов
          </CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayStats?.p2pCount ?? 0}/{todayStats?.idexCount ?? 0}/{todayStats?.matchCount ?? 0}</div>
          <p className="text-xs text-muted-foreground">
            Количество P2P/IDEX/Match транзакций за сегодня
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Заработная плата
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${formatCurrency(todayStats?.salary ?? 0)}</div>
          <p className="text-xs text-muted-foreground">
            Заработано за сегодня
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Часы работы</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {workTime ?? "00:00 - 00:00"}
          </div>
          <p className="text-xs text-muted-foreground">
            Последняя активность
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
