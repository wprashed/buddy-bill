import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings, adminAuditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAuthResponse, requireAdminSession } from "@/lib/adminAuth";

// Get all system settings
export async function GET(req: NextRequest) {
  const admin = await requireAdminSession(req);
  if (isAuthResponse(admin)) return admin;

  const settings = await db
    .select()
    .from(systemSettings)
    .orderBy(systemSettings.category, systemSettings.key);

  return NextResponse.json(settings);
}

// Create or update setting
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { key, value, type = "string", category = "general", description } = body;
  const admin = await requireAdminSession(req, body.sessionToken);
  if (isAuthResponse(admin)) return admin;

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
      adminUserId: admin.userId,
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
      adminUserId: admin.userId,
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
  const key = searchParams.get("key");

  const admin = await requireAdminSession(req);
  if (isAuthResponse(admin)) return admin;

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
    adminUserId: admin.userId,
    action: "setting_deleted",
    entityType: "system_setting",
    oldValue: { key, value: setting?.value },
  });

  return NextResponse.json({ success: true });
}
