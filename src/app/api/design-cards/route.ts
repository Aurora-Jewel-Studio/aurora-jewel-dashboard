import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

// GET /api/design-cards — List cards (by pipeline_id query param)
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const pipeline_id = searchParams.get("pipeline_id");

    let query = supabaseAdmin
      .from("design_cards")
      .select("*, assigned_designer:assigned_designer_id(id, name), design_comments(id)")
      .order("created_at", { ascending: true });

    if (pipeline_id) {
      query = query.eq("pipeline_id", pipeline_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const cards = (data || []).map((c: any) => ({
      ...c,
      comment_count: c.design_comments?.length || 0,
      design_comments: undefined,
    }));

    return NextResponse.json({ cards });
  } catch (err) {
    console.error("List design cards error:", err);
    return NextResponse.json(
      { error: "Failed to fetch design cards" },
      { status: 500 }
    );
  }
}

// POST /api/design-cards — Create design card with reference image
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    if (!requireRole(user, "owner", "superadmin"))
      return forbiddenResponse(["owner", "superadmin"]);

    const formData = await req.formData();
    const pipeline_id = formData.get("pipeline_id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const quantityStr = formData.get("quantity");
    const quantity = quantityStr ? parseInt(quantityStr as string, 10) : 1;
    const assigned_designer_id = formData.get("assigned_designer_id") as string | null;
    const referenceImage = formData.get("reference_image") as File | null;

    if (!pipeline_id || !title) {
      return NextResponse.json(
        { error: "Pipeline ID and title are required" },
        { status: 400 }
      );
    }

    // Check pipeline is active
    const { data: pipeline } = await supabaseAdmin
      .from("pipelines")
      .select("status")
      .eq("id", pipeline_id)
      .single();

    if (!pipeline || pipeline.status === "archived") {
      return NextResponse.json(
        { error: "Pipeline is archived or not found" },
        { status: 400 }
      );
    }

    let referenceImageUrl = null;

    if (referenceImage && referenceImage.size > 0) {
      const buffer = Buffer.from(await referenceImage.arrayBuffer());
      const ext = referenceImage.name.split(".").pop();
      const filePath = `pipelines/${pipeline_id}/ref_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("pipeline-files")
        .upload(filePath, buffer, { contentType: referenceImage.type });

      if (uploadError) {
        console.error("Reference image upload failed:", uploadError);
        return NextResponse.json(
          { error: `Image upload failed: ${uploadError.message}. Please ensure the 'pipeline-files' bucket exists in Supabase.` },
          { status: 500 }
        );
      }
      
      const { data: publicUrl } = supabaseAdmin.storage
        .from("pipeline-files")
        .getPublicUrl(filePath);
      referenceImageUrl = publicUrl.publicUrl;
    }

    const { data, error } = await supabaseAdmin
      .from("design_cards")
      .insert({
        pipeline_id,
        title,
        description: description || null,
        quantity,
        reference_image_url: referenceImageUrl,
        reference_uploaded_by: user.id,
        reference_uploaded_at: referenceImageUrl ? new Date().toISOString() : null,
        assigned_designer_id: assigned_designer_id || null,
        stage: "reference",
      })
      .select("*, assigned_designer:assigned_designer_id(id, name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ card: { ...data, comment_count: 0 } }, { status: 201 });
  } catch (err) {
    console.error("Create design card error:", err);
    return NextResponse.json(
      { error: "Failed to create design card" },
      { status: 500 }
    );
  }
}
