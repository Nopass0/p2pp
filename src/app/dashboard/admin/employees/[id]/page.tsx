"use client";

import { useState } from "react";
import { OverallMetrics } from "@/components/admin/OverallMetrics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

export default function EmployeeProfilePage({ params }: { params: { id: string } }) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const [addingExpense, setAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: 0,
    currency: "USDT",
    type: "SCAM" as "SCAM" | "ERROR",
    description: "",
  });

  const { data: employee } = api.admin.getEmployee.useQuery({
    id: parseInt(params.id),
  });

  const { data: expenses } = api.admin.getEmployeeExpenses.useQuery({
    userId: parseInt(params.id),
    dateRange,
  });

  const { data: appeals } = api.admin.getEmployeeAppeals.useQuery({
    userId: parseInt(params.id),
    dateRange,
  });

  const addExpense = api.admin.addEmployeeExpense.useMutation({
    onSuccess: () => {
      setAddingExpense(false);
      setNewExpense({
        amount: 0,
        currency: "USDT",
        type: "SCAM",
        description: "",
      });
    },
  });

  if (!employee) return <div>Загрузка...</div>;

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {employee.firstName} {employee.middleName} {employee.lastName}
        </h1>
      </div>

      <OverallMetrics employeeId={parseInt(params.id)} dateRange={dateRange} />

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Транзакции</TabsTrigger>
          <TabsTrigger value="expenses">Расходы</TabsTrigger>
          <TabsTrigger value="appeals">Апелляции</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Add transaction rows here */}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Button onClick={() => setAddingExpense(true)}>Добавить расход</Button>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses?.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.type}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>
                      {expense.date.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="appeals" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gate ID</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Комментарий сотрудника</TableHead>
                  <TableHead>Комментарий админа</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appeals?.map((appeal) => (
                  <TableRow key={appeal.id}>
                    <TableCell>{appeal.gateId}</TableCell>
                    <TableCell>{appeal.status}</TableCell>
                    <TableCell>{appeal.employeeComment}</TableCell>
                    <TableCell>{appeal.adminComment}</TableCell>
                    <TableCell>
                      {appeal.createdAt.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={addingExpense} onOpenChange={setAddingExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить расход</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Сумма"
              value={newExpense.amount}
              onChange={(e) =>
                setNewExpense({
                  ...newExpense,
                  amount: parseFloat(e.target.value),
                })
              }
            />
            <select
              className="w-full rounded-md border p-2"
              value={newExpense.type}
              onChange={(e) =>
                setNewExpense({
                  ...newExpense,
                  type: e.target.value as "SCAM" | "ERROR",
                })
              }
            >
              <option value="SCAM">Скам</option>
              <option value="ERROR">Ошибка</option>
            </select>
            <Input
              placeholder="Описание"
              value={newExpense.description}
              onChange={(e) =>
                setNewExpense({
                  ...newExpense,
                  description: e.target.value,
                })
              }
            />
            <Button
              onClick={() =>
                addExpense.mutate({
                  userId: parseInt(params.id),
                  ...newExpense,
                  date: new Date(),
                })
              }
            >
              Добавить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
