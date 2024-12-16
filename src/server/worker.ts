import { PrismaClient } from "@prisma/client";
import { startGateSyncService } from "@/services/gateSyncService";

let isWorkerStarted = false;

export async function startBackgroundWorkers() {
  if (isWorkerStarted) {
    console.log('Background workers already started');
    return;
  }

  console.log('Starting background workers...');
  const prisma = new PrismaClient();

  try {
    // Запускаем все фоновые сервисы
    await startGateSyncService(prisma);
    isWorkerStarted = true;
    console.log('Background workers started successfully');
  } catch (error) {
    console.error('Error starting background workers:', error);
    throw error;
  }
}