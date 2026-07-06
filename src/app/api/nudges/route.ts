import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { nudges, users, groups } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const userNudges = await db
    .select({
      id: nudges.id,
      fromUserId: nudges.fromUserId,
      fromUserName: users.name,
      toUserId: nudges.toUserId,
      groupId: nudges.groupId,
      groupName: groups.name,
      amount: nudges.amount,
      message: nudges.message,
      read: nudges.read,
      createdAt: nudges.createdAt,
    })
    .from(nudges)
    .innerJoin(users, eq(nudges.fromUserId, users.id))
    .innerJoin(groups, eq(nudges.groupId, groups.id))
    .where(eq(nudges.toUserId, parseInt(userId)))
    .orderBy(desc(nudges.createdAt));

  return NextResponse.json(userNudges);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fromUserId, toUserId, groupId, amount, message } = body;

  if (!fromUserId || !toUserId || !groupId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [nudge] = await db
    .insert(nudges)
    .values({
      fromUserId,
      toUserId,
      groupId,
      amount: amount ? parseFloat(amount).toFixed(2) : null,
      message: message || null,
    })
    .returning();

  return NextResponse.json(nudge, { status: 201 });
}

// Mark nudge as read
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { nudgeId } = body;

  if (!nudgeId) {
    return NextResponse.json({ error: "nudgeId is required" }, { status: 400 });
  }

  await db
    .update(nudges)
    .set({ read: true })
    .where(eq(nudges.id, nudgeId));

  return NextResponse.json({ success: true });
}
