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

// GET /api/leads — List leads
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    if (!requireRole(user, "owner", "staff"))
      return forbiddenResponse(["owner", "staff"]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const interest_level = searchParams.get("interest_level");

    let query = supabaseAdmin
      .from("leads")
      .select("*")
      .order("last_message_time", { ascending: false });

    if (status) query = query.eq("status", status);
    if (interest_level) query = query.eq("interest_level", interest_level);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leads: data });
  } catch (err) {
    console.error("List leads error:", err);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

// POST /api/leads — Create a new lead
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    if (!requireRole(user, "owner", "staff"))
      return forbiddenResponse(["owner", "staff"]);

    const body = await req.json();
    const {
      instagram_username,
      message_count,
      product_asked,
      price_given,
      status,
      first_message_time,
      last_message_time,
    } = body;

    if (!instagram_username) {
      return NextResponse.json(
        { error: "Instagram username is required" },
        { status: 400 }
      );
    }

    const msgCount = parseInt(message_count) || 0;
    const interestLevel = computeInterestLevel(msgCount);

    const validStatuses = ["new", "interested", "ghosted", "bought"];
    const leadStatus = validStatuses.includes(status) ? status : "new";

    const { data, error } = await supabaseAdmin
      .from("leads")
      .insert({
        instagram_username,
        message_count: msgCount,
        interest_level: interestLevel,
        product_asked: product_asked || null,
        price_given: price_given ? parseFloat(price_given) : null,
        status: leadStatus,
        first_message_time:
          first_message_time || new Date().toISOString(),
        last_message_time:
          last_message_time || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lead: data }, { status: 201 });
  } catch (err) {
    console.error("Create lead error:", err);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
