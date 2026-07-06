import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settlements } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { groupId, fromUserId, toUserId, amount } = body;

  if (!groupId || !fromUserId || !toUserId || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [settlement] = await db
    .insert(settlements)
    .values({
      groupId,
      fromUserId,
      toUserId,
      amount: parseFloat(amount).toFixed(2),
    })
    .returning();

  return NextResponse.json(settlement, { status: 201 });
}
