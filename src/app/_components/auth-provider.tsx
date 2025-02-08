"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/trpc/react";

interface User {
  id: number;
  login: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const { data: session, refetch: refetchSession } =
    api.auth.getSession.useQuery(undefined, {
      retry: false,
      refetchOnWindowFocus: false,
    });

  const loginMutation = api.auth.login.useMutation();

  useEffect(() => {
    const fetchSession = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        await refetchSession();
      } else {
        setLoading(false);
      }
    };

    fetchSession();
  }, [refetchSession]);

  useEffect(() => {
    if (session) {
      setUser(session.user);
      setLoading(false);
    } else if (session === null) {
      setUser(null);
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!loading) {
      if (user && pathname === "/auth") {
        router.push("/");
      } else if (!user && pathname !== "/auth" && pathname !== "/register") {
        router.push("/auth");
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (login: string, password: string) => {
    try {
      const result = await loginMutation.mutateAsync({ login, password });
      if (result?.token) {
        localStorage.setItem("token", result.token);
        await refetchSession();
        return result;
      }
      throw new Error("Login failed: No token received");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    localStorage.removeItem("token");
    setUser(null);
    router.push("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
