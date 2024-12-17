"use client";

import { useRouter, usePathname } from "next/navigation";
import { api } from "@/trpc/react";
import { useEffect, useState } from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [redirected, setRedirected] = useState(false); // Track if redirect has happened

  const {
    data: session,
    isLoading: isSessionLoading,
    isFetching: isSessionFetching,
    isError,
    error,
  } = api.auth.getSession.useQuery(undefined, {
    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    gcTime: 0,
  });

  useEffect(() => {
    if (!isSessionLoading && !isSessionFetching && !redirected) {
      // Check redirected flag
      console.log("AuthProvider useEffect:", {
        pathname,
        session,
      });

      if (isError) {
        console.error("Error fetching session:", error);
      }

      if (pathname === "/auth" && session && session.user) {
        console.log("Redirecting to /dashboard");
        router.replace("/dashboard");
        setRedirected(true); // Set the flag after redirect
      }

      if (pathname !== "/auth" && (!session || !session.user)) {
        console.log("Redirecting to /auth");
        router.replace("/auth");
        setRedirected(true); // Set the flag after redirect
      }
    }
  }, [
    isSessionLoading,
    isSessionFetching,
    session,
    pathname,
    router,
    isError,
    error,
    redirected, // Include redirected in dependencies
  ]);

  if (isSessionLoading || isSessionFetching) {
    return null;
  }

  return children;
}
