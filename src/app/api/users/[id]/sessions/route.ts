import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userSessions } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id);

  const sessions = await db
    .select({
      id: userSessions.id,
      userAgent: userSessions.userAgent,
      ipAddress: userSessions.ipAddress,
      lastActive: userSessions.lastActive,
      createdAt: userSessions.createdAt,
    })
    .from(userSessions)
    .where(eq(userSessions.userId, userId))
    .orderBy(userSessions.lastActive);

  return NextResponse.json(sessions);
}

// Revoke a specific session or all other sessions
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id);
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const currentToken = searchParams.get("currentToken");

  if (sessionId) {
    // Revoke specific session
    await db
      .delete(userSessions)
      .where(
        and(
          eq(userSessions.id, parseInt(sessionId)),
          eq(userSessions.userId, userId)
        )
      );
  } else if (currentToken) {
    // Revoke all except current
    await db
      .delete(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          ne(userSessions.token, currentToken)
        )
      );
  }

  return NextResponse.json({ success: true });
}
