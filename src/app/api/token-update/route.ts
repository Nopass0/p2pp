import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const requestSchema = z.object({
  device_token: z.string(),
  telegram_token: z.string(),
  phone: z.string(),
});

// Enable CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { device_token, telegram_token, phone } = requestSchema.parse(body);

    // Find the user by deviceToken
    const deviceTokenRecord = await prisma.deviceToken.findUnique({
      where: { token: device_token },
      include: { user: true },
    });

    if (!deviceTokenRecord) {
      return NextResponse.json(
        {
          message: "User not found",
          success: false,
        },
        {
          status: 404,
          headers: corsHeaders,
        },
      );
    }

    const user = deviceTokenRecord.user;

    // Update user's tgAuthToken and currentTgPhone
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        tgAuthToken: telegram_token,
        currentTgPhone: phone
      },
    });

    return NextResponse.json(
      {
        message: "Tokens updated successfully",
        success: true,
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Error processing request:", { error: errorMessage });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Invalid request data",
          success: false,
          error: error.errors
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Error processing request",
        success: false,
        error: errorMessage
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  } finally {
    await prisma.$disconnect();
  }
}
