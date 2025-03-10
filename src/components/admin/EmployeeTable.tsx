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
import {
  CameraIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Trash,
} from "lucide-react"
import Image from "next/image"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { EmployeeDetailsDialog } from "./EmployeeDetailsDialog"
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"

const ITEMS_PER_PAGE = 24

interface Employee {
  id: number
  login: string
  firstName: string | null
  lastName: string | null
  middleName: string | null
  deposit: number
  salaryPercentage: number
  gateTransactions: any[]
  P2PTransaction: any[]
  matchTransactionsCount?: number
  matchTransactions: any[]
  grossProfit: number
  salary: number
  commentsCount?: number
  scamErrorsCount?: number
  errorsCount?: number
  employeeExpenses: any[]
  workTimes: any[]
  passportPhoto?: string
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
  const router = useRouter()
  const utils = api.useContext()

  const [page, setPage] = useState(1)
  const [searchState, setSearchState] = useState(search)
  // Новый фильтр: "all" — все, "online" — в работе, "offline" — не в работе
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all")
  const [selectedCurrency, setSelectedCurrency] = useState<'USDT' | 'RUB'>('USDT')
  const [showPhotoDialog, setShowPhotoDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null)
  const [newPhotoUrl, setNewPhotoUrl] = useState("")
  const [editingDeposit, setEditingDeposit] = useState<{ id: number; value: number } | null>(null)
  const [editingSalary, setEditingSalary] = useState<{ id: number; value: number } | null>(null)
  const [showExpensesDialog, setShowExpensesDialog] = useState(false)
  const [showCommentsDialog, setShowCommentsDialog] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [newExpense, setNewExpense] = useState({
    amount: 0,
    type: "SCAM",
    description: "",
    currency: "USDT"
  })
  const [showWorkTimeDialog, setShowWorkTimeDialog] = useState(false)
  const [selectedWorkTime, setSelectedWorkTime] = useState<any>(null)
  const [editingComment, setEditingComment] = useState<{ id: number; content: string } | null>(null)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<Employee | null>(null)
  const [editingName, setEditingName] = useState<{ id: number; firstName: string; lastName: string } | null>(null)
  const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
  })

  // Create a default date range if none provided
  const effectiveDateRange = useMemo(() => {
    return {
      from: fromDate,
      to: toDate
    }
  }, [fromDate, toDate])

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
  )

  // Фильтруем сотрудников по статусу (онлайн/оффлайн)
  const filteredEmployees = useMemo(() => {
    return employees?.filter((employee) => {
      if (statusFilter === "online") {
        // Онлайн: есть данные о работе и у последней записи отсутствует endTime
        return employee.workTimes &&
          employee.workTimes.length > 0 &&
          !employee.workTimes[employee.workTimes.length - 1].endTime
      } else if (statusFilter === "offline") {
        // Оффлайн: либо нет данных, либо в последней записи присутствует endTime
        return !employee.workTimes ||
          employee.workTimes.length === 0 ||
          employee.workTimes[employee.workTimes.length - 1].endTime
      }
      return true
    }) || []
  }, [employees, statusFilter])

  // Остальные запросы и мутации остаются без изменений...
  const { data: workTimeData } = api.admin.getEmployeeWorkTime.useQuery(
    { userId: selectedEmployee || 0 },
    { enabled: !!selectedEmployee }
  )

  const { data: comments, refetch: refetchComments } = api.admin.getEmployeeComments.useQuery(
    { userId: selectedEmployee ?? 0 },
    { enabled: !!selectedEmployee }
  )

  const updateDeposit = api.admin.updateEmployeeDeposit.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate()
      setEditingDeposit(null)
    }
  })

  const updateSalary = api.admin.updateEmployeeSalary.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate()
      setEditingSalary(null)
    }
  })

  useEffect(() => {
    console.log(employees)
  }, [employees])

  const updatePhoto = api.admin.updateEmployeePhoto.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate()
      setShowPhotoDialog(false)
      setNewPhotoUrl("")
    }
  })

  const addComment = api.admin.addEmployeeComment.useMutation({
    onSuccess: () => {
      refetchComments()
      setNewComment("")
    },
  })

  const addExpense = api.admin.addExpense.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate()
      setNewExpense({
        amount: 0,
        type: "SCAM",
        description: "",
        currency: "USDT"
      })
      setShowExpensesDialog(false)
    }
  })

  const deleteExpense = api.admin.deleteExpense.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate()
    }
  })

  const editCommentMutation = api.admin.editComment.useMutation({
    onSuccess: () => {
      utils.admin.getEmployeeComments.invalidate({ userId: selectedEmployee ?? 0 })
      utils.admin.getEmployees.invalidate()
      setEditingComment(null)
    }
  })

  const deleteCommentMutation = api.admin.deleteComment.useMutation({
    onSuccess: () => {
      utils.admin.getEmployeeComments.invalidate({ userId: selectedEmployee ?? 0 })
      utils.admin.getEmployees.invalidate()
    }
  })

  const updateNameMutation = api.admin.updateEmployeeName.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate()
      setEditingName(null)
    }
  })

  const deleteEmployeeMutation = api.admin.deleteEmployee.useMutation({
    onSuccess: () => {
      utils.admin.getEmployees.invalidate()
      setEmployeeToDelete(null)
      setShowDetailsDialog(false)
      setDeleteError(null)
    },
    onError: (error) => {
      console.error("Error deleting employee:", error)
      setDeleteError(error.message || "Не удалось удалить сотрудника. Пожалуйста, попробуйте снова.")
    }
  })

  const formatWorkTime = (employee: any) => {
    if (!employee.workTimes || employee.workTimes.length === 0) return "Нет данных"
    const lastWorkTime = employee.workTimes[employee.workTimes.length - 1]
    if (!lastWorkTime.endTime) {
      return `В работе с ${format(new Date(lastWorkTime.startTime), "HH:mm dd.MM")}`
    }
    return `${format(new Date(lastWorkTime.startTime), "HH:mm")}-${format(new Date(lastWorkTime.endTime), "HH:mm")}`
  }

  // Другие вспомогательные функции остаются без изменений...
  const formatTransactions = (employee: any) => {
    const p2pCount = Array.isArray(employee.P2PTransaction) ? employee.P2PTransaction.filter((tx: any) => tx.processed).length : 0
    const gateCount = Array.isArray(employee.gateTransactions) ? employee.gateTransactions.length : 0
    const matchCount = Array.isArray(employee.TransactionMatch) ? employee.TransactionMatch.length : 0
    return `${p2pCount}/${gateCount}/${matchCount}`
  }

  const formatCurrencyValue = (value: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const calculateGrossProfit = (employee: any) => {
    const matchedTransactions = (employee.matchTransactions || []).filter((tx: any) => {
      const p2pDate = tx.P2PTransaction?.completedAt ? new Date(tx.P2PTransaction.completedAt) : null
      const gateDate = tx.GateTransaction?.approvedAt ? new Date(tx.GateTransaction.approvedAt) : null

      return (p2pDate && p2pDate >= fromDate && p2pDate <= toDate) ||
             (gateDate && gateDate >= fromDate && gateDate <= toDate)
    })

    const commission = 1.009
    const grossExpense = matchedTransactions.reduce((sum: number, tx: any) => 
      sum + (tx.P2PTransaction?.amount ?? 0), 0) * commission

    const grossIncome = matchedTransactions.reduce((sum: number, tx: any) => 
      sum + (tx.GateTransaction?.totalUsdt ?? 0), 0)

    return grossIncome - grossExpense
  }

  const calculateSalary = (employee: any) => {
    const grossProfit = calculateGrossProfit(employee)
    return grossProfit * (Number(employee.salaryPercentage) || 0)
  }

  const getLatestMatchDetails = (employee: any) => {
    if (!employee.matchTransactions || employee.matchTransactions.length === 0) {
      return { phone: '-', idexId: '-' }
    }
    const sortedTransactions = [...employee.matchTransactions].sort((a, b) => {
      const dateA = a.P2PTransaction?.completedAt ? new Date(a.P2PTransaction.completedAt) : 
                   a.GateTransaction?.approvedAt ? new Date(a.GateTransaction.approvedAt) : new Date(0)
      const dateB = b.P2PTransaction?.completedAt ? new Date(b.P2PTransaction.completedAt) : 
                   b.GateTransaction?.approvedAt ? new Date(b.GateTransaction.approvedAt) : new Date(0)
      return dateB.getTime() - dateA.getTime()
    })
    const latestMatch = sortedTransactions[0]
    const phone = latestMatch.P2PTransaction?.currentTgPhone || '-'
    const idexId = latestMatch.GateTransaction?.idexId || '-'
    return { phone, idexId }
  }

  useEffect(() => {
    if (selectedEmployee && showCommentsDialog) {
      refetchComments()
    }
  }, [selectedEmployee, showCommentsDialog])

  useEffect(() => {
    if (selectedEmployee && showExpensesDialog) {
      // Нет необходимости в повторном запросе, так как данные уже загружены
    }
  }, [selectedEmployee, showExpensesDialog])

  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>
  }

  if (!employees || employees.length === 0) {
    return <div className="text-center py-4">No employees found</div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Валовый расход</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregatedStats.grossExpense.toFixed(2)} USDT</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Валовый доход</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregatedStats.grossIncome.toFixed(2)} USDT</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Валовая прибыль</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregatedStats.grossProfit.toFixed(2)} USDT</div>
              <p className="text-xs text-muted-foreground">
                {aggregatedStats.profitPercentage.toFixed(2)}% от выручки
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Метченные ордера</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregatedStats.matchedCount}</div>
              <p className="text-xs text-muted-foreground">
                Ср. прибыль: {aggregatedStats.profitPerOrder.toFixed(2)} USDT
              </p>
              <p className="text-xs text-muted-foreground">
                Ср. расход: {aggregatedStats.expensePerOrder.toFixed(2)} USDT
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-between items-center">
        <Input
          placeholder="Search by login or name..."
          value={searchState}
          onChange={(e) => setSearchState(e.target.value)}
          className="max-w-sm"
        />
        {/* Фильтр по статусу */}
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "online" | "offline")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Все" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="online">Онлайн</SelectItem>
            <SelectItem value="offline">Оффлайн</SelectItem>
          </SelectContent>
        </Select>
        {/* Можно оставить или убрать выбор валюты */}
        {/* <Select
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
        </Select> */}
      </div>

      {/* Обновлённые стили таблицы: обёртка с overflow, скруглением и бордером */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Фото</TableHead>
              <TableHead>ФИО</TableHead>
              <TableHead>Логин</TableHead>
              <TableHead>ЗП Коэф.</TableHead>
              <TableHead className="whitespace-nowrap items-center gap-1 flex">
                <span className="text-blue-500">P2P</span>
                <span className="text-yellow-500">IDEX</span>
                <span className="text-red-500">Bybit</span>
                <span className="text-green-500">Match</span>
              </TableHead>
              <TableHead>Время работы</TableHead>
              <TableHead>Валовая прибыль</TableHead>
              <TableHead>ЗП</TableHead>
              <TableHead>Депозит</TableHead>
              <TableHead>Комментарии/Скам/Ошибки</TableHead>
              <TableHead className="whitespace-nowrap items-center gap-1 flex">
                <span className="text-blue-500">Номер телефона</span>
                <span className="text-yellow-500">ID IDEX</span>
              </TableHead>
              <TableHead>Детали</TableHead>
              <TableHead>Удалить</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((employee: Employee) => (
              <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <div 
                    className="relative h-10 w-10 cursor-pointer" 
                    onClick={() => {
                      setSelectedEmployee(employee.id)
                      setNewPhotoUrl(employee.passportPhoto || "")
                      setShowPhotoDialog(true)
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
                  {editingName?.id === employee.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingName.firstName}
                        onChange={(e) => setEditingName({ ...editingName, firstName: e.target.value })}
                        placeholder="First Name"
                        className="w-24"
                      />
                      <Input
                        value={editingName.lastName}
                        onChange={(e) => setEditingName({ ...editingName, lastName: e.target.value })}
                        placeholder="Last Name"
                        className="w-24"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          updateNameMutation.mutate({
                            id: employee.id,
                            firstName: editingName.firstName || null,
                            lastName: editingName.lastName || null,
                          })
                        }}
                      >
                        ✓
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingName(null)}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{employee.firstName || ''} {employee.lastName || ''}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingName({
                          id: employee.id,
                          firstName: employee.firstName || '',
                          lastName: employee.lastName || ''
                        })}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
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
                  <div className={cn("flex flex-row gap-1", "rounded-lg p-1 items-center flex justify-center")}>
                    <span className="rounded-lg p-1 items-center flex justify-center bg-muted px-2 border-t-2 border-blue-500">
                      {employee.P2PTransaction?.length || 0}
                    </span>
                    <span className="rounded-lg p-1 items-center flex justify-center bg-muted px-2 border-t-2 border-yellow-500">
                      {employee.gateTransactions?.length || 0}
                    </span>
                    <span className="rounded-lg p-1 items-center flex justify-center bg-muted px-2 border-t-2 border-red-500">
                      {employee.bybitTransactions?.length || 0}
                    </span>
                    <span className="rounded-lg p-1 items-center flex justify-center bg-muted px-2 border-t-2 border-green-500">
                      {employee.matchTransactionsCount || 0}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div 
                    className="cursor-pointer hover:text-blue-500"
                    onClick={() => {
                      setSelectedEmployee(employee.id)
                      setShowWorkTimeDialog(true)
                    }}
                  >
                    {formatWorkTime(employee)}
                  </div>
                </TableCell>
                <TableCell>{formatCurrencyValue(calculateGrossProfit(employee), selectedCurrency)}</TableCell>
                <TableCell>{formatCurrencyValue(calculateSalary(employee), selectedCurrency)}</TableCell>
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
                        {formatCurrencyValue(employee.deposit || 0, selectedCurrency)}
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
                      <span className="bg-muted px-2 py-1 rounded-md">Комментарии: {employee.commentsCount || 0}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(employee.id)
                          setShowCommentsDialog(true)
                          refetchComments()
                        }}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-muted px-2 py-1 rounded-md">Скам/Ошибки: {employee.employeeExpenses?.length || 0}</span>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedEmployee(employee.id)
                        setShowExpensesDialog(true)
                      }}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const { phone, idexId } = getLatestMatchDetails(employee)
                      return (
                        <>
                          <span className="bg-muted rounded-md px-2 py-1 border-t-2 border-blue-500">{phone}</span>
                          <span className="bg-muted rounded-md px-2 py-1 border-t-2 border-yellow-500">{idexId}</span>
                        </>
                      )
                    })()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setSelectedEmployeeForDetails(employee)
                        setShowDetailsDialog(true)
                      }}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setEmployeeToDelete(employee.id)}
                    >
                      Удалить
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

      {/* Далее идут диалоги для фото, комментариев, расходов, отчётов по рабочему времени и подтверждения удаления */}
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
                  const file = e.target.files?.[0]
                  if (file) {
                    const formData = new FormData()
                    formData.append("file", file)
                    try {
                      const response = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                      })
                      const data = await response.json()
                      setNewPhotoUrl(data.url)
                    } catch (error) {
                      console.error("Error uploading file:", error)
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
                  setShowPhotoDialog(false)
                  setNewPhotoUrl("")
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
                    })
                  }
                }}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Комментарии */}
      <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Комментарии</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {comments?.map((comment) => (
                <div key={comment.id} className="border-b pb-2">
                  {editingComment?.id === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingComment.content}
                        onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            await editCommentMutation.mutateAsync({
                              id: comment.id,
                              content: editingComment.content
                            })
                          }}
                        >
                          Сохранить
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingComment(null)}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap">{comment.content}</p>
                      <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
                        <span>{format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm")}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingComment({
                              id: comment.id,
                              content: comment.content
                            })}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await deleteCommentMutation.mutateAsync({ id: comment.id })
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
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
                if (!selectedEmployee || !newComment.trim()) return
                await addComment.mutateAsync({
                  employeeId: selectedEmployee,
                  content: newComment,
                })
              }}
              disabled={!newComment.trim()}
            >
              Добавить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Расходы */}
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
                if (!selectedEmployee) return
                await addExpense.mutateAsync({
                  employeeId: selectedEmployee,
                  amount: newExpense.amount,
                  type: newExpense.type as "SCAM" | "ERROR",
                  description: newExpense.description,
                  currency: "USDT"
                })
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
                        {formatCurrencyValue(expense.amount, expense.currency)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingExpense(expense)
                        }}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          deleteExpense.mutate({ id: expense.id })
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

      {/* История работы */}
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

      {/* Подтверждение удаления */}
      <Dialog open={employeeToDelete !== null} onOpenChange={(open) => {
        if (!open) {
          setEmployeeToDelete(null)
          setDeleteError(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Вы уверены, что хотите удалить этого пользователя и все связанные с ним данные? Это действие нельзя отменить.</p>
            {deleteError && (
              <p className="text-red-500 mt-2">{deleteError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEmployeeToDelete(null)
                setDeleteError(null)
              }}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (employeeToDelete) {
                  try {
                    console.log("Employee ID to delete:", employeeToDelete)
                    await deleteEmployeeMutation.mutateAsync({ id: employeeToDelete })
                  } catch (error) {
                    console.error("Failed to delete employee:", error)
                  }
                }
              }}
              disabled={deleteEmployeeMutation.isLoading}
            >
              {deleteEmployeeMutation.isLoading ? "Удаление..." : "Удалить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedEmployeeForDetails && (
        <EmployeeDetailsDialog
          isOpen={showDetailsDialog}
          onClose={() => {
            setShowDetailsDialog(false)
            setSelectedEmployeeForDetails(null)
          }}
          employee={selectedEmployeeForDetails}
          fromDate={fromDate}
          toDate={toDate}
          onDateChange={(from, to) => {
            setFromDate(from)
            setToDate(to)
          }}
        />
      )}
    </div>
  )
}
