"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeesTable } from "./EmployeesTable";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";

export function OverallMetrics() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [search, setSearch] = useState("");

  const { data, isLoading } = api.admin.getOverallMetrics.useQuery(dateRange);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-[250px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[200px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "0";
    return value.toLocaleString("ru-RU", { maximumFractionDigits: 20 });
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Валовая прибыль
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatNumber(data?.grossProfit)} USDT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Валовая прибыль в процентах
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatNumber(data?.grossProfitPercentage)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Средняя валовая прибыль на ордер
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatNumber(data?.averageGrossProfitPerOrder)} USDT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Средняя сумма ордера
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-xl font-semibold">
                {formatNumber(data?.averageOrderAmountRub)} RUB
              </p>
              <p className="text-xl font-semibold">
                {formatNumber(data?.averageOrderAmountUsdt)} USDT
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Валовый расход
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatNumber(data?.grossExpense)} USDT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Валовая выручка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatNumber(data?.grossRevenue)} USDT
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="flex space-x-4">
        <DateRangePicker value={dateRange} onValueChange={setDateRange} />
        <Input
          placeholder="Поиск сотрудника"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={() => setSearch("")}>Сбросить</Button>
      </div>
      <EmployeesTable dateRange={dateRange} search={search} />
    </div>
  );
}
