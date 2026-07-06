import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { friends, users } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const userFriends = await db
    .select({
      id: friends.id,
      friendId: users.id,
      name: users.name,
      email: users.email,
      avatarColor: users.avatarColor,
      createdAt: friends.createdAt,
    })
    .from(friends)
    .innerJoin(users, eq(friends.friendId, users.id))
    .where(eq(friends.userId, parseInt(userId)));

  return NextResponse.json(userFriends);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, friendId } = body;

  if (!userId || !friendId) {
    return NextResponse.json({ error: "userId and friendId are required" }, { status: 400 });
  }

  if (userId === friendId) {
    return NextResponse.json({ error: "Cannot add yourself as a friend" }, { status: 400 });
  }

  // Check if already friends
  const existing = await db
    .select()
    .from(friends)
    .where(
      and(
        eq(friends.userId, userId),
        eq(friends.friendId, friendId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ message: "Already friends" });
  }

  // Add friendship (both directions)
  await db.insert(friends).values([
    { userId, friendId },
    { userId: friendId, friendId: userId },
  ]);

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const friendId = searchParams.get("friendId");

  if (!userId || !friendId) {
    return NextResponse.json({ error: "userId and friendId are required" }, { status: 400 });
  }

  // Remove friendship (both directions)
  await db
    .delete(friends)
    .where(
      or(
        and(
          eq(friends.userId, parseInt(userId)),
          eq(friends.friendId, parseInt(friendId))
        ),
        and(
          eq(friends.userId, parseInt(friendId)),
          eq(friends.friendId, parseInt(userId))
        )
      )
    );

  return NextResponse.json({ success: true });
}
