import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, expenseSplits } from "@/db/schema";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import { logActivity, checkAndAwardAchievements } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const userId = searchParams.get("userId");
  const category = searchParams.get("category");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const search = searchParams.get("search");

  let query = db.select().from(expenses);
  const conditions = [];

  if (groupId) {
    conditions.push(eq(expenses.groupId, parseInt(groupId)));
  }
  if (userId) {
    conditions.push(eq(expenses.paidById, parseInt(userId)));
  }
  if (category) {
    conditions.push(eq(expenses.category, category));
  }
  if (startDate) {
    conditions.push(gte(expenses.createdAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(expenses.createdAt, new Date(endDate)));
  }
  if (search) {
    conditions.push(sql`${expenses.description} ILIKE ${'%' + search + '%'}`);
  }

  const result = await db
    .select()
    .from(expenses)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(expenses.createdAt));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 
    groupId, 
    paidById, 
    description, 
    amount, 
    category, 
    splitType = "equal",
    splitAmong,
    splitDetails // For percentage, exact, shares splits: [{userId, value}]
  } = body;

  if (!groupId || !paidById || !description || !amount || !splitAmong || splitAmong.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check for duplicates (same description, amount, and paidBy within last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const duplicates = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.groupId, groupId),
        eq(expenses.paidById, paidById),
        eq(expenses.description, description),
        eq(expenses.amount, parseFloat(amount).toFixed(2)),
        gte(expenses.createdAt, oneHourAgo)
      )
    )
    .limit(1);

  if (duplicates.length > 0) {
    return NextResponse.json(
      { error: "Possible duplicate expense detected", duplicate: true },
      { status: 409 }
    );
  }

  const totalAmount = parseFloat(amount);

  const [expense] = await db
    .insert(expenses)
    .values({
      groupId,
      paidById,
      description,
      amount: totalAmount.toFixed(2),
      category: category || "General",
      splitType,
    })
    .returning();

  // Calculate splits based on type
  let splitValues: { expenseId: number; userId: number; amount: string; percentage?: string; shares?: number }[] = [];

  if (splitType === "equal") {
    const splitAmount = Math.round((totalAmount / splitAmong.length) * 100) / 100;
    const remainder = Math.round((totalAmount - splitAmount * splitAmong.length) * 100) / 100;

    splitValues = splitAmong.map((userId: number, index: number) => ({
      expenseId: expense.id,
      userId,
      amount: (index === 0 ? splitAmount + remainder : splitAmount).toFixed(2),
    }));
  } else if (splitType === "percentage" && splitDetails) {
    splitValues = splitDetails.map((detail: { userId: number; value: number }) => ({
      expenseId: expense.id,
      userId: detail.userId,
      amount: ((totalAmount * detail.value) / 100).toFixed(2),
      percentage: detail.value.toFixed(2),
    }));
  } else if (splitType === "exact" && splitDetails) {
    splitValues = splitDetails.map((detail: { userId: number; value: number }) => ({
      expenseId: expense.id,
      userId: detail.userId,
      amount: detail.value.toFixed(2),
    }));
  } else if (splitType === "shares" && splitDetails) {
    const totalShares = splitDetails.reduce((sum: number, d: { value: number }) => sum + d.value, 0);
    splitValues = splitDetails.map((detail: { userId: number; value: number }) => ({
      expenseId: expense.id,
      userId: detail.userId,
      amount: ((totalAmount * detail.value) / totalShares).toFixed(2),
      shares: detail.value,
    }));
  }

  await db.insert(expenseSplits).values(splitValues);

  await logActivity(paidById, "expense_added", "expense", expense.id, groupId, {
    description,
    amount: totalAmount,
  });

  await checkAndAwardAchievements(paidById);

  return NextResponse.json(expense, { status: 201 });
}
