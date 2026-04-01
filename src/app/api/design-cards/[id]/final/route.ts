import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

// POST /api/design-cards/[id]/final — Upload final design
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const { data: card } = await supabaseAdmin
      .from("design_cards")
      .select("pipeline_id, assigned_designer_id")
      .eq("id", id)
      .single();

    if (!card) {
      return NextResponse.json(
        { error: "Design card not found" },
        { status: 404 }
      );
    }

    // Any authenticated user can access this action now

    const formData = await req.formData();
    const finalImage = formData.get("final_design") as File | null;

    if (!finalImage || finalImage.size === 0) {
      return NextResponse.json(
        { error: "Final design image is required" },
        { status: 400 }
      );
    }

    const ext = finalImage.name.split(".").pop()?.toLowerCase();
    if (!ext || !["png", "jpg", "jpeg"].includes(ext)) {
      return NextResponse.json(
        { error: "Only PNG and JPG files are allowed" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await finalImage.arrayBuffer());
    const filePath = `pipelines/${card.pipeline_id}/final_${id}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("pipeline-files")
      .upload(filePath, buffer, { contentType: finalImage.type });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload final design" },
        { status: 500 }
      );
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from("pipeline-files")
      .getPublicUrl(filePath);

    const { data, error } = await supabaseAdmin
      .from("design_cards")
      .update({
        final_design_url: publicUrl.publicUrl,
        final_uploaded_by: user.id,
        final_uploaded_at: new Date().toISOString(),
        stage: "final_uploaded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, assigned_designer:assigned_designer_id(id, name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ card: data });
  } catch (err) {
    console.error("Upload final design error:", err);
    return NextResponse.json(
      { error: "Failed to upload final design" },
      { status: 500 }
    );
  }
}
