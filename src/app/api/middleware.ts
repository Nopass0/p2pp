import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function withCors(handler: Function) {
  return async function (request: NextRequest) {
    try {
      const origin = request.headers.get("origin");
      const allowedOrigins = [
        "https://telegram.org",
        "https://oauth.telegram.org",
        "https://t.me",
        process.env.NEXT_PUBLIC_APP_URL,
        "https://incredibly-firm-gull.ngrok-free.app/dashboard",
        "http://localhost:3000",
      ].filter(Boolean);

      // Handle OPTIONS preflight request
      if (request.method === "OPTIONS") {
        return new NextResponse(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": origin || "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, x-trpc-source",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
          },
        });
      }

      // Call the actual handler
      const response = await handler(request);

      // Add CORS headers to the response
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
      }

      return response;
    } catch (error) {
      console.error("API Error:", error);
      return new NextResponse(
        JSON.stringify({
          error: "Internal Server Error",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  };
}
