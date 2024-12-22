// src/app/settings/DeviceTokens.tsx
"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyIcon, TrashIcon } from "lucide-react";

export function DeviceTokens() {
  const [newDeviceName, setNewDeviceName] = useState("");
  const { toast } = useToast();
  const utils = api.useContext();

  // Query for fetching tokens
  const { data: tokens, isLoading } = api.deviceToken.getMyTokens.useQuery();

  // Mutation for creating new token
  const createToken = api.deviceToken.createToken.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Токен создан",
          description: "Новый токен устройства успешно создан",
        });
        setNewDeviceName("");
        utils.deviceToken.getMyTokens.invalidate();
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка!",
        description: error.message || "Не удалось создать токен",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting token
  const deleteToken = api.deviceToken.deleteToken.useMutation({
    onSuccess: () => {
      toast({
        title: "Токен удален",
        description: "Токен устройства успешно удален",
      });
      utils.deviceToken.getMyTokens.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Ошибка!",
        description: error.message || "Не удалось удалить токен",
        variant: "destructive",
      });
    },
  });

  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault();
    const deviceId = crypto.randomUUID(); // Generate unique device ID
    createToken.mutate({
      deviceId,
      name: newDeviceName.trim(),
    });
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
      title: "Скопировано!",
      description: "Токен скопирован в буфер обмена",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Токены устройств</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateToken} className="mb-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Создать новый токен</h3>
            <p className="text-sm text-muted-foreground">
              Создайте новый токен для доступа к API с вашего устройства
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Название устройства"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                className="max-w-sm"
              />
              <Button
                type="submit"
                //@ts-ignore
                disabled={createToken.isLoading || !newDeviceName.trim()}
              >
                {/* @ts-ignore */}
                {createToken.isLoading ? "Создание..." : "Создать токен"}
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Активные токены</h3>
          {isLoading ? (
            <p>Загрузка токенов...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Устройство</TableHead>
                  <TableHead>Токен</TableHead>
                  <TableHead>Последнее использование</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens?.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>{token.name || token.deviceId}</TableCell>
                    <TableCell className="font-mono">
                      {token.token.substring(0, 16)}...
                    </TableCell>
                    <TableCell>
                      {new Date(token.lastUsed).toLocaleString()}
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToken(token.token)}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteToken.mutate(String(token.id))}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
