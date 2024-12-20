// src/trpc/server.ts
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createHydrationHelpers } from "@trpc/react-query/rsc";
//@ts-ignore
import { createClient } from "@trpc/client";
import { headers } from "next/headers";
import { cache } from "react";

import { type AppRouter } from "@/server/api/root";
import { env } from "@/env";

export const api = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
    }),
    httpBatchLink({
      //@ts-ignore
      url: `${env.NEXT_PUBLIC_APP_URL}/api/trpc`,
      headers() {
        //@ts-ignore
        const heads = new Headers(headers());
        heads.set("x-trpc-source", "rsc");
        return {
          ...Object.fromEntries(heads.entries()),
        };
      },
    }),
  ],
});
//@ts-ignore
export { type RouterInputs, type RouterOutputs } from "@/server/api/root";
