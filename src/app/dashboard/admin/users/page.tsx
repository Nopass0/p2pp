"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function UserManagementTable() {
  const { toast } = useToast();

  // Состояния для фильтров и пагинации
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>();
  const [isAdminFilter, setIsAdminFilter] = useState<string>("all"); // Используем строку вместо boolean | null
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const limit = 10;

  // Запрос пользователей с фильтрами
  const {
    data: response,
    isLoading,
    error,
  } = api.admin.searchUsers.useQuery({
    search: searchQuery,
    //@ts-ignore

    startDate: dateRange?.from?.toISOString(),
    //@ts-ignore

    endDate: dateRange?.to?.toISOString(),
    isAdmin: isAdminFilter === "all" ? undefined : isAdminFilter === "true", // Преобразуем строку в boolean | undefined
    limit,
    page: currentPage,
    sortBy,
    sortDirection,
  });

  // Извлекаем пользователей из ответа
  const users = response?.users || [];
  const totalUsers = response?.total || 0;

  // Запрос количества транзакций для всех пользователей
  //@ts-ignore

  const { data: transactionCounts } = api.admin.getTransactionCounts.useQuery(
    { userIds: users.map((user) => user.id) },
    { enabled: users.length > 0 },
  );

  // Действия администратора
  const makeAdminMutation = api.admin.makeAdmin.useMutation({
    onSuccess: () => {
      toast({ title: "Пользователь назначен администратором." });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeAdminMutation = api.admin.removeAdmin.useMutation({
    onSuccess: () => {
      toast({ title: "Права администратора удалены." });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = api.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast({ title: "Пользователь удален." });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Обработка сортировки
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Управление пользователями</h1>

      {/* Фильтры */}
      <div className="mb-6 flex flex-wrap gap-4">
        <Input
          placeholder="Поиск по имени, фамилии или Telegram ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <DatePickerWithRange
          //@ts-ignore

          onSelect={(range) => setDateRange(range)}
          className="max-w-md"
        />
        <Select
          value={isAdminFilter}
          onValueChange={(value) => setIsAdminFilter(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус администратора" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="true">Администратор</SelectItem>
            <SelectItem value="false">Не администратор</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Таблица */}
      {isLoading && <p>Загрузка...</p>}
      {error && <p className="text-red-500">Ошибка: {error.message}</p>}
      {users.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-gray-100 dark:bg-gray-800">
              <TableRow>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("id")}
                >
                  <div className="flex items-center">
                    ID
                    {sortBy === "id" && (
                      <span className="ml-1">
                        {sortDirection === "asc" ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Telegram ID</TableHead>
                <TableHead>Имя пользователя</TableHead>
                <TableHead>Имя</TableHead>
                <TableHead>Фамилия</TableHead>
                <TableHead>Администратор</TableHead>
                <TableHead>Транзакции</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.telegramId}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.firstName}</TableCell>
                  <TableCell>{user.lastName}</TableCell>
                  <TableCell>{user.isAdmin ? "Да" : "Нет"}</TableCell>
                  <TableCell>
                    Gate: {transactionCounts?.[user.id]?.gate || 0}
                    <br />
                    P2P: {transactionCounts?.[user.id]?.p2p || 0}
                    <br />
                    Match: {transactionCounts?.[user.id]?.match || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.isAdmin ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            removeAdminMutation.mutate({ userId: user.id })
                          }
                        >
                          Убрать админа
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() =>
                            makeAdminMutation.mutate({ userId: user.id })
                          }
                        >
                          Назначить админом
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            onClick={() =>
                              deleteUserMutation.mutate({ userId: user.id })
                            }
                          >
                            Удалить
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <p>
                            Вы уверены, что хотите удалить этого пользователя?
                          </p>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Пагинация */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
        >
          Назад
        </Button>
        <span>Страница {currentPage}</span>
        <Button
          variant="outline"
          disabled={users.length < limit}
          onClick={() => setCurrentPage((prev) => prev + 1)}
        >
          Вперед
        </Button>
      </div>
    </div>
  );
}
