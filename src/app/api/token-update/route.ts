import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

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
  console.log("POST request received");
  try {
    const body = await request.json();
    //@ts-ignore

    console.log("Request body:", JSON.stringify(body, null, 2));

    const { device_token, telegram_token, gate_cookies, phone, idex_id } = body;

    // Convert gate_cookies array to string format if needed
    const cookieString = Array.isArray(gate_cookies) 
      ? gate_cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
      : gate_cookies;

    console.log("Received data:", {
      device_token,
      telegram_token: telegram_token?.substring(0, 20) + "...",
      gate_cookies: typeof cookieString === "string" ? cookieString.substring(0, 20) + "..." : "...",
      phone,
      idex_id
    });

    if (!device_token || !telegram_token || !cookieString) {
      console.log("Missing required fields");
      return NextResponse.json(
        {
          message: "Missing required fields",
          success: false,
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    // Find the user by deviceToken
    const deviceTokenRecord = await prisma.deviceToken.findUnique({
      where: { token: device_token },
      include: { user: true },
    });

    if (!deviceTokenRecord) {
      console.log("No user found for device token:", device_token);
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
        currentTgPhone: phone // Update the phone number if provided
      },
    });

    console.log(`Updated user ${user.id} with new telegram token and phone:`, phone);

    // Update or create GateCookie
    const updatedCookie = await prisma.gateCookie.upsert({
      where: {
        userId_cookie: {
          userId: user.id,
          cookie: cookieString,
        },
      },
      update: {
        isActive: true,
        lastChecked: new Date(),
        idexId: idex_id || undefined // Update idexId if provided
      },
      create: {
        userId: user.id,
        cookie: cookieString,
        isActive: true,
        idexId: idex_id || undefined // Set idexId if provided
      },
    });

    console.log(`Updated gate cookie for user ${user.id}:`, {
      cookieId: updatedCookie.id,
      idexId: updatedCookie.idexId
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
