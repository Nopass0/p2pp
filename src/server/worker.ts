// // p2pp\p2pp\src\server\worker.ts
// import { PrismaClient } from "@prisma/client";
// import { startGateSyncService } from "@/services/gateSyncService";
// import { startTronSyncService } from "@/services/tronSyncService";
// import { startTelegramTransactionsSync } from "@/server/api/routers/wallet";

// export async function runWorkers() {
//   console.log("Starting background workers locally...");
//   const prisma = new PrismaClient();

//   try {
//     await startGateSyncService(prisma);
//     await startTronSyncService(prisma);
//     await startTelegramTransactionsSync(prisma);
//     console.log("Background workers finished locally.");
//   } catch (error) {
//     console.error("Error running background workers locally:", error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // Only run if the environment variable is set
// if (process.env.RUN_WORKERS_LOCALLY === "true") {
//   runWorkers();
// } else {
//   console.log(
//     "RUN_WORKERS_LOCALLY environment variable not set. Skipping local worker execution.",
//   );
// }
