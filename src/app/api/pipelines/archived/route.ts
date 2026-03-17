import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticate, unauthorizedResponse } from "@/lib/auth-helpers";

// GET /api/pipelines/archived — List archived pipelines
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { data, error } = await supabaseAdmin
      .from("pipelines")
      .select("*, design_cards(id)")
      .eq("status", "archived")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pipelines = (data || []).map((p: any) => ({
      ...p,
      card_count: p.design_cards?.length || 0,
      design_cards: undefined,
    }));

    return NextResponse.json({ pipelines });
  } catch (err) {
    console.error("List archived pipelines error:", err);
    return NextResponse.json(
      { error: "Failed to fetch archived pipelines" },
      { status: 500 }
    );
  }
}
