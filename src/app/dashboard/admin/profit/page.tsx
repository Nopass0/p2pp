"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format, isValid } from "date-fns";
import { DateTimePicker } from "@/components/ui/date-range-picker"; // Импорт нашего DateTimePicker
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";

// ===== DateRangePickerPopover =====

export type DateRange = {
  from: Date;
  to: Date;
};

export function DateRangePickerPopover({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);

  const formatDate = (date: Date | null) => {
    return date && isValid(date) ? format(date, "dd/MM/yyyy") : "";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {value.from && value.to
            ? `${formatDate(value.from)} – ${formatDate(value.to)}`
            : "Выберите диапазон"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-4 p-4">
        <div className="flex gap-4">
          <div>
            <Label className="mb-2 block">От</Label>
            <Calendar
              mode="single"
              selected={value.from ?? undefined}
              onSelect={(date) => {
                if (date && isValid(date)) {
                  onChange({ ...value, from: date, to: value.to || date });
                }
              }}
              initialFocus
            />
          </div>
          <div>
            <Label className="mb-2 block">До</Label>
            <Calendar
              mode="single"
              selected={value.to ?? undefined}
              onSelect={(date) => {
                if (date && isValid(date)) {
                  onChange({ ...value, to: date, from: value.from || date });
                }
              }}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)}>Применить</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ===== Функция расширения повторяющихся расходов =====

interface RecordType {
  id: number;
  amount: number;
  type: "SCAM" | "ERROR" | "Другое";
  currency: "USDT" | "RUB";
  date: string; // исходная дата в ISO
  description?: string;
  isRecurring?: boolean;
  period?: string; // период повторения в днях
  profit?: number; // для дохода
  processed?: boolean;
}

interface ExpandedRecord extends RecordType {
  occurrenceDate: string;
}

function expandRecurringExpenses(records: RecordType[], rangeFrom: Date, rangeTo: Date): ExpandedRecord[] {
  const expanded: ExpandedRecord[] = [];
  records.forEach(record => {
    const baseDate = new Date(record.date);
    if (!isValid(baseDate)) return;
    if (!record.isRecurring || !record.period) {
      expanded.push({ ...record, occurrenceDate: record.date });
    } else {
      const periodDays = parseInt(record.period, 10);
      if (isNaN(periodDays) || periodDays <= 0) {
        expanded.push({ ...record, occurrenceDate: record.date });
      } else {
        let occDate = new Date(baseDate);
        while (occDate <= rangeTo) {
          if (occDate >= rangeFrom) {
            expanded.push({ ...record, occurrenceDate: occDate.toISOString() });
          }
          occDate.setDate(occDate.getDate() + periodDays);
        }
      }
    }
  });
  expanded.sort(
    (a, b) => new Date(b.occurrenceDate).getTime() - new Date(a.occurrenceDate).getTime()
  );
  return expanded;
}

// ===== Главная страница =====

const recordsPerPage = 20;

const FinancialRecordsPage = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const [recordCategory, setRecordCategory] = useState<"expense" | "income">("expense");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [newRecord, setNewRecord] = useState({
    amount: "",
    type: "SCAM" as "SCAM" | "ERROR" | "Другое",
    currency: "USDT" as "USDT" | "RUB",
    date: new Date().toISOString(),
    description: "",
    isRecurring: false,
    period: "",
    profit: "",
  });

  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<"expense" | "income" | null>(null);

  const [expensesPage, setExpensesPage] = useState(1);
  const [incomesPage, setIncomesPage] = useState(1);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [incomesSearchTerm, setIncomesSearchTerm] = React.useState("");
  const [expenseTypeFilter, setExpenseTypeFilter] = React.useState<string>("all");

  // Получаем данные с сервера через tRPC (предполагается, что API возвращает массив записей)
  const { data: expensesData, refetch: refetchExpenses } = api.admin.getExpenses.useQuery({
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString(),
  });
  const { data: incomesData, refetch: refetchIncomes } = api.admin.getIncomes.useQuery({
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString(),
  });
  const { data: summaryData, refetch: refetchSummary } = api.admin.getFinancialSummaryManual.useQuery({
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString(),
  });

  const addExpense = api.admin.addExpense.useMutation({
    onSuccess: () => {
      refetchExpenses();
      refetchSummary();
      setIsAddDialogOpen(false);
      setNewRecord({
        amount: "",
        type: "SCAM",
        currency: "USDT",
        date: new Date().toISOString(),
        description: "",
        isRecurring: false,
        period: "",
        profit: "",
      });
      toast.success("Расход добавлен");
    },
  });
  const updateExpense = api.admin.updateExpense.useMutation({
    onSuccess: () => {
      refetchExpenses();
      refetchSummary();
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      setEditingCategory(null);
      toast.success("Расход обновлён");
    },
  });
  const deleteExpense = api.admin.deleteExpense.useMutation({
    onSuccess: () => {
      refetchExpenses();
      refetchSummary();
      toast.success("Расход удалён");
    },
  });
  const addIncome = api.admin.addIncome.useMutation({
    onSuccess: () => {
      refetchIncomes();
      refetchSummary();
      setIsAddDialogOpen(false);
      setNewRecord({
        amount: "",
        type: "SCAM",
        currency: "USDT",
        date: new Date().toISOString(),
        description: "",
        isRecurring: false,
        period: "",
        profit: "",
      });
      toast.success("Доход добавлен");
    },
  });
  const updateIncome = api.admin.updateIncome.useMutation({
    onSuccess: () => {
      refetchIncomes();
      refetchSummary();
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      setEditingCategory(null);
      toast.success("Доход обновлён");
    },
  });
  const deleteIncome = api.admin.deleteIncome.useMutation({
    onSuccess: () => {
      refetchIncomes();
      refetchSummary();
      toast.success("Доход удалён");
    },
  });

  const toggleExpenseMutation = api.admin.toggleExpenseProcessed.useMutation();
  const statusIndicatorStyle = (processed: boolean) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: processed ? '#22c55e' : '#ef4444',
    display: 'inline-block',
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    boxShadow: processed 
      ? '0 0 6px rgba(34, 197, 94, 0.6)' 
      : '0 0 6px rgba(239, 68, 68, 0.6)',
    border: '2px solid ' + (processed ? '#16a34a' : '#dc2626'),
  });

  const toggleProcessed = async (recordId: number, newStatus: boolean) => {
    try {
      const result = await toggleExpenseMutation.mutateAsync({ 
        id: recordId, 
        processed: newStatus 
      });
      
      // Оптимистичное обновление UI для расходов
      const updatedExpenses = expensesData.map(expense => {
        if (expense.id === recordId) {
          return { ...expense, processed: newStatus };
        }
        return expense;
      });
      setExpenses(updatedExpenses);
      
      if (result.success) {
        // Обновляем данные с сервера для синхронизации
        void refetchExpenses();
      }
    } catch (error: any) {
      console.error("Ошибка переключения состояния:", error);
      // Откатываем оптимистичное обновление в случае ошибки
      void refetchExpenses();
      if (error.message) {
        toast({
          title: "Ошибка",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleAddRecord = () => {
    const amount = parseFloat(newRecord.amount);
    if (recordCategory === "expense") {
      addExpense.mutate({
        amount,
        type: newRecord.type,
        currency: newRecord.currency,
        date: new Date(newRecord.date).toISOString(),
        description: newRecord.description || "",
        isRecurring: newRecord.isRecurring,
        period: newRecord.period || "",
      });
    } else {
      const profit = newRecord.profit ? parseFloat(newRecord.profit) : undefined;
      addIncome.mutate({
        amount,
        type: newRecord.type,
        currency: newRecord.currency,
        date: new Date(newRecord.date).toISOString(),
        description: newRecord.description || "",
        isRecurring: newRecord.isRecurring,
        period: newRecord.period || "",
        profit,
      });
    }
  };

  const handleUpdateRecord = () => {
    if (!editingRecord || !editingCategory) return;
    const amount = parseFloat(editingRecord.amount);
    if (editingCategory === "expense") {
      updateExpense.mutate({
        id: editingRecord.id,
        amount,
        type: editingRecord.type,
        currency: editingRecord.currency,
        date: editingRecord.date,
        description: editingRecord.description,
        isRecurring: editingRecord.isRecurring,
        period: editingRecord.period,
      });
    } else {
      const profit = editingRecord.profit ? parseFloat(editingRecord.profit) : undefined;
      updateIncome.mutate({
        id: editingRecord.id,
        amount,
        type: editingRecord.type,
        currency: editingRecord.currency,
        date: editingRecord.date,
        description: editingRecord.description,
        isRecurring: editingRecord.isRecurring,
        period: editingRecord.period,
        profit,
      });
    }
  };

  const handleDeleteRecord = (id: number, category: "expense" | "income") => {
    if (confirm("Удалить запись?")) {
      if (category === "expense") {
        deleteExpense.mutate({ id });
      } else {
        deleteIncome.mutate({ id });
      }
    }
  };

  // Расширяем повторяющиеся расходы
  const expandedExpenses = expensesData ? expandRecurringExpenses(expensesData, dateRange.from, dateRange.to) : [];
  const expandedIncomes = incomesData ? incomesData : [];

  const displayedExpenses = expandedExpenses.slice(0, expensesPage * recordsPerPage);
  const displayedIncomes = expandedIncomes.slice(0, incomesPage * recordsPerPage);

  const expensesScrollRef = useRef<HTMLDivElement>(null);
  const incomesScrollRef = useRef<HTMLDivElement>(null);

  const handleExpensesScroll = useCallback(() => {
    if (expensesScrollRef.current) {
      const { scrollTop, clientHeight, scrollHeight } = expensesScrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setExpensesPage(prev => prev + 1);
      }
    }
  }, []);

  const handleIncomesScroll = useCallback(() => {
    if (incomesScrollRef.current) {
      const { scrollTop, clientHeight, scrollHeight } = incomesScrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setIncomesPage(prev => prev + 1);
      }
    }
  }, []);

  // Универсальная форма записи
  const FinancialRecordForm = ({
    record,
    onSubmit,
    submitText,
    onChange,
  }: {
    record: any;
    onSubmit: () => void;
    submitText: string;
    onChange: (newData: any) => void;
  }) => {
    // Use local state to manage form fields to avoid re-rendering parent on every change
    const [formData, setFormData] = React.useState(record);

    React.useEffect(() => {
      setFormData(record);
    }, [record]);

    // Validate date
    const parsedDate = new Date(formData.date);
    const validDate = isValid(parsedDate) ? parsedDate : new Date();

    const handleInputChange = (field: string, value: any) => {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    // On blur, propagate the local state to parent
    const handleBlur = () => {
      onChange(formData);
    };

    return (
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label>Сумма</Label>
          <Input
            type="number"
            value={formData.amount}
            onChange={(e) => handleInputChange("amount", e.target.value)}
            onBlur={handleBlur}
          />
        </div>
        <div className="grid gap-2">
          <Label>Валюта</Label>
          <Select
            value={formData.currency}
            onValueChange={(value: "USDT" | "RUB") => handleInputChange("currency", value)}
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
            value={formData.type}
            onValueChange={(value: "SCAM" | "ERROR" | "Другое") => handleInputChange("type", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SCAM">Скам</SelectItem>
              <SelectItem value="ERROR">Ошибка</SelectItem>
              <SelectItem value="Другое">Другое</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Дата и время</Label>
          <DateTimePicker
            value={validDate}
            onChange={(date) => handleInputChange("date", date.toString())}
          />
        </div>
        <div className="grid gap-2">
          <Label>Описание</Label>
          <Input
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            onBlur={handleBlur}
          />
        </div>
        {recordCategory === "income" && (
          <div className="grid gap-2">
            <Label>Прибыль</Label>
            <Input
              type="number"
              value={formData.profit}
              onChange={(e) => handleInputChange("profit", e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        )}
        <div className="grid gap-2">
          <Label>Повторяющаяся запись?</Label>
          <Select
            value={formData.isRecurring ? "true" : "false"}
            onValueChange={(value: string) => handleInputChange("isRecurring", value === "true")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">Нет</SelectItem>
              <SelectItem value="true">Да</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(formData.isRecurring || formData.period) && (
          <div className="grid gap-2">
            <Label>Период (в днях)</Label>
            <Input
              type="number"
              value={formData.period}
              onChange={(e) => handleInputChange("period", e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        )}
        <div className="mt-4">
          <Button onClick={onSubmit}>{submitText}</Button>
        </div>
      </div>
    );
  };

  return (
    <ScrollArea className="h-screen">
      <div className="space-y-6 p-6">
        {/* Заголовок и выбор категории */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Финансовые записи</h1>
          <div className="flex items-center gap-4">
            <Select
              value={recordCategory}
              onValueChange={(value: "expense" | "income") => setRecordCategory(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Расход</SelectItem>
                <SelectItem value="income">Доход</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsAddDialogOpen(true)}>Добавить запись</Button>
          </div>
        </div>

        {/* DateRangePicker через Popover */}
        <div className="w-full">
          <DateRangePickerPopover value={dateRange} onChange={setDateRange} />
        </div>

        {/* Сводная информация */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Общий доход</CardTitle>
            </CardHeader>
            <CardContent>
              <div>USDT: {summaryData?.incomes.USDT?.toFixed(2) ?? "0.00"}</div>
              <div>RUB: {summaryData?.incomes.RUB?.toFixed(2) ?? "0.00"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Общие расходы</CardTitle>
            </CardHeader>
            <CardContent>
              <div>USDT: {summaryData?.expenses.USDT?.toFixed(2) ?? "0.00"}</div>
              <div>RUB: {summaryData?.expenses.RUB?.toFixed(2) ?? "0.00"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Прибыль</CardTitle>
            </CardHeader>
            <CardContent>
              <div>USDT: {summaryData?.profit.USDT?.toFixed(2) ?? "0.00"}</div>
              <div>RUB: {summaryData?.profit.RUB?.toFixed(2) ?? "0.00"}</div>
            </CardContent>
          </Card>
        </div>

        {/* Две таблицы рядом: расходы слева, доходы справа */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Таблица расходов */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Расходы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4 items-center">
                <Input
                  placeholder="Поиск по всем столбцам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
                <Select
                  value={expenseTypeFilter}
                  onValueChange={(value: string) => setExpenseTypeFilter(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Фильтр по типу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все расходы</SelectItem>
                    <SelectItem value="processed">Обработанные</SelectItem>
                    <SelectItem value="unprocessed">Не обработанные</SelectItem>
                    <SelectItem value="returned">Возвратные</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="h-80" ref={expensesScrollRef} onScroll={handleExpensesScroll}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Валюта</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead>Обработано</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedExpenses.filter(record => {
                      const searchLower = searchTerm.toLowerCase();
                      const matchesSearch =
                        record.amount.toString().toLowerCase().includes(searchLower) ||
                        (record.description && record.description.toLowerCase().includes(searchLower)) ||
                        record.type.toLowerCase().includes(searchLower);

                      let matchesType = true;
                      if (expenseTypeFilter === "processed") {
                        matchesType = record.processed === true;
                      } else if (expenseTypeFilter === "unprocessed") {
                        matchesType = record.processed === false;
                      } else if (expenseTypeFilter === "returned") {
                        matchesType = record.returned === true;
                      }

                      return matchesSearch && matchesType;
                    }).map(record => {
                      const occDate = new Date(record.occurrenceDate);
                      if (!isValid(occDate)) return null;
                      const isFuture = occDate > new Date();
                      return (
                        <TableRow key={`${record.id}-${record.occurrenceDate}`} className={isFuture ? "opacity-60" : ""}>
                          <TableCell>{format(occDate, "dd.MM.yyyy HH:mm")}</TableCell>
                          <TableCell>{record.type === "SCAM" ? "Скам" : record.type === "ERROR" ? "Ошибка" : "Другое"}</TableCell>
                          <TableCell>{record.amount.toFixed(2)}</TableCell>
                          <TableCell>{record.currency}</TableCell>
                          <TableCell>{record.description}</TableCell>
                          <TableCell className="text-center">
                            <Tooltip
                              label={record.processed ? "Обработано" : "Не обработано"}
                              placement="top"
                            >
                              <div
                                style={statusIndicatorStyle(record.processed)}
                                onClick={() => toggleProcessed(record.id, !record.processed)}
                                className="mx-auto hover:scale-110 transition-transform"
                              />
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingRecord(record);
                                  setEditingCategory("expense");
                                  setIsEditDialogOpen(true);
                                }}>
                                  <Pencil className="mr-2 h-4 w-4" /> Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteRecord(record.id, "expense")} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" /> Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
          {/* Таблица доходов */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Доходы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4 items-center">
                <Input
                  placeholder="Поиск по доходам..."
                  value={incomesSearchTerm}
                  onChange={(e) => setIncomesSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <ScrollArea className="h-80" ref={incomesScrollRef} onScroll={handleIncomesScroll}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Прибыль</TableHead>
                      <TableHead>Валюта</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedIncomes.filter(record => {
                      const searchLower = incomesSearchTerm.toLowerCase();
                      return (
                        record.amount.toString().toLowerCase().includes(searchLower) ||
                        (record.description && record.description.toLowerCase().includes(searchLower)) ||
                        record.type.toLowerCase().includes(searchLower)
                      );
                    }).map(record => {
                      const recDate = new Date(record.date);
                      if (!isValid(recDate)) return null;
                      const isFuture = recDate > new Date();
                      return (
                        <TableRow key={record.id} className={isFuture ? "opacity-60" : ""}>
                          <TableCell>{format(recDate, "dd.MM.yyyy HH:mm")}</TableCell>
                          <TableCell>{record.type === "SCAM" ? "Скам" : record.type === "ERROR" ? "Ошибка" : "Другое"}</TableCell>
                          <TableCell>{record.amount.toFixed(2)}</TableCell>
                          <TableCell>{record.profit ? record.profit.toFixed(2) : "-"}</TableCell>
                          <TableCell>{record.currency}</TableCell>
                          <TableCell>{record.description}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingRecord(record);
                                  setEditingCategory("income");
                                  setIsEditDialogOpen(true);
                                }}>
                                  <Pencil className="mr-2 h-4 w-4" /> Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteRecord(record.id, "income")} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" /> Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Диалог для добавления записи */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent autoFocus={false}>
            <DialogHeader>
              <DialogTitle>Добавить {recordCategory === "expense" ? "расход" : "доход"}</DialogTitle>
            </DialogHeader>
            <FinancialRecordForm
              record={newRecord}
              onSubmit={handleAddRecord}
              submitText="Сохранить"
              onChange={setNewRecord}
            />
          </DialogContent>
        </Dialog>

        {/* Диалог для редактирования записи */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsEditDialogOpen(false);
              setEditingRecord(null);
              setEditingCategory(null);
            }
          }}
        >
          <DialogContent autoFocus={false}>
            <DialogHeader>
              <DialogTitle>Редактировать запись</DialogTitle>
            </DialogHeader>
            {editingRecord && (
              <FinancialRecordForm
                record={editingRecord}
                onSubmit={handleUpdateRecord}
                submitText="Обновить"
                onChange={setEditingRecord}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Обновление KPI */}
        <div className="mt-4">
          <div>Всего расходов: {expandedExpenses.length}</div>
          <div>Обработанных расходов: {expandedExpenses.filter(r => r.processed).length}</div>
          <div>Возвратных расходов: {expandedExpenses.filter(r => r.returned).length}</div>
        </div>
      </div>
    </ScrollArea>
  );
};

export default FinancialRecordsPage;
