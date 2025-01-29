"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/trpc/react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CameraIcon, PencilIcon, ChevronLeftIcon, ChevronRightIcon, Trash } from "lucide-react"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const ITEMS_PER_PAGE = 6;

interface Employee {
  id: number;
  login: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  deposit: number;
  salaryPercentage: number;
  gateTransactions: any[];
  p2pTransactions: any[];
  grossProfit: number;
  salary: number;
  commentsCount?: number;
  scamErrorsCount?: number;
}

interface EmployeeTableProps {
  limit?: number
  search?: string
  dateRange?: {
    from: Date
    to: Date
  }
}

export function EmployeeTable({ limit = 10, search = "", dateRange }: EmployeeTableProps) {
  const router = useRouter();
  const utils = api.useContext();

  const [page, setPage] = useState(1);
  const [searchState, setSearchState] = useState(search);
  const [selectedCurrency, setSelectedCurrency] = useState<'USDT' | 'RUB'>('USDT');
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [editingDeposit, setEditingDeposit] = useState<{ id: number; value: number } | null>(null);
  const [editingSalary, setEditingSalary] = useState<{ id: number; value: number } | null>(null);
  const [showExpensesDialog, setShowExpensesDialog] = useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newExpense, setNewExpense] = useState({
    amount: 0,
    type: "SCAM",
    description: "",
    currency: "USDT"
  });
  const [showWorkTimeDialog, setShowWorkTimeDialog] = useState(false);
  const [selectedWorkTime, setSelectedWorkTime] = useState<any>(null);
  const [editingComment, setEditingComment] = useState<{ id: number; content: string } | null>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Create a default date range if none provided
  const effectiveDateRange = useMemo(() => {
    const defaultFrom = new Date(0);
    const defaultTo = new Date();
    
    return {
      from: dateRange?.from ? new Date(dateRange.from) : defaultFrom,
      to: dateRange?.to ? new Date(dateRange.to) : defaultTo
    };
  }, [dateRange]);

  const { data: employees, isLoading } = api.admin.getEmployees.useQuery(
    {
      search: searchState,
      limit: ITEMS_PER_PAGE,
      offset: (page - 1) * ITEMS_PER_PAGE,
      dateRange: {
        from: effectiveDateRange.from.toISOString(),
        to: effectiveDateRange.to.toISOString()
      },
      currency: selectedCurrency
    },
    {
      keepPreviousData: true,
    }
  );

  const { data: workTimeData } = api.admin.getEmployeeWorkTime.useQuery(
    { userId: selectedEmployee || 0 },
    { enabled: !!selectedEmployee }
  );

  const { data: comments, refetch: refetchComments } = api.admin.getEmployeeComments.useQuery(
    { employeeId: selectedEmployee ?? 0 },
    { enabled: !!selectedEmployee }
  );

  const { data: employeeExpenses, refetch: refetchExpenses } = api.admin.getEmployeeExpenses.useQuery(
    { employeeId: selectedEmployee || 0 },
    { enabled: showExpensesDialog && !!selectedEmployee }
  );

  const updateDeposit = api.admin.updateEmployeeDeposit.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
      setEditingDeposit(null);
    }
  });

  const updateSalary = api.admin.updateEmployeeSalary.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
      setEditingSalary(null);
    }
  });

  useEffect(() => {
    console.log(employees);
  }, [employees]);

  const updatePhoto = api.admin.updateEmployeePhoto.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
      setShowPhotoDialog(false);
      setNewPhotoUrl("");
    }
  });

  const addComment = api.admin.addEmployeeComment.useMutation({
    onSuccess: () => {
      refetchComments();
      setNewComment("");
    },
  });

  const addExpense = api.admin.addEmployeeExpense.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
      setNewExpense({ amount: 0, type: "SCAM", description: "", currency: "USDT" });
      setShowExpensesDialog(false);
    }
  });

  const deleteComment = api.admin.deleteComment.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
    }
  });

  const editCommentMutation = api.admin.editComment.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
      setEditingComment(null);
    }
  });

  const deleteExpense = api.admin.deleteExpense.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
    }
  });

  const editExpenseMutation = api.admin.editExpense.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
      setEditingExpense(null);
    }
  });

  const formatWorkTime = (employee: any) => {
    if (!employee.lastWorkTime) return "Нет данных";
    if (!employee.lastWorkTime.endTime) {
      return `В работе с ${format(new Date(employee.lastWorkTime.startTime), "dd.MM.yyyy HH:mm")}`;
    }
    return `${format(new Date(employee.lastWorkTime.startTime), "dd.MM.yyyy HH:mm")} - ${format(new Date(employee.lastWorkTime.endTime), "dd.MM.yyyy HH:mm")}`;
  };

  const formatTransactions = (employee: any) => {
    const p2pCount = Array.isArray(employee.P2PTransaction) ? employee.P2PTransaction.filter((tx: any) => tx.processed).length : 0;
    const gateCount = Array.isArray(employee.gateTransactions) ? employee.gateTransactions.length : 0;
    const matchCount = Array.isArray(employee.TransactionMatch) ? employee.TransactionMatch.length : 0;
    return `${p2pCount}/${gateCount}/${matchCount}`;
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const calculateGrossProfit = (employee: any) => {
    let profit = 0;
    
    // P2P transactions
    if (Array.isArray(employee.P2PTransaction)) {
      employee.P2PTransaction.forEach((tx: any) => {
        profit += Number(tx.amount) || 0;
      });
    }

    // Gate transactions
    if (Array.isArray(employee.gateTransactions)) {
      employee.gateTransactions.forEach((tx: any) => {
        profit += Number(tx.totalUsdt) || 0;
      });
    }

    return profit;
  };

  const calculateSalary = (employee: any) => {
    const grossProfit = calculateGrossProfit(employee);
    return grossProfit * (Number(employee.salaryPercentage) || 0);
  };

  useEffect(() => {
    if (selectedEmployee && showCommentsDialog) {
      refetchComments();
    }
  }, [selectedEmployee, showCommentsDialog]);

  useEffect(() => {
    if (selectedEmployee && showExpensesDialog) {
      refetchExpenses();
    }
  }, [selectedEmployee, showExpensesDialog]);

  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (!employees || employees.length === 0) {
    return <div className="text-center py-4">No employees found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Поиск сотрудников..."
          value={searchState}
          onChange={(e) => setSearchState(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={selectedCurrency}
          onValueChange={(value: 'USDT' | 'RUB') => setSelectedCurrency(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Выберите валюту" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USDT">USDT</SelectItem>
            <SelectItem value="RUB">RUB</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Фото</TableHead>
              <TableHead>ФИО</TableHead>
              <TableHead>Логин</TableHead>
              <TableHead>ЗП Коэф.</TableHead>
              <TableHead>Заказы</TableHead>
              <TableHead>Время работы</TableHead>
              <TableHead>Валовая прибыль</TableHead>
              <TableHead>ЗП</TableHead>
              <TableHead>Депозит</TableHead>
              <TableHead>Комментарии/Скам/Ошибки</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee: Employee) => (
              <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <div 
                    className="relative h-10 w-10 cursor-pointer" 
                    onClick={() => {
                      setSelectedEmployee(employee.id);
                      setNewPhotoUrl(employee.passportPhoto || "");
                      setShowPhotoDialog(true);
                    }}
                  >
                    {employee.passportPhoto ? (
                      <Image
                        src={employee.passportPhoto}
                        alt={`${employee.firstName} ${employee.lastName}`}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <CameraIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {employee.firstName || ''} {employee.lastName || ''}
                </TableCell>
                <TableCell>{employee.login}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {editingSalary?.id === employee.id ? (
                      <Input
                        type="number"
                        value={editingSalary.value}
                        onChange={(e) => setEditingSalary({ ...editingSalary, value: parseFloat(e.target.value) })}
                        onBlur={() => updateSalary.mutate({ id: employee.id, salaryPercentage: editingSalary.value })}
                        className="w-20"
                        step="0.1"
                        min="0"
                        max="1"
                      />
                    ) : (
                      <>
                        {employee.salaryPercentage}
                        <Button variant="ghost" size="sm" onClick={() => setEditingSalary({ id: employee.id, value: employee.salaryPercentage || 0 })}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span>P2P: {employee.p2pTransactions?.length || 0}</span>
                    <span>Gate: {employee.gateTransactions?.length || 0}</span>
                    <span>Match: {employee.matchTransactionsCount || 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div 
                    className="cursor-pointer hover:text-blue-500"
                    onClick={() => {
                      setSelectedEmployee(employee.id);
                      setShowWorkTimeDialog(true);
                    }}
                  >
                    {formatWorkTime(employee)}
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(employee.grossProfit || 0, selectedCurrency)}</TableCell>
                <TableCell>{formatCurrency(employee.salary || 0, selectedCurrency)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {editingDeposit?.id === employee.id ? (
                      <Input
                        type="number"
                        value={editingDeposit.value}
                        onChange={(e) => setEditingDeposit({ ...editingDeposit, value: parseFloat(e.target.value) })}
                        onBlur={() => updateDeposit.mutate({ id: employee.id, deposit: editingDeposit.value })}
                        className="w-24"
                      />
                    ) : (
                      <>
                        {formatCurrency(employee.deposit || 0, selectedCurrency)}
                        <Button variant="ghost" size="sm" onClick={() => setEditingDeposit({ id: employee.id, value: employee.deposit || 0 })}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span>Comments: {employee.commentsCount || 0}</span>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedEmployee(employee.id);
                        setShowCommentsDialog(true);
                        refetchComments();
                      }}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Scam/Errors: {employeeExpenses?.lenght || 0}</span>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedEmployee(employee.id);
                        setShowExpensesDialog(true);
                        refetchExpenses();
                      }}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/admin/employees/${employee.id}`)}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-center space-x-2 py-4">
        <Button
          variant="outline"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <span className="py-2">
          Page {page} of {Math.ceil((employees?.length || 0) / ITEMS_PER_PAGE)}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage(p => Math.min(Math.ceil((employees?.length || 0) / ITEMS_PER_PAGE), p + 1))}
          disabled={page === Math.ceil((employees?.length || 0) / ITEMS_PER_PAGE)}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обновить фото</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              {newPhotoUrl && (
                <Image
                  src={newPhotoUrl}
                  alt="Preview"
                  width={200}
                  height={200}
                  className="rounded-lg object-cover mb-4"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const response = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await response.json();
                      setNewPhotoUrl(data.url);
                    } catch (error) {
                      console.error("Error uploading file:", error);
                    }
                  }
                }}
                className="mb-4"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPhotoDialog(false);
                  setNewPhotoUrl("");
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={() => {
                  if (selectedEmployee && newPhotoUrl) {
                    updatePhoto.mutate({
                      id: selectedEmployee,
                      passportPhoto: newPhotoUrl,
                    });
                  }
                }}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Комментарии</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {comments?.map((comment) => (
                <div key={comment.id} className="border-b pb-2">
                  <p className="whitespace-pre-wrap">{comment.content}</p>
                  <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
                    <span>{format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm")}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="space-y-4 mt-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Добавить комментарий..."
            />
            <Button 
              onClick={async () => {
                if (!selectedEmployee || !newComment.trim()) return;
                await addComment.mutateAsync({
                  employeeId: selectedEmployee,
                  content: newComment,
                });
              }}
              disabled={!newComment.trim()}
            >
              Добавить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expenses Dialog */}
      <Dialog open={showExpensesDialog} onOpenChange={setShowExpensesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Скам/Ошибки</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                  placeholder="Сумма"
                />
                <Select
                  value={newExpense.type}
                  onValueChange={(value) => setNewExpense({ ...newExpense, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCAM">Скам</SelectItem>
                    <SelectItem value="ERROR">Ошибка</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={newExpense.currency}
                  onValueChange={(value: 'USDT' | 'RUB') => setNewExpense({ ...newExpense, currency: value })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Валюта" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="RUB">RUB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Описание..."
              />
              <Button onClick={async () => {
                if (!selectedEmployee || !newExpense.amount || !newExpense.description.trim()) return;
                await addExpense.mutateAsync({
                  employeeId: selectedEmployee,
                  ...newExpense
                });
                setNewExpense({
                  amount: 0,
                  type: "SCAM",
                  description: "",
                  currency: "USDT"
                });
                await refetchExpenses();
              }}>
                Добавить
              </Button>
            </div>
            <ScrollArea className="h-[400px]">
              {employeeExpenses?.map((expense) => (
                <div key={expense.id} className="flex items-start gap-2 p-4 border-b">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={expense.type === 'SCAM' ? 'destructive' : 'secondary'}>
                        {expense.type === 'SCAM' ? 'Скам' : 'Ошибка'}
                      </Badge>
                      <span className="font-medium">{formatCurrency(expense.amount, expense.currency)}</span>
                    </div>
                    <p className="whitespace-pre-wrap mb-2">{expense.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{format(new Date(expense.createdAt), "dd.MM.yyyy")}</span>
                      <span>•</span>
                      <span>{format(new Date(expense.createdAt), "HH:mm")}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Удалить эту запись?")) {
                        deleteExpense.mutate({ expenseId: expense.id });
                      }
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
