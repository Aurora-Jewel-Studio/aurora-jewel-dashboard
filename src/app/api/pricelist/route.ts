import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticate, unauthorizedResponse } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { data, error } = await supabaseAdmin
      .from("price_lists")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ price_lists: data });
  } catch (err) {
    console.error("List price lists error:", err);
    return NextResponse.json(
      { error: "Failed to fetch price lists" },
      { status: 500 }
    );
  }
}
