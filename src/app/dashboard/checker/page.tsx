"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  XCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { env } from "@/env.js";
import { toast } from "@/components/ui/use-toast";

type GateTransaction = {
  id: number;
  transactionId: string;
  amountRub: number;
  amountUsdt: number;
  createdAt: string;
  userId: number;
  wallet: string;
  status: number;
};

type Receipt = {
  id: number;
  bankLabel: string | null;
  fileName: string;
  fileSize: number;
  filePath: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  gateId: number;
  GateTransaction: GateTransaction;
};

const ITEMS_PER_PAGE = 9; // 3 строки по 3 блока

// Утилиты
const formatDate = (date: string) => {
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

// Компонент для отображения превью PDF
const PDFPreview = ({ url, fileName }: { url: string; fileName: string }) => {
  return (
    <div className="relative h-[200px] w-full overflow-hidden rounded-lg border bg-muted">
      <object data={url} type="application/pdf" className="h-full w-full">
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
          <FileText className="h-8 w-8" />
          <div>
            <div className="font-medium">PDF документ</div>
            <div className="text-xs opacity-70">{fileName}</div>
          </div>
        </div>
      </object>
    </div>
  );
};

export default function CheckerView() {
  const [search, setSearch] = useState("");
  const [filterVerified, setFilterVerified] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Запрос данных
  const { data: receipts, isLoading } = api.receipt.getAll.useQuery<{
    items: Receipt[];
    total: number;
  }>({
    search,
    isVerified: filterVerified,
    dateRange: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
    },
    page,
    limit: ITEMS_PER_PAGE,
  });

  // Мутация для изменения статуса проверки
  const { mutate: setVerified } = api.receipt.setVerified.useMutation({
    onSuccess: () => {
      toast({
        title: "Статус чека обновлен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Скачивание файла
  const handleDownload = async (receiptId: number, fileName: string) => {
    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_SERVICES_URL}/api/receipts/${receiptId}/download`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error("Ошибка загрузки файла");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось скачать файл",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil((receipts?.total || 0) / ITEMS_PER_PAGE);

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Фильтры и пагинация */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <Label>Поиск</Label>
          <Input
            placeholder="Поиск по банку или ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1">
          <Label>Период</Label>
          <DatePickerWithRange
            value={dateRange}
            onChange={(range) => {
              if (range?.from && range?.to) {
                setDateRange({ from: range.from, to: range.to });
                setPage(1); // Сброс страницы при изменении дат
              }
            }}
          />
        </div>

        <div>
          <Label>Фильтр</Label>
          <div className="flex gap-2">
            <Button
              variant={filterVerified === undefined ? "default" : "outline"}
              onClick={() => {
                setFilterVerified(undefined);
                setPage(1);
              }}
            >
              Все
            </Button>
            <Button
              variant={filterVerified === true ? "default" : "outline"}
              onClick={() => {
                setFilterVerified(true);
                setPage(1);
              }}
            >
              Проверенные
            </Button>
            <Button
              variant={filterVerified === false ? "default" : "outline"}
              onClick={() => {
                setFilterVerified(false);
                setPage(1);
              }}
            >
              Непроверенные
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-10 items-center px-2 text-sm">
            Страница {page} из {totalPages || 1}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
            disabled={page === totalPages || !totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Основной контент */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="text-muted-foreground">Загрузка...</div>
          </div>
        ) : !receipts?.items.length ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="text-muted-foreground">Чеки не найдены</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
            {receipts.items.map((receipt) => (
              <Card key={receipt.id} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="mb-4 flex items-start justify-between">
                    <Badge
                      variant={receipt.isVerified ? "default" : "secondary"}
                    >
                      {receipt.isVerified ? "Проверен" : "Не проверен"}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(receipt.id, receipt.fileName);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVerified({
                            id: receipt.id,
                            isVerified: !receipt.isVerified,
                          });
                        }}
                      >
                        {receipt.isVerified ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <PDFPreview
                    url={`${env.NEXT_PUBLIC_SERVICES_URL}/api/receipts/${receipt.id}`}
                    fileName={receipt.fileName}
                  />

                  <div className="mt-4 space-y-2">
                    <div>
                      <Label>ID транзакции</Label>
                      <div className="font-mono text-sm">
                        {receipt.GateTransaction.transactionId}
                      </div>
                    </div>
                    <div>
                      <Label>Банк</Label>
                      <div>{receipt.bankLabel || "Не указан"}</div>
                    </div>
                    <div>
                      <Label>Сумма</Label>
                      <div className="font-mono">
                        {formatMoney(receipt.GateTransaction.amountRub)} RUB /{" "}
                        {formatMoney(receipt.GateTransaction.amountUsdt)} USDT
                      </div>
                    </div>
                    <div>
                      <Label>Дата создания</Label>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(receipt.GateTransaction.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
