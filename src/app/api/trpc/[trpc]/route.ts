import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { env } from "@/env";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { startBackgroundWorkers } from "@/server/worker";

// Запускаем бэкграунд воркеры при первом запросе
let isInitialized = false;
async function initialize() {
  if (!isInitialized) {
    await startBackgroundWorkers();
    isInitialized = true;
  }
}

const handler = async (req: NextRequest) => {
  console.log("API Route Handler - Request method:", req.method);
  console.log("API Route Handler - Request path:", req.nextUrl.pathname);

  // Инициализируем бэкграунд воркеры
  await initialize();

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const ctx = await createTRPCContext({
        headers: req.headers,
      });
      return ctx;
    },
    onError: ({ path, error }) => {
      console.error(`❌ tRPC failed on ${path ?? "<no-path>"}:`, {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
        cause: error.cause,
      });
    },
  });

  // Add CORS headers
  const allowedOrigins = [
    "https://telegram.org",
    "https://oauth.telegram.org",
    "https://t.me",
    process.env.NEXT_PUBLIC_APP_URL,
    "https://mostly-assured-kodiak.ngrok-free.app"
  ].filter(Boolean);

  const origin = req.headers.get("origin");
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", [
      "Content-Type",
      "Authorization",
      "x-trpc-source"
    ].join(", "));
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
};

export const GET = handler;
export const POST = handler;
export const OPTIONS = (req: NextRequest) => {
  const origin = req.headers.get("origin");
  
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": [
        "Content-Type",
        "Authorization",
        "x-trpc-source"
      ].join(", "),
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
};