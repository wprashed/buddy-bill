import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers, users, groups, expenses, settlements, userSessions } from "@/db/schema";
import { eq, sql, gte, count } from "drizzle-orm";

// Check if user is admin
async function isAdmin(userId: number): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, userId))
    .limit(1);
  return !!admin;
}

// Get admin dashboard stats
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const isUserAdmin = await isAdmin(parseInt(userId));
  if (!isUserAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get stats
  const [usersCount] = await db.select({ count: count() }).from(users);
  const [groupsCount] = await db.select({ count: count() }).from(groups);
  const [expensesCount] = await db.select({ count: count() }).from(expenses);
  const [settlementsCount] = await db.select({ count: count() }).from(settlements);

  // Active users today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [activeToday] = await db
    .select({ count: count() })
    .from(userSessions)
    .where(gte(userSessions.lastActive, today));

  // New users this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [newThisWeek] = await db
    .select({ count: count() })
    .from(users)
    .where(gte(users.createdAt, weekAgo));

  // Total expense amount
  const [totalAmount] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses);

  return NextResponse.json({
    totalUsers: usersCount.count,
    totalGroups: groupsCount.count,
    totalExpenses: expensesCount.count,
    totalSettlements: settlementsCount.count,
    activeUsersToday: activeToday.count,
    newUsersThisWeek: newThisWeek.count,
    totalExpenseAmount: parseFloat(totalAmount.total || "0"),
  });
}

// Create admin user
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, targetUserId, role = "admin" } = body;

  if (!userId || !targetUserId) {
    return NextResponse.json({ error: "userId and targetUserId are required" }, { status: 400 });
  }

  // Check if requester is super_admin
  const [requester] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, userId))
    .limit(1);

  if (!requester || requester.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can create admins" }, { status: 403 });
  }

  // Check if target is already admin
  const existing = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, targetUserId))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: "User is already an admin" }, { status: 409 });
  }

  const [admin] = await db
    .insert(adminUsers)
    .values({ userId: targetUserId, role })
    .returning();

  return NextResponse.json(admin, { status: 201 });
}
