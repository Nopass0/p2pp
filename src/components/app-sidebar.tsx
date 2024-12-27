"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Search,
  ShieldAlert,
  Command,
  Users,
  FileText,
  LogOut,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/trpc/react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import UserComponent from "@/components/UserComponent";

const regularMenuItems = [
  {
    title: "Парсер",
    icon: FileText,
    path: "/dashboard/parser",
    items: [
      {
        title: "Telegram Wallet",
        path: "/dashboard/parser/tg",
      },
      // {
      //   title: "Tron",
      //   path: "/dashboard/parser",
      // },
      {
        title: "IDEX",
        path: "/dashboard/parser/gate",
      },
      {
        title: "Совпадения",
        path: "/dashboard/parser/match",
      },
    ],
  },
  {
    title: "Чеки",
    icon: Receipt,
    path: "/dashboard/checker",
  },
];

const adminMenuItems = [
  {
    title: "Пользователи",
    icon: Users,
    path: "/dashboard/admin/users",
  },
  {
    title: "Парсер",
    icon: FileText,
    path: "/dashboard/admin/parser",
  },
  // {
  //   title: "Чекер",
  //   icon: Search,
  //   path: "/dashboard/admin/checker",
  // },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = api.auth.getSession.useQuery();
  const [openCollapsible, setOpenCollapsible] = React.useState<string | null>(
    "/dashboard/parser",
  );

  const menuItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  const subMenuVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
      opacity: 1,
      height: "auto",
      transition: {
        height: {
          duration: 0.3,
          ease: "easeOut",
        },
        opacity: {
          duration: 0.2,
          ease: "easeOut",
        },
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        height: {
          duration: 0.3,
          ease: "easeIn",
        },
        opacity: {
          duration: 0.2,
          ease: "easeIn",
        },
      },
    },
  };

  const isAdminPath = pathname.includes("/admin");
  const currentMenuItems = isAdminPath ? adminMenuItems : regularMenuItems;

  React.useEffect(() => {
    const item = regularMenuItems.find((item) =>
      item.items?.some((subItem) => pathname.startsWith(subItem.path)),
    );
    if (item) {
      setOpenCollapsible(item.path);
    }
  }, [pathname]);

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Command className="size-4" />
                </div>
                <span className="ml-2 font-semibold">P2PP</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="mx-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={isAdminPath ? "admin" : "regular"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
              <SidebarMenu>
                {currentMenuItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    {/* @ts-ignore */}
                    {item.items ? (
                      <Collapsible
                        open={openCollapsible === item.path}
                        onOpenChange={() =>
                          setOpenCollapsible(
                            openCollapsible === item.path ? null : item.path,
                          )
                        }
                      >
                        <div className="flex items-center">
                          <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith(item.path)}
                            tooltip={item.title}
                          >
                            {/* @ts-ignore */}
                            <Link href={item.items[0].path}>
                              <item.icon className="size-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuAction>
                              <ChevronRight
                                className="size-4 transition-transform duration-200"
                                style={{
                                  transform:
                                    openCollapsible === item.path
                                      ? "rotate(90deg)"
                                      : "rotate(0deg)",
                                }}
                              />
                            </SidebarMenuAction>
                          </CollapsibleTrigger>
                        </div>

                        <AnimatePresence initial={false}>
                          {openCollapsible === item.path && (
                            <CollapsibleContent forceMount asChild>
                              <motion.div
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                variants={subMenuVariants}
                              >
                                <SidebarMenuSub>
                                  {/* @ts-ignore */}
                                  {item.items.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.path}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={pathname === subItem.path}
                                      >
                                        <Link href={subItem.path}>
                                          <span>{subItem.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </motion.div>
                            </CollapsibleContent>
                          )}
                        </AnimatePresence>
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.path}
                        tooltip={item.title}
                      >
                        <Link href={item.path}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto size-4 opacity-0 transition-all group-hover:opacity-100" />
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}

                {session?.user?.isAdmin && !isAdminPath && (
                  <motion.div
                    variants={menuItemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Админ панель">
                        <Link href="/dashboard/admin">
                          <ShieldAlert className="size-4" />
                          <span>Админ панель</span>
                          <ChevronRight className="ml-auto size-4 opacity-0 transition-all group-hover:opacity-100" />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </motion.div>
                )}

                {isAdminPath && (
                  <motion.div
                    variants={menuItemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip="Выйти из админ-панели"
                      >
                        <Link href="/dashboard">
                          <LogOut className="size-4" />
                          <span>Выйти из админ-панели</span>
                          <ChevronRight className="ml-auto size-4 opacity-0 transition-all group-hover:opacity-100" />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </motion.div>
                )}
              </SidebarMenu>
            </SidebarGroup>
          </motion.div>
        </AnimatePresence>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <UserComponent />
      </SidebarFooter>
    </Sidebar>
  );
}
