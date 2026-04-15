import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticate, unauthorizedResponse } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { id: pipelineId } = await params;
    const body = await req.json();
    const rows = body.rows;

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { error: "Invalid data format. Expected an array of rows." },
        { status: 400 }
      );
    }

    // Process updates sequentially
    for (const row of rows) {
      if (!row.cardId) continue;
      
      const priceVal = parseFloat(row.price_inr) || 0;
      
      await supabaseAdmin
        .from("design_cards")
        .update({
          price_inr: priceVal,
          remarks: row.remarks || "",
          updated_at: new Date().toISOString()
        })
        .eq("id", row.cardId)
        .eq("pipeline_id", pipelineId);
    }

    return NextResponse.json({ success: true, message: "Finance data saved successfully" });
  } catch (err: unknown) {
    console.error("Save finance data error:", err);
    return NextResponse.json(
      { error: "Failed to save finance data" },
      { status: 500 }
    );
  }
}
