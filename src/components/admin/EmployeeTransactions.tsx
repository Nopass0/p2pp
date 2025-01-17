"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

export function EmployeeTransactions({ employeeId }: { employeeId: number }) {
  const [search, setSearch] = useState("");
  const { data: transactions, isLoading } =
    api.admin.getEmployeeTransactions.useQuery({ employeeId, search });

  if (isLoading) return <div>Loading transactions...</div>;

  return (
    <div>
      <Input
        type="text"
        placeholder="Search transactions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions?.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>{tx.id}</TableCell>
              <TableCell>{tx.type}</TableCell>
              <TableCell>
                {tx.amount.toFixed(2)} {tx.currency}
              </TableCell>
              <TableCell>{tx.status}</TableCell>
              <TableCell>{new Date(tx.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
