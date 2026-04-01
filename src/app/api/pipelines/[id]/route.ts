import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

// GET /api/pipelines/[id] — Get pipeline with all cards
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const { data: pipeline, error } = await supabaseAdmin
      .from("pipelines")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      );
    }

    // Fetch cards with comment counts and assigned designer info
    const { data: cards } = await supabaseAdmin
      .from("design_cards")
      .select("*, assigned_designer:assigned_designer_id(id, name), design_comments(id)")
      .eq("pipeline_id", id)
      .order("created_at", { ascending: true });

    const cardsWithCounts = (cards || []).map((c: any) => ({
      ...c,
      comment_count: c.design_comments?.length || 0,
      design_comments: undefined,
    }));

    return NextResponse.json({
      pipeline,
      cards: cardsWithCounts,
    });
  } catch (err) {
    console.error("Get pipeline error:", err);
    return NextResponse.json(
      { error: "Failed to fetch pipeline" },
      { status: 500 }
    );
  }
}

// PATCH /api/pipelines/[id] — Update pipeline
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    // Any authenticated user can access this action now

    const { id } = await params;
    const updates = await req.json();

    const { data, error } = await supabaseAdmin
      .from("pipelines")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pipeline: data });
  } catch (err) {
    console.error("Update pipeline error:", err);
    return NextResponse.json(
      { error: "Failed to update pipeline" },
      { status: 500 }
    );
  }
}

// DELETE /api/pipelines/[id] — Delete pipeline
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    // Any authenticated user can access this action now

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from("pipelines")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Pipeline deleted" });
  } catch (err) {
    console.error("Delete pipeline error:", err);
    return NextResponse.json(
      { error: "Failed to delete pipeline" },
      { status: 500 }
    );
  }
}
