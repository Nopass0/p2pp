"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileIcon, FileText } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Типы данных
type Attachment = {
  name: string;
  size: number;
  extension: string;
  file_name: string;
  created_at: string;
  original_url: string;
  custom_properties: { fake: boolean };
};

type Transaction = {
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
  approvedAt: Date | null;
  createdAt: Date;
  attachments: Attachment[];
  traderId: number | null;
  traderName: string | null;
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

const STATUS_INFO = {
  2: { label: "В процессе", color: "text-yellow-500 bg-yellow-50" },
  3: { label: "Успешно", color: "text-green-500 bg-green-50" },
  7: { label: "Ошибка", color: "text-red-500 bg-red-50" },
  8: { label: "Отменено", color: "text-gray-500 bg-gray-50" },
  9: { label: "Отклонено", color: "text-red-500 bg-red-50" },
} as const;

// Компоненты
const StatusBadge = ({ status }: { status: number }) => {
  const info = STATUS_INFO[status as keyof typeof STATUS_INFO] || {
    label: `Статус ${status}`,
    color: "text-gray-500 bg-gray-50",
  };

  return (
    <span
      className={cn("rounded-full px-2 py-1 text-xs font-medium", info.color)}
    >
      {info.label}
    </span>
  );
};

const TableSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex space-x-4">
        <Skeleton className="h-8 w-full" />
      </div>
    ))}
  </div>
);

