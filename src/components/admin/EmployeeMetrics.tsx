"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { DateRangePicker } from "@/components/ui/date-picker";

export function EmployeeMetrics({ employeeId }: { employeeId: number }) {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const { data: metrics, isLoading } =
    api.admin.getDetailedEmployeeMetrics.useQuery({
      employeeId,
      startDate: dateRange.from,
      endDate: dateRange.to,
    });

  if (isLoading) return <div>Загрузка метрик...</div>;

  return (
    <div className="space-y-4">
      <DateRangePicker
        value={dateRange}
        onChange={(newRange) => {
          if (newRange?.from && newRange?.to) {
            setDateRange({ from: newRange.from, to: newRange.to });
          }
        }}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Рабочее время</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics?.workTime} часов</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Общее количество транзакций</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {metrics?.totalTransactionsCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Общая выручка</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {metrics?.totalRevenue.toFixed(2)} USDT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Средневзвешенный спред</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {metrics?.weightedSpread.toFixed(2)} RUB
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Спред в USDT</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {metrics?.spreadInUsdt.toFixed(2)} USDT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Зарплата</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {metrics?.salary.toFixed(2)} USDT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Начальный баланс</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {metrics?.initialBalance.toFixed(2)} USDT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Конечный баланс</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {metrics?.finalBalance.toFixed(2)} USDT
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
