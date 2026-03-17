import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    if (!requireRole(user, "superadmin")) return forbiddenResponse(["superadmin"]);

    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ users });
  } catch (err) {
    console.error("Fetch users error:", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
