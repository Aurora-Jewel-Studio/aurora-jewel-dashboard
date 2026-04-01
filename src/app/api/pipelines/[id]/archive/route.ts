import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

// POST /api/pipelines/[id]/archive — Archive a pipeline
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    // Any authenticated user can access this action now

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("pipelines")
      .update({ status: "archived" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pipeline: data });
  } catch (err) {
    console.error("Archive pipeline error:", err);
    return NextResponse.json(
      { error: "Failed to archive pipeline" },
      { status: 500 }
    );
  }
}

// DELETE /api/pipelines/[id]/archive — Unarchive a pipeline
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    // Any authenticated user can access this action now

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("pipelines")
      .update({ status: "active" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pipeline: data });
  } catch (err) {
    console.error("Unarchive pipeline error:", err);
    return NextResponse.json(
      { error: "Failed to unarchive pipeline" },
      { status: 500 }
    );
  }
}
