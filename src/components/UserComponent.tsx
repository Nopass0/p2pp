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

interface User {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  telegramId: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  const { data: sessionData } = api.auth.getSession.useQuery(undefined, {
    retry: false,
    onError: () => {
      localStorage.removeItem("token");
      router.push("/auth");
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/auth");
  };

  if (!sessionData?.json?.user) {
    return null;
  }

  const user = sessionData.json.user;
  const displayName = user.firstName || user.username || "User";
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="flex w-full items-center justify-between">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-12 w-full justify-start px-3 hover:bg-accent">
            <Avatar className="mr-2 h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start text-sm">
              <span className="font-medium">{displayName}</span>
              <span className="text-xs text-muted-foreground">
                #{user.telegramId}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <AnimatePresence>
          <DropdownMenuContent
            align="end"
            className="w-56"
            asChild
          >
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Настройки</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Выйти</span>
              </DropdownMenuItem>
            </motion.div>
          </DropdownMenuContent>
        </AnimatePresence>
      </DropdownMenu>

      <motion.div
        initial="initial"
        whileHover={{ scale: 1.05 }}
      >
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
      </motion.div>
    </div>
  );
}