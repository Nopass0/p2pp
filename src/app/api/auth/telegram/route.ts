import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { verifyTelegramAuth, validateAuthDate } from "@/lib/telegram";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  console.log("[Auth API] Starting POST request handler");
  try {
    // Read and log request details
    const body = await request.text();
    console.log("[Auth API] Request body:", body);

    let input;
    try {
      input = JSON.parse(body);
    } catch (e) {
      console.error("[Auth API] Failed to parse request body:", e);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("[Auth API] Parsed input:", input);

    // Verify Telegram auth
    console.log("[Auth API] Verifying auth data...");
    const isValid = await verifyTelegramAuth(input);
    console.log("[Auth API] Auth verification result:", isValid);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid authentication data" },
        { status: 401 }
      );
    }

    if (!validateAuthDate(input.auth_date)) {
      return NextResponse.json(
        { error: "Authentication data has expired" },
        { status: 400 }
      );
    }

    // Database transaction
    console.log("[Auth API] Starting database transaction");
    const { user, token } = await db.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { telegramId: input.id.toString() },
        update: {
          firstName: input.first_name,
          lastName: input.last_name || null,
          username: input.username || null,
          photoUrl: input.photo_url || null,
        },
        create: {
          telegramId: input.id.toString(),
          firstName: input.first_name,
          lastName: input.last_name || null,
          username: input.username || null,
          photoUrl: input.photo_url || null,
          isAdmin: false,
        },
      });

      const token = randomUUID();
      await tx.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return { user, token };
    });

    console.log("[Auth API] Transaction completed successfully");

    const responseData = {
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        photoUrl: user.photoUrl,
        isAdmin: user.isAdmin,
      },
    };

    console.log("[Auth API] Sending response:", responseData);

    // Create response with explicit headers
    const response = NextResponse.json(responseData, { status: 200 });
    
    // Ensure proper headers
    response.headers.set("Content-Type", "application/json");
    
    const origin = request.headers.get("origin");
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    return response;

  } catch (error) {
    console.error("[Auth API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Auth API] Error details:", errorMessage);

    return NextResponse.json(
      { error: "Authentication failed", details: errorMessage },
      { status: 500 }
    );
  }
}

// Options handler
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": [
        "Content-Type",
        "Authorization"
      ].join(", "),
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Define runtime config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';