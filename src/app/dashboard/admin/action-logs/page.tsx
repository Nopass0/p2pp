"use client";

import { useState } from "react";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

export default function ActionLogsPage() {
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const { data: logs, isLoading } = api.admin.getActionLogs.useQuery({
    limit: 50,
    startDate: dateRange.from,
    endDate: dateRange.to,
  });

  return (
    <div className="space-y-6">
      <h1 className="mb-4 text-3xl font-bold">Логи действий</h1>
      {/* @ts-ignore */}

      <DateRangePicker onChange={setDateRange} />
      {isLoading ? (
        <div>Загрузка логов действий...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead>Действие</TableHead>
              <TableHead>Детали</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.items.map((log) => (
              <TableRow key={log.id}>
                {/* @ts-ignore */}

                <TableCell>
                  {/* @ts-ignore */}

                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{log.user.username}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.target}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
