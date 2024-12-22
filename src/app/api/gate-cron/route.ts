// import { PrismaClient } from "@prisma/client";
// import { startGateSyncService } from "@/services/gateSyncService";
// import { NextResponse } from "next/server";

// export const dynamic = "force-dynamic";

// export async function GET(req: Request) {
//   console.log("Gate Cron Job triggered");

//   // Verify the CRON_SECRET
//   if (
//     req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
//   ) {
//     return new NextResponse("Unauthorized", { status: 401 });
//   }

//   const prisma = new PrismaClient();
//   try {
//     await startGateSyncService(prisma);
//     return NextResponse.json({ ok: true, message: "Gate sync completed" });
//   } catch (error) {
//     console.error("Error in Gate Cron Job:", error);
//     return NextResponse.json(
//       { ok: false, message: "Gate sync failed", error },
//       { status: 500 },
//     );
//   } finally {
//     await prisma.$disconnect();
//   }
// }
