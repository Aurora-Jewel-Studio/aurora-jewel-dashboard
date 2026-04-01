import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

// POST /api/design-cards/[id]/reference — Upload Reference Image
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    // Check card exists
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
    const refImage = formData.get("reference_image") as File | null;

    if (!refImage || refImage.size === 0) {
      return NextResponse.json(
        { error: "Reference image is required" },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = refImage.name.split(".").pop()?.toLowerCase();
    const allowedExts = ["jpg", "jpeg", "png", "webp"];
    if (!ext || !allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: `Only ${allowedExts.join(", ")} files are allowed` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await refImage.arrayBuffer());
    const filePath = `pipelines/${card.pipeline_id}/ref_${id}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("pipeline-files")
      .upload(filePath, buffer, {
        contentType: refImage.type || "image/jpeg",
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload reference image" },
        { status: 500 }
      );
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from("pipeline-files")
      .getPublicUrl(filePath);

    const { data, error } = await supabaseAdmin
      .from("design_cards")
      .update({
        reference_image_url: publicUrl.publicUrl,
        reference_uploaded_at: new Date().toISOString(),
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
    console.error("Upload Reference error:", err);
    return NextResponse.json(
      { error: "Failed to upload reference image" },
      { status: 500 }
    );
  }
}
