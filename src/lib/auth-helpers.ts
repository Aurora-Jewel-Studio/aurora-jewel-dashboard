import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "owner" | "staff" | "designer" | "superadmin";
}

/**
 * Authenticate a request by validating the Supabase JWT from the Authorization header.
 * Returns the user profile or null if invalid.
 */
export async function authenticate(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) return null;

    // Fetch user profile with role from our users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) return null;

    return {
      id: user.id,
      email: user.email!,
      name: profile.name,
      role: profile.role,
    };
  } catch {
    return null;
  }
}

/**
 * Check if user has one of the allowed roles.
 */
export function requireRole(
  user: AuthUser,
  ...allowedRoles: string[]
): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * Helper: return a 401 Unauthorized response.
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Missing or invalid authorization" },
    { status: 401 },
  );
}

/**
 * Helper: return a 403 Forbidden response.
 */
export function forbiddenResponse(allowedRoles: string[]) {
  return NextResponse.json(
    { error: "Insufficient permissions", required: allowedRoles },
    { status: 403 },
  );
}
