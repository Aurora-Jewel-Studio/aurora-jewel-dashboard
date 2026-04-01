import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

// GET /api/pipelines — List active pipelines
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { data, error } = await supabaseAdmin
      .from("pipelines")
      .select("*, design_cards(id)")
      .eq("status", "active")
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
    console.error("List pipelines error:", err);
    return NextResponse.json(
      { error: "Failed to fetch pipelines" },
      { status: 500 }
    );
  }
}

// POST /api/pipelines — Create a pipeline
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    // Any authenticated user can access this action now

    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Pipeline name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("pipelines")
      .insert({
        name,
        description: description || null,
        created_by: user.id,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pipeline: data }, { status: 201 });
  } catch (err) {
    console.error("Create pipeline error:", err);
    return NextResponse.json(
      { error: "Failed to create pipeline" },
      { status: 500 }
    );
  }
}
