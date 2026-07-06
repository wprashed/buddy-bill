import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { featureFlags, adminUsers, adminAuditLog } from "@/db/schema";
import { eq } from "drizzle-orm";

async function isAdmin(userId: number): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, userId))
    .limit(1);
  return !!admin;
}

// Get all feature flags
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const flags = await db
    .select()
    .from(featureFlags)
    .orderBy(featureFlags.category, featureFlags.name);

  return NextResponse.json(flags);
}

// Create feature flag
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, key, name, description, enabled = true, category = "general" } = body;

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!key || !name) {
    return NextResponse.json({ error: "key and name are required" }, { status: 400 });
  }

  const [flag] = await db
    .insert(featureFlags)
    .values({ key, name, description, enabled, category })
    .returning();

  // Log action
  await db.insert(adminAuditLog).values({
    adminUserId: parseInt(userId),
    action: "feature_flag_created",
    entityType: "feature_flag",
    entityId: flag.id,
    newValue: { key, name, enabled },
  });

  return NextResponse.json(flag, { status: 201 });
}

// Update feature flag
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { userId, flagId, enabled, name, description } = body;

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!flagId) {
    return NextResponse.json({ error: "flagId is required" }, { status: 400 });
  }

  // Get old value
  const [oldFlag] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.id, flagId))
    .limit(1);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (enabled !== undefined) updateData.enabled = enabled;
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;

  const [flag] = await db
    .update(featureFlags)
    .set(updateData)
    .where(eq(featureFlags.id, flagId))
    .returning();

  // Log action
  await db.insert(adminAuditLog).values({
    adminUserId: parseInt(userId),
    action: "feature_flag_updated",
    entityType: "feature_flag",
    entityId: flagId,
    oldValue: { enabled: oldFlag?.enabled, name: oldFlag?.name },
    newValue: { enabled: flag.enabled, name: flag.name },
  });

  return NextResponse.json(flag);
}

// Delete feature flag
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const flagId = searchParams.get("flagId");

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!flagId) {
    return NextResponse.json({ error: "flagId is required" }, { status: 400 });
  }

  // Get flag for logging
  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.id, parseInt(flagId)))
    .limit(1);

  await db.delete(featureFlags).where(eq(featureFlags.id, parseInt(flagId)));

  // Log action
  await db.insert(adminAuditLog).values({
    adminUserId: parseInt(userId),
    action: "feature_flag_deleted",
    entityType: "feature_flag",
    entityId: parseInt(flagId),
    oldValue: { key: flag?.key, name: flag?.name },
  });

  return NextResponse.json({ success: true });
}
