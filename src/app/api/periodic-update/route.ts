import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const body = await request.json();
  const { deviceToken, tgToken, gateCookie } = body;

  console.log("Received periodic update:");
  console.log("Device Token:", deviceToken);
  console.log("Telegram Token:", tgToken);
  console.log("Gate Cookie:", gateCookie);

  try {
    // Find the user by deviceToken
    const deviceTokenRecord = await prisma.deviceToken.findUnique({
      where: { token: deviceToken },
      include: { user: true },
    });

    if (!deviceTokenRecord) {
      console.log("No user found for the given device token");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
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
      //@ts-ignore

      where: { userId: user.id },
      //@ts-ignore

      update: {
        cookie: gateCookie,
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

    console.log(`Periodic update for user ${user.id} completed successfully`);

    return NextResponse.json(
      { message: "Periodic update successful" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error during periodic update:", error);
    return NextResponse.json(
      { message: "Error during periodic update" },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
