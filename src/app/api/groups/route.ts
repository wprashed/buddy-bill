import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    const allGroups = await db.select().from(groups).orderBy(groups.createdAt);
    return NextResponse.json(allGroups);
  }

  // Get groups where user is a member
  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, parseInt(userId)));

  if (memberRows.length === 0) {
    return NextResponse.json([]);
  }

  const groupIds = memberRows.map((r) => r.groupId);
  const userGroups = await db
    .select()
    .from(groups)
    .where(inArray(groups.id, groupIds))
    .orderBy(groups.createdAt);

  return NextResponse.json(userGroups);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, createdBy, memberIds } = body;

  if (!name || !createdBy) {
    return NextResponse.json({ error: "Name and createdBy are required" }, { status: 400 });
  }

  const [group] = await db
    .insert(groups)
    .values({ name, description: description || null, createdBy })
    .returning();

  // Add creator + members
  const allMemberIds: number[] = Array.from(new Set([createdBy, ...(memberIds || [])]));

  await db.insert(groupMembers).values(
    allMemberIds.map((uid: number) => ({
      groupId: group.id,
      userId: uid,
    }))
  );

  return NextResponse.json(group, { status: 201 });
}
