import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, expenseSplits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expenseId = parseInt(id);

  const [expense] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const splits = await db
    .select()
    .from(expenseSplits)
    .where(eq(expenseSplits.expenseId, expenseId));

  return NextResponse.json({ ...expense, splits });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expenseId = parseInt(id);
  const body = await req.json();

  const { description, amount, category, splitType, splitAmong, splitDetails, updatedBy } = body;

  const [existingExpense] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);

  if (!existingExpense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (description !== undefined) updateData.description = description;
  if (amount !== undefined) updateData.amount = parseFloat(amount).toFixed(2);
  if (category !== undefined) updateData.category = category;
  if (splitType !== undefined) updateData.splitType = splitType;

  const [expense] = await db
    .update(expenses)
    .set(updateData)
    .where(eq(expenses.id, expenseId))
    .returning();

  // Update splits if provided
  if (splitAmong && splitAmong.length > 0) {
    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));

    const totalAmount = parseFloat(amount || existingExpense.amount);
    let splitValues: { expenseId: number; userId: number; amount: string; percentage?: string; shares?: number }[] = [];

    const effectiveSplitType = splitType || existingExpense.splitType;

    if (effectiveSplitType === "equal") {
      const splitAmount = Math.round((totalAmount / splitAmong.length) * 100) / 100;
      const remainder = Math.round((totalAmount - splitAmount * splitAmong.length) * 100) / 100;

      splitValues = splitAmong.map((userId: number, index: number) => ({
        expenseId: expense.id,
        userId,
        amount: (index === 0 ? splitAmount + remainder : splitAmount).toFixed(2),
      }));
    } else if (effectiveSplitType === "percentage" && splitDetails) {
      splitValues = splitDetails.map((detail: { userId: number; value: number }) => ({
        expenseId: expense.id,
        userId: detail.userId,
        amount: ((totalAmount * detail.value) / 100).toFixed(2),
        percentage: detail.value.toFixed(2),
      }));
    } else if (effectiveSplitType === "exact" && splitDetails) {
      splitValues = splitDetails.map((detail: { userId: number; value: number }) => ({
        expenseId: expense.id,
        userId: detail.userId,
        amount: detail.value.toFixed(2),
      }));
    } else if (effectiveSplitType === "shares" && splitDetails) {
      const totalShares = splitDetails.reduce((sum: number, d: { value: number }) => sum + d.value, 0);
      splitValues = splitDetails.map((detail: { userId: number; value: number }) => ({
        expenseId: expense.id,
        userId: detail.userId,
        amount: ((totalAmount * detail.value) / totalShares).toFixed(2),
        shares: detail.value,
      }));
    }

    await db.insert(expenseSplits).values(splitValues);
  }

  if (updatedBy) {
    await logActivity(updatedBy, "expense_edited", "expense", expenseId, existingExpense.groupId);
  }

  return NextResponse.json(expense);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expenseId = parseInt(id);
  const { searchParams } = new URL(req.url);
  const deletedBy = searchParams.get("deletedBy");

  const [expense] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  await db.delete(expenses).where(eq(expenses.id, expenseId));

  if (deletedBy) {
    await logActivity(parseInt(deletedBy), "expense_deleted", "expense", expenseId, expense.groupId, {
      description: expense.description,
      amount: expense.amount,
    });
  }

  return NextResponse.json({ success: true });
}
