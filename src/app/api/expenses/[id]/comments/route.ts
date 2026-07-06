import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenseComments, expenses, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { logActivity } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expenseId = parseInt(id);

  const comments = await db
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
    .where(eq(expenseComments.expenseId, expenseId))
    .orderBy(desc(expenseComments.createdAt));

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expenseId = parseInt(id);
  const body = await req.json();
  const { userId, content } = body;

  if (!userId || !content) {
    return NextResponse.json(
      { error: "userId and content are required" },
      { status: 400 }
    );
  }

  const [expense] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const [comment] = await db
    .insert(expenseComments)
    .values({ expenseId, userId, content })
    .returning();

  await logActivity(userId, "comment_added", "expense", expenseId, expense.groupId);

  return NextResponse.json(comment, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("commentId");

  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  await db.delete(expenseComments).where(eq(expenseComments.id, parseInt(commentId)));

  return NextResponse.json({ success: true });
}
