// src/app/layout.tsx
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { type Metadata } from "next";
import { cookies } from "next/headers";
import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "@/app/_components/theme-provider";
import { AuthProvider } from "@/app/_components/auth-provider";
import { startBackgroundWorkers } from "@/server/worker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

let workersStarted = false;

export const metadata: Metadata = {
  title: "p2pp",
  description: "p2pp platform",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Инициализируем сервисы при старте приложения
  if (!workersStarted) {
    try {
      console.log("Starting background workers from layout...");
      await startBackgroundWorkers();
      workersStarted = true;
      console.log("Background workers started successfully");
    } catch (error) {
      console.error("Failed to start background workers:", error);
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`font-sans ${inter.variable}`}>
        {/* @ts-ignore */}
        <TRPCReactProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
