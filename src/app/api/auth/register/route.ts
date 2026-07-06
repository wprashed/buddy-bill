import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, userSessions, adminUsers } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/utils";

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#a855f7",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash, avatarColor: color })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarColor: users.avatarColor,
        darkMode: users.darkMode,
        emailNotifications: users.emailNotifications,
        createdAt: users.createdAt,
      });

    // Create session
    const sessionToken = generateToken(64);
    try {
      await db.insert(userSessions).values({
        userId: user.id,
        token: sessionToken,
        userAgent: req.headers.get("user-agent") || null,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
      });
    } catch {
      // Session table might not exist yet, continue anyway
    }

    // Auto-promote first user to super_admin
    try {
      const [userCount] = await db.select({ total: count() }).from(users);
      if (userCount.total === 1) {
        await db
          .insert(adminUsers)
          .values({ userId: user.id, role: "super_admin" })
          .onConflictDoNothing();
      }
    } catch {
      // Admin table might not exist yet, continue anyway
    }

    return NextResponse.json({ ...user, sessionToken }, { status: 201 });
  } catch (err) {
    console.error("Registration error:", err);
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
