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

    const { deviceToken, tgToken, gateCookie } = body;

    console.log("Received data:");
    console.log("Device Token:", deviceToken);
    console.log("Telegram Token:", tgToken?.substring(0, 20) + "...");
    console.log(
      "Gate Cookie:",
      typeof gateCookie === "string"
        ? //@ts-ignore

          gateCookie.substring(0, 20) + "..."
        : //@ts-ignore

          JSON.stringify(gateCookie).substring(0, 20) + "...",
    );

    if (!deviceToken || !tgToken || !gateCookie) {
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
      where: { token: deviceToken },
      include: { user: true },
    });

    if (!deviceTokenRecord) {
      console.log("No user found for device token:", deviceToken);
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

    // Update user's tgAuthToken
    await prisma.user.update({
      where: { id: user.id },
      //@ts-ignore

      data: { tgAuthToken: tgToken },
    });

    // Update or create GateCookie
    await prisma.gateCookie.upsert({
      where: {
        //@ts-ignore

        userId_cookie: {
          userId: user.id,
          cookie: gateCookie,
        },
      },
      //@ts-ignore

      update: {
        isActive: true,
        //@ts-ignore

        lastChecked: new Date(),
      },
      //@ts-ignore

      create: {
        userId: user.id,
        cookie: gateCookie,
        isActive: true,
      },
    });

    console.log(`Updated user ${user.id} with new tokens`);

    return NextResponse.json(
      {
        message: "Update successful",
        success: true,
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error("Error processing request:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // The .code property can be accessed in a type-safe manner
      if (error.code === "P2002") {
        console.log(
          "There is a unique constraint violation, a new user cannot be created with this email",
        );
      }
    }

    return NextResponse.json(
      {
        message: "Internal server error",
        success: false,
        //@ts-ignore
        error: error instanceof Error ? error.message : "Unknown error",
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
