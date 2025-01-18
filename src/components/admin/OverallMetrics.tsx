"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";

interface OverallMetricsProps {
  dateRange: { from: Date; to: Date };
}

export function OverallMetrics({ dateRange }: OverallMetricsProps) {
  const { data, isLoading } = api.admin.getOverallMetrics.useQuery(dateRange);

  if (isLoading) return <div>Загрузка метрик...</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Валовая прибыль</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {data?.grossProfit !== null ? data?.grossProfit.toFixed(20) : "0"}{" "}
            USDT
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Валовая прибыль в процентном соотношении</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {data?.grossProfitPercentage !== null
              ? data?.grossProfitPercentage.toFixed(2)
              : "0"}{" "}
            %
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Средняя валовая прибыль на ордер</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {data?.averageGrossProfitPerOrder !== null
              ? data?.averageGrossProfitPerOrder.toFixed(2)
              : "0"}{" "}
            USDT
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Средняя сумма ордера в USDT/RUB</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <p className="text-2xl font-bold">
            {data?.averageOrderAmountRub !== null
              ? data?.averageOrderAmountRub.toFixed(2)
              : "0"}{" "}
            RUB
          </p>
          <p className="text-2xl font-bold">
            {data?.averageOrderAmountUsdt !== null
              ? data?.averageOrderAmountUsdt.toFixed(2)
              : "0"}{" "}
            USDT
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