const UpdateCookiesDialog = ({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (cookies: string) => void;
}) => {
  const [cookies, setCookies] = useState("");

  const handleSave = useCallback(() => {
    onSave(cookies);
    setCookies("");
    onOpenChange(false);
  }, [cookies, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Обновить куки</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Вставьте новые куки..."
            value={cookies}
            onChange={(e) => setCookies(e.target.value)}
            className="min-h-[200px]"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setCookies("");
              onOpenChange(false);
            }}
          >
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DataTableView = ({
  transactions,
  onRowClick,
}: {
  transactions: Transaction[];
  onRowClick: (tx: Transaction) => void;
}) => (
  <div className="relative h-full w-full">
    <div className="absolute inset-0 overflow-auto">
      <div className="inline-block min-w-full align-middle">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-[140px]">Дата</TableHead>
              <TableHead className="w-[140px]">ID</TableHead>
              <TableHead className="w-[200px]">Кошелек</TableHead>
              <TableHead className="w-[120px] text-right">RUB</TableHead>
              <TableHead className="w-[120px] text-right">USDT</TableHead>
              <TableHead className="w-[120px]">Статус</TableHead>
              <TableHead className="w-[140px]">Банк</TableHead>
              <TableHead className="w-[120px] text-right">Курс</TableHead>
              <TableHead className="w-[80px]">Файлы</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow
                key={tx.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => onRowClick(tx)}
              >
                <TableCell>{formatDate(tx.createdAt)}</TableCell>
                <TableCell className="font-mono text-xs">
                  {tx.transactionId}
                </TableCell>
                <TableCell>{tx.wallet}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatMoney(tx.amountRub)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatMoney(tx.amountUsdt)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={tx.status} />
                </TableCell>
                <TableCell>{tx.bankLabel || "-"}</TableCell>
                <TableCell className="text-right font-mono">
                  {tx.course ? formatMoney(tx.course) : "-"}
                </TableCell>
                <TableCell>
                  {tx.attachments?.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium">
                      {tx.attachments.length}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
);

const TransactionDetails = ({ transaction }: { transaction: Transaction }) => (
  <div className="mt-6 grid gap-6">
    {/* Основная информация */}
    <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Сумма RUB</p>
        <p className="font-mono text-lg font-medium">
          {formatMoney(transaction.amountRub)}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Сумма USDT</p>
        <p className="font-mono text-lg font-medium">
          {formatMoney(transaction.amountUsdt)}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Курс</p>
        <p className="font-mono text-lg font-medium">
          {transaction.course ? formatMoney(transaction.course) : "-"}
        </p>
      </div>
      {transaction.successRate && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Успешность</p>
          <p className="font-mono text-lg font-medium">
            {transaction.successRate}%
          </p>
        </div>
      )}
    </div>

    {/* Детали */}
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-sm text-muted-foreground">Кошелек</p>
        <p className="font-mono">{transaction.wallet}</p>
      </div>
      {transaction.bankLabel && (
        <div>
          <p className="text-sm text-muted-foreground">Банк</p>
          <p>{transaction.bankLabel}</p>
        </div>
      )}
      {transaction.traderName && (
        <div>
          <p className="text-sm text-muted-foreground">Трейдер</p>
          <p>{transaction.traderName}</p>
        </div>
      )}
      <div>
        <p className="text-sm text-muted-foreground">Создано</p>
        <p>{formatDate(transaction.createdAt)}</p>
      </div>
      {transaction.approvedAt && (
        <div>
          <p className="text-sm text-muted-foreground">Подтверждено</p>
          <p>{formatDate(transaction.approvedAt)}</p>
        </div>
      )}
    </div>

    {/* Прикрепленные файлы */}
    {transaction.attachments?.length > 0 && (
      <div className="space-y-3 rounded-lg border p-4">
        <p className="font-medium">Прикрепленные файлы</p>
        <div className="grid gap-2">
          {transaction.attachments.map((file) => (
            <a
              key={file.file_name}
              href={`https://cdn.gate.cx/${file.original_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              {file.extension.toLowerCase() === "pdf" ? (
                <FileText className="h-5 w-5 text-red-500" />
              ) : (
                <FileIcon className="h-5 w-5 text-blue-500" />
              )}
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(file.created_at)} ·{" "}
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Основной компонент
export default function GateParserPage() {
  // State
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Hooks
  const { toast } = useToast();

  const [isUpdateCookiesOpen, setIsUpdateCookiesOpen] = useState(false);
  const { mutate: saveCookies } = api.gate.saveCookies.useMutation({
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Куки успешно обновлены",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveCookies = useCallback(
    (cookies: string) => {
      saveCookies({ cookies });
    },
    [saveCookies],
  );

  // Query with debounce
  const {
    data: transactions,
    isLoading,
    error,
    refetch,
  } = api.gate.getTransactions.useQuery(
    {
      search,
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    },
    {
      retry: 3,
      retryDelay: 1000,
      enabled: !!dateRange.from && !!dateRange.to,
      //@ts-ignore

      onError: (error) => {
        toast({
          title: "Ошибка загрузки",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  );

  // Effects
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refetch();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search, dateRange, refetch]);

  // Handlers
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

  const handleRowClick = useCallback((tx: Transaction) => {
    setSelectedTx(tx);
  }, []);

  const handleDialogClose = useCallback(() => {
    setSelectedTx(null);
  }, []);

  return (
    <div className="container flex h-[calc(100vh-2rem)] flex-col py-6">
      <Card className="flex flex-1 flex-col">
        <CardHeader>
          <CardTitle>Транзакции Gate</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col space-y-4">
            {/* Фильтры */}
            <div className="flex gap-4">
              <Input
                placeholder="Поиск..."
                value={search}
                onChange={handleSearch}
                className="max-w-xs"
              />
              <DatePickerWithRange
                value={dateRange}
                onChange={handleDateChange}
              />
              <Button
                variant="outline"
                onClick={() => setIsUpdateCookiesOpen(true)}
              >
                Обновить куки
              </Button>
            </div>

            {/* Контент */}
            <div className="flex-1 rounded-md border">
              {isLoading ? (
                <TableSkeleton />
              ) : error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              ) : !transactions?.length ? (
                <div className="p-4 text-center text-muted-foreground">
                  Нет данных для отображения
                </div>
              ) : (
                <DataTableView
                  //@ts-ignore

                  transactions={transactions}
                  onRowClick={handleRowClick}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <UpdateCookiesDialog
        open={isUpdateCookiesOpen}
        onOpenChange={setIsUpdateCookiesOpen}
        onSave={handleSaveCookies}
      />

      {/* Детали транзакции */}
      <Dialog open={!!selectedTx} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
          <AnimatePresence mode="wait">
            {selectedTx && (
              <motion.div
                key={selectedTx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <span>Транзакция {selectedTx.transactionId}</span>
                    <StatusBadge status={selectedTx.status} />
                  </DialogTitle>
                </DialogHeader>

                <TransactionDetails transaction={selectedTx} />
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
