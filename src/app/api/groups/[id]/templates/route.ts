import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenseTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id);

  const templates = await db
    .select()
    .from(expenseTemplates)
    .where(eq(expenseTemplates.groupId, groupId))
    .orderBy(expenseTemplates.name);

  return NextResponse.json(templates);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id);
  const body = await req.json();

  const { name, description, amount, category, splitType, splitConfig, createdBy } = body;

  if (!name || !description || !createdBy) {
    return NextResponse.json(
      { error: "name, description, and createdBy are required" },
      { status: 400 }
    );
  }

  const [template] = await db
    .insert(expenseTemplates)
    .values({
      groupId,
      createdBy,
      name,
      description,
      amount: amount || null,
      category: category || "General",
      splitType: splitType || "equal",
      splitConfig: splitConfig || null,
    })
    .returning();

  return NextResponse.json(template, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get("templateId");

  if (!templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }

  await db.delete(expenseTemplates).where(eq(expenseTemplates.id, parseInt(templateId)));

  return NextResponse.json({ success: true });
}
