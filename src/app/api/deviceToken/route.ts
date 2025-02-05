import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { z } from "zod";

const requestSchema = z.object({
  deviceToken: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceToken } = requestSchema.parse(body);

    console.log("Received device token:", body);

    const token = await db.deviceToken.findUnique({
      where: { token: deviceToken },
      include: { user: true },
    });

    if (!token) {
      return NextResponse.json(
        { 
          valid: false,
          error: "Device token not found" 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      userId: token.userId,
      username: token.user.username,
    });
  } catch (error) {
    console.error("Error verifying device token:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          valid: false,
          error: "Invalid request data", 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        valid: false,
        error: "Internal server error" 
      },
      { status: 500 }
    );
  }
}