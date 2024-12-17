"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";

interface GateTransaction {
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
  paymentMethod: string | null;
  course: number | null;
  successCount: number | null;
  successRate: number | null;
  usdtBalance: string | null;
  rubBalance: string | null;
  approvedAt: Date | null;
  createdAt: Date;
}

export default function GateParserPage() {
  const [cookies, setCookies] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const utils = api.useContext();

  const { data: transactions, isLoading: isLoadingTransactions } =
    api.gate.getTransactions.useQuery();

  const { mutate: saveCookies } = api.gate.saveCookies.useMutation({
    onSuccess: () => {
      toast({
        title: "Успешно!",
        description: "Куки сохранены и начат парсинг данных",
      });
      setCookies("");
      utils.gate.getTransactions.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Ошибка!",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveCookies = () => {
    if (!cookies.trim()) return;

    try {
      // Пытаемся распарсить JSON если это JSON
      let parsedCookies = cookies;
      try {
        const jsonCookies = JSON.parse(cookies);
        parsedCookies = jsonCookies
          .filter((cookie: any) => cookie.name && cookie.value)
          .map((cookie: any) => `${cookie.name}=${cookie.value}`)
          .join("; ");
      } catch {
        // Если не JSON, используем как есть
      }

      saveCookies({ cookies: parsedCookies });
    } catch (error) {
      toast({
        title: "Ошибка!",
        description: "Неверный формат куки",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const formatStatus = (status: number) => {
    const statuses: Record<number, string> = {
      2: "В процессе",
      3: "Успешно",
      7: "Ошибка",
      8: "Отменено",
      9: "Отклонено",
    };
    return statuses[status] || `Статус ${status}`;
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Gate Parser</CardTitle>
            <CardDescription>
              Вставьте куки из вашего аккаунта Gate для парсинга истории
              операций
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Вставьте куки здесь..."
                  className="min-h-[100px]"
                  value={cookies}
                  onChange={(e) => setCookies(e.target.value)}
                  multiple
                  //@ts-ignore
                  as="textarea"
                />
                <Button
                  onClick={handleSaveCookies}
                  disabled={isLoading || !cookies.trim()}
                >
                  {isLoading ? "Сохранение..." : "Сохранить куки"}
                </Button>
              </div>

              {isLoadingTransactions ? (
                <div className="py-4 text-center">Загрузка транзакций...</div>
              ) : transactions?.length ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Кошелек</TableHead>
                        <TableHead>Сумма RUB</TableHead>
                        <TableHead>Сумма USDT</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Банк</TableHead>
                        <TableHead>Курс</TableHead>
                        <TableHead>Успешность</TableHead>
                        <TableHead>Баланс USDT</TableHead>
                        <TableHead>Баланс RUB</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.transactionId}>
                          <TableCell>
                            {
                              //@ts-ignore
                              formatDate(tx.createdAt)
                            }
                          </TableCell>
                          <TableCell>{tx.wallet}</TableCell>
                          <TableCell>{formatMoney(tx.amountRub)}</TableCell>
                          <TableCell>{formatMoney(tx.amountUsdt)}</TableCell>
                          <TableCell>{formatStatus(tx.status)}</TableCell>
                          <TableCell>{tx.bankName || "-"}</TableCell>
                          <TableCell>
                            {tx.course ? formatMoney(tx.course) : "-"}
                          </TableCell>
                          <TableCell>
                            {tx.successRate ? `${tx.successRate}%` : "-"}
                          </TableCell>
                          <TableCell>{tx.usdtBalance || "-"}</TableCell>
                          <TableCell>{tx.rubBalance || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  Нет данных для отображения
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
