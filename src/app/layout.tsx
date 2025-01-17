// src/app/layout.tsx
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { type Metadata } from "next";
import { cookies } from "next/headers";
import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "@/app/_components/theme-provider";
import { AuthProvider } from "@/app/_components/auth-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "p2pp",
  description: "p2pp platform",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
  //@ts-ignore
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`font-sans ${inter.variable}`}>
        {/* @ts-ignore */}
        <TRPCReactProvider
          //@ts-ignore
          attribute="data-theme"
          enableSystem
          disableTransitionOnChange={false}
        >
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
