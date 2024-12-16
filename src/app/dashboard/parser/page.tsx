"use client";

import { useState } from "react";
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

type Transaction = {
  id: string;
  date: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  comment?: string;
};

export default function ParserPage() {
  const [rawData, setRawData] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const parseTransactions = (text: string): Transaction[] => {
    // Разделяем текст по новым строкам и фильтруем пустые строки
    const lines = text.split('\n').filter(line => line.trim());
    const parsedTransactions: Transaction[] = [];

    // Парсим каждую строку
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Ищем паттерны для различных типов транзакций
      if (line.includes('Transaction')) {
        const dateMatch = line.match(/(\d{2}\.\d{2}\.\d{2} \d{2}:\d{2})/);
        const amountMatch = line.match(/([+-]?\d+(\.\d+)?)\s*(TON|USD|RUB)/i);
        const typeMatch = line.match(/(Received|Sent|Exchanged)/i);
        const statusMatch = line.match(/(Completed|Pending|Failed)/i);
        const commentLine = lines[i + 1]?.includes('Comment:') ? lines[i + 1] : '';

        if (dateMatch && amountMatch) {
          parsedTransactions.push({
            id: crypto.randomUUID(),
            date: dateMatch[1],
            type: typeMatch?.[1] || 'Unknown',
            amount: amountMatch[1],
            currency: amountMatch[3],
            status: statusMatch?.[1] || 'Unknown',
            comment: commentLine ? commentLine.replace('Comment:', '').trim() : undefined
          });
        }
      }
    }

    return parsedTransactions;
  };

  const handleParse = () => {
    try {
      setIsLoading(true);
      const parsed = parseTransactions(rawData);
      setTransactions(parsed);
      
      if (parsed.length === 0) {
        toast({
          title: "Внимание",
          description: "Не найдено транзакций для парсинга",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Успешно",
          description: `Найдено ${parsed.length} транзакций`,
        });
      }
    } catch (error) {
      console.error('Parsing error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось распарсить данные",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
            <CardTitle>P2P Market Telegram Wallet Парсер</CardTitle>
            <CardDescription>
              Вставьте историю операций из вашего Telegram кошелька для анализа
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Вставьте историю операций здесь..."
                  className="min-h-[200px]"
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  multiple
                  as="textarea"
                />
                <Button 
                  onClick={handleParse}
                  disabled={isLoading || !rawData.trim()}
                >
                  {isLoading ? "Парсинг..." : "Парсить"}
                </Button>
              </div>

              {transactions.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Валюта</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Комментарий</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{tx.date}</TableCell>
                          <TableCell>{tx.type}</TableCell>
                          <TableCell>{tx.amount}</TableCell>
                          <TableCell>{tx.currency}</TableCell>
                          <TableCell>{tx.status}</TableCell>
                          <TableCell>{tx.comment || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}