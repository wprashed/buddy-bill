import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/utils";

// Request password reset
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, token, newPassword } = body;

  // If token and newPassword provided, reset the password
  if (token && newPassword) {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, resetToken.userId));

    // Delete the used token
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, resetToken.id));

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  }

  // Otherwise, generate a reset token
  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    // Don't reveal if email exists
    return NextResponse.json({ 
      success: true, 
      message: "If an account exists with this email, a reset link has been sent" 
    });
  }

  // Delete existing tokens for this user
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.id));

  // Create new token (expires in 1 hour)
  const resetTokenValue = generateToken(64);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token: resetTokenValue,
    expiresAt,
  });

  // In production, you would send an email here
  // For now, we'll return the token (development only)
  return NextResponse.json({ 
    success: true, 
    message: "If an account exists with this email, a reset link has been sent",
    // Only for development - remove in production
    resetToken: resetTokenValue,
  });
}
