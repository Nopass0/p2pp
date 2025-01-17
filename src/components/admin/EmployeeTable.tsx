"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { api } from "@/trpc/react";

interface EmployeeTableProps {
  limit?: number;
  dateRange: { from: Date; to: Date };
}

export function EmployeeTable({ limit = 10, dateRange }: EmployeeTableProps) {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data: employees, isLoading } = api.admin.getEmployees.useQuery({
    search,
    limit,
    dateRange,
  });

  const handleEmployeeClick = (id: number) => {
    router.push(`/dashboard/admin/employees/${id}`);
  };

  if (isLoading) return <div>Загрузка сотрудников...</div>;

  return (
    <div>
      <Input
        type="text"
        placeholder="Поиск сотрудников..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Имя</TableHead>
            <TableHead>Telegram ID</TableHead>
            <TableHead>Gate ID</TableHead>
            <TableHead>Рабочее время</TableHead>
            <TableHead>Заказы</TableHead>
            <TableHead>Выручка</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees?.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>{employee.name}</TableCell>
              <TableCell>{employee.telegramId}</TableCell>
              <TableCell>{employee.gateId}</TableCell>
              <TableCell>{employee.workTime} часов</TableCell>
              <TableCell>{employee.ordersCount}</TableCell>
              <TableCell>{employee.revenue.toFixed(2)} USDT</TableCell>
              <TableCell>
                <Button onClick={() => handleEmployeeClick(employee.id)}>
                  Подробнее
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
