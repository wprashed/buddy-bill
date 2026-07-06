import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminAuditLog, adminUsers, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function isAdmin(userId: number): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, userId))
    .limit(1);
  return !!admin;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const limit = parseInt(searchParams.get("limit") || "100");

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const logs = await db
    .select({
      id: adminAuditLog.id,
      adminUserId: adminAuditLog.adminUserId,
      adminUserName: users.name,
      action: adminAuditLog.action,
      entityType: adminAuditLog.entityType,
      entityId: adminAuditLog.entityId,
      oldValue: adminAuditLog.oldValue,
      newValue: adminAuditLog.newValue,
      ipAddress: adminAuditLog.ipAddress,
      createdAt: adminAuditLog.createdAt,
    })
    .from(adminAuditLog)
    .innerJoin(users, eq(adminAuditLog.adminUserId, users.id))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);

  return NextResponse.json(logs);
}
