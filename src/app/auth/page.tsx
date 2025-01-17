/* src/app/auth/page.tsx */
import { type Metadata } from "next";
import { AuthTabs } from "@/components/AuthTabs";

export const metadata: Metadata = {
  title: "p2pp · Sign In",
  description: "Sign in to p2pp platform",
};

export default function AuthPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center space-y-6 px-4">
        <AuthTabs />
      </div>
    </main>
  );
}
