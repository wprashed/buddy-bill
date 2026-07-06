import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userSessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionToken } = body;

  if (sessionToken) {
    await db.delete(userSessions).where(eq(userSessions.token, sessionToken));
  }

  return NextResponse.json({ success: true });
}
