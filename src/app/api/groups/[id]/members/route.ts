import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { logActivity } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id);
  const body = await req.json();
  const { userId, role = "member" } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ message: "Already a member" });
  }

  await db.insert(groupMembers).values({ groupId, userId, role });
  await logActivity(userId, "member_added", "group", groupId, groupId);

  return NextResponse.json({ success: true }, { status: 201 });
}

// Update member role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id);
  const body = await req.json();
  const { userId, role } = body;

  if (!userId || !role) {
    return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
  }

  await db
    .update(groupMembers)
    .set({ role })
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId)
      )
    );

  return NextResponse.json({ success: true });
}

// Leave group or remove member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await db
    .delete(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, parseInt(userId))
      )
    );

  await logActivity(parseInt(userId), "member_left", "group", groupId, groupId);

  return NextResponse.json({ success: true });
}
