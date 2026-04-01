import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticate, unauthorizedResponse } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: profile });
  } catch (err) {
    console.error("Profile fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { name, email, password } = body;

    // 1. Update Auth credentials (email, password)
    const authUpdatePayload: { email?: string; password?: string; user_metadata?: any } = {};
    if (email) authUpdatePayload.email = email;
    if (password) authUpdatePayload.password = password;
    if (name) authUpdatePayload.user_metadata = { name };

    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        authUpdatePayload
      );
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // 2. Update users table (name, email)
    const profileUpdatePayload: { name?: string; email?: string } = {};
    if (name) profileUpdatePayload.name = name;
    if (email) profileUpdatePayload.email = email;

    if (Object.keys(profileUpdatePayload).length > 0) {
      const { error: dbError } = await supabaseAdmin
        .from("users")
        .update(profileUpdatePayload)
        .eq("id", user.id);

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (err: any) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
