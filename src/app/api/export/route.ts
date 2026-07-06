import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, expenseSplits, users, groups } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const userId = searchParams.get("userId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const format = searchParams.get("format") || "csv";

  const conditions = [];
  if (groupId) conditions.push(eq(expenses.groupId, parseInt(groupId)));
  if (startDate) conditions.push(gte(expenses.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(expenses.createdAt, new Date(endDate)));

  const data = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      amount: expenses.amount,
      category: expenses.category,
      date: expenses.createdAt,
      paidBy: users.name,
      groupName: groups.name,
    })
    .from(expenses)
    .innerJoin(users, eq(expenses.paidById, users.id))
    .innerJoin(groups, eq(expenses.groupId, groups.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(expenses.createdAt);

  if (format === "csv") {
    const headers = ["ID", "Date", "Description", "Amount", "Category", "Paid By", "Group"];
    const rows = data.map(row => [
      row.id,
      new Date(row.date).toISOString().split("T")[0],
      `"${row.description.replace(/"/g, '""')}"`,
      row.amount,
      row.category,
      row.paidBy,
      row.groupName,
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="expenses-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  // JSON format
  return NextResponse.json(data);
}
