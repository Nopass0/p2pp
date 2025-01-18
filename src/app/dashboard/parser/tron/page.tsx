"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronUp, ChevronDown, RefreshCw } from "lucide-react";

export default function P2PTransactionsPage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "completedAt",
    direction: "desc",
  });

  const { data: user, isLoading: isUserLoading } = api.user.me.useQuery();

  const {
    data: transactionsData,
    isLoading: isTransactionsLoading,
    refetch: refetchTransactions,
  } = api.user.getTronTransactions.useQuery(
    {
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
      limit: 100,
      offset: 0,
    },
    {
      enabled: !!user,
    },
  );

  const processedTransactions = useMemo(() => {
    if (!transactionsData?.transactions) return [];
    return transactionsData.transactions
      .filter((tx) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          tx.fromAddress.toLowerCase().includes(query) ||
          tx.toAddress.toLowerCase().includes(query) ||
          tx.amount.toString().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortConfig.key === "timestamp") {
          return sortConfig.direction === "asc"
            ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        if (sortConfig.key === "amount") {
          return sortConfig.direction === "asc"
            ? a.amount - b.amount
            : b.amount - a.amount;
        }
        return 0;
      });
  }, [transactionsData?.transactions, searchQuery, sortConfig]);

  const handleRefresh = async () => {
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
  };

  useEffect(() => {
    if (!user) return;
    const intervalId = setInterval(handleRefresh, 3 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [user]);

  if (isUserLoading || isTransactionsLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col space-y-4 overflow-hidden p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>История Tron транзакций</CardTitle>
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
              <DatePickerWithRange
                value={dateRange}
                onChange={(newDateRange) =>
                  setDateRange(newDateRange as { from: Date; to: Date })
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-16rem)]">
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
                  <TableHead>От</TableHead>
                  <TableHead>Кому</TableHead>
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
                  <TableHead>Тип</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {format(new Date(tx.timestamp), "dd.MM.yyyy HH:mm", {
                        locale: ru,
                      })}
                    </TableCell>
                    <TableCell className="font-mono">
                      {tx.fromAddress}
                    </TableCell>
                    <TableCell className="font-mono">{tx.toAddress}</TableCell>
                    <TableCell>{tx.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          tx.type === "incoming"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {tx.type === "incoming" ? "Входящий" : "Исходящий"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {processedTransactions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
    </div>
  );
}
