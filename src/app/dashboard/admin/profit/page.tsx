"use client";

import { useState } from "react";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProfitCalculationPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [expenses, setExpenses] = useState([
    { name: "", amount: "", isRecurring: false, period: "daily" },
  ]);
  const { data: profitData, isLoading } = api.admin.calculateProfit.useQuery({
    dateRange,
    expenses: expenses.map((e) => ({
      ...e,
      amount: parseFloat(e.amount) || 0,
    })),
  });

  const handleAddExpense = () => {
    setExpenses([
      ...expenses,
      { name: "", amount: "", isRecurring: false, period: "daily" },
    ]);
  };

  const handleExpenseChange = (
    index: number,
    field: string,
    value: string | boolean,
  ) => {
    const newExpenses = [...expenses];
    newExpenses[index] = { ...newExpenses[index], [field]: value };
    setExpenses(newExpenses);
  };

  return (
    <div className="space-y-6">
      <h1 className="mb-4 text-3xl font-bold">Расчет прибыли</h1>
      <DateRangePicker
        value={dateRange as any}
        onChange={(newRange) => {
          if (newRange?.from && newRange?.to) {
            setDateRange({ from: newRange.from, to: newRange.to });
          }
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>Выручка</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {profitData?.revenue.toFixed(2)} USDT
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Расходы</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.map((expense, index) => (
            <div key={index} className="mb-4 grid grid-cols-5 gap-2">
              <Input
                placeholder="Название расхода"
                value={expense.name}
                onChange={(e) =>
                  handleExpenseChange(index, "name", e.target.value)
                }
              />
              <Input
                type="number"
                placeholder="Сумма"
                value={expense.amount}
                onChange={(e) =>
                  handleExpenseChange(index, "amount", e.target.value)
                }
              />
              <div className="flex items-center">
                <Input
                  type="checkbox"
                  checked={expense.isRecurring}
                  onChange={(e) =>
                    handleExpenseChange(index, "isRecurring", e.target.checked)
                  }
                  className="mr-2"
                />
                <Label>Повторяющийся</Label>
              </div>
              {expense.isRecurring && (
                <Select
                  value={expense.period}
                  onValueChange={(value) =>
                    handleExpenseChange(index, "period", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите период" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Ежедневно</SelectItem>
                    <SelectItem value="weekly">Еженедельно</SelectItem>
                    <SelectItem value="monthly">Ежемесячно</SelectItem>
                    <SelectItem value="yearly">Ежегодно</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button
                onClick={() => {
                  const newExpenses = [...expenses];
                  newExpenses.splice(index, 1);
                  setExpenses(newExpenses);
                }}
              >
                Удалить
              </Button>
            </div>
          ))}
          <Button onClick={handleAddExpense}>Добавить расход</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Чистая прибыль</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {profitData?.netProfit.toFixed(2)} USDT
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
