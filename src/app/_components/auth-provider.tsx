"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Проверяем авторизацию
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const isAuthPage = pathname === "/";  // Путь страницы входа
      
      if (!token && !isAuthPage) {
        router.push("/");
      }
    };

    checkAuth();

    // Добавляем токен в заголовки для всех fetch запросов
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      const token = localStorage.getItem("token");
      const modifiedInit = {
        ...init,
        headers: {
          ...init?.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      };
      return originalFetch(input, modifiedInit);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [pathname, router]);

  return children;
}