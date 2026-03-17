import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    if (!requireRole(user, "superadmin")) return forbiddenResponse(["superadmin"]);

    const { id } = await params;

    if (id === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
