// src/app/page.tsx
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "p2pp · Home",
  description: "p2pp platform home page",
};

export default async function Home() {
  redirect("/dashboard");

  return (
    <main className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8">
      <div className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <h1 className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl">
          p2pp platform
        </h1>

        <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
          Platform is currently under development. Stay tuned for updates.
        </p>

        <div className="relative flex size-32 items-center justify-center rounded-full bg-muted">
          <div className="animate-spin-slow absolute size-32 rounded-full bg-gradient-to-r from-primary to-secondary blur-xl" />
          <div className="relative flex size-24 items-center justify-center rounded-full bg-background">
            <p className="text-lg font-semibold">Coming soon</p>
          </div>
        </div>
      </div>
    </main>
  );
}
