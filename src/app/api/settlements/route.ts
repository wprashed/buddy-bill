import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settlements } from "@/db/schema";
import { logActivity, checkAndAwardAchievements } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { groupId, fromUserId, toUserId, amount, isPartial = false, note } = body;

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
      isPartial,
      note: note || null,
    })
    .returning();

  await logActivity(fromUserId, "settlement_made", "settlement", settlement.id, groupId, {
    amount: parseFloat(amount),
    toUserId,
    isPartial,
  });

  await checkAndAwardAchievements(fromUserId);

  return NextResponse.json(settlement, { status: 201 });
}
