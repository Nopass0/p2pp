"use client";

import { api } from "@/trpc/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

const menuVariants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    transition: {
      duration: 0.15,
    },
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    transition: {
      duration: 0.15,
    },
  },
};

const iconVariants = {
  initial: { rotate: 0 },
  animate: { rotate: 360 },
};

export default function UserComponent() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Запрашиваем сессию
  const { data: sessionData, isLoading: isSessionLoading } =
    api.auth.getSession.useQuery();

  // Обработчик выхода
  const logoutMutation = api.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("token");
      router.push("/auth");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (theme === "dark") {
      htmlElement.setAttribute("class", "dark");
      htmlElement.style.backgroundColor = "#18181b"; // Пример цвета фона
    } else {
      htmlElement.setAttribute("class", "light");
      htmlElement.style.backgroundColor = "#ffffff"; // Пример цвета фона
    }
  }, [theme]);

  // Показываем скелетон во время загрузки
  if (isSessionLoading) {
    return (
      <div className="flex w-full items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    );
  }

  // Проверяем наличие данных пользователя
  if (!sessionData?.user) {
    return null;
  }

  const user = sessionData.user;
  const displayName = user.firstName || user.username || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex w-full items-center justify-between">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-12 w-full justify-start gap-2 px-2 hover:bg-accent"
          >
            <Avatar className="h-8 w-8">
              {user.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-medium">{displayName}</span>
              <span className="text-xs text-muted-foreground">
                #{user.telegramId}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <AnimatePresence>
          <DropdownMenuContent align="end" className="w-56" asChild>
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/settings")}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Настройки</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
                //@ts-ignore

                disabled={logoutMutation.isLoading}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {/* @ts-ignore */}

                <span>{logoutMutation.isLoading ? "Выход..." : "Выйти"}</span>
              </DropdownMenuItem>
            </motion.div>
          </DropdownMenuContent>
        </AnimatePresence>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        className="ml-2 h-9 w-9"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={theme}
            variants={iconVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.4 }}
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </motion.div>
        </AnimatePresence>
        <span className="sr-only">Переключить тему</span>
      </Button>
    </div>
  );
}
