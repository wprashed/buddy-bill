import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id);

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarColor: users.avatarColor,
      darkMode: users.darkMode,
      emailNotifications: users.emailNotifications,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id);
  const body = await req.json();

  const { name, darkMode, emailNotifications, avatarColor } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (darkMode !== undefined) updateData.darkMode = darkMode;
  if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
  if (avatarColor !== undefined) updateData.avatarColor = avatarColor;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [user] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarColor: users.avatarColor,
      darkMode: users.darkMode,
      emailNotifications: users.emailNotifications,
      createdAt: users.createdAt,
    });

  return NextResponse.json(user);
}
