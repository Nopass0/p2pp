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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Save, User, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";

interface EmployeesTableProps {
  dateRange: { from: Date; to: Date };
  search?: string;
}

interface Employee {
  id: number;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  passportPhoto: string | null;
  commissionRate: number | null;
  grossProfit: number;
  ordersCount: number;
  workTime: number;
  TransactionMatch: {
    createdAt: Date;
  }[];
}

export function EmployeesTable({ dateRange, search }: EmployeesTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();

  const { data: employees, refetch } = api.admin.getEmployees.useQuery({
    dateRange,
    search,
  });

  const updateCommissionRate = api.admin.updateCommissionRate.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: "Успешно обновлено",
        description: "Процент ЗП сотрудника был успешно обновлен.",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить процент ЗП: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (id: number, currentValue: number | null) => {
    setEditingId(id);
    setEditValue(currentValue?.toString() ?? "");
  };

  const handleSave = async (id: number) => {
    const newRate = Number.parseFloat(editValue);
    if (!isNaN(newRate) && newRate >= 0 && newRate <= 100) {
      await updateCommissionRate.mutateAsync({
        employeeId: id,
        rate: newRate,
      });
    }
    setEditingId(null);
  };

  const calculateWorkTime = (transactions: { createdAt: Date }[]) => {
    if (transactions.length < 1) return 0;
    const first = transactions[0].createdAt.getTime();
    const last = transactions[transactions.length - 1].createdAt.getTime();
    return Math.round((last - first) / (1000 * 60)); // в минутах
  };

  if (!employees) return <div>Загрузка...</div>;

  return (
    <ScrollArea className="h-[600px] w-full rounded-md border">
      <Table className="relative">
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead className="w-[120px]">Фото</TableHead>
            <TableHead>ФИО</TableHead>
            <TableHead className="text-right">Валовая прибыль</TableHead>
            <TableHead className="text-right">Процент ЗП</TableHead>
            <TableHead className="text-right">Заработано</TableHead>
            <TableHead className="text-right">Заказы</TableHead>
            <TableHead className="text-right">Время работы</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => {
            const workTime = employee.workTime;
            const salary = employee.commissionRate
              ? (employee.grossProfit * employee.commissionRate) / 100
              : 0;

            return (
              <TableRow key={employee.id}>
                <TableCell>
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border">
                    {employee.passportPhoto ? (
                      <Image
                        src={employee.passportPhoto}
                        width={48}
                        height={48}
                        alt="Паспорт"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {[
                      employee.lastName,
                      employee.firstName,
                      employee.middleName,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ID: {employee.id}
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  ${employee.grossProfit.toFixed(2)}
                </TableCell>

                <TableCell className="text-right">
                  {editingId === employee.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20 text-right"
                        type="number"
                        min="0"
                        max="100"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleSave(employee.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <span>{employee.commissionRate?.toFixed(1) ?? 0}%</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleEdit(employee.id, employee.commissionRate)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  ${salary.toFixed(2)}
                </TableCell>

                <TableCell className="text-right">
                  {employee.ordersCount}
                </TableCell>

                <TableCell className="text-right">
                  {formatWorkTime(workTime)}
                </TableCell>

                <TableCell>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/admin/employees/${employee.id}`}
                      className="flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      <span>Профиль</span>
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function formatWorkTime(minutes: number): string {
  if (minutes <= 0) return "0 мин";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return [
    hours > 0 && `${hours} ч`,
    remainingMinutes > 0 && `${remainingMinutes} мин`,
  ]
    .filter(Boolean)
    .join(" ");
}
