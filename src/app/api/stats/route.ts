import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, expenseSplits, settlements, groupMembers } from "@/db/schema";
import { eq, sql, and, gte, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const uid = parseInt(userId);

  // Get groups user is in
  const userGroups = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, uid));

  const groupIds = userGroups.map(g => g.groupId);
  const groupsCount = groupIds.length;

  if (groupIds.length === 0) {
    return NextResponse.json({
      totalOwed: 0,
      totalOwing: 0,
      groupsCount: 0,
      expensesThisMonth: 0,
      topCategory: "None",
      categoryBreakdown: [],
      monthlySpending: [],
    });
  }

  // Calculate what user owes others and what others owe user
  // User paid for expenses (others owe user)
  const paidExpenses = await db
    .select({ amount: expenses.amount })
    .from(expenses)
    .where(
      and(
        eq(expenses.paidById, uid),
        sql`${expenses.groupId} IN (${sql.join(groupIds.map(id => sql`${id}`), sql`, `)})`
      )
    );

  const totalPaid = paidExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // User's share of expenses (what user consumed)
  const userSplits = await db
    .select({ amount: expenseSplits.amount })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(
      and(
        eq(expenseSplits.userId, uid),
        sql`${expenses.groupId} IN (${sql.join(groupIds.map(id => sql`${id}`), sql`, `)})`
      )
    );

  const totalConsumed = userSplits.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  // Settlements made by user (reduces what user owes)
  const settledByUser = await db
    .select({ amount: settlements.amount })
    .from(settlements)
    .where(
      and(
        eq(settlements.fromUserId, uid),
        sql`${settlements.groupId} IN (${sql.join(groupIds.map(id => sql`${id}`), sql`, `)})`
      )
    );

  const totalSettledByUser = settledByUser.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  // Settlements received by user (reduces what others owe user)
  const settledToUser = await db
    .select({ amount: settlements.amount })
    .from(settlements)
    .where(
      and(
        eq(settlements.toUserId, uid),
        sql`${settlements.groupId} IN (${sql.join(groupIds.map(id => sql`${id}`), sql`, `)})`
      )
    );

  const totalSettledToUser = settledToUser.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  // Net balance: positive = others owe user, negative = user owes others
  const netBalance = (totalPaid - totalConsumed) + totalSettledByUser - totalSettledToUser;
  const totalOwed = netBalance > 0 ? netBalance : 0; // Others owe user
  const totalOwing = netBalance < 0 ? Math.abs(netBalance) : 0; // User owes others

  // Expenses this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthExpenses = await db
    .select({ amount: expenseSplits.amount })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(
      and(
        eq(expenseSplits.userId, uid),
        gte(expenses.createdAt, startOfMonth)
      )
    );

  const expensesThisMonth = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Category breakdown
  const categoryData = await db
    .select({
      category: expenses.category,
      total: sql<string>`SUM(${expenseSplits.amount})`,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(eq(expenseSplits.userId, uid))
    .groupBy(expenses.category)
    .orderBy(desc(sql`SUM(${expenseSplits.amount})`));

  const categoryBreakdown = categoryData.map(c => ({
    category: c.category || "General",
    amount: parseFloat(c.total || "0"),
  }));

  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].category : "None";

  // Monthly spending (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyData = await db
    .select({
      month: sql<string>`TO_CHAR(${expenses.createdAt}, 'YYYY-MM')`,
      total: sql<string>`SUM(${expenseSplits.amount})`,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(
      and(
        eq(expenseSplits.userId, uid),
        gte(expenses.createdAt, sixMonthsAgo)
      )
    )
    .groupBy(sql`TO_CHAR(${expenses.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${expenses.createdAt}, 'YYYY-MM')`);

  const monthlySpending = monthlyData.map(m => ({
    month: m.month,
    amount: parseFloat(m.total || "0"),
  }));

  return NextResponse.json({
    totalOwed,
    totalOwing,
    groupsCount,
    expensesThisMonth,
    topCategory,
    categoryBreakdown,
    monthlySpending,
  });
}
