import { PrismaClient } from "@prisma/client";
import { startTronSyncService } from "@/services/tronSyncService";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  console.log("Tron Cron Job triggered");

  // Verify the CRON_SECRET
  if (
    req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const prisma = new PrismaClient();
  try {
    await startTronSyncService(prisma);
    return NextResponse.json({ ok: true, message: "Tron sync completed" });
  } catch (error) {
    console.error("Error in Tron Cron Job:", error);
    return NextResponse.json(
      { ok: false, message: "Tron sync failed", error },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
