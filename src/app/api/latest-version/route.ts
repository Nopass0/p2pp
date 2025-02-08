// pages/api/latest-version.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

// Создаём экземпляр Prisma (или импортируйте уже настроенный клиент)
const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const latestVersion = await prisma.appVersion.findFirst({
      where: { isMain: true },
      orderBy: { createdAt: "desc" },
    });

    if (!latestVersion) {
      return res.status(404).json({ error: "No version found" });
    }

    return res.status(200).json({
      version: latestVersion.version,
      download_url: latestVersion.downloadUrl,
      hash: latestVersion.hash,
    });
  } catch (err) {
    console.error("Error in latest-version API route:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
