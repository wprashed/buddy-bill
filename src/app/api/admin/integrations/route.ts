import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations, adminUsers, adminAuditLog } from "@/db/schema";
import { eq } from "drizzle-orm";

async function isAdmin(userId: number): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, userId))
    .limit(1);
  return !!admin;
}

// Get all integrations
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const allIntegrations = await db
    .select()
    .from(integrations)
    .orderBy(integrations.category, integrations.name);

  // Mask sensitive config values
  const maskedIntegrations = allIntegrations.map((i) => ({
    ...i,
    config: i.config
      ? Object.fromEntries(
          Object.entries(i.config as Record<string, unknown>).map(([key, value]) => [
            key,
            key.toLowerCase().includes("key") || key.toLowerCase().includes("secret")
              ? typeof value === "string" && value.length > 4
                ? `${"*".repeat(value.length - 4)}${value.slice(-4)}`
                : "****"
              : value,
          ])
        )
      : null,
  }));

  return NextResponse.json(maskedIntegrations);
}

// Create integration
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, key, name, description, enabled = false, config, category = "payment", iconUrl } = body;

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!key || !name) {
    return NextResponse.json({ error: "key and name are required" }, { status: 400 });
  }

  const [integration] = await db
    .insert(integrations)
    .values({ key, name, description, enabled, config, category, iconUrl })
    .returning();

  await db.insert(adminAuditLog).values({
    adminUserId: parseInt(userId),
    action: "integration_created",
    entityType: "integration",
    entityId: integration.id,
    newValue: { key, name, enabled },
  });

  return NextResponse.json(integration, { status: 201 });
}

// Update integration
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { userId, integrationId, enabled, config, name, description } = body;

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!integrationId) {
    return NextResponse.json({ error: "integrationId is required" }, { status: 400 });
  }

  // Get old value
  const [oldIntegration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (enabled !== undefined) updateData.enabled = enabled;
  if (config !== undefined) {
    // Merge with existing config
    updateData.config = { ...(oldIntegration?.config as object || {}), ...config };
  }
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;

  const [integration] = await db
    .update(integrations)
    .set(updateData)
    .where(eq(integrations.id, integrationId))
    .returning();

  await db.insert(adminAuditLog).values({
    adminUserId: parseInt(userId),
    action: "integration_updated",
    entityType: "integration",
    entityId: integrationId,
    oldValue: { enabled: oldIntegration?.enabled },
    newValue: { enabled: integration.enabled },
  });

  return NextResponse.json(integration);
}

// Delete integration
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const integrationId = searchParams.get("integrationId");

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!integrationId) {
    return NextResponse.json({ error: "integrationId is required" }, { status: 400 });
  }

  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, parseInt(integrationId)))
    .limit(1);

  await db.delete(integrations).where(eq(integrations.id, parseInt(integrationId)));

  await db.insert(adminAuditLog).values({
    adminUserId: parseInt(userId),
    action: "integration_deleted",
    entityType: "integration",
    entityId: parseInt(integrationId),
    oldValue: { key: integration?.key, name: integration?.name },
  });

  return NextResponse.json({ success: true });
}
