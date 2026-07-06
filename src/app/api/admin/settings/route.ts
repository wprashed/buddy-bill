import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings, adminUsers, adminAuditLog } from "@/db/schema";
import { eq } from "drizzle-orm";

async function isAdmin(userId: number): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, userId))
    .limit(1);
  return !!admin;
}

// Get all system settings
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const settings = await db
    .select()
    .from(systemSettings)
    .orderBy(systemSettings.category, systemSettings.key);

  return NextResponse.json(settings);
}

// Create or update setting
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, key, value, type = "string", category = "general", description } = body;

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  // Check if setting exists
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  let setting;
  if (existing) {
    [setting] = await db
      .update(systemSettings)
      .set({ value, type, category, description, updatedAt: new Date() })
      .where(eq(systemSettings.key, key))
      .returning();

    await db.insert(adminAuditLog).values({
      adminUserId: parseInt(userId),
      action: "setting_updated",
      entityType: "system_setting",
      entityId: setting.id,
      oldValue: { value: existing.value },
      newValue: { value },
    });
  } else {
    [setting] = await db
      .insert(systemSettings)
      .values({ key, value, type, category, description })
      .returning();

    await db.insert(adminAuditLog).values({
      adminUserId: parseInt(userId),
      action: "setting_created",
      entityType: "system_setting",
      entityId: setting.id,
      newValue: { key, value },
    });
  }

  return NextResponse.json(setting, { status: existing ? 200 : 201 });
}

// Delete setting
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const key = searchParams.get("key");

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  await db.delete(systemSettings).where(eq(systemSettings.key, key));

  await db.insert(adminAuditLog).values({
    adminUserId: parseInt(userId),
    action: "setting_deleted",
    entityType: "system_setting",
    oldValue: { key, value: setting?.value },
  });

  return NextResponse.json({ success: true });
}
