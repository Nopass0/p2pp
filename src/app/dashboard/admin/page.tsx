"use client";

import { useState, useMemo } from "react";
import { Suspense } from "react";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { OverallMetrics } from "@/components/admin/OverallMetrics";
import { EmployeeTable } from "@/components/admin/EmployeeTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [search, setSearch] = useState("");

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Панель администратора</h1>
          <div className="flex items-center space-x-4">
            <DateRangePicker
              value={dateRange}
              onValueChange={(newRange) => {
                if (!newRange) {
                  setDateRange({});
                  return;
                }
                setDateRange({
                  from: newRange.from || undefined,
                  to: newRange.to || undefined,
                });
              }}
            />
            <Input
              placeholder="Поиск сотрудника"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Button variant="outline" onClick={() => setSearch("")}>
              Сбросить
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Общие показатели</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Загрузка общих метрик...</div>}>
              <OverallMetrics dateRange={dateRange} />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сотрудники</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Загрузка таблицы сотрудников...</div>}>
              <EmployeeTable
                dateRange={dateRange}
                limit={10}
                search={search}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
