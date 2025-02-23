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
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: addDays(new Date(), -7).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const { data, isLoading } = api.admin.getIdexStats.useQuery({
    dateRange,
  }, {
    keepPreviousData: true
  });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Статистика IDEX кабинетов</CardTitle>
          <div className="flex items-center space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(new Date(dateRange.from), "dd.MM.yyyy")} -{" "}
                        {format(new Date(dateRange.to), "dd.MM.yyyy")}
                      </>
                    ) : (
                      format(new Date(dateRange.from), "dd.MM.yyyy")
                    )
                  ) : (
                    <span>Выберите дату</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  selected={{
                    from: new Date(dateRange.from),
                    to: new Date(dateRange.to),
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({
                        from: range.from.toISOString().split('T')[0],
                        to: range.to.toISOString().split('T')[0],
                      });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID IDEX</TableHead>

                  <TableHead className="text-right">Сумма USDT</TableHead>
                  <TableHead className="text-right">Кол-во транзакций</TableHead>
                  <TableHead className="text-right">Средний чек RUB</TableHead>
                  <TableHead className="text-right">Средний чек USDT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>

                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.stats.map((stat) => (
                  <TableRow key={stat.idexId}>
                    <TableCell>{stat.idexId}</TableCell>
                    <TableCell className="text-right">{formatNumber(stat.totalUsdt)}</TableCell>
                    <TableCell className="text-right">{stat.transactionCount}</TableCell>
                    <TableCell className="text-right">{formatNumber(stat.averageRub)}</TableCell>
                    <TableCell className="text-right">{formatNumber(stat.averageUsdt)}</TableCell>
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