import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/cron/archive-pipelines — Auto-archive pipelines older than 3 months
// Can be triggered by Vercel Cron or manually
export async function GET() {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data, error } = await supabaseAdmin
      .from("pipelines")
      .update({ status: "archived" })
      .eq("status", "active")
      .lt("created_at", threeMonthsAgo.toISOString())
      .select("id, name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Archived ${data?.length || 0} pipeline(s)`,
      archived: data,
    });
  } catch (err) {
    console.error("Archive cron error:", err);
    return NextResponse.json(
      { error: "Failed to run archive cron" },
      { status: 500 }
    );
  }
}
