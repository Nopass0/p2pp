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
import { cn, formatCurrency } from "@/lib/utils"
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
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { EmployeeDetailsDialog } from "./EmployeeDetailsDialog"

const ITEMS_PER_PAGE = 24;

interface Employee {
  id: number;
  login: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  deposit: number;
  salaryPercentage: number;
  gateTransactions: any[];
  P2PTransaction: any[];
  matchTransactionsCount?: number;
  matchTransactions: any[];
  grossProfit: number;
  salary: number;
  commentsCount?: number;
  scamErrorsCount?: number;
  errorsCount?: number;
  employeeExpenses: any[];

  workTimes: any[];
}

interface EmployeeTableProps {
  limit?: number
  search?: string
  dateRange?: {
    from: string
    to: string
  }
}

export function EmployeeTable({ limit = 10, search = "" }: EmployeeTableProps) {
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
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<Employee | null>(null);

  const [fromDate, setFromDate] = useState<Date>(new Date(new Date().setHours(0, 0, 0, 0)))
  const [toDate, setToDate] = useState<Date>(new Date(new Date().setHours(23, 59, 59, 999)))

  // Fetch aggregated stats
  const { data: aggregatedStats } = api.admin.getAggregatedStats.useQuery({
    dateRange: {
      from: fromDate.toISOString(),
      to: toDate.toISOString()
    }
  }, {
    refetchOnWindowFocus: false
  });

  // Create a default date range if none provided
  const effectiveDateRange = useMemo(() => {
    const defaultFrom = new Date(0);
    const defaultTo = new Date();
    
    return {
      from: fromDate,
      to: toDate
    };
  }, [fromDate, toDate]);

  const { data: employees, isLoading } = api.admin.getEmployees.useQuery(
    {
      limit,
      offset: (page - 1) * ITEMS_PER_PAGE,
      search: searchState,
      dateRange: {
        from: effectiveDateRange.from.toISOString(),
        to: effectiveDateRange.to.toISOString()
      },
      currency: selectedCurrency,
      includeExpenses: true
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
    { userId: selectedEmployee ?? 0 },
    { enabled: !!selectedEmployee }
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

  const addExpense = api.admin.addExpense.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
      setNewExpense({
        amount: 0,
        type: "SCAM",
        description: "",
        currency: "USDT"
      });
      setShowExpensesDialog(false);
    }
  });

  const deleteExpense = api.admin.deleteExpense.useMutation({
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

  const editExpenseMutation = api.admin.editExpense.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
      setEditingExpense(null);
    }
  });

  const formatWorkTime = (employee: any) => {
    if (!employee.workTimes || employee.workTimes.length === 0) return "Нет данных";
    const lastWorkTime = employee.workTimes[employee.workTimes.length - 1];
    if (!lastWorkTime.endTime) {
      return `В работе с ${format(new Date(lastWorkTime.startTime), "HH:mm dd.MM")}`;
    }
    return `${format(new Date(lastWorkTime.startTime), "HH:mm")}-${format(new Date(lastWorkTime.endTime), "HH:mm")}`;
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
      // No need to refetch since we have the data
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
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <DateTimePicker
            date={fromDate}
            setDate={setFromDate}
            label="С"
          />
          <DateTimePicker
            date={toDate}
            setDate={setToDate}
            label="По"
          />
        </div>
      </div>

      {/* Aggregated Statistics */}
      {aggregatedStats && (
        <div className="bg-secondary/20 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>Валовый расход: {aggregatedStats.grossExpense.toFixed(2)} USDT</div>
              <div>Валовый доход: {aggregatedStats.grossIncome.toFixed(2)} USDT</div>
              <div>Валовая прибыль: {aggregatedStats.grossProfit.toFixed(2)} USDT</div>
              <div>Процент от выручки: {aggregatedStats.profitPercentage.toFixed(2)}%</div>
            </div>
            <div className="space-y-2">
              <div>Количество метченных ордеров: {aggregatedStats.matchedCount}</div>
              <div>Средняя прибыль на ордер: {aggregatedStats.profitPerOrder.toFixed(2)} USDT</div>
              <div>Средний расход на ордер: {aggregatedStats.expensePerOrder.toFixed(2)} USDT</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <Input
          placeholder="Search by login or name..."
          value={searchState}
          onChange={(e) => setSearchState(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center space-x-2">
        </div>
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
              <TableHead>Детали</TableHead>
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
                  <div className={cn("flex flex-row gap-1", employee.P2PTransaction?.length === employee.gateTransactions?.length && employee.p2pTransactions?.length === employee.matchTransactionsCount ? "bg-green-500/50 rounded-lg p-1 items-center flex justify-center" : "bg-muted rounded-lg p-1 items-center flex justify-center")} >
                    <span> {employee.P2PTransaction?.length || 0}</span>/
                    <span >{employee.gateTransactions?.length || 0}</span>/
                    <span> {employee.matchTransactionsCount || 0}</span>
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
                      <span>Scam/Errors: {employee.employeeExpenses?.length || 0}</span>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedEmployee(employee.id);
                        setShowExpensesDialog(true);
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
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setSelectedEmployeeForDetails(employee);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </div>
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
                    {/* <SelectItem value="RUB">RUB</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Описание..."
              />
              <Button onClick={async () => {
                if (!selectedEmployee) return;
                
                await addExpense.mutateAsync({
                  employeeId: selectedEmployee,
                  amount: newExpense.amount,
                  type: newExpense.type as "SCAM" | "ERROR",
                  description: newExpense.description,
                  currency: "USDT"
                });
              }}>
                Add
              </Button>
            </div>
            <ScrollArea className="h-[400px]">
              {selectedEmployee && employees.find((employee) => employee.id === selectedEmployee)?.employeeExpenses?.map((expense) => (
                <div key={expense.id} className="flex items-start gap-2 p-4 border-b">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={expense.type === 'SCAM' ? 'destructive' : 'secondary'}>
                        {expense.type}
                      </Badge>
                      <span className="font-medium">
                        {formatCurrency(expense.amount, expense.currency)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingExpense(expense);
                        }}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          deleteExpense.mutate({ id: expense.id });
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {expense.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{format(new Date(expense.createdAt), "dd.MM.yyyy HH:mm")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Work Time Dialog */}
      <Dialog open={showWorkTimeDialog} onOpenChange={setShowWorkTimeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>История работы</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {selectedEmployee && employees.find((employee) => employee.id === selectedEmployee)?.workTimes?.map((workTime) => (
                <div key={workTime.id} className="border-b pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {format(new Date(workTime.startTime), "dd.MM.yyyy")}
                      </div>
                      <div className="text-muted-foreground">
                        {format(new Date(workTime.startTime), "HH:mm")} - {workTime.endTime ? format(new Date(workTime.endTime), "HH:mm") : "В работе"}
                      </div>
                      {workTime.duration && (
                        <div className="text-sm text-muted-foreground">
                          Длительность: {Math.round(workTime.duration * 24 * 60)} мин
                        </div>
                      )}
                    </div>
                  </div>
                  {workTime.report && (
                    <div className="mt-2">
                      <div className="text-sm font-medium">Отчет:</div>
                      <p className="text-sm whitespace-pre-wrap">{workTime.report.content}</p>
                      {workTime.report.files && workTime.report.files.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium">Файлы:</div>
                          <div className="flex flex-wrap gap-2">
                            {workTime.report.files.map((file) => (
                              <a
                                key={file.id}
                                href={`/${file.path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-500 hover:underline"
                              >
                                {file.filename}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {selectedEmployeeForDetails && (
        <EmployeeDetailsDialog
          isOpen={showDetailsDialog}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedEmployeeForDetails(null);
          }}
          employee={selectedEmployeeForDetails}
          fromDate={fromDate}
          toDate={toDate}
          onDateChange={(from, to) => {
            setFromDate(from);
            setToDate(to);
          }}
        />
      )}
    </div>
  );
}
