"use client";
import "@/styles/globals.css";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <div className="m-2 flex max-h-[99vh] flex-col px-4 py-3">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
