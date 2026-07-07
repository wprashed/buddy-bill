import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers, userSessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AdminSession = {
  userId: number;
  role: string;
};

function getSessionToken(req: NextRequest, tokenFromBody?: unknown): string | null {
  if (typeof tokenFromBody === "string" && tokenFromBody.trim()) {
    return tokenFromBody;
  }

  const headerToken = req.headers.get("x-session-token");
  if (headerToken) return headerToken;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return req.nextUrl.searchParams.get("sessionToken");
}

export async function getAdminSession(
  req: NextRequest,
  tokenFromBody?: unknown
): Promise<AdminSession | null> {
  const token = getSessionToken(req, tokenFromBody);
  if (!token) return null;

  const [session] = await db
    .select({
      userId: userSessions.userId,
      role: adminUsers.role,
    })
    .from(userSessions)
    .innerJoin(adminUsers, eq(userSessions.userId, adminUsers.userId))
    .where(eq(userSessions.token, token))
    .limit(1);

  return session ?? null;
}

export async function requireAdminSession(
  req: NextRequest,
  tokenFromBody?: unknown
): Promise<AdminSession | NextResponse> {
  const session = await getAdminSession(req, tokenFromBody);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return session;
}

export function isAuthResponse(value: AdminSession | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
