"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfHour,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Wallet,
} from "lucide-react";
import { type P2PTransaction } from "@prisma/client";
import type { UseTRPCQueryResult } from "@trpc/react-query/shared";
import type { TRPCClientErrorLike } from "@trpc/client";
//@ts-ignore
import type { DefaultErrorShape } from "@trpc/server";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";

// Типы
type RouterOutput = inferRouterOutputs<AppRouter>;
type User = NonNullable<RouterOutput["user"]["me"]>;
type Transactions = NonNullable<RouterOutput["wallet"]["getP2PTransactions"]>;

// Периоды для группировки
const PERIODS = [
  { value: "hour", label: "По часам" },
  { value: "day", label: "По дням" },
  { value: "week", label: "По неделям" },
  { value: "month", label: "По месяцам" },
  { value: "quarter", label: "По кварталам" },
  { value: "year", label: "По годам" },
] as const;

// Режимы отображения графиков
const CHART_MODES = [
  { value: "amount", label: "По сумме" },
  { value: "count", label: "По количеству" },
] as const;

// Утилиты для форматирования дат
function getPeriodStart(date: Date, period: string) {
  switch (period) {
    case "hour":
      return startOfHour(date);
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date, { locale: ru });
    case "month":
      return startOfMonth(date);
    case "quarter":
      return startOfQuarter(date);
    case "year":
      return startOfYear(date);
    default:
      return startOfDay(date);
  }
}

function formatDate(date: Date, period: string) {
  switch (period) {
    case "hour":
      return format(date, "HH:mm", { locale: ru });
    case "day":
      return format(date, "dd MMM", { locale: ru });
    case "week":
      return `Нед. ${format(date, "w", { locale: ru })}`;
    case "month":
      return format(date, "LLLL", { locale: ru });
    case "quarter":
      return `${format(date, "QQQ yyyy", { locale: ru })}`;
    case "year":
      return format(date, "yyyy", { locale: ru });
    default:
      return format(date, "dd.MM.yyyy", { locale: ru });
  }
}

