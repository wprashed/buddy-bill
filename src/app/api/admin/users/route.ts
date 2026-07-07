import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminUsers } from "@/db/schema";
import { desc, count } from "drizzle-orm";
import { isAuthResponse, requireAdminSession } from "@/lib/adminAuth";

// Get all users with stats
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const admin = await requireAdminSession(req);
  if (isAuthResponse(admin)) return admin;

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
