import { db } from "@/server/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get domains from database
    const dbDomains = await db.allowedDomain.findMany();
    
    // Default allowed domains
    const defaultDomains = [
      "https://telegram.org",
      "http://telegram.org",
      "https://web.telegram.org",
      "http://web.telegram.org",
      "https://wallet.telegram.org",
      "http://wallet.telegram.org",
      "https://p2pp.vercel.app",
      "http://p2pp.vercel.app",
      "https://panel.gate.cx",
      "http://panel.gate.cx",
      "http://localhost:3000",
      "https://localhost:3000",
      "http://localhost",
      "https://localhost",
      "http://localhost:9000",
      "https://localhost:9000",
      "http://localhost:80",
      "https://localhost:80",
      "http://localhost:8080",
      "https://localhost:8080"
    ];

    // Combine default domains with database domains
    const allDomains = [
      ...defaultDomains,
      ...dbDomains.map(d => d.domain)
    ];

    // Remove duplicates and sort
    const uniqueDomains = [...new Set(allDomains)].sort();

    return NextResponse.json({ links: uniqueDomains });
  } catch (error) {
    console.error("Error fetching allowed domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch allowed domains" },
      { status: 500 }
    );
  }
}