import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ isAdmin: false });
  }

  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, parseInt(userId)))
    .limit(1);

  return NextResponse.json({
    isAdmin: !!admin,
    role: admin?.role || null,
  });
}
