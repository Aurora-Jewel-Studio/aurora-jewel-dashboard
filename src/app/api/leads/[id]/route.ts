import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

function computeInterestLevel(messageCount: number): string {
  if (messageCount < 5) return "low";
  if (messageCount <= 15) return "medium";
  return "high";
}

// PATCH /api/leads/[id] — Update a lead
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    if (!requireRole(user, "owner", "staff"))
      return forbiddenResponse(["owner", "staff"]);

    const { id } = await params;
    const updates = await req.json();

    // Auto-compute interest level if message_count is updated
    if (updates.message_count !== undefined) {
      updates.message_count = parseInt(updates.message_count);
      updates.interest_level = computeInterestLevel(updates.message_count);
    }

    // Validate status if provided
    if (updates.status) {
      const validStatuses = ["new", "interested", "ghosted", "bought"];
      if (!validStatuses.includes(updates.status)) {
        return NextResponse.json(
          { error: "Invalid lead status" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lead: data });
  } catch (err) {
    console.error("Update lead error:", err);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id] — Delete a lead
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    if (!requireRole(user, "owner")) return forbiddenResponse(["owner"]);

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from("leads")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Lead deleted successfully" });
  } catch (err) {
    console.error("Delete lead error:", err);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
