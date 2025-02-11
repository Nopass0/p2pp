import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { z } from "zod";

const requestSchema = z.object({
  cookies: z.array(z.object({
    name: z.string(),
    value: z.string(),
    domain: z.string().optional(),
    path: z.string().optional(),
  })).or(z.string()),
  deviceToken: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    const deviceToken = await db.deviceToken.findUnique({
      where: { token: validatedData.deviceToken },
      include: { user: true },
    });

    console.log("Device token:", validatedData.deviceToken);

    if (!deviceToken) {
      return NextResponse.json(
        { error: "Device token not found", token: validatedData.deviceToken },
        { status: 404 }
      );
    }

    const user = deviceToken.user;

    const cookies = Array.isArray(validatedData.cookies) 
      ? validatedData.cookies 
      : [{
          name: 'session',
          value: validatedData.cookies,
          domain: '',
          path: '/',
        }];

    for (const cookie of cookies) {
      await db.gateCookie.upsert({
        where: {
          userId_cookie: {
            userId: user.id,
            cookie: cookie.value,
          },
        },
        update: {
          lastChecked: new Date(),
          isActive: true,
        },
        create: {
          userId: user.id,
          cookie: cookie.value,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Cookies saved successfully",
    });
  } catch (error) {
    console.error("Error processing request:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}