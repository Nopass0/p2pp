"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Компоненты для отображения деталей транзакций
const TransactionDetailsDialog = ({ selectedItem, selectedTab, onClose }) => {
  if (!selectedItem) return null;

  return (
    <Dialog open={!!selectedItem} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {selectedTab === "gate" && "Детали Gate транзакции"}
            {selectedTab === "p2p" && "Детали P2P транзакции"}
            {selectedTab === "matches" && "Детали сопоставления"}
          </DialogTitle>
        </DialogHeader>
        {selectedTab === "gate" ? (
          <GateDetails transaction={selectedItem} />
        ) : selectedTab === "p2p" ? (
          <P2PDetails transaction={selectedItem} />
        ) : (
          <MatchDetails match={selectedItem} />
        )}
      </DialogContent>
    </Dialog>
  );
};

// Детали Gate транзакции
const GateDetails = ({ transaction }) => (
  <div className="grid gap-6">
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">ID</p>
            <p className="font-mono">{transaction.transactionId}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Статус</p>
            {/* @ts-ignore */}

            <Badge variant={transaction.status === 3 ? "success" : "default"}>
              {transaction.status}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">USDT</p>
            <p className="font-mono">{transaction.amountUsdt?.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">RUB</p>
            <p className="font-mono">{transaction.amountRub?.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Платежные детали</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Кошелек</p>
            <p className="break-all font-mono">{transaction.wallet}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Банк</p>
            <p>{transaction.bankLabel || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Метод</p>
            <p>{transaction.paymentMethod || "-"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Детали P2P транзакции
const P2PDetails = ({ transaction }) => (
  <div className="grid gap-6">
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Telegram ID
            </p>
            <p className="font-mono">{transaction.telegramId}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Статус</p>
            <Badge
              //@ts-ignore

              variant={
                transaction.status === "completed" ? "success" : "default"
              }
            >
              {transaction.status}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">USDT</p>
            <p className="font-mono">{transaction.amount?.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">RUB</p>
            <p className="font-mono">{transaction.totalRub?.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Детали сделки</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Покупатель
            </p>
            <p>{transaction.buyerName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Метод</p>
            <p>{transaction.method}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Курс</p>
            <p className="font-mono">{transaction.price?.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Детали матча
const MatchDetails = ({ match }) => (
  <div className="grid gap-6">
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Основная информация</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Тип</p>
          {/* @ts-ignore */}

          <Badge variant={match.isAutoMatched ? "success" : "default"}>
            {match.isAutoMatched ? "Авто" : "Ручное"}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Разница времени
          </p>
          <p className="font-mono">{match.timeDifference} мин</p>
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">P2P транзакция</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">ID</p>
            <p className="font-mono">{match.p2pTxId}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">USDT</p>
            <p className="font-mono">
              {match.P2PTransaction?.amount?.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gate транзакция</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">ID</p>
            <p className="font-mono">{match.gateTxId}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">USDT</p>
            <p className="font-mono">
              {match.GateTransaction?.amountUsdt?.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Таблица с данными
const DataTable = ({ data = [], isLoading, columns, onRowClick }) => {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {/* @ts-ignore */}

        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className="h-12">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* @ts-ignore */}

          {data.map((item) => (
            <TableRow
              key={item.id}
              className="h-12 cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(item)}
            >
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.format ? col.format(item[col.key]) : item[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {/* @ts-ignore */}

          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Нет данных для отображения
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

// Основной компонент
export default function AdminParserPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("gate");
  const [selectedItem, setSelectedItem] = useState(null);
  const [dateRange, setDateRange] = useState({
    //@ts-ignore

    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    //@ts-ignore

    to: new Date(),
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Запросы данных
  const { data: gateTransactions, isLoading: isLoadingGate } =
    api.gate.getAllTransactions.useQuery({
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    });

  const { data: p2pTransactions, isLoading: isLoadingP2P } =
    api.wallet.getAllP2PTransactions.useQuery({
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    });

  const { data: matches, isLoading: isLoadingMatches } =
    api.wallet.getAllMatches.useQuery({
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    });

  // Колонки для таблиц
  const gateColumns = [
    { key: "id", label: "ID" },
    { key: "wallet", label: "Кошелек" },
    {
      key: "amountUsdt",
      label: "Сумма USDT",
      format: (value) => value?.toFixed(2),
    },
    {
      key: "amountRub",
      label: "Сумма RUB",
      format: (value) => value?.toFixed(2),
    },
    {
      key: "status",
      label: "Статус",
      format: (value) => (
        //@ts-ignore

        <Badge variant={value === 3 ? "success" : "default"}>{value}</Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Дата создания",
      //@ts-ignore

      format: (value) => format(new Date(value), "dd.MM.yyyy HH:mm"),
    },
  ];

  const p2pColumns = [
    { key: "id", label: "ID" },
    { key: "telegramId", label: "Telegram ID" },
    {
      key: "amount",
      label: "Сумма USDT",
      format: (value) => value?.toFixed(2),
    },
    {
      key: "status",
      label: "Статус",
      format: (value) => (
        //@ts-ignore

        <Badge variant={value === "completed" ? "success" : "default"}>
          {value}
        </Badge>
      ),
    },
    {
      key: "completedAt",
      label: "Дата завершения",
      //@ts-ignore

      format: (value) => format(new Date(value), "dd.MM.yyyy HH:mm"),
    },
  ];

  const matchColumns = [
    { key: "id", label: "ID" },
    { key: "p2pTxId", label: "P2P ID" },
    { key: "gateTxId", label: "Gate ID" },
    {
      key: "isAutoMatched",
      label: "Тип",
      format: (value) => (
        //@ts-ignore

        <Badge variant={value ? "success" : "default"}>
          {value ? "Авто" : "Ручное"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Дата создания",
      //@ts-ignore

      format: (value) => format(new Date(value), "dd.MM.yyyy HH:mm"),
    },
  ];

  const [averageRevenue, setAverageRevenue] = useState(() => 0);

  useEffect(() => {
    if (gateTransactions && p2pTransactions) {
      const gateFee = 0.009; // 0.9%
      const gateRevenue = gateTransactions.reduce(
        (sum, tx) => sum + tx.amountUsdt / tx.course,
        0,
      );
      const p2pRevenue = p2pTransactions.reduce(
        (sum, tx) => sum + (tx.amount * tx.price - tx.totalRub) / tx.price,
        0,
      );
      setAverageRevenue((gateRevenue + p2pRevenue) / 2);
    }
  }, [gateTransactions, p2pTransactions]);

  return (
    <div className="container flex h-[calc(100vh-2rem)] w-full flex-col space-y-4 py-6">
      <Card className="w-full flex-1">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-4">
              <p>Административная панель</p>
              <div className="ml-10 flex items-center gap-4">
                <div className="flex items-center rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                  <p>Средневзвешенный спред: {averageRevenue} RUB</p>
                </div>
              </div>
            </CardTitle>
            <div className="flex items-center gap-4">
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[300px]"
              />
              <DatePickerWithRange
                value={dateRange}
                onChange={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          {/* @ts-ignore */}

          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="flex h-full flex-col"
          >
            <TabsList className="w-full justify-start rounded-none border-b px-6">
              <TabsTrigger value="gate">Gate транзакции</TabsTrigger>
              <TabsTrigger value="p2p">P2P транзакции</TabsTrigger>
              <TabsTrigger value="matches">Совпадения</TabsTrigger>
            </TabsList>

            <div className="flex-1 p-6">
              <TabsContent value="gate" className="m-0 h-full">
                <DataTable
                  data={gateTransactions}
                  isLoading={isLoadingGate}
                  columns={gateColumns}
                  onRowClick={setSelectedItem}
                />
              </TabsContent>

              <TabsContent value="p2p" className="m-0 h-full">
                <DataTable
                  data={p2pTransactions}
                  isLoading={isLoadingP2P}
                  columns={p2pColumns}
                  onRowClick={setSelectedItem}
                />
              </TabsContent>

              <TabsContent value="matches" className="m-0 h-full">
                <DataTable
                  data={matches}
                  isLoading={isLoadingMatches}
                  columns={matchColumns}
                  onRowClick={setSelectedItem}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <TransactionDetailsDialog
        selectedItem={selectedItem}
        selectedTab={selectedTab}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
