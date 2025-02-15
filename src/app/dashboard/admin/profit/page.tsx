"use client";

import { useState } from "react";
import { DateRangePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/trpc/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfitCalculationPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  const [newExpense, setNewExpense] = useState({
    amount: "",
    type: "SCAM" as "SCAM" | "ERROR",
    currency: "USDT" as "USDT" | "RUB",
    date: new Date().toISOString(),
    description: "",
  });

  const { data: profitData, refetch: refetchProfit } = api.admin.getProfitSummary.useQuery({
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString(),
  });

  const { data: expenses, refetch: refetchExpenses } = api.admin.getExpenses.useQuery({
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString(),
  });

  const addExpense = api.admin.addExpense.useMutation({
    onSuccess: () => {
      refetchExpenses();
      refetchProfit();
      setIsAddExpenseOpen(false);
      setNewExpense({
        amount: "",
        type: "SCAM",
        currency: "USDT",
        date: new Date().toISOString(),
        description: "",
      });
      toast.success("Расход успешно добавлен");
    },
  });

  const updateExpense = api.admin.updateExpense.useMutation({
    onSuccess: () => {
      refetchExpenses();
      refetchProfit();
      setIsEditExpenseOpen(false);
      setEditingExpense(null);
      toast.success("Расход успешно обновлен");
    },
  });

  const deleteExpense = api.admin.deleteExpense.useMutation({
    onSuccess: () => {
      refetchExpenses();
      refetchProfit();
      toast.success("Расход успешно удален");
    },
  });

  const handleAddExpense = () => {
    addExpense.mutate({
      ...newExpense,
      amount: parseFloat(newExpense.amount),
    });
  };

  const handleUpdateExpense = () => {
    if (!editingExpense) return;
    updateExpense.mutate({
      ...editingExpense,
      amount: parseFloat(editingExpense.amount.toString()),
    });
  };

  const handleDeleteExpense = (id: number) => {
    if (confirm("Вы уверены, что хотите удалить этот расход?")) {
      deleteExpense.mutate({ id });
    }
  };

  const ExpenseForm = ({ expense, onSubmit, submitText }: any) => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label>Сумма</Label>
        <Input
          type="number"
          value={expense.amount}
          onChange={(e) => 
            expense === newExpense 
              ? setNewExpense({ ...newExpense, amount: e.target.value })
              : setEditingExpense({ ...editingExpense, amount: e.target.value })
          }
        />
      </div>
      <div className="grid gap-2">
        <Label>Валюта</Label>
        <Select
          value={expense.currency}
          onValueChange={(value: "USDT" | "RUB") =>
            expense === newExpense
              ? setNewExpense({ ...newExpense, currency: value })
              : setEditingExpense({ ...editingExpense, currency: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USDT">USDT</SelectItem>
            <SelectItem value="RUB">RUB</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Тип</Label>
        <Select
          value={expense.type}
          onValueChange={(value: "SCAM" | "ERROR") =>
            expense === newExpense
              ? setNewExpense({ ...newExpense, type: value })
              : setEditingExpense({ ...editingExpense, type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SCAM">Скам</SelectItem>
            <SelectItem value="ERROR">Ошибка</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Дата и время</Label>
        <Input
          type="datetime-local"
          value={format(new Date(expense.date), "yyyy-MM-dd'T'HH:mm")}
          onChange={(e) =>
            expense === newExpense
              ? setNewExpense({ ...newExpense, date: new Date(e.target.value).toISOString() })
              : setEditingExpense({ ...editingExpense, date: new Date(e.target.value).toISOString() })
          }
        />
      </div>
      <div className="grid gap-2">
        <Label>Описание</Label>
        <Input
          value={expense.description}
          onChange={(e) =>
            expense === newExpense
              ? setNewExpense({ ...newExpense, description: e.target.value })
              : setEditingExpense({ ...editingExpense, description: e.target.value })
          }
        />
      </div>
      <DialogFooter>
        <Button onClick={onSubmit}>{submitText}</Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Расчет прибыли</h1>
        <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
          <DialogTrigger asChild>
            <Button>Добавить расход</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить новый расход</DialogTitle>
            </DialogHeader>
            <ExpenseForm
              expense={newExpense}
              onSubmit={handleAddExpense}
              submitText="Сохранить"
            />
          </DialogContent>
        </Dialog>
      </div>

      <DateRangePicker
        value={dateRange}
        onChange={(newRange) => {
          if (newRange?.from && newRange?.to) {
            setDateRange({ from: newRange.from, to: newRange.to });
          }
        }}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Выручка</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Валюта</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>USDT</TableCell>
                  <TableCell className="text-right">
                    {profitData?.revenue.USDT.toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>RUB</TableCell>
                  <TableCell className="text-right">
                    {profitData?.revenue.RUB.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Расходы</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Валюта</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>USDT</TableCell>
                  <TableCell className="text-right">
                    {profitData?.expenses.USDT.toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>RUB</TableCell>
                  <TableCell className="text-right">
                    {profitData?.expenses.RUB.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditExpenseOpen} onOpenChange={setIsEditExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать расход</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm
              expense={editingExpense}
              onSubmit={handleUpdateExpense}
              submitText="Обновить"
            />
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>История расходов</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Валюта</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses?.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.date), "dd.MM.yyyy HH:mm")}</TableCell>
                  <TableCell>{expense.type === "SCAM" ? "Скам" : "Ошибка"}</TableCell>
                  <TableCell>{expense.amount.toFixed(2)}</TableCell>
                  <TableCell>{expense.currency}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingExpense(expense);
                            setIsEditExpenseOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
