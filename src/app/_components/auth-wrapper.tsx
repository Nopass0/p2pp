// app/_components/auth-wrapper.tsx
"use client";

import dynamic from "next/dynamic";

// Динамически импортируем AuthProvider только на клиенте
const AuthProvider = dynamic(() => import("./auth-provider"), {
  ssr: false,
});

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const pathname = headersList.get("x-pathname") || "/";

  if (pathname === "/auth") {
    return children;
  }

  return <AuthProvider>{children}</AuthProvider>;
}
