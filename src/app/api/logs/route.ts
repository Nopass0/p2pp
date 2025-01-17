import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { logs } = body;

  // Log the received logs
  console.log("Received logs:");
  logs.forEach((log: string) => console.log(log));

  return NextResponse.json({ message: "Logs received successfully" });
}
