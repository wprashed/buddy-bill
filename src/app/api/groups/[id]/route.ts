import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers, users, expenses, expenseSplits, settlements } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id);

  // Get group info
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Get members
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarColor: users.avatarColor,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  // Get expenses with paidBy info
  const groupExpenses = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      amount: expenses.amount,
      category: expenses.category,
      createdAt: expenses.createdAt,
      paidById: expenses.paidById,
      paidByName: users.name,
    })
    .from(expenses)
    .innerJoin(users, eq(expenses.paidById, users.id))
    .where(eq(expenses.groupId, groupId))
    .orderBy(sql`${expenses.createdAt} DESC`);

  // Get splits for each expense
  const expenseIds = groupExpenses.map((e) => e.id);
  let splits: { id: number; expenseId: number; userId: number; amount: string; settled: boolean; userName: string }[] = [];
  if (expenseIds.length > 0) {
    splits = await db
      .select({
        id: expenseSplits.id,
        expenseId: expenseSplits.expenseId,
        userId: expenseSplits.userId,
        amount: expenseSplits.amount,
        settled: expenseSplits.settled,
        userName: users.name,
      })
      .from(expenseSplits)
      .innerJoin(users, eq(expenseSplits.userId, users.id))
      .where(
        sql`${expenseSplits.expenseId} IN (${sql.join(
          expenseIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
  }

  // Get settlements
  const groupSettlements = await db
    .select({
      id: settlements.id,
      fromUserId: settlements.fromUserId,
      toUserId: settlements.toUserId,
      amount: settlements.amount,
      createdAt: settlements.createdAt,
    })
    .from(settlements)
    .where(eq(settlements.groupId, groupId))
    .orderBy(sql`${settlements.createdAt} DESC`);

  // Calculate balances
  const balances: Record<number, number> = {};
  members.forEach((m) => {
    balances[m.id] = 0;
  });

  // For each expense: payer gets +amount, each split person gets -splitAmount
  groupExpenses.forEach((exp) => {
    const expAmount = parseFloat(exp.amount);
    if (balances[exp.paidById] !== undefined) {
      balances[exp.paidById] += expAmount;
    }
  });

  splits.forEach((s) => {
    const splitAmount = parseFloat(s.amount);
    if (balances[s.userId] !== undefined) {
      balances[s.userId] -= splitAmount;
    }
  });

  // Account for settlements
  groupSettlements.forEach((s) => {
    const amt = parseFloat(s.amount);
    if (balances[s.fromUserId] !== undefined) {
      balances[s.fromUserId] += amt;
    }
    if (balances[s.toUserId] !== undefined) {
      balances[s.toUserId] -= amt;
    }
  });

  const expensesWithSplits = groupExpenses.map((e) => ({
    ...e,
    splits: splits.filter((s) => s.expenseId === e.id),
  }));

  return NextResponse.json({
    group,
    members,
    expenses: expensesWithSplits,
    settlements: groupSettlements,
    balances,
  });
}
