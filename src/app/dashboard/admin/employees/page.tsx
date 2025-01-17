"use client";

import { useState } from "react";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

export default function EmployeesPage() {
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [search, setSearch] = useState("");
  const { data: employees, isLoading } = api.admin.getEmployees.useQuery({
    search,
  });

  return (
    <div className="space-y-6">
      <h1 className="mb-4 text-2xl font-bold">Сотрудники</h1>
      <div className="flex items-center space-x-4">
        {/* @ts-ignore */}

        <DateRangePicker onChange={setDateRange} />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      {isLoading ? (
        <div>Loading employees...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Telegram ID</TableHead>
              <TableHead>Work Time</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees?.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>{employee.name}</TableCell>
                <TableCell>{employee.telegramId}</TableCell>
                <TableCell>{employee.workTime} hours</TableCell>
                <TableCell>{employee.ordersCount}</TableCell>
                <TableCell>{employee.revenue.toFixed(2)} USDT</TableCell>
                <TableCell>
                  {/* @ts-ignore */}

                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
