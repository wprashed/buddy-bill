import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id);
  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Check if already a member
  const existing = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ message: "Already a member" });
  }

  await db.insert(groupMembers).values({ groupId, userId });

  return NextResponse.json({ success: true }, { status: 201 });
}
