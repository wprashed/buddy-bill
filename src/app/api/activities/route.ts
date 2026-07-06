import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLog, users, groupMembers } from "@/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const groupId = searchParams.get("groupId");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (groupId) {
    const activities = await db
      .select({
        id: activityLog.id,
        groupId: activityLog.groupId,
        userId: activityLog.userId,
        userName: users.name,
        userColor: users.avatarColor,
        action: activityLog.action,
        entityType: activityLog.entityType,
        entityId: activityLog.entityId,
        metadata: activityLog.metadata,
        createdAt: activityLog.createdAt,
      })
      .from(activityLog)
      .innerJoin(users, eq(activityLog.userId, users.id))
      .where(eq(activityLog.groupId, parseInt(groupId)))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);

    return NextResponse.json(activities);
  }

  if (userId) {
    // Get all groups user is in
    const userGroups = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, parseInt(userId)));

    const groupIds = userGroups.map(g => g.groupId);

    if (groupIds.length === 0) {
      return NextResponse.json([]);
    }

    const activities = await db
      .select({
        id: activityLog.id,
        groupId: activityLog.groupId,
        userId: activityLog.userId,
        userName: users.name,
        userColor: users.avatarColor,
        action: activityLog.action,
        entityType: activityLog.entityType,
        entityId: activityLog.entityId,
        metadata: activityLog.metadata,
        createdAt: activityLog.createdAt,
      })
      .from(activityLog)
      .innerJoin(users, eq(activityLog.userId, users.id))
      .where(inArray(activityLog.groupId, groupIds))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);

    return NextResponse.json(activities);
  }

  return NextResponse.json({ error: "userId or groupId is required" }, { status: 400 });
}
