import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { achievements, userAchievements } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkAndAwardAchievements } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id);

  // Check for new achievements first
  await checkAndAwardAchievements(userId);

  // Get all achievements with unlock status
  const allAchievements = await db
    .select({
      id: achievements.id,
      code: achievements.code,
      name: achievements.name,
      description: achievements.description,
      icon: achievements.icon,
      unlockedAt: userAchievements.unlockedAt,
    })
    .from(achievements)
    .leftJoin(
      userAchievements,
      sql`${userAchievements.achievementId} = ${achievements.id} AND ${userAchievements.userId} = ${userId}`
    )
    .orderBy(achievements.id);

  return NextResponse.json(allAchievements);
}
