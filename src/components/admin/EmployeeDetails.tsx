"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { format } from "date-fns";

export function EmployeeDetails({ employeeId }: { employeeId: number }) {
  const [commissionRate, setCommissionRate] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [salaryPercentage, setSalaryPercentage] = useState("");
  const [showExpensesDialog, setShowExpensesDialog] = useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newExpense, setNewExpense] = useState({
    amount: 0,
    type: "SCAM",
    description: ""
  });

  const utils = api.useContext();

  const { data: employee, isLoading } = api.admin.getEmployeeDetails.useQuery({
    employeeId,
  });

  const { data: expenses } = api.admin.getEmployeeExpenses.useQuery({
    userId: employeeId,
    dateRange: {
      from: new Date(0).toISOString(),
      to: new Date().toISOString(),
    },
  });

  const { data: comments } = api.admin.getEmployeeComments.useQuery({
    userId: employeeId,
  });

  const updateCommissionRate = api.admin.updateCommissionRate.useMutation({
    onSuccess: () => utils.admin.getEmployeeDetails.invalidate(),
  });

  const updateInitialBalance = api.admin.updateInitialBalance.useMutation({
    onSuccess: () => utils.admin.getEmployeeDetails.invalidate(),
  });

  const updateSalaryPercentage = api.admin.updateEmployeeSalary.useMutation({
    onSuccess: () => utils.admin.getEmployeeDetails.invalidate(),
  });

  const addComment = api.admin.addEmployeeComment.useMutation({
    onSuccess: () => {
      utils.admin.getEmployeeDetails.invalidate();
      utils.admin.getEmployeeComments.invalidate();
      setNewComment("");
      setShowCommentsDialog(false);
    }
  });

  const addExpense = api.admin.addEmployeeExpense.useMutation({
    onSuccess: () => {
      utils.admin.getEmployeeDetails.invalidate();
      utils.admin.getEmployeeExpenses.invalidate();
      setNewExpense({ amount: 0, type: "SCAM", description: "" });
      setShowExpensesDialog(false);
    }
  });

  useEffect(() => {
    if (employee) {
      setCommissionRate(employee.commissionRate?.toString() || "");
      setInitialBalance(employee.initialBalance?.toString() || "");
      setSalaryPercentage(employee.salaryPercentage?.toString() || "");
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

  const handleSalaryPercentageUpdate = () => {
    updateSalaryPercentage.mutate({
      id: employeeId,
      salaryPercentage: parseFloat(salaryPercentage),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Информация о сотруднике</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Имя: {employee?.firstName} {employee?.lastName}</p>
            <p>Telegram ID: {employee?.telegramId}</p>
            <p>Логин: {employee?.login}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Комиссия</CardTitle>
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
            <CardTitle>ЗП Коэффициент</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={salaryPercentage}
              onChange={(e) => setSalaryPercentage(e.target.value)}
              step="0.1"
              min="0"
              max="1"
            />
            <Button onClick={handleSalaryPercentageUpdate} className="mt-2">
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
            <CardTitle>Валовая прибыль</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {employee?.grossProfit?.toFixed(2)} USDT
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Зарплата</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {((employee?.grossProfit || 0) * (employee?.salaryPercentage || 0)).toFixed(2)} USDT
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Расходы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <p className="text-2xl font-bold">
                Скам: {expenses?.filter(e => e.type === "SCAM").reduce((sum, e) => sum + e.amount, 0).toFixed(2)} USDT
                <br />
                Ошибки: {expenses?.filter(e => e.type === "ERROR").reduce((sum, e) => sum + e.amount, 0).toFixed(2)} USDT
              </p>
              <Button onClick={() => setShowExpensesDialog(true)}>
                Добавить
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Комментарии ({comments?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowCommentsDialog(true)} className="w-full">
              Управление комментариями
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showExpensesDialog} onOpenChange={setShowExpensesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Управление расходами</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  placeholder="Сумма"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                />
                <select
                  value={newExpense.type}
                  onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value as "SCAM" | "ERROR" })}
                  className="border rounded p-2"
                >
                  <option value="SCAM">Скам</option>
                  <option value="ERROR">Ошибка</option>
                </select>
              </div>
              <Textarea
                placeholder="Описание"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              />
              <Button onClick={() => {
                addExpense.mutate({
                  userId: employeeId,
                  ...newExpense
                });
              }}>
                Добавить расход
              </Button>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">История расходов</h3>
              <div className="space-y-2">
                {expenses?.map((expense) => (
                  <div key={expense.id} className="border p-2 rounded">
                    <div className="flex justify-between">
                      <span>{expense.type === "SCAM" ? "Скам" : "Ошибка"}: {expense.amount} USDT</span>
                      <span>{format(new Date(expense.createdAt), "dd.MM.yyyy HH:mm")}</span>
                    </div>
                    {expense.description && (
                      <p className="text-sm text-gray-600 mt-1">{expense.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Комментарии</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Новый комментарий"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <Button onClick={() => {
              if (newComment) {
                addComment.mutate({
                  userId: employeeId,
                  content: newComment
                });
              }
            }}>
              Добавить комментарий
            </Button>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">История комментариев</h3>
              <div className="space-y-2">
                {comments?.map((comment) => (
                  <div key={comment.id} className="border p-2 rounded">
                    <div className="flex justify-between">
                      <p>{comment.content}</p>
                      <span className="text-sm text-gray-600">
                        {format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
