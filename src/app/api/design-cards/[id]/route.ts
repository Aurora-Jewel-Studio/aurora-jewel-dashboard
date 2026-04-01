import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

// GET /api/design-cards/[id] — Get single card
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("design_cards")
      .select("*, assigned_designer:assigned_designer_id(id, name), design_comments(id)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Design card not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      card: {
        ...data,
        comment_count: data.design_comments?.length || 0,
        design_comments: undefined,
      },
    });
  } catch (err) {
    console.error("Get design card error:", err);
    return NextResponse.json(
      { error: "Failed to fetch design card" },
      { status: 500 }
    );
  }
}

// PATCH /api/design-cards/[id] — Update card (stage, assigned designer, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const { data: existingCard } = await supabaseAdmin
      .from("design_cards")
      .select("assigned_designer_id")
      .eq("id", id)
      .single();

    if (!existingCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Any authenticated user can access this action now

    const updates = await req.json();

    // Validate stage if provided
    if (updates.stage) {
      const validStages = [
        "reference",
        "cad_in_progress",
        "cad_uploaded",
        "final_uploaded",
        "completed",
      ];
      if (!validStages.includes(updates.stage)) {
        return NextResponse.json(
          { error: "Invalid stage" },
          { status: 400 }
        );
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("design_cards")
      .update(updates)
      .eq("id", id)
      .select("*, assigned_designer:assigned_designer_id(id, name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ card: data });
  } catch (err) {
    console.error("Update design card error:", err);
    return NextResponse.json(
      { error: "Failed to update design card" },
      { status: 500 }
    );
  }
}