// Основной компонент страницы
export default function P2PTransactionsPage() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<string>("day");
  const [chartMode, setChartMode] = useState<string>("amount");
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof P2PTransaction;
    direction: "asc" | "desc";
  }>({
    key: "completedAt",
    direction: "desc",
  });
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // API запросы
  const { data: user, isLoading: isUserLoading } =
    api.user.me.useQuery() as UseTRPCQueryResult<User, DefaultErrorShape>;

  // Параметры запроса транзакций
  const queryInput = useMemo(
    () => ({
      dateFrom: dateRange.from ?? new Date(0),
      dateTo: dateRange.to ?? new Date(),
    }),
    [dateRange.from, dateRange.to],
  );

  const {
    data: transactionsData,
    isLoading: isTransactionsLoading,
    refetch: refetchTransactions,
  } = api.wallet.getP2PTransactions.useQuery(queryInput, {
    enabled: Boolean(user),
    staleTime: 3 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  }) as UseTRPCQueryResult<Transactions, DefaultErrorShape>;

  // Обработка и фильтрация транзакций
  const processedTransactions = useMemo(() => {
    //@ts-ignore
    if (!transactionsData?.transactions) return [];
    //@ts-ignore
    return transactionsData.transactions
      .filter((tx) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          tx.telegramId.toLowerCase().includes(query) ||
          tx.buyerName.toLowerCase().includes(query) ||
          tx.method.toLowerCase().includes(query) ||
          tx.amount.toString().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortConfig.key === "completedAt") {
          return sortConfig.direction === "asc"
            ? new Date(a.completedAt).getTime() -
                new Date(b.completedAt).getTime()
            : new Date(b.completedAt).getTime() -
                new Date(a.completedAt).getTime();
        }
        if (sortConfig.key === "amount") {
          return sortConfig.direction === "asc"
            ? a.amount - b.amount
            : b.amount - a.amount;
        }
        return 0;
      });
    //@ts-ignore
  }, [transactionsData?.transactions, searchQuery, sortConfig]);

  // Данные для графиков
  const chartData = useMemo(() => {
    if (!processedTransactions.length) return [];

    const groups = processedTransactions.reduce(
      (acc, tx) => {
        const date = getPeriodStart(new Date(tx.completedAt), period);
        const key = formatDate(date, period);

        if (!acc[key]) {
          acc[key] = {
            date: key,
            total: 0,
            count: 0,
          };
        }

        acc[key].total += tx.amount;
        acc[key].count += 1;

        return acc;
      },
      {} as Record<string, { date: string; total: number; count: number }>,
    );

    return Object.entries(groups).map(([date, data]) => ({
      date,
      //@ts-ignore

      amount: data.total,
      //@ts-ignore

      count: data.count,
    }));
  }, [processedTransactions, period]);

  // Обновление данных
  const handleRefresh = useCallback(async () => {
    try {
      await refetchTransactions();
      toast({
        title: "Данные обновлены",
        description: "Список транзакций успешно обновлен",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные",
        variant: "destructive",
      });
    }
  }, [refetchTransactions, toast]);

  // Автоматическое обновление
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(handleRefresh, 3 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [user, handleRefresh]);

  // Загрузка
  if (isUserLoading || isTransactionsLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-[300px]" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-[400px] lg:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  // Основной интерфейс
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-screen flex-col space-y-4 overflow-hidden p-4"
    >
      {/* Графики */}
      <div className="grid h-1/2 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* График транзакций */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>P2P Транзакции</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={chartMode} onValueChange={setChartMode}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) =>
                    chartMode === "amount"
                      ? `${value.toFixed(2)} USDT`
                      : `${value} транзакций`
                  }
                />
                <Legend />
                <Bar
                  dataKey={chartMode === "amount" ? "amount" : "count"}
                  name={chartMode === "amount" ? "Сумма" : "Количество"}
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Статистика */}
        <Card>
          <CardHeader>
            <CardTitle>Статистика</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  Всего транзакций
                </h4>
                <p className="text-2xl font-bold">
                  {processedTransactions.length}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  Общая сумма
                </h4>
                <p className="text-2xl font-bold">
                  {processedTransactions
                    .reduce((sum, tx) => sum + tx.amount, 0)
                    .toFixed(2)}{" "}
                  USDT
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  Средняя сумма
                </h4>
                <p className="text-2xl font-bold">
                  {(
                    processedTransactions.reduce(
                      (sum, tx) => sum + tx.amount,
                      0,
                    ) / (processedTransactions.length || 1)
                  ).toFixed(2)}{" "}
                  USDT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица транзакций */}
      <Card className="h-1/2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>История транзакций</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[300px]"
              />
              <Button onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Обновить
              </Button>
              {/* @ts-ignore */}

              <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(50vh-10rem)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() =>
                      setSortConfig({
                        key: "completedAt",
                        direction:
                          sortConfig.key === "completedAt" &&
                          sortConfig.direction === "asc"
                            ? "desc"
                            : "asc",
                      })
                    }
                  >
                    <div className="flex items-center">
                      Дата
                      {sortConfig.key === "completedAt" && (
                        <span className="ml-2">
                          {sortConfig.direction === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() =>
                      setSortConfig({
                        key: "amount",
                        direction:
                          sortConfig.key === "amount" &&
                          sortConfig.direction === "asc"
                            ? "desc"
                            : "asc",
                      })
                    }
                  >
                    <div className="flex items-center">
                      Сумма USDT
                      {sortConfig.key === "amount" && (
                        <span className="ml-2">
                          {sortConfig.direction === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Сумма RUB</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Покупатель</TableHead>
                  <TableHead>Метод</TableHead>
                  <TableHead>Статистика торгов</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedTransactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      setExpandedRow(expandedRow === tx.id ? null : tx.id)
                    }
                  >
                    <TableCell>
                      {format(new Date(tx.completedAt), "dd.MM.yyyy HH:mm", {
                        locale: ru,
                      })}
                    </TableCell>
                    <TableCell className="font-mono">{tx.telegramId}</TableCell>
                    <TableCell className="font-medium">
                      {tx.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{tx.totalRub.toFixed(2)}</TableCell>
                    <TableCell>{tx.price.toFixed(2)}</TableCell>
                    <TableCell>{tx.buyerName}</TableCell>
                    <TableCell>{tx.method}</TableCell>
                    <TableCell>{tx.tradeStats || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          tx.processed
                            ? "bg-success/20 text-success"
                            : "bg-warning/20 text-warning"
                        }`}
                      >
                        {tx.processed ? "Обработано" : "В обработке"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {processedTransactions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Нет транзакций за выбранный период
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
