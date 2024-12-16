import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check if it's an API request
  const isApiRequest = request.nextUrl.pathname.startsWith('/api');
  const origin = request.headers.get("origin");

  // Handle Preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS,DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-trpc-source",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  // Create the base response
  const response = NextResponse.next();

  // Add security headers for non-API requests
  if (!isApiRequest) {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-XSS-Protection", "1; mode=block");
  }

  // Add CORS headers
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS,DELETE");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-trpc-source"
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes
    '/(.*)',
  ],
};