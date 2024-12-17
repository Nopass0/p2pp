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
import React from "react";
//@ts-ignore

import { DefaultErrorShape } from "@trpc/server";
import { UseTRPCQueryResult } from "@trpc/react-query/shared";
import { TRPCClientErrorLike } from "@trpc/client";
import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "@/server/api/root"; // Import your AppRouter

// Infer the router output types
type RouterOutput = inferRouterOutputs<AppRouter>;

// Define types for User and Transactions
type User = NonNullable<RouterOutput["user"]["me"]>;
type Transactions = NonNullable<RouterOutput["wallet"]["getP2PTransactions"]>;
//@ts-ignore
type Transaction = Transactions["transactions"][number];

// Constants
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

// Utilities for formatting data
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

// Main page component
export default function TelegramWalletPage() {
  const { toast } = useToast();
  const [period, setPeriod] = useState("day");
  const [chartMode, setChartMode] = useState("amount");
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Transaction;
    direction: "asc" | "desc";
  }>({
    key: "createdAt",
    direction: "desc",
  });
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [newToken, setNewToken] = useState("");
  const [showTokenUpdate, setShowTokenUpdate] = useState(false);

  // API requests
  const { data: user, isLoading: isUserLoading } =
    api.user.me.useQuery() as UseTRPCQueryResult<User, DefaultErrorShape>;
  const setTelegramAuthTokenMutation =
    api.wallet.setTelegramAuthToken.useMutation({
      onSuccess: () => {
        toast({
          title: "Успех",
          description: "Токен успешно сохранен",
        });
        // Получаем utils из api
        void api.useContext().user.me.invalidate();
        setNewToken("");
        setShowTokenUpdate(false);
      },
      onError: (error) => {
        console.error("Token setting error:", error);
        toast({
          title: "Ошибка",
          description: error.message || "Не удалось установить токен",
          variant: "destructive",
        });
      },
    });

  const handleSetToken = async () => {
    if (!newToken.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите токен",
        variant: "destructive",
      });
      return;
    }

    // Очищаем токен от пробелов перед отправкой
    const cleanToken = newToken.replace(/\s+/g, "").trim();

    try {
      await setTelegramAuthTokenMutation.mutateAsync({
        token: cleanToken,
      });
    } catch (error) {
      console.error("Error in handleSetToken:", error);
    }
  };

  // Memoized request parameters
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
    placeholderData: (prev) => prev,
  }) as UseTRPCQueryResult<Transactions, DefaultErrorShape>;

  const transactions =
    transactionsData && "transactions" in transactionsData
      ? transactionsData
      : {
          success: false,
          transactions: [],
        };

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

  // Memoized data for charts
  const chartData = useMemo(() => {
    if (!transactions?.transactions?.length) return [];

    const groups = transactions.transactions.reduce(
      (acc, tx) => {
        const date = getPeriodStart(new Date(tx.createdAt), period);
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

        const amount = Number(tx.amount);
        if (tx.type === "p2p_payment") {
          acc[key].incoming += amount;
          acc[key].incomingCount += 1;
        } else {
          acc[key].outgoing += amount;
          acc[key].outgoingCount += 1;
        }

        return acc;
      },
      {} as Record<
        string,
        {
          date: string;
          incoming: number;
          outgoing: number;
          incomingCount: number;
          outgoingCount: number;
        }
      >,
    );

    return Object.values(groups);
  }, [transactions?.transactions, period]);

  // Memoized filtered and sorted data
  const processedTransactions = useMemo(() => {
    if (!transactions?.transactions) return [];

    return transactions.transactions
      .filter((tx) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          tx.transactionId.toString().includes(query) ||
          (tx.input_addresses &&
            tx.input_addresses.toLowerCase().includes(query)) ||
          (tx.recipient_wallet_address &&
            tx.recipient_wallet_address.toLowerCase().includes(query)) ||
          tx.amount.toString().includes(query) ||
          tx.currency.toLowerCase().includes(query) ||
          tx.type.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (sortConfig.key === "createdAt") {
          return sortConfig.direction === "asc"
            ? new Date(aValue).getTime() - new Date(bValue).getTime()
            : new Date(bValue).getTime() - new Date(aValue).getTime();
        }

        if (sortConfig.key === "amount") {
          const amountA = Number(aValue);
          const amountB = Number(bValue);
          return sortConfig.direction === "asc"
            ? amountA - amountB
            : amountB - amountA;
        }

        return 0;
      });
  }, [transactions?.transactions, searchQuery, sortConfig]);

  // Effect for automatic updates every 3 minutes
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(
      () => {
        void refetchTransactions();
      },
      3 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [user, refetchTransactions]);

  // Effect for checking token validity
  useEffect(() => {
    //@ts-ignore

    if (user?.tgAuthToken) {
      setIsTokenValid(true);
    } else {
      setIsTokenValid(false);
    }
    //@ts-ignore
  }, [user?.tgAuthToken]);

  // Components for various states
  if (isUserLoading) {
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
  //@ts-ignore

  if (!user?.tgAuthToken) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-screen items-center justify-center p-4"
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Установка Telegram токена</CardTitle>
            <CardDescription>
              Введите ваш Telegram токен для отслеживания транзакций
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Telegram токен"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
              />
              <Button
                onClick={handleSetToken}
                //@ts-ignore

                disabled={setTelegramAuthTokenMutation.isLoading}
              >
                {/* @ts-ignore */}

                {setTelegramAuthTokenMutation.isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Сохранить
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Token update window
  if (showTokenUpdate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-screen items-center justify-center p-4"
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Обновление Telegram токена</CardTitle>
            <CardDescription>Введите новый Telegram токен.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Новый Telegram токен"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
              />
              <Button
                onClick={handleSetToken}
                //@ts-ignore

                disabled={setTelegramAuthTokenMutation.isLoading}
              >
                {/* @ts-ignore */}

                {setTelegramAuthTokenMutation.isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Обновление...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Обновить
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Main interface
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-screen flex-col space-y-4 overflow-hidden p-4"
    >
      {/* Button to update token */}
      <div className="flex justify-end">
        <Button onClick={() => setShowTokenUpdate(true)}>Обновить токен</Button>
      </div>

      {/* Top section with charts */}
      <div className="grid h-1/2 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Transaction chart */}
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
            <div className="flex items-center gap-4">
              <Button onClick={handleRefresh} disabled={isTransactionsLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Обновить
              </Button>
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
                    fill="var(--destructive)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart */}
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
                          //@ts-ignore

                          (sum, item) =>
                            //@ts-ignore

                            sum +
                            (chartMode === "amount"
                              ? //@ts-ignore

                                Number(item.incoming)
                              : //@ts-ignore

                                Number(item.incomingCount)),
                          0,
                        ),
                      },
                      {
                        name: "Исходящие",
                        value: chartData.reduce(
                          (sum, item) =>
                            //@ts-ignore

                            sum +
                            (chartMode === "amount"
                              ? //@ts-ignore

                                Number(item.outgoing)
                              : //@ts-ignore

                                Number(item.outgoingCount)),
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

      {/* Bottom section with table and filters */}
      <div className="grid h-1/2 grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Transaction table */}
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
                          key: "createdAt",
                          direction:
                            sortConfig.key === "createdAt" &&
                            sortConfig.direction === "asc"
                              ? "desc"
                              : "asc",
                        })
                      }
                    >
                      <div className="flex items-center">
                        Дата
                        {sortConfig.key === "createdAt" && (
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
                    <TableHead>ID</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Валюта</TableHead>
                    <TableHead>Статус</TableHead>
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
                    processedTransactions.map((tx) => (
                      <React.Fragment key={tx.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            setExpandedRow(expandedRow === tx.id ? null : tx.id)
                          }
                        >
                          <TableCell>
                            {format(
                              new Date(tx.createdAt),
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
                                tx.type === "p2p_payment"
                                  ? "text-success"
                                  : "text-destructive"
                              }`}
                            >
                              {tx.type === "p2p_payment" ? (
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
                            {tx.transactionId}
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{tx.currency}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                tx.status === "completed"
                                  ? "bg-success/20 text-success"
                                  : "bg-warning/20 text-warning"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </TableCell>
                        </TableRow>
                        <AnimatePresence>
                          {expandedRow === tx.id && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{
                                opacity: { duration: 0.2 },
                                height: { duration: 0.2 },
                              }}
                            >
                              <td colSpan={8}>
                                <Card className="m-2">
                                  <CardHeader>
                                    <CardTitle>Детали транзакции</CardTitle>
                                  </CardHeader>
                                  <CardContent className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        ID транзакции
                                      </p>
                                      <p className="font-mono">
                                        {tx.transactionId}
                                      </p>
                                    </div>
                                    {tx.input_addresses && (
                                      <div>
                                        <p className="text-sm text-muted-foreground">
                                          Входные адреса
                                        </p>
                                        <p className="font-mono">
                                          {tx.input_addresses}
                                        </p>
                                      </div>
                                    )}
                                    {tx.recipient_wallet_address && (
                                      <div>
                                        <p className="text-sm text-muted-foreground">
                                          Адрес получателя
                                        </p>
                                        <p className="font-mono">
                                          {tx.recipient_wallet_address}
                                        </p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Сумма
                                      </p>
                                      <p>{tx.amount}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Валюта
                                      </p>
                                      <p>{tx.currency}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Статус
                                      </p>
                                      <p>{tx.status}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Тип
                                      </p>
                                      <p>{tx.type}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Дата создания
                                      </p>
                                      <p>
                                        {format(
                                          new Date(tx.createdAt),
                                          "dd.MM.yyyy HH:mm",
                                          {
                                            locale: ru,
                                          },
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Дата обновления
                                      </p>
                                      <p>
                                        {format(
                                          new Date(tx.updatedAt),
                                          "dd.MM.yyyy HH:mm",
                                          {
                                            locale: ru,
                                          },
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Изображение
                                      </p>
                                      <img
                                        src={tx.photo_url ?? ""}
                                        alt="Transaction"
                                      />
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Детали для пользователя
                                      </p>
                                      <p>{tx.details_for_user}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Валюта парной транзакции
                                      </p>
                                      <p>{tx.pair_transaction_currency}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Заблокирована
                                      </p>
                                      <p>{tx.is_blocked ? "Да" : "Нет"}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Сеть
                                      </p>
                                      <p>{tx.network}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Криптовалютная биржа
                                      </p>
                                      <p>{tx.cryptocurrency_exchange}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Filters block */}
        <Card>
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Период</label>
              <DatePickerWithRange
                //@ts-ignore

                value={dateRange}
                onChange={setDateRange}
                selectsRange
                locale={ru}
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
