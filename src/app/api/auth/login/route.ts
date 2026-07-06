import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, userSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

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
      // Session table might not exist, continue anyway
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor,
      darkMode: user.darkMode,
      emailNotifications: user.emailNotifications,
      createdAt: user.createdAt,
      sessionToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
