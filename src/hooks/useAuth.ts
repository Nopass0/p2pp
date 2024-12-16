import { useEffect } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const router = useRouter();
  const { data: session, isLoading } = api.auth.getSession.useQuery(undefined, {
    retry: false,
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") {
        localStorage.removeItem("token");
        router.push("/auth");
      }
    },
  });

  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/auth");
    }
  }, [session, isLoading, router]);

  return {
    session,
    isLoading,
    isAuthenticated: !!session,
    user: session?.user,
  };
}
