import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    if (!requireRole(user, "superadmin")) return forbiddenResponse(["superadmin"]);

    const { email, password, name, role, portfolio_link } = await req.json();

    if (
      !email || typeof email !== "string" || email.length > 255 ||
      !password || typeof password !== "string" || password.length > 72 || password.length < 6 ||
      !name || typeof name !== "string" || name.length > 100
    ) {
      return NextResponse.json(
        { error: "Invalid email, password, or name format/length" },
        { status: 400 }
      );
    }

    const validRoles = ["owner", "staff", "designer", "superadmin"];
    const userRole = validRoles.includes(role) ? role : "staff";

    // Create auth user in Supabase
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        name,
        email,
        role: userRole,
      })
      .select()
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      );
    }

    // If role is designer, create designer record
    if (userRole === "designer") {
      await supabaseAdmin.from("designers").insert({
        user_id: authData.user.id,
        portfolio_link: portfolio_link || null,
      });
    }

    return NextResponse.json(
      { message: "User created successfully", user: profile },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
