import { db } from "@/db";
import { activityLog, achievements, userAchievements, expenses, settlements, groups, groupMembers } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

export function generateToken(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function logActivity(
  userId: number,
  action: string,
  entityType?: string,
  entityId?: number,
  groupId?: number,
  metadata?: Record<string, unknown>
) {
  try {
    await db.insert(activityLog).values({
      userId,
      action,
      entityType: entityType || null,
      entityId: entityId || null,
      groupId: groupId || null,
      metadata: metadata || null,
    });
  } catch {
    // Silently fail — activity logging should never break the main flow
  }
}

export async function checkAndAwardAchievements(userId: number) {
  try {
    // Get all achievements
    const allAchievements = await db.select().from(achievements);
    
    if (allAchievements.length === 0) return;

    // Get user's current achievements
    const userAchievementRows = await db
      .select({ achievementId: userAchievements.achievementId })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));
    
    const unlockedIds = new Set(userAchievementRows.map(a => a.achievementId));
    
    // Check each achievement
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) continue;
      
      let earned = false;
      
      switch (achievement.code) {
        case "first_expense": {
          const [count] = await db
            .select({ count: sql<number>`count(*)` })
            .from(expenses)
            .where(eq(expenses.paidById, userId));
          earned = count.count >= 1;
          break;
        }
        case "expense_master": {
          const [count] = await db
            .select({ count: sql<number>`count(*)` })
            .from(expenses)
            .where(eq(expenses.paidById, userId));
          earned = count.count >= 50;
          break;
        }
        case "first_settlement": {
          const [count] = await db
            .select({ count: sql<number>`count(*)` })
            .from(settlements)
            .where(eq(settlements.fromUserId, userId));
          earned = count.count >= 1;
          break;
        }
        case "debt_crusher": {
          const [count] = await db
            .select({ count: sql<number>`count(*)` })
            .from(settlements)
            .where(eq(settlements.fromUserId, userId));
          earned = count.count >= 10;
          break;
        }
        case "group_founder": {
          const [count] = await db
            .select({ count: sql<number>`count(*)` })
            .from(groups)
            .where(eq(groups.createdBy, userId));
          earned = count.count >= 1;
          break;
        }
        case "social_butterfly": {
          const [count] = await db
            .select({ count: sql<number>`count(*)` })
            .from(groupMembers)
            .where(eq(groupMembers.userId, userId));
          earned = count.count >= 5;
          break;
        }
      }
      
      if (earned) {
        await db.insert(userAchievements).values({
          userId,
          achievementId: achievement.id,
        });
      }
    }
  } catch {
    // Silently fail — achievement checking should never break the main flow
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function getPaymentLink(platform: string, amount: number, note?: string): string {
  const encodedNote = encodeURIComponent(note || "BuddyBill payment");
  
  switch (platform) {
    case "venmo":
      return `venmo://paycharge?txn=pay&amount=${amount}&note=${encodedNote}`;
    case "paypal":
      return `https://www.paypal.me/?amount=${amount}&currency_code=USD`;
    case "cashapp":
      return `https://cash.app/$cashtag?amount=${amount}&note=${encodedNote}`;
    default:
      return "";
  }
}
