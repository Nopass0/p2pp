"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

export function EmployeeDetails({ employeeId }: { employeeId: number }) {
  const [commissionRate, setCommissionRate] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const { data: employee, isLoading } = api.admin.getEmployeeDetails.useQuery({
    employeeId,
  });
  const updateCommissionRate = api.admin.updateCommissionRate.useMutation();
  const updateInitialBalance = api.admin.updateInitialBalance.useMutation();

  useEffect(() => {
    if (employee) {
      setCommissionRate(employee.commissionRate?.toString() || "");
      setInitialBalance(employee.initialBalance?.toString() || "");
    }
  }, [employee]);

  if (isLoading) return <div>Загрузка деталей сотрудника...</div>;

  const handleCommissionRateUpdate = () => {
    updateCommissionRate.mutate({
      employeeId,
      rate: parseFloat(commissionRate),
    });
  };

  const handleInitialBalanceUpdate = () => {
    updateInitialBalance.mutate({
      employeeId,
      balance: parseFloat(initialBalance),
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Информация о сотруднике</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Имя: {employee?.name}</p>
          <p>Telegram ID: {employee?.telegramId}</p>
          <p>Gate ID: {employee?.gateId}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Зарплатный коэффициент</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
          />
          <Button onClick={handleCommissionRateUpdate} className="mt-2">
            Обновить
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Начальный баланс</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
          />
          <Button onClick={handleInitialBalanceUpdate} className="mt-2">
            Обновить
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Рабочее время</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{employee?.workTime} часов</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Количество заказов</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{employee?.ordersCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Выручка</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {employee?.revenue.toFixed(2)} USDT
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
