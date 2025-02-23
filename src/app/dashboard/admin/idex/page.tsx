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
  const [dateRange, setDateRange] = useState<{
    from: string;
    to: string;
    fromTime: string;
    toTime: string;
  }>({
    from: addDays(new Date(), -7).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
    fromTime: "00:00",
    toTime: "23:59",
  });

  const { data, isLoading } = api.admin.getIdexStats.useQuery({
    dateRange: {
      from: `${dateRange.from}T${dateRange.fromTime}:00.000Z`,
      to: `${dateRange.to}T${dateRange.toTime}:59.999Z`,
    },
  }, {
    keepPreviousData: true,
  });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Calculate totals
  const totals = data?.stats.reduce(
    (acc, stat) => ({
      totalUsdt: acc.totalUsdt + stat.totalUsdt,
      transactionCount: acc.transactionCount + stat.transactionCount,
      averageRub: acc.averageRub + stat.averageRub,
      averageUsdt: acc.averageUsdt + stat.averageUsdt,
    }),
    {
      totalUsdt: 0,
      transactionCount: 0,
      averageRub: 0,
      averageUsdt: 0,
    }
  );

  if (totals) {
    totals.averageRub = totals.averageRub / data!.stats.length;
    totals.averageUsdt = totals.averageUsdt / data!.stats.length;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Статистика IDEX кабинетов</CardTitle>
          <div className="flex items-center space-x-2">
            {/* From Date */}
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      format(new Date(dateRange.from), "dd.MM.yyyy")
                    ) : (
                      <span>От</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="single"
                    selected={new Date(dateRange.from)}
                    onSelect={(date) => {
                      if (date) {
                        setDateRange((prev) => ({
                          ...prev,
                          from: date.toISOString().split("T")[0],
                        }));
                      }
                    }}
                  />
                  <div className="border-t p-3">
                    <Input
                      type="time"
                      value={dateRange.fromTime}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          fromTime: e.target.value,
                        }))
                      }
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* To Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? (
                      format(new Date(dateRange.to), "dd.MM.yyyy")
                    ) : (
                      <span>До</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="single"
                    selected={new Date(dateRange.to)}
                    onSelect={(date) => {
                      if (date) {
                        setDateRange((prev) => ({
                          ...prev,
                          to: date.toISOString().split("T")[0],
                        }));
                      }
                    }}
                  />
                  <div className="border-t p-3">
                    <Input
                      type="time"
                      value={dateRange.toTime}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          toTime: e.target.value,
                        }))
                      }
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID IDEX</TableHead>
                  <TableHead className="text-right">
                    Сумма USDT
                    {totals && (
                      <div className="text-xs text-muted-foreground">
                        Всего: {formatNumber(totals.totalUsdt)}
                      </div>
                    )}
                  </TableHead>
                  <TableHead className="text-right">
                    Кол-во транзакций
                    {totals && (
                      <div className="text-xs text-muted-foreground">
                        Всего: {totals.transactionCount}
                      </div>
                    )}
                  </TableHead>
                  <TableHead className="text-right">
                    Средний чек RUB
                    {totals && (
                      <div className="text-xs text-muted-foreground">
                        Среднее: {formatNumber(totals.averageRub)}
                      </div>
                    )}
                  </TableHead>
                  <TableHead className="text-right">
                    Средний чек USDT
                    {totals && (
                      <div className="text-xs text-muted-foreground">
                        Среднее: {formatNumber(totals.averageUsdt)}
                      </div>
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.stats.map((stat) => (
                  <TableRow key={stat.idexId}>
                    <TableCell>{stat.idexId}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(stat.totalUsdt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.transactionCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(stat.averageRub)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(stat.averageUsdt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}