import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminUsers, groups, groupMembers, expenses } from "@/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";

async function isAdmin(userId: number): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, userId))
    .limit(1);
  return !!admin;
}

// Get all users with stats
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  if (!userId || !(await isAdmin(parseInt(userId)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const offset = (page - 1) * limit;

  // Get users with group count
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarColor: users.avatarColor,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  // Get admin status for each user
  const adminStatuses = await db
    .select({
      userId: adminUsers.userId,
      role: adminUsers.role,
    })
    .from(adminUsers);

  const adminMap = new Map(adminStatuses.map((a) => [a.userId, a.role]));

  const usersWithAdmin = allUsers.map((u) => ({
    ...u,
    isAdmin: adminMap.has(u.id),
    adminRole: adminMap.get(u.id) || null,
  }));

  // Total count
  const [{ total }] = await db.select({ total: count() }).from(users);

  return NextResponse.json({
    users: usersWithAdmin,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
