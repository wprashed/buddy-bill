import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminAuditLog, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { isAuthResponse, requireAdminSession } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "100");

  const admin = await requireAdminSession(req);
  if (isAuthResponse(admin)) return admin;

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
