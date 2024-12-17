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
  Calendar,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Wallet,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

// Константы
const PERIODS = [
  { value: "hour", label: "По часам" },
  { value: "day", label: "По дням" },
  { value: "week", label: "По неделям" },
  { value: "month", label: "По месяцам" },
  { value: "quarter", label: "По кварталам" },
  { value: "year", label: "По годам" },
];

const CHART_MODES = [
  { value: "amount", label: "По сумме" },
  { value: "count", label: "По количеству" },
];

// Утилиты для форматирования данных
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
export default function ParserPage() {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState("");
  const [period, setPeriod] = useState("day");
  const [chartMode, setChartMode] = useState("amount");
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 дней назад
    to: new Date(),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "timestamp",
    direction: "desc" as "asc" | "desc",
  });

  // API запросы
  const { data: wallet, isLoading: isWalletLoading } = api.user.me.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000, // 5 минут
    },
  );

  // Мемоизированные параметры запроса
  const queryInput = useMemo(
    () => ({
      startDate: dateRange.from?.toISOString(),
      endDate: dateRange.to?.toISOString(),
      limit: 50,
      offset: 0,
    }),
    [dateRange.from, dateRange.to],
  );

  const {
    data: transactions,
    isLoading: isTransactionsLoading,
    refetch: refetchTransactions,
  } = api.user.getTronTransactions.useQuery(queryInput, {
    enabled: Boolean(wallet?.TronWallet),
    staleTime: 3 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
    suspense: false,
    //@ts-ignore
    keepPreviousData: true,
  });

  const setWalletMutation = api.user.setTronWallet.useMutation({
    onSuccess: () => {
      toast({
        title: "Кошелек успешно добавлен",
        description: "Начинаем загрузку транзакций...",
      });
      void refetchTransactions();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Обработчик сохранения кошелька
  const handleSaveWallet = useCallback(async () => {
    if (!walletAddress.match(/^T[A-Za-z0-9]{33}$/)) {
      toast({
        title: "Ошибка",
        description: "Неверный формат адреса кошелька",
        variant: "destructive",
      });
      return;
    }

    try {
      await setWalletMutation.mutateAsync(walletAddress);
    } catch (error) {
      console.error("Error in handleSaveWallet:", error);
      toast({
        title: "Ошибка",
        description:
          error instanceof Error
            ? error.message
            : "Произошла неизвестная ошибка",
        variant: "destructive",
      });
    }
  }, [walletAddress, setWalletMutation, toast]);

  // Обработчик обновления данных
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

  // Мемоизированные данные для графиков
  const chartData = useMemo(() => {
    if (!transactions?.transactions?.length) return [];

    const groups = transactions.transactions.reduce(
      (acc, tx) => {
        const date = getPeriodStart(new Date(tx.timestamp), period);
        const key = formatDate(date, period);

        if (!acc[key]) {
          acc[key] = {
            date: key,
            incoming: 0,
            outgoing: 0,
            incomingCount: 0,
            outgoingCount: 0,
          };
        }

        const amount = Number(tx.amount) / Math.pow(10, tx.tokenDecimal);
        if (tx.type === "incoming") {
          acc[key].incoming += amount;
          acc[key].incomingCount += 1;
        } else {
          acc[key].outgoing += amount;
          acc[key].outgoingCount += 1;
        }

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(groups);
  }, [transactions?.transactions, period]);

  // Мемоизированные отфильтрованные и отсортированные данные
  // Изменяем обработку транзакций в processedTransactions
  const processedTransactions = useMemo(() => {
    if (!transactions?.transactions) return [];

    return transactions.transactions
      .map((tx) => ({
        ...tx,
        // Изменяем логику: если отправитель - наш кошелек, то это исходящая транзакция
        type:
          tx.fromAddress === wallet?.TronWallet?.address
            ? "outgoing"
            : "incoming",
      }))
      .filter((tx) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          tx.hash.toLowerCase().includes(query) ||
          tx.fromAddress.toLowerCase().includes(query) ||
          tx.toAddress.toLowerCase().includes(query) ||
          tx.tokenSymbol.toLowerCase().includes(query) ||
          tx.amount.toString().includes(query)
        );
      })
      .sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (sortConfig.key === "timestamp") {
          return sortConfig.direction === "asc"
            ? new Date(aValue).getTime() - new Date(bValue).getTime()
            : new Date(bValue).getTime() - new Date(aValue).getTime();
        }

        if (sortConfig.key === "amount") {
          const amountA = Number(aValue) / Math.pow(10, a.tokenDecimal);
          const amountB = Number(bValue) / Math.pow(10, b.tokenDecimal);
          return sortConfig.direction === "asc"
            ? amountA - amountB
            : amountB - amountA;
        }

        return 0;
      });
  }, [transactions?.transactions, searchQuery, sortConfig, wallet?.TronWallet]);

  // Эффект для автоматического обновления каждые 3 минуты
  useEffect(() => {
    if (!wallet?.TronWallet) return;

    const intervalId = setInterval(
      () => {
        void refetchTransactions();
      },
      3 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [wallet?.TronWallet, refetchTransactions]);

  // Компоненты для различных состояний
  if (isWalletLoading) {
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

  if (!wallet?.TronWallet) {
    // Правильный регистр
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-screen items-center justify-center p-4"
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Добавление кошелька</CardTitle>
            <CardDescription>
              Введите адрес вашего TRON кошелька для отслеживания транзакций
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Адрес TRX кошелька"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
              <Button
                onClick={handleSaveWallet}
                //@ts-ignore
                disabled={setWalletMutation.isLoading}
              >
                {
                  //@ts-ignore
                  setWalletMutation.isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Сохранить
                    </>
                  )
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Основной интерфейс
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-screen flex-col space-y-4 overflow-hidden p-4"
    >
      {/* Верхняя секция с графиками */}
      <div className="grid h-1/2 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* График транзакций */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-4">
              <CardTitle>Статистика транзакций</CardTitle>
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
            </div>
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
          </CardHeader>
          <CardContent>
            {isTransactionsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : !chartData.length ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">
                  Нет данных за выбранный период
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      chartMode === "amount"
                        ? `${Number(value).toFixed(2)} USDT`
                        : `${value} операций`
                    }
                  />
                  <Legend />
                  <Bar
                    name="Входящие"
                    dataKey={
                      chartMode === "amount" ? "incoming" : "incomingCount"
                    }
                    fill="hsl(var(--success))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    name="Исходящие"
                    dataKey={
                      chartMode === "amount" ? "outgoing" : "outgoingCount"
                    }
                    fill="hsl()"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Круговая диаграмма */}
        <Card>
          <CardHeader>
            <CardTitle>Соотношение операций</CardTitle>
          </CardHeader>
          <CardContent>
            {isTransactionsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : !chartData.length ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground">
                  Нет данных за выбранный период
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Входящие",
                        value: chartData.reduce(
                          (sum, item) =>
                            sum +
                            (chartMode === "amount"
                              ? //@ts-ignore
                                item.incoming
                              : //@ts-ignore
                                item.incomingCount),
                          0,
                        ),
                      },
                      {
                        name: "Исходящие",
                        value: chartData.reduce(
                          (sum, item) =>
                            sum +
                            (chartMode === "amount"
                              ? //@ts-ignore
                                item.outgoing
                              : //@ts-ignore
                                item.outgoingCount),
                          0,
                        ),
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) =>
                      `${name}: ${
                        chartMode === "amount"
                          ? `${value.toFixed(2)} USDT`
                          : `${value} оп.`
                      }`
                    }
                  >
                    <Cell fill="var(--success)" />
                    <Cell fill="var(--destructive)" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Нижняя секция с таблицей и фильтрами */}
      <div className="grid h-1/2 grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Таблица транзакций */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>История транзакций</CardTitle>
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
                          key: "timestamp",
                          direction:
                            sortConfig.key === "timestamp" &&
                            sortConfig.direction === "asc"
                              ? "desc"
                              : "asc",
                        })
                      }
                    >
                      <div className="flex items-center">
                        Дата
                        {sortConfig.key === "timestamp" && (
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
                    <TableHead>Тип</TableHead>
                    <TableHead>От кого</TableHead>
                    <TableHead>Кому</TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
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
                      <div className="flex items-center justify-end">
                        Сумма
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
                    <TableHead>Токен</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Хеш</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isTransactionsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-12 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !processedTransactions.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Нет данных за выбранный период
                      </TableCell>
                    </TableRow>
                  ) : (
                    processedTransactions
                      .filter((tx) => {
                        const query = searchQuery.toLowerCase();
                        return (
                          tx.hash.toLowerCase().includes(query) ||
                          tx.fromAddress.toLowerCase().includes(query) ||
                          tx.toAddress.toLowerCase().includes(query) ||
                          tx.tokenSymbol.toLowerCase().includes(query) ||
                          tx.amount.toString().includes(query)
                        );
                      })
                      .sort((a, b) => {
                        const aValue = a[sortConfig.key];
                        const bValue = b[sortConfig.key];

                        if (sortConfig.key === "timestamp") {
                          return sortConfig.direction === "asc"
                            ? new Date(aValue).getTime() -
                                new Date(bValue).getTime()
                            : new Date(bValue).getTime() -
                                new Date(aValue).getTime();
                        }

                        if (sortConfig.key === "amount") {
                          const amountA =
                            Number(aValue) / Math.pow(10, a.tokenDecimal);
                          const amountB =
                            Number(bValue) / Math.pow(10, b.tokenDecimal);
                          return sortConfig.direction === "asc"
                            ? amountA - amountB
                            : amountB - amountA;
                        }

                        return 0;
                      })
                      .map((tx) => (
                        <TableRow key={tx.hash}>
                          <TableCell>
                            {format(
                              new Date(tx.timestamp),
                              "dd.MM.yyyy HH:mm",
                              {
                                locale: ru,
                              },
                            )}
                          </TableCell>
                          <TableCell>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={`flex items-center ${
                                tx.type === "incoming"
                                  ? "text-success"
                                  : "text-destructive"
                              }`}
                            >
                              {tx.type === "incoming" ? (
                                <>
                                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                                  Входящая
                                </>
                              ) : (
                                <>
                                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                                  Исходящая
                                </>
                              )}
                            </motion.div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {tx.fromAddress.slice(0, 6)}...
                            {tx.fromAddress.slice(-6)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {tx.toAddress.slice(0, 6)}...
                            {tx.toAddress.slice(-6)}
                          </TableCell>
                          <TableCell className="text-right">
                            {(
                              Number(tx.amount) / Math.pow(10, tx.tokenDecimal)
                            ).toFixed(2)}
                          </TableCell>
                          <TableCell>{tx.tokenSymbol}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                tx.confirmed
                                  ? "bg-success/20 text-success"
                                  : "bg-warning/20 text-warning"
                              }`}
                            >
                              {tx.confirmed ? "Подтверждено" : "Ожидает"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <a
                              href={`https://tronscan.org/#/transaction/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center hover:text-primary"
                            >
                              <span className="font-mono">
                                {tx.hash.slice(0, 6)}...{tx.hash.slice(-6)}
                              </span>
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Блок фильтров */}
        <Card>
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Период</label>

              <DatePickerWithRange
                value={dateRange}
                //@ts-ignore
                onChange={setDateRange}
              />
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              <label className="text-sm font-medium">Поиск</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по транзакциям..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Поиск по адресам, суммам и хешам транзакций
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
