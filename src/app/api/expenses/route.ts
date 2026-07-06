import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, expenseSplits } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { groupId, paidById, description, amount, category, splitAmong } = body;

  if (!groupId || !paidById || !description || !amount || !splitAmong || splitAmong.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const totalAmount = parseFloat(amount);
  const splitAmount = Math.round((totalAmount / splitAmong.length) * 100) / 100;

  // Handle rounding: give the remainder to the first person
  const remainder = Math.round((totalAmount - splitAmount * splitAmong.length) * 100) / 100;

  const [expense] = await db
    .insert(expenses)
    .values({
      groupId,
      paidById,
      description,
      amount: totalAmount.toFixed(2),
      category: category || "General",
    })
    .returning();

  const splitValues = splitAmong.map((userId: number, index: number) => ({
    expenseId: expense.id,
    userId,
    amount: (index === 0 ? splitAmount + remainder : splitAmount).toFixed(2),
  }));

  await db.insert(expenseSplits).values(splitValues);

  return NextResponse.json(expense, { status: 201 });
}
