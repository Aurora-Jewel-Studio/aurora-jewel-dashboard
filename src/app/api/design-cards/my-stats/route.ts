import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticate, unauthorizedResponse } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    // Fetch design cards assigned to this designer
    const { data: cards, error } = await supabaseAdmin
      .from("design_cards")
      .select("*")
      .eq("assigned_designer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = {
      total: cards?.length || 0,
      reference: cards?.filter((c) => c.stage === "reference").length || 0,
      cad_in_progress: cards?.filter((c) => c.stage === "cad_in_progress").length || 0,
      cad_uploaded: cards?.filter((c) => c.stage === "cad_uploaded").length || 0,
      final_uploaded: cards?.filter((c) => c.stage === "final_uploaded").length || 0,
      completed: cards?.filter((c) => c.stage === "completed").length || 0,
      recent_designs: (cards || []).slice(0, 5).map((c: { id: string; title: string; stage: string; created_at: string }) => ({
        id: c.id,
        title: c.title,
        stage: c.stage,
        created_at: c.created_at,
      })),
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error("Designer stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
