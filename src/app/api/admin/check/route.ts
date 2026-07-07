import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const admin = await getAdminSession(req);

  return NextResponse.json({
    isAdmin: !!admin,
    role: admin?.role || null,
  });
}
