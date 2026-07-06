import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers, users, expenses, expenseSplits, settlements, activityLog, expenseComments } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id);

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Get members with roles
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarColor: users.avatarColor,
      darkMode: users.darkMode,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  // Get expenses
  const groupExpenses = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      amount: expenses.amount,
      category: expenses.category,
      splitType: expenses.splitType,
      receiptUrl: expenses.receiptUrl,
      createdAt: expenses.createdAt,
      updatedAt: expenses.updatedAt,
      paidById: expenses.paidById,
      paidByName: users.name,
    })
    .from(expenses)
    .innerJoin(users, eq(expenses.paidById, users.id))
    .where(eq(expenses.groupId, groupId))
    .orderBy(desc(expenses.createdAt));

  // Get splits
  const expenseIds = groupExpenses.map((e) => e.id);
  let splits: { id: number; expenseId: number; userId: number; amount: string; percentage: string | null; shares: number | null; settled: boolean; userName: string }[] = [];
  
  if (expenseIds.length > 0) {
    splits = await db
      .select({
        id: expenseSplits.id,
        expenseId: expenseSplits.expenseId,
        userId: expenseSplits.userId,
        amount: expenseSplits.amount,
        percentage: expenseSplits.percentage,
        shares: expenseSplits.shares,
        settled: expenseSplits.settled,
        userName: users.name,
      })
      .from(expenseSplits)
      .innerJoin(users, eq(expenseSplits.userId, users.id))
      .where(
        sql`${expenseSplits.expenseId} IN (${sql.join(
          expenseIds.map((eid) => sql`${eid}`),
          sql`, `
        )})`
      );
  }

  // Get comments
  let comments: { id: number; expenseId: number; userId: number; userName: string; userColor: string; content: string; createdAt: Date }[] = [];
  if (expenseIds.length > 0) {
    comments = await db
      .select({
        id: expenseComments.id,
        expenseId: expenseComments.expenseId,
        userId: expenseComments.userId,
        userName: users.name,
        userColor: users.avatarColor,
        content: expenseComments.content,
        createdAt: expenseComments.createdAt,
      })
      .from(expenseComments)
      .innerJoin(users, eq(expenseComments.userId, users.id))
      .where(
        sql`${expenseComments.expenseId} IN (${sql.join(
          expenseIds.map((eid) => sql`${eid}`),
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
      isPartial: settlements.isPartial,
      note: settlements.note,
      createdAt: settlements.createdAt,
    })
    .from(settlements)
    .where(eq(settlements.groupId, groupId))
    .orderBy(desc(settlements.createdAt));

  // Get activities
  const activities = await db
    .select({
      id: activityLog.id,
      groupId: activityLog.groupId,
      userId: activityLog.userId,
      userName: users.name,
      userColor: users.avatarColor,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
    })
    .from(activityLog)
    .innerJoin(users, eq(activityLog.userId, users.id))
    .where(eq(activityLog.groupId, groupId))
    .orderBy(desc(activityLog.createdAt))
    .limit(50);

  // Calculate balances
  const balances: Record<number, number> = {};
  members.forEach((m) => {
    balances[m.id] = 0;
  });

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
    comments: comments.filter((c) => c.expenseId === e.id),
  }));

  return NextResponse.json({
    group,
    members,
    expenses: expensesWithSplits,
    settlements: groupSettlements,
    balances,
    activities,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id);
  const body = await req.json();

  const { name, description, archived } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (archived !== undefined) updateData.archived = archived;

  const [group] = await db
    .update(groups)
    .set(updateData)
    .where(eq(groups.id, groupId))
    .returning();

  return NextResponse.json(group);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id);

  await db.delete(groups).where(eq(groups.id, groupId));

  return NextResponse.json({ success: true });
}
