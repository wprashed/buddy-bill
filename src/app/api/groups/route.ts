import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers, users } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { generateToken, logActivity } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "true";

  if (!userId) {
    const allGroups = await db.select().from(groups).orderBy(groups.createdAt);
    return NextResponse.json(allGroups);
  }

  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, parseInt(userId)));

  if (memberRows.length === 0) {
    return NextResponse.json([]);
  }

  const groupIds = memberRows.map((r) => r.groupId);
  
  let query = db
    .select()
    .from(groups)
    .where(inArray(groups.id, groupIds))
    .orderBy(groups.createdAt);

  const userGroups = await query;

  // Filter archived if needed
  const filteredGroups = includeArchived 
    ? userGroups 
    : userGroups.filter(g => !g.archived);

  return NextResponse.json(filteredGroups);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, createdBy, memberIds } = body;

  if (!name || !createdBy) {
    return NextResponse.json({ error: "Name and createdBy are required" }, { status: 400 });
  }

  const inviteCode = generateToken(12);

  const [group] = await db
    .insert(groups)
    .values({ name, description: description || null, createdBy, inviteCode })
    .returning();

  const allMemberIds: number[] = Array.from(new Set([createdBy, ...(memberIds || [])]));

  await db.insert(groupMembers).values(
    allMemberIds.map((uid: number, index: number) => ({
      groupId: group.id,
      userId: uid,
      role: uid === createdBy ? "admin" : "member",
    }))
  );

  await logActivity(createdBy, "group_created", "group", group.id, group.id, { groupName: name });

  return NextResponse.json(group, { status: 201 });
}
