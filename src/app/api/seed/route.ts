import { NextResponse } from "next/server";
import { db } from "@/db";
import { achievements } from "@/db/schema";

const ACHIEVEMENTS_DATA = [
  {
    code: "first_expense",
    name: "First Step",
    description: "Added your first expense",
    icon: "🎯",
  },
  {
    code: "expense_master",
    name: "Expense Master",
    description: "Added 50 expenses",
    icon: "💰",
  },
  {
    code: "first_settlement",
    name: "Debt Free",
    description: "Made your first settlement",
    icon: "💸",
  },
  {
    code: "debt_crusher",
    name: "Debt Crusher",
    description: "Settled 10 debts",
    icon: "⚡",
  },
  {
    code: "group_founder",
    name: "Group Founder",
    description: "Created your first group",
    icon: "👑",
  },
  {
    code: "social_butterfly",
    name: "Social Butterfly",
    description: "Joined 5 groups",
    icon: "🦋",
  },
];

export async function POST() {
  try {
    for (const achievement of ACHIEVEMENTS_DATA) {
      await db
        .insert(achievements)
        .values(achievement)
        .onConflictDoNothing();
    }
    return NextResponse.json({ success: true, message: "Database seeded" });
  } catch (err) {
    console.error("Seed error:", err);
    // Don't fail — seeding is optional
    return NextResponse.json({ success: false, message: "Seed skipped (tables may not exist yet)" });
  }
}
