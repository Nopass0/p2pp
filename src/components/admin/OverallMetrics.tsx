"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { formatCurrency } from "@/lib/utils";
import { useMemo } from "react";

const DEFAULT_FROM_DATE = new Date(0);
const DEFAULT_TO_DATE = new Date();

interface OverallMetricsProps {
  employeeId?: number;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export function OverallMetrics({ employeeId, dateRange }: OverallMetricsProps) {
  const effectiveDateRange = useMemo(() => ({
    from: dateRange?.from ?? DEFAULT_FROM_DATE,
    to: dateRange?.to ?? DEFAULT_TO_DATE,
  }), [dateRange?.from, dateRange?.to]);

  const { data: metrics, isLoading } = employeeId 
    ? api.admin.getEmployeeMetrics.useQuery(
        {
          employeeId,
          dateRange: effectiveDateRange,
        },
        {
          enabled: !!employeeId,
        }
      )
    : api.admin.getOverallMetrics.useQuery({
        dateRange: effectiveDateRange,
      });

  if (isLoading) return <div>Загрузка метрик...</div>;
  if (!metrics) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Валовая прибыль</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.grossProfit)}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.grossProfitPercentage.toFixed(2)}% от выручки
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Средняя прибыль на ордер</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.averageOrderProfit)}
          </div>
          <p className="text-xs text-muted-foreground">
            Всего ордеров: {metrics.totalOrders}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Средняя сумма ордера</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.averageOrderAmount)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Финансовые показатели</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Расход:</span>
              <span className="ml-2 font-bold">{formatCurrency(metrics.totalExpenses)}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Выручка:</span>
              <span className="ml-2 font-bold">{formatCurrency(metrics.totalRevenue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {employeeId && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Заказы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.ordersMatched ? "bg-green-100 rounded p-2" : ""}`}>
                {metrics.p2pOrders}/{metrics.gateOrders}/{metrics.matchedOrders}
              </div>
              <p className="text-xs text-muted-foreground">P2P/Gate/Match</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Время работы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.workTime}</div>
              <p className="text-xs text-muted-foreground">
                С {metrics.firstMatchTime?.toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Расходы от ошибок</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Скам:</span>
                  <span className="ml-2 font-bold">{formatCurrency(metrics.scamExpenses)}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Ошибки:</span>
                  <span className="ml-2 font-bold">{formatCurrency(metrics.errorExpenses)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
