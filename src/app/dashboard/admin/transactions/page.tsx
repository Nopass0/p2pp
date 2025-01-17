"use client";

import { useState } from "react";
import { DateRangePicker } from "@/components/ui/date-picker";
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

export default function TransactionsPage() {
  const [dateRange, setDateRange] = useState<{
    from: Date | null;
    to: Date | null;
  }>({ from: null, to: null });
  const [search, setSearch] = useState("");
  const { data: transactions, isLoading } = api.admin.getTransactions.useQuery({
    startDate: dateRange.from,
    endDate: dateRange.to,
    search,
  });

  return (
    <div className="space-y-6">
      <h1 className="mb-4 text-2xl font-bold">Транзакции</h1>
      <div className="flex items-center space-x-4">
        <DateRangePicker
          value={dateRange as any}
          onChange={(newRange) => setDateRange(newRange as any)}
        />
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      {isLoading ? (
        <div>Loading transactions...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.id}</TableCell>
                <TableCell>{transaction.type}</TableCell>
                <TableCell>{transaction.amountUsdt} USDT</TableCell>
                <TableCell>{transaction.status}</TableCell>
                <TableCell>
                  {/* @ts-ignore */}

                  {new Date(transaction.createdAt).toLocaleString()}
                </TableCell>
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
