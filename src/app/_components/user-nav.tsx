// src/app/_components/user-nav.tsx
"use client";

import { CreditCard, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserNav() {
  const router = useRouter();
  const { data: session } = api.auth.getSession.useQuery();
  const { mutate: logout } = api.auth.logout.useMutation({
    //@ts-ignore

    onSuccess: () => {
      router.push("/auth");
    },
  });

  if (!session?.user) return null;

  const { firstName, lastName, username, photoUrl, telegramId, login } =
    session.user;

  return (
    <DropdownMenu>
      {/* @ts-ignore */}

      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg p-2 hover:bg-accent">
          <Avatar>
            <AvatarImage src={photoUrl ?? undefined} />
            <AvatarFallback>
              {firstName?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left">
            <p className="text-sm font-medium">
              {firstName} {lastName ?? ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {login ? `@${login}` : `ID: `}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
