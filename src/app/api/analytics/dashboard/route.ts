import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  authenticate,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();
    if (!requireRole(user, "owner", "staff", "superadmin"))
      return forbiddenResponse(["owner", "staff", "superadmin"]);

    // Lead counts by interest level
    const { data: leads } = await supabaseAdmin
      .from("leads")
      .select("interest_level, status");

    const leadMetrics = {
      total: leads?.length || 0,
      high_interest:
        leads?.filter((l) => l.interest_level === "high").length || 0,
      medium_interest:
        leads?.filter((l) => l.interest_level === "medium").length || 0,
      low_interest:
        leads?.filter((l) => l.interest_level === "low").length || 0,
      conversion_rate: 0 as number | string,
    };

    // Conversion rate
    const boughtCount =
      leads?.filter((l) => l.status === "bought").length || 0;
    leadMetrics.conversion_rate =
      leadMetrics.total > 0
        ? ((boughtCount / leadMetrics.total) * 100).toFixed(1)
        : 0;

    // Lead status distribution
    const statusDistribution = {
      new: leads?.filter((l) => l.status === "new").length || 0,
      interested:
        leads?.filter((l) => l.status === "interested").length || 0,
      ghosted: leads?.filter((l) => l.status === "ghosted").length || 0,
      bought: boughtCount,
    };

    // Most asked products
    const { data: productLeads } = await supabaseAdmin
      .from("leads")
      .select("product_asked")
      .not("product_asked", "is", null);

    const productCounts: Record<string, number> = {};
    productLeads?.forEach((l) => {
      if (l.product_asked) {
        const product = l.product_asked.toLowerCase().trim();
        productCounts[product] = (productCounts[product] || 0) + 1;
      }
    });

    const mostAskedProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([product, count]) => ({ product, count }));

    // Design metrics
    const { data: cards } = await supabaseAdmin
      .from("design_cards")
      .select("assigned_designer_id, stage, assigned_designer:assigned_designer_id(name)");

    const designMetrics = {
      total: cards?.length || 0,
      reference: cards?.filter((c) => c.stage === "reference").length || 0,
      cad_in_progress: cards?.filter((c) => c.stage === "cad_in_progress").length || 0,
      cad_uploaded: cards?.filter((c) => c.stage === "cad_uploaded").length || 0,
      final_uploaded: cards?.filter((c) => c.stage === "final_uploaded").length || 0,
      completed: cards?.filter((c) => c.stage === "completed").length || 0,
    };

    // Designer upload counts
    const designerCounts: Record<string, number> = {};
    cards?.forEach((c) => {
      const designerName = (c.assigned_designer as any)?.name || "Unassigned";
      designerCounts[designerName] = (designerCounts[designerName] || 0) + 1;
    });

    const designerUploadCounts = Object.entries(designerCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([designer, count]) => ({ designer, count }));

    // Price list count
    const { count: priceListCount } = await supabaseAdmin
      .from("price_lists")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      leads: leadMetrics,
      status_distribution: statusDistribution,
      most_asked_products: mostAskedProducts,
      designs: designMetrics,
      designer_upload_counts: designerUploadCounts,
      price_lists_count: priceListCount || 0,
    });
  } catch (err) {
    console.error("Dashboard analytics error:", err);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
