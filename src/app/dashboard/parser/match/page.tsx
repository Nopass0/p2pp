"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Обновленные типы с правильными типами данных для дат
type P2PTransaction = {
  id: number;
  telegramId: string;
  status: string;
  amount: number;
  totalRub: number;
  price: number;
  buyerName: string;
  method: string;
  completedAt: string; // Дата приходит как строка с сервера
};

type GateTransaction = {
  id: number;
  transactionId: string;
  wallet: string;
  amountRub: number;
  amountUsdt: number;
  totalRub: number;
  totalUsdt: number;
  status: number;
  bankName: string | null;
  bankLabel: string | null;
  course: number | null;
  approvedAt: string | null; // Дата приходит как строка с сервера
};

type Match = {
  id: number;
  userId: number;
  p2pTxId: number;
  gateTxId: number;
  isAutoMatched: boolean;
  timeDifference: number;
  createdAt: string; // Дата приходит как строка с сервера
  P2PTransaction: P2PTransaction;
  GateTransaction: GateTransaction;
};

type MatchResponse = {
  items: Match[];
  total: number;
};

// Компоненты
const TableSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex space-x-4">
        <Skeleton className="h-8 w-full" />
      </div>
    ))}
  </div>
);

const Stats = ({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) => {
  const { data: stats } = api.wallet.getTransactionStats.useQuery(
    {
      startDate,
      endDate,
    },
    {
      refetchInterval: 30000,
    },
  );

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Общая прибыль (USDT)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-green-500">
              {stats?.totalProfit ? formatMoney(stats.totalProfit) : "0.00"}
            </div>
            <div className="mb-1 text-sm text-muted-foreground">
              за период • {stats?.matchesCount || 0} сделок
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Непроматченные P2P
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="text-2xl font-bold">{stats?.unmatchedP2P || 0}</div>
            <div className="mb-1 text-sm text-muted-foreground">сделок</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Непроматченные Gate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="text-2xl font-bold">
              {stats?.unmatchedGate || 0}
            </div>
            <div className="mb-1 text-sm text-muted-foreground">сделок</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Утилиты
const formatDate = (date: Date | string | null) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const calculateSpread = (match: Match) => {
  return Math.abs(
    match.P2PTransaction.amount - match.GateTransaction.totalUsdt,
  );
};

const TransactionDetails = ({ match }: { match: Match }) => (
  <div className="mt-6 grid gap-6">
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">P2P Транзакция</h3>
        <Badge variant="outline">{match.P2PTransaction.method}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Сумма USDT</p>
          <p className="font-mono text-lg font-medium">
            {formatMoney(match.P2PTransaction.amount)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Сумма RUB</p>
          <p className="font-mono text-lg font-medium">
            {formatMoney(match.P2PTransaction.totalRub)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Курс</p>
          <p className="font-mono text-lg font-medium">
            {formatMoney(match.P2PTransaction.price)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Покупатель</p>
          <p className="font-mono">{match.P2PTransaction.buyerName}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Telegram ID</p>
          <p className="font-mono">{match.P2PTransaction.telegramId}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Дата завершения</p>
          <p className="font-mono">
            {formatDate(match.P2PTransaction.completedAt)}
          </p>
        </div>
      </div>
    </div>

    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Gate Транзакция</h3>
        <Badge variant="outline">{match.GateTransaction.transactionId}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Сумма USDT</p>
          <p className="font-mono text-lg font-medium">
            {formatMoney(match.GateTransaction.totalUsdt)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Сумма RUB</p>
          <p className="font-mono text-lg font-medium">
            {formatMoney(match.GateTransaction.amountRub)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Курс</p>
          <p className="font-mono text-lg font-medium">
            {match.GateTransaction.course
              ? formatMoney(match.GateTransaction.course)
              : "-"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Банк</p>
          <p className="font-mono">{match.GateTransaction.bankLabel || "-"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Кошелек</p>
          <p className="font-mono">{match.GateTransaction.wallet}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Дата подтверждения</p>
          <p className="font-mono">
            {formatDate(match.GateTransaction.approvedAt)}
          </p>
        </div>
      </div>
    </div>

    <div className="rounded-lg border bg-muted/50 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Разница во времени</p>
          <p className="font-mono text-lg font-medium">
            {match.timeDifference} минут
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Спред USDT</p>
          <p className="font-mono text-lg font-medium">
            {formatMoney(calculateSpread(match))}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Тип сопоставления</p>
          <Badge variant={match.isAutoMatched ? "default" : "secondary"}>
            {match.isAutoMatched ? "Автоматическое" : "Ручное"}
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Дата сопоставления</p>
          <p className="font-mono">{formatDate(match.createdAt)}</p>
        </div>
      </div>
    </div>
  </div>
);

export default function MatchParserPage() {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const { toast } = useToast();

  const {
    data: matches,
    isLoading,
    error,
    refetch,
  } = api.wallet.getMatches.useQuery<Match[]>(
    {
      search,
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    },
    {
      retry: 3,
      retryDelay: 1000,
      enabled: !!dateRange.from && !!dateRange.to,
    },
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refetch();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search, dateRange, refetch]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleDateChange = useCallback(
    (range: { from: Date; to: Date | undefined } | undefined) => {
      if (range?.from && range?.to) {
        setDateRange({ from: range.from, to: range.to });
      }
    },
    [],
  );

  const handleSelectMatch = useCallback((match: Match) => {
    setSelectedMatch(match);
  }, []);

  return (
    <div className="container flex h-[calc(100vh-2rem)] flex-col py-6">
      <Card className="flex flex-1 flex-col">
        <CardHeader>
          <CardTitle>Сопоставление транзакций</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Поиск по всем полям..."
                value={search}
                onChange={handleSearch}
                className="max-w-xs"
              />
              <DatePickerWithRange
                value={dateRange}
                onChange={handleDateChange}
              />
            </div>

            <Stats
              startDate={dateRange.from.toISOString()}
              endDate={dateRange.to.toISOString()}
            />

            <div className="flex-1 rounded-md border">
              {isLoading ? (
                <TableSkeleton />
              ) : error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              ) : !matches?.length ? (
                <div className="p-4 text-center text-muted-foreground">
                  Нет найденных совпадений
                </div>
              ) : (
                <div className="relative h-full w-full">
                  <div className="absolute inset-0 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-background">
                        <TableRow>
                          <TableHead className="w-[140px]">Дата</TableHead>
                          <TableHead className="w-[120px]">P2P Сумма</TableHead>
                          <TableHead className="w-[120px]">
                            Gate Сумма
                          </TableHead>
                          <TableHead className="w-[120px]">
                            Спред USDT
                          </TableHead>
                          <TableHead className="w-[140px]">
                            Разница во времени
                          </TableHead>
                          <TableHead className="w-[120px]">Тип</TableHead>
                          <TableHead className="w-[140px]">
                            Покупатель
                          </TableHead>
                          <TableHead className="w-[140px]">Банк</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matches.map((match: Match) => (
                          <TableRow
                            key={match.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSelectMatch(match)}
                          >
                            <TableCell>{formatDate(match.createdAt)}</TableCell>
                            <TableCell className="font-mono">
                              {formatMoney(match.P2PTransaction.amount)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatMoney(match.GateTransaction.totalUsdt)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatMoney(calculateSpread(match))}
                            </TableCell>
                            <TableCell>{match.timeDifference} мин</TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-1 text-xs font-medium",
                                  match.isAutoMatched
                                    ? "bg-green-50 text-green-500"
                                    : "bg-blue-50 text-blue-500",
                                )}
                              >
                                {match.isAutoMatched ? "Авто" : "Ручной"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {match.P2PTransaction.buyerName}
                            </TableCell>
                            <TableCell>
                              {match.GateTransaction.bankLabel || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Диалог деталей матча */}
      <Dialog
        open={!!selectedMatch}
        onOpenChange={() => setSelectedMatch(null)}
      >
        <DialogContent className="max-w-3xl">
          <AnimatePresence mode="wait">
            {selectedMatch && (
              <motion.div
                key={selectedMatch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Детали сопоставления</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          selectedMatch.isAutoMatched ? "default" : "secondary"
                        }
                      >
                        {selectedMatch.isAutoMatched
                          ? "Автоматическое"
                          : "Ручное"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(selectedMatch.createdAt)}
                      </span>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <TransactionDetails match={selectedMatch} />
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
