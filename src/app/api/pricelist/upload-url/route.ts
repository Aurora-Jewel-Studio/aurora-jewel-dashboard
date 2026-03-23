import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticate, unauthorizedResponse } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const { fileName, contentType } = await req.json();

    if (!fileName) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    const fileExt = fileName.split(".").pop();
    const uniquePath = `temp-uploads/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Create a signed URL for a 5-minute window to upload the specific file
    const { data: uploadInfo, error: uploadError } = await supabaseAdmin.storage
      .from("price-lists")
      .createSignedUploadUrl(uniquePath);

    if (uploadError) {
      console.error("Signed URL error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: uploadInfo.signedUrl,
      publicUrl: uploadInfo.signedUrl.split("?")[0], // for fallback/debugging
      filePath: uniquePath
    });

  } catch (err: unknown) {
    console.error("Upload URL error:", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
