"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { DeviceTokens } from "./DeviceTokens";
import { GeminiTokenCard } from "./GeminiToken";

export default function SettingsPage() {
  const [adminKey, setAdminKey] = useState("");
  const { toast } = useToast();
  const utils = api.useContext();

  // Используем правильный хук для получения данных пользователя
  const { data: user, isLoading } = api.user.me.useQuery();
  //@ts-ignore
  const { mutate: activateAdmin, isLoading: isSubmitting } =
    api.admin.activateAdmin.useMutation({
      onSuccess: (data) => {
        if (data.success) {
          toast({
            title: "Успешно!",
            description: "Вы стали администратором",
          });
          utils.user.me.invalidate(); // Обновляем данные пользователя
          setAdminKey("");
        }
      },
      onError: (error) => {
        console.error("Activation error details:", error);
        toast({
          title: "Ошибка!",
          description: error.message || "Произошла ошибка при активации",
          variant: "destructive",
        });
      },
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = adminKey.trim();
    if (!trimmedKey) return;
    activateAdmin({ key: trimmedKey });
  };

  if (isLoading) {
    return null; // или показать состояние загрузки
  }

  return (
    <div className="container mx-auto max-w-2xl py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Показываем карточку активации только если пользователь не админ */}
        {user && !user.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Настройки</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">
                    Активация прав администратора
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Введите ключ администратора для получения расширенных прав
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Введите ключ"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      className="max-w-sm"
                    />
                    <Button
                      type="submit"
                      disabled={isSubmitting || !adminKey.trim()}
                    >
                      {isSubmitting ? "Активация..." : "Активировать"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        {/* <GeminiTokenCard /> */}
        <DeviceTokens />
      </motion.div>
    </div>
  );
}
