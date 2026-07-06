import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logActivity } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { inviteCode, userId } = body;

  if (!inviteCode || !userId) {
    return NextResponse.json(
      { error: "Invite code and userId are required" },
      { status: 400 }
    );
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, inviteCode))
    .limit(1);

  if (!group) {
    return NextResponse.json(
      { error: "Invalid invite code" },
      { status: 404 }
    );
  }

  if (group.archived) {
    return NextResponse.json(
      { error: "This group has been archived" },
      { status: 400 }
    );
  }

  // Check if already a member
  const existing = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ group, message: "Already a member" });
  }

  await db.insert(groupMembers).values({
    groupId: group.id,
    userId,
    role: "member",
  });

  await logActivity(userId, "member_joined", "group", group.id, group.id);

  return NextResponse.json({ group, message: "Successfully joined group" }, { status: 201 });
}
