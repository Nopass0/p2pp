import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
//@ts-ignore
import { authOptions } from "@/server/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401 },
    );
  }

  return NextResponse.json({ user: session.user });
}

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401 },
    );
  }

  // Здесь можно добавить дополнительную логику для работы с кошельком

  return NextResponse.json({ success: true });
}
