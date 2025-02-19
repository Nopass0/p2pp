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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const statusColors = {
  NEW: "bg-blue-500",
  VERIFIED: "bg-green-500",
  WORKING: "bg-yellow-500",
  BLOCKED: "bg-red-500",
  FROZEN_FUNDS: "bg-purple-500",
};

const statusLabels = {
  NEW: "Новая",
  VERIFIED: "Верифицирована",
  WORKING: "В работе",
  BLOCKED: "Заблокирована",
  FROZEN_FUNDS: "Зависшие деньги",
};

export default function ResourcesPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCard, setEditingCard] = useState<any>(null);
  const [formData, setFormData] = useState({
    phoneNumber: "",
    status: "NEW" as const,
    category: "TELEGRAM" as const,
    bankCard: {
      bankName: "",
      ownerName: "",
      balance: 0,
    },
  });
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data: simCards, isLoading } = api.admin.getSimCards.useQuery();
  
  const filteredCards = simCards?.filter((card) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      card.phoneNumber.toLowerCase().includes(searchLower) ||
      card.status.toLowerCase().includes(searchLower) ||
      statusLabels[card.status].toLowerCase().includes(searchLower) ||
      (card.category === "BANK" &&
        (card.bankCard?.bankName.toLowerCase().includes(searchLower) ||
          card.bankCard?.ownerName.toLowerCase().includes(searchLower) ||
          card.bankCard?.balance.toString().includes(searchLower)))
    );
  });

  const addSimCard = api.admin.addSimCard.useMutation({
    onSuccess: () => {
      utils.admin.getSimCards.invalidate();
      setIsAddDialogOpen(false);
      resetForm();
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const updateSimCard = api.admin.updateSimCard.useMutation({
    onSuccess: () => {
      utils.admin.getSimCards.invalidate();
      setIsEditDialogOpen(false);
      setEditingCard(null);
    },
  });

  const deleteSimCard = api.admin.deleteSimCard.useMutation({
    onSuccess: () => {
      utils.admin.getSimCards.invalidate();
    },
  });

  const resetForm = () => {
    setFormData({
      phoneNumber: "",
      status: "NEW",
      category: "TELEGRAM",
      bankCard: {
        bankName: "",
        ownerName: "",
        balance: 0,
      },
    });
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const submitData = {
      ...formData,
      bankCard: formData.category === "BANK" ? formData.bankCard : undefined,
    };

    addSimCard.mutate(submitData);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    updateSimCard.mutate({
      id: editingCard.id,
      phoneNumber: editingCard.phoneNumber,
      status: editingCard.status,
      bankCard: editingCard.category === "BANK" ? editingCard.bankCard : undefined,
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateSimCard.mutate({
      id,
      status: status as any,
    });
  };

  const openEditDialog = (card: any) => {
    setEditingCard({
      ...card,
      bankCard: card.bankCard || {
        bankName: "",
        ownerName: "",
        balance: 0,
      },
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Ресурсы</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>Добавить СИМ-карту</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить новую СИМ-карту</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                  {error}
                </div>
              )}
              <div>
                <label>Номер телефона</label>
                <Input
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label>Категория</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TELEGRAM">Telegram</SelectItem>
                    <SelectItem value="BANK">Банковская карта</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label>Порядковый номер</label>
                <Input
                  type="number"
                  value={formData.orderNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      orderNumber: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
              {formData.category === "BANK" && (
                <>
                  <div>
                    <label>Название банка</label>
                    <Input
                      value={formData.bankCard.bankName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankCard: {
                            ...formData.bankCard,
                            bankName: e.target.value,
                          },
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label>ФИО владельца</label>
                    <Input
                      value={formData.bankCard.ownerName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankCard: {
                            ...formData.bankCard,
                            ownerName: e.target.value,
                          },
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label>Баланс</label>
                    <Input
                      type="number"
                      value={formData.bankCard.balance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankCard: {
                            ...formData.bankCard,
                            balance: parseFloat(e.target.value),
                          },
                        })
                      }
                      required
                    />
                  </div>
                </>
              )}
              <Button type="submit">Добавить</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по всем полям..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>№</TableHead>
            <TableHead>Номер телефона</TableHead>
            <TableHead>Категория</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Банк</TableHead>
            <TableHead>Владелец</TableHead>
            <TableHead>Баланс</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCards?.map((card) => (
            <TableRow key={card.id}>
              <TableCell>{card.orderNumber}</TableCell>
              <TableCell>{card.phoneNumber}</TableCell>
              <TableCell>
                {card.category === "TELEGRAM" ? "Telegram" : "Банковская карта"}
              </TableCell>
              <TableCell>
                <Select
                  value={card.status}
                  onValueChange={(value) => handleStatusChange(card.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">Новая</SelectItem>
                    <SelectItem value="VERIFIED">Верифицирована</SelectItem>
                    <SelectItem value="WORKING">В работе</SelectItem>
                    <SelectItem value="BLOCKED">Заблокирована</SelectItem>
                    <SelectItem value="FROZEN_FUNDS">Зависшие деньги</SelectItem>
                  </SelectContent>
                </Select>
                <Badge className={statusColors[card.status]}>
                  {statusLabels[card.status]}
                </Badge>
              </TableCell>
              <TableCell>{card.bankCard?.bankName || "-"}</TableCell>
              <TableCell>{card.bankCard?.ownerName || "-"}</TableCell>
              <TableCell>
                {card.bankCard ? `${card.bankCard.balance} ₽` : "-"}
              </TableCell>
              <TableCell className="space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEditDialog(card)}
                >
                  Изменить
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteSimCard.mutate({ id: card.id })}
                >
                  Удалить
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать СИМ-карту</DialogTitle>
          </DialogHeader>
          {editingCard && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label>Номер телефона</label>
                <Input
                  value={editingCard.phoneNumber}
                  onChange={(e) =>
                    setEditingCard({ ...editingCard, phoneNumber: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label>Статус</label>
                <Select
                  value={editingCard.status}
                  onValueChange={(value) =>
                    setEditingCard({ ...editingCard, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">Новая</SelectItem>
                    <SelectItem value="VERIFIED">Верифицирована</SelectItem>
                    <SelectItem value="WORKING">В работе</SelectItem>
                    <SelectItem value="BLOCKED">Заблокирована</SelectItem>
                    <SelectItem value="FROZEN_FUNDS">Зависшие деньги</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingCard.category === "BANK" && (
                <>
                  <div>
                    <label>Название банка</label>
                    <Input
                      value={editingCard.bankCard.bankName}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          bankCard: {
                            ...editingCard.bankCard,
                            bankName: e.target.value,
                          },
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label>ФИО владельца</label>
                    <Input
                      value={editingCard.bankCard.ownerName}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          bankCard: {
                            ...editingCard.bankCard,
                            ownerName: e.target.value,
                          },
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label>Баланс</label>
                    <Input
                      type="number"
                      value={editingCard.bankCard.balance}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          bankCard: {
                            ...editingCard.bankCard,
                            balance: parseFloat(e.target.value),
                          },
                        })
                      }
                      required
                    />
                  </div>
                </>
              )}
              <Button type="submit">Сохранить</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}