// p2pp\p2pp\src\app\api\telegram-cron\route.ts
import { PrismaClient } from "@prisma/client";
import { startTelegramTransactionsSync } from "@/server/api/routers/wallet";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  console.log("Telegram Cron Job triggered");

  // Verify the CRON_SECRET
  if (
    req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const prisma = new PrismaClient();
  try {
    await startTelegramTransactionsSync(prisma);
    return NextResponse.json({
      ok: true,
      message: "Telegram sync completed",
    });
  } catch (error) {
    console.error("Error in Telegram Cron Job:", error);
    return NextResponse.json(
      { ok: false, message: "Telegram sync failed", error },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
