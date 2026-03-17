import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticate, unauthorizedResponse } from "@/lib/auth-helpers";

// GET /api/design-cards/[id]/comments — List comments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("design_comments")
      .select("*, user:user_id(id, name, role)")
      .eq("design_card_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: data || [] });
  } catch (err) {
    console.error("List comments error:", err);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/design-cards/[id]/comments — Add comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const { comment_text } = await req.json();

    if (!comment_text || !comment_text.trim()) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      );
    }

    // Verify card exists
    const { data: card } = await supabaseAdmin
      .from("design_cards")
      .select("id")
      .eq("id", id)
      .single();

    if (!card) {
      return NextResponse.json(
        { error: "Design card not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("design_comments")
      .insert({
        design_card_id: id,
        user_id: user.id,
        comment_text: comment_text.trim(),
      })
      .select("*, user:user_id(id, name, role)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (err) {
    console.error("Add comment error:", err);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}
