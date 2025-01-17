"use client";

import { useState } from "react";
import { Suspense } from "react";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { OverallMetrics } from "@/components/admin/OverallMetrics";
import { EmployeeTable } from "@/components/admin/EmployeeTable";
import { CustomMetrics } from "@/components/admin/CustomMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  return (
    <ScrollArea className="space-y-6">
      <h1 className="text-3xl font-bold">Панель администратора</h1>
      <DateRangePicker
        value={dateRange}
        onChange={(newRange) => {
          if (newRange?.from && newRange?.to) {
            setDateRange({ from: newRange.from, to: newRange.to });
            console.log("Диапазон дат изменен:", newRange);
            // Here you would typically update your data fetching logic
            // based on the new date range
          }
        }}
      />
      <Suspense fallback={<div>Загрузка общих метрик...</div>}>
        <OverallMetrics dateRange={dateRange} />
      </Suspense>
      <Card>
        <CardHeader>
          <CardTitle>Последние сотрудники</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Загрузка таблицы сотрудников...</div>}>
            <EmployeeTable limit={5} dateRange={dateRange} />
          </Suspense>
        </CardContent>
      </Card>
      <Suspense fallback={<div>Загрузка пользовательских метрик...</div>}>
        <CustomMetrics dateRange={dateRange} />
      </Suspense>
    </ScrollArea>
  );
}
