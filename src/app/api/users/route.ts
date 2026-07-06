import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#a855f7",
];

export async function GET() {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarColor: users.avatarColor,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.name);
  return NextResponse.json(allUsers);
}

// POST here is for adding friends (from dashboard), not for auth registration
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  // Check if email already exists
  const existing = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarColor: users.avatarColor,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(existing[0]);
  }

  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  // When adding a friend from dashboard, generate a default password they can use to login
  const defaultPassword = password || "changeme123";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, avatarColor: color })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarColor: users.avatarColor,
      createdAt: users.createdAt,
    });

  return NextResponse.json(user, { status: 201 });
}
