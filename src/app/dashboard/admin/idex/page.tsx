"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminIdexPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: addDays(new Date(), -7).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const { data, isLoading } = api.admin.getIdexRecords.useQuery({
    page,
    search,
    dateRange,
    sortBy,
    sortDirection,
  }, {
    keepPreviousData: true
  });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatPercent = (num: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num / 100);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: ru });
  };

  const getStatusBadgeStyle = (status: number) => {
    switch (status) {
      case 1:
        return "bg-green-500/20 text-green-500 hover:bg-green-500/30";
      case 2:
        return "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30";
      case 3:
        return "bg-red-500/20 text-red-500 hover:bg-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-500 hover:bg-gray-500/30";
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1:
        return "Успешно";
      case 2:
        return "В обработке";
      case 3:
        return "Отменено";
      default:
        return "Неизвестно";
    }
  };

  const exportToCsv = () => {
    if (!data?.records) return;

    const headers = [
      'ID IDEX',
      'ID транзакции',
      'Сотрудник',
      'Кошелек',
      'Сумма RUB',
      'Сумма USDT',
      'Итого RUB',
      'Итого USDT',
      'Курс',
      'Банк',
      'Метка банка',
      'Метод оплаты',
      'Успешность',
      'Статус',
      'Дата'
    ];

    const csvContent = [
      headers.join(','),
      ...data.records.map(record => [
        record.idexId,
        record.transactionId,
        `${record.user.firstName} ${record.user.lastName}`,
        record.wallet,
        record.amountRub,
        record.amountUsdt,
        record.totalRub,
        record.totalUsdt,
        record.course || '',
        record.bankName || '',
        record.bankLabel || '',
        record.paymentMethod || '',
        record.successRate || '',
        getStatusText(record.status),
        formatDate(record.createdAt)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `idex_transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const CardSkeleton = () => (
    <Card className="bg-background text-foreground">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-[100px]" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[120px]" />
      </CardContent>
    </Card>
  );

  const TableRowSkeleton = () => (
    <TableRow className="hover:bg-muted/50">
      {Array(14).fill(0).map((_, i) => (
        <TableCell key={i} className="text-foreground">
          <Skeleton className="h-4 w-[80px]" />
        </TableCell>
      ))}
    </TableRow>
  );

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-foreground">IDEX Транзакции</h1>
            <Button onClick={exportToCsv} variant="outline" className="gap-2">
              <Download size={16} />
              Экспорт CSV
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 mb-4">
            <Input
              placeholder="Поиск (ID IDEX, ID транзакции, кошелек, банк и т.д.)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md bg-background text-foreground"
            />
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? formatDate(dateRange.from) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(dateRange.from)}
                    onSelect={(date) =>
                      setDateRange(prev => ({
                        ...prev,
                        from: date?.toISOString().split('T')[0] || prev.from
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-foreground">—</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? formatDate(dateRange.to) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(dateRange.to)}
                    onSelect={(date) =>
                      setDateRange(prev => ({
                        ...prev,
                        to: date?.toISOString().split('T')[0] || prev.to
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-background text-foreground">
                <SelectValue placeholder="Сортировать по" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Дата создания</SelectItem>
                <SelectItem value="amountRub">Сумма RUB</SelectItem>
                <SelectItem value="amountUsdt">Сумма USDT</SelectItem>
                <SelectItem value="totalRub">Итого RUB</SelectItem>
                <SelectItem value="totalUsdt">Итого USDT</SelectItem>
                <SelectItem value="course">Курс</SelectItem>
                <SelectItem value="successRate">Успешность</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={sortDirection === "desc" ? "default" : "outline"}
              onClick={() => setSortDirection(sortDirection === "desc" ? "asc" : "desc")}
            >
              {sortDirection === "desc" ? "По убыванию" : "По возрастанию"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {isLoading ? (
            Array(8).fill(0).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <Card className="bg-background text-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Сумма RUB</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.totals ? formatNumber(data.totals.amountRub) : "0"} ₽
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background text-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Сумма USDT</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.totals ? formatNumber(data.totals.amountUsdt) : "0"} USDT
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background text-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Итого RUB</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.totals ? formatNumber(data.totals.totalRub) : "0"} ₽
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background text-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Итого USDT</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.totals ? formatNumber(data.totals.totalUsdt) : "0"} USDT
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background text-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Средний курс</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.totals ? formatNumber(data.totals.course) : "0"}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background text-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Успешных транзакций</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.totals ? data.totals.successCount : "0"}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background text-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Средняя успешность</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.totals ? formatPercent(data.totals.successRate) : "0%"}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="bg-background rounded-lg shadow overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                <TableHead className="text-foreground font-medium">ID IDEX</TableHead>
                <TableHead className="text-foreground font-medium">ID транзакции</TableHead>
                <TableHead className="text-foreground font-medium">Сотрудник</TableHead>
                <TableHead className="text-foreground font-medium">Кошелек</TableHead>
                <TableHead className="text-foreground font-medium text-right">Сумма RUB</TableHead>
                <TableHead className="text-foreground font-medium text-right">Сумма USDT</TableHead>
                <TableHead className="text-foreground font-medium text-right">Итого RUB</TableHead>
                <TableHead className="text-foreground font-medium text-right">Итого USDT</TableHead>
                <TableHead className="text-foreground font-medium text-right">Курс</TableHead>
                <TableHead className="text-foreground font-medium">Банк</TableHead>
                <TableHead className="text-foreground font-medium">Метка банка</TableHead>
                <TableHead className="text-foreground font-medium">Метод оплаты</TableHead>
                <TableHead className="text-foreground font-medium text-right">Успешность</TableHead>
                <TableHead className="text-foreground font-medium">Статус</TableHead>
                <TableHead className="text-foreground font-medium">Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(10).fill(0).map((_, i) => <TableRowSkeleton key={i} />)
              ) : (
                data?.records.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/50">
                    <TableCell className="text-foreground font-mono">
                      <Badge variant="outline" className="font-mono">{record.idexId}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground font-mono">
                      <Badge variant="outline" className="font-mono">{record.transactionId}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      <Badge variant="secondary">{record.user.firstName} {record.user.lastName}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground font-mono">
                      <Badge variant="outline" className="font-mono">{record.wallet}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground text-right">
                      <Badge variant="secondary">{formatNumber(record.amountRub)} ₽</Badge>
                    </TableCell>
                    <TableCell className="text-foreground text-right">
                      <Badge variant="secondary">{formatNumber(record.amountUsdt)} USDT</Badge>
                    </TableCell>
                    <TableCell className="text-foreground text-right">
                      <Badge variant="secondary">{formatNumber(record.totalRub)} ₽</Badge>
                    </TableCell>
                    <TableCell className="text-foreground text-right">
                      <Badge variant="secondary">{formatNumber(record.totalUsdt)} USDT</Badge>
                    </TableCell>
                    <TableCell className="text-foreground text-right">
                      <Badge variant="secondary">{record.course ? formatNumber(record.course) : "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      <Badge variant="outline">{record.bankName || "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      <Badge variant="outline">{record.bankLabel || "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      <Badge variant="outline">{record.paymentMethod || "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground text-right">
                      <Badge variant="secondary">{record.successRate ? formatPercent(record.successRate) : "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      <Badge className={getStatusBadgeStyle(record.status)}>{getStatusText(record.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground whitespace-nowrap">
                      <Badge variant="outline">{formatDate(record.createdAt)}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-between items-center text-foreground">
          <div>
            Всего записей: {data?.total || 0}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={!data || page >= data.pageCount}
            >
              Вперед
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}