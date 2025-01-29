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
import { CameraIcon, PencilIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"

const ITEMS_PER_PAGE = 6;

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
    description: ""
  });
  const [showWorkTimeDialog, setShowWorkTimeDialog] = useState(false);
  const [selectedWorkTime, setSelectedWorkTime] = useState<any>(null);

  const effectiveDateRange = useMemo(
    () => ({
      from: dateRange?.from ? new Date(dateRange.from).toISOString() : new Date(0).toISOString(),
      to: dateRange?.to ? new Date(dateRange.to).toISOString() : new Date().toISOString(),
    }),
    [dateRange?.from, dateRange?.to],
  );

  const { data, isLoading } = api.admin.getEmployees.useQuery({
    search: searchState,
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
    dateRange: effectiveDateRange,
  });

  const { data: workTimeData } = api.admin.getEmployeeWorkTime.useQuery(
    { userId: selectedEmployee || 0 },
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
    console.log(data);
  }, [data]);

  const updatePhoto = api.admin.updateEmployeePhoto.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
      setShowPhotoDialog(false);
      setNewPhotoUrl("");
    }
  });

  const addComment = api.admin.addEmployeeComment.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
      setNewComment("");
      setShowCommentsDialog(false);
    }
  });

  const addExpense = api.admin.addEmployeeExpense.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate();
      setNewExpense({ amount: 0, type: "SCAM", description: "" });
      setShowExpensesDialog(false);
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
    return `${employee.p2pTransactions || 0}/${employee.gateTransactions || 0}/${employee.matchTransactions || 0}`;
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-4">No employees found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Input
          placeholder="Поиск сотрудников..."
          value={searchState}
          onChange={(e) => setSearchState(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Фото</TableHead>
              <TableHead>ФИО</TableHead>
              <TableHead>Логин</TableHead>
              <TableHead>ЗП Коэф.</TableHead>
              <TableHead>Заказы (P2P/Gate/Match)</TableHead>
              <TableHead>Время работы</TableHead>
              <TableHead>Валовая прибыль</TableHead>
              <TableHead>ЗП</TableHead>
              <TableHead>Депозит</TableHead>
              <TableHead>Скам/Ошибки</TableHead>
              <TableHead>Комментарии</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((employee) => (
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
                <TableCell>{formatTransactions(employee)}</TableCell>
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
                <TableCell>{formatCurrency(employee.grossProfit || 0)}</TableCell>
                <TableCell>{formatCurrency(employee.salary || 0)}</TableCell>
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
                        {formatCurrency(employee.deposit || 0)}
                        <Button variant="ghost" size="sm" onClick={() => setEditingDeposit({ id: employee.id, value: employee.deposit || 0 })}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {employee.scamExpenses || 0}/{employee.errorExpenses || 0}
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedEmployee(employee.id);
                      setShowExpensesDialog(true);
                    }}>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {employee.commentsCount || 0}
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedEmployee(employee.id);
                      setShowCommentsDialog(true);
                    }}>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
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
          Page {page} of {Math.ceil((data?.length || 0) / ITEMS_PER_PAGE)}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage(p => Math.min(Math.ceil((data?.length || 0) / ITEMS_PER_PAGE), p + 1))}
          disabled={page === Math.ceil((data?.length || 0) / ITEMS_PER_PAGE)}
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

      <Dialog open={showExpensesDialog} onOpenChange={setShowExpensesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Управление расходами</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Сумма"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
              />
              <select
                className="border rounded p-2"
                value={newExpense.type}
                onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value as "SCAM" | "ERROR" })}
              >
                <option value="SCAM">SCAM</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>
            <Textarea
              placeholder="Описание"
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
            />
            <Button
              onClick={() => {
                if (selectedEmployee) {
                  addExpense.mutate({
                    userId: selectedEmployee,
                    ...newExpense,
                  });
                }
              }}
            >
              Добавить расход
            </Button>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">История расходов</h3>
              <div className="space-y-2">
                {data
                  .find(e => e.id === selectedEmployee)
                  ?.employeeExpenses?.map((expense: any) => (
                    <div key={expense.id} className="border p-2 rounded">
                      <div className="flex justify-between">
                        <span>{expense.type}</span>
                        <span>{formatCurrency(expense.amount)}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {expense.description}
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(new Date(expense.createdAt), 'dd.MM.yyyy HH:mm')}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Комментарии</DialogTitle>
          </DialogHeader>
          <div>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Новый комментарий..."
              className="min-h-[100px]"
            />
            <Button
              className="mt-2"
              onClick={() => {
                if (selectedEmployee && newComment) {
                  addComment.mutate({
                    userId: selectedEmployee,
                    text: newComment
                  });
                }
              }}
            >
              Добавить
            </Button>
          </div>
          <div className="mt-4 max-h-[400px] overflow-y-auto">
            <h3 className="font-semibold mb-2">История комментариев</h3>
            <div className="space-y-2">
              {data
                .find(e => e.id === selectedEmployee)
                ?.comments?.map((comment: any) => (
                  <div key={comment.id} className="border p-3 rounded">
                    <div className="text-sm text-gray-600 mb-1">
                      {format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm")}
                      {comment.author && ` • ${comment.author.firstName} ${comment.author.lastName}`}
                    </div>
                    <div className="whitespace-pre-wrap">{comment.text}</div>
                  </div>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkTimeDialog} onOpenChange={setShowWorkTimeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>История времени работы</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {workTimeData?.map((wt: any) => (
              <div key={wt.id} className="border p-3 rounded">
                <div className="font-semibold">
                  {format(new Date(wt.startTime), "dd.MM.yyyy HH:mm")} - 
                  {wt.endTime ? format(new Date(wt.endTime), "dd.MM.yyyy HH:mm") : "В работе"}
                </div>
                {wt.report && (
                  <div className="mt-2 text-sm text-gray-600">
                    <div className="font-medium">Отчет:</div>
                    <div className="whitespace-pre-wrap">{wt.report.content}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
