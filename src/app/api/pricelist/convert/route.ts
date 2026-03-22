import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticate, unauthorizedResponse } from "@/lib/auth-helpers";
import * as ExcelJS from "exceljs";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";
const INR_TO_NPR = 1.6015;

interface ExtractedItem {
  sn: number;
  name: string;
  details: string;
  quantity: number;
  weight: string;
  price_inr: number;
}

/**
 * Send PDF page(s) as base64 to OpenRouter Vision API for structured extraction.
 */
async function extractWithVision(pdfBase64: string): Promise<ExtractedItem[]> {
  const apiKey = process.env.OPENROUTER_API;
  if (!apiKey) {
    throw new Error("OPENROUTER_API key is not configured");
  }

  const systemPrompt = `You are a jewelry price list OCR expert. You will receive an image of a jewelry catalog/price list page. Extract ALL items from the page into a structured JSON array.

For each item, extract:
- "sn": serial number (integer, auto-increment if not visible)
- "name": item name/title (e.g. "Silver Ring", "Gold Pendant")
- "details": materials, stones, and other specifications (e.g. "CZ stones, 925 Silver, Rhodium plated")
- "quantity": total quantity shown (integer, default 1 if not clear)
- "weight": weight in grams as a string (e.g. "5.2g")
- "price_inr": the total price in Indian Rupees as a number (remove ₹, Rs, commas). This is the price for the TOTAL quantity.

Rules:
- Return ONLY valid JSON array, no markdown, no explanation.
- If a value is unclear, make your best guess.
- Prices are in Indian Rupees (INR).
- Include every single item row you can see, do not skip any.
- If the page has no items, return an empty array [].

Example output:
[{"sn":1,"name":"Silver CZ Ring","details":"925 Silver, CZ stones, Rhodium finish","quantity":12,"weight":"45.6g","price_inr":8500},{"sn":2,"name":"Gold Pendant","details":"22K Gold, Ruby stone","quantity":6,"weight":"18.3g","price_inr":42000}]`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all jewelry items with their details, quantities, weights, and prices from this price list. Return as a JSON array.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("OpenRouter API error:", errorData);
    throw new Error(`OpenRouter API returned ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "[]";

  // Parse JSON from the response (handle potential markdown wrapping)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const items: ExtractedItem[] = JSON.parse(jsonStr);
    return items.map((item, idx) => ({
      sn: item.sn || idx + 1,
      name: item.name || "Unknown Item",
      details: item.details || "",
      quantity: item.quantity || 1,
      weight: item.weight || "",
      price_inr: typeof item.price_inr === "number" ? item.price_inr : 0,
    }));
  } catch (e) {
    console.error("Failed to parse AI response:", jsonStr);
    throw new Error("AI returned invalid JSON. Please try again.");
  }
}

/**
 * Create a professional Excel workbook from extracted items with INR→NPR conversion.
 */
async function createExcel(
  items: ExtractedItem[],
  marginPercent: number,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Price List");

  // ── Style definitions ──
  const headerStyle: Partial<ExcelJS.Style> = {
    font: {
      name: "Calibri",
      bold: true,
      size: 11,
      color: { argb: "FFFFFFFF" },
    },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1a1a2e" },
    },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
  };

  const cellBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // ── Title row ──
  ws.mergeCells("A1:J1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "Aurora Jewel Studio — Price List (NPR)";
  titleCell.font = {
    name: "Calibri",
    bold: true,
    size: 14,
    color: { argb: "FF1a1a2e" },
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  // ── Subtitle row ──
  ws.mergeCells("A2:J2");
  const subtitleCell = ws.getCell("A2");
  subtitleCell.value = `Conversion Rate: 1 INR = ${INR_TO_NPR} NPR  |  Default Margin: ${marginPercent}%`;
  subtitleCell.font = {
    name: "Calibri",
    size: 10,
    italic: true,
    color: { argb: "FF666666" },
  };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 20;

  // ── Headers (row 3) ──
  const headers = [
    "S.N.",
    "Item Name",
    "Details / Specs",
    "Qty",
    "Weight",
    "Total Price (INR)",
    "Unit Price (INR)",
    "Unit Price (NPR)",
    "Margin (%)",
    "Selling Price (NPR)",
  ];

  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });
  headerRow.height = 28;

  // ── Data rows (starting row 4) ──
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const excelRow = i + 4; // row 4 onwards (1=title, 2=subtitle, 3=header)

    const unitPriceINR =
      item.quantity > 0 ? item.price_inr / item.quantity : item.price_inr;
    const unitPriceNPR = unitPriceINR * INR_TO_NPR;
    const sellingPrice = unitPriceNPR * (1 + marginPercent / 100);

    const row = ws.addRow([
      item.sn,
      item.name,
      item.details,
      item.quantity,
      item.weight,
      item.price_inr,
      // Formula-based for unit price so it stays dynamic
      {
        formula: `IF(D${excelRow}>0,F${excelRow}/D${excelRow},F${excelRow})`,
        result: unitPriceINR,
      },
      { formula: `G${excelRow}*${INR_TO_NPR}`, result: unitPriceNPR },
      marginPercent,
      { formula: `H${excelRow}*(1+I${excelRow}/100)`, result: sellingPrice },
    ]);

    row.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11 };
      cell.border = cellBorder;
      cell.alignment = { vertical: "middle" };
    });

    // Number formatting
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(6).numFmt = "#,##0.00";
    row.getCell(7).numFmt = "#,##0.00";
    row.getCell(8).numFmt = "#,##0.00";
    row.getCell(9).numFmt = "0";
    row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(10).numFmt = "#,##0.00";

    // Alternate row shading
    if (i % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F5FF" },
        };
      });
    }
  }

  // ── Totals row ──
  if (items.length > 0) {
    const lastDataRow = items.length + 3;
    const totalsRow = ws.addRow([
      "",
      "TOTAL",
      "",
      {
        formula: `SUM(D4:D${lastDataRow})`,
        result: items.reduce((a, b) => a + b.quantity, 0),
      },
      "",
      {
        formula: `SUM(F4:F${lastDataRow})`,
        result: items.reduce((a, b) => a + b.price_inr, 0),
      },
      "",
      "",
      "",
      { formula: `SUM(J4:J${lastDataRow})`, result: 0 },
    ]);

    totalsRow.eachCell((cell) => {
      cell.font = { name: "Calibri", bold: true, size: 11 };
      cell.border = cellBorder;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE8E8FF" },
      };
    });
    totalsRow.getCell(6).numFmt = "#,##0.00";
    totalsRow.getCell(10).numFmt = "#,##0.00";
  }

  // ── Column widths ──
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 35;
  ws.getColumn(4).width = 8;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 18;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 12;
  ws.getColumn(10).width = 20;

  // ── Freeze panes ──
  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const marginStr = formData.get("margin") as string | null;
    const marginPercent = marginStr ? parseFloat(marginStr) : 30;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 },
      );
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const pdfBase64 = pdfBuffer.toString("base64");

    // Extract items using Vision AI
    const items = await extractWithVision(pdfBase64);

    if (!items.length) {
      return NextResponse.json(
        {
          error:
            "No items could be extracted from the PDF. Please ensure the PDF contains jewel price data.",
        },
        { status: 422 },
      );
    }

    // Generate Excel
    const excelBuffer = await createExcel(items, marginPercent);

    // Store PDF reference in database
    const pdfPath = `pricelists/${user.id}/${Date.now()}_${file.name}`;
    await supabaseAdmin.storage
      .from("price-lists")
      .upload(pdfPath, pdfBuffer, { contentType: "application/pdf" });

    const { data: publicUrl } = supabaseAdmin.storage
      .from("price-lists")
      .getPublicUrl(pdfPath);

    await supabaseAdmin.from("price_lists").insert({
      pdf_url: publicUrl.publicUrl,
      uploaded_by: user.id,
      items_count: items.length,
    });

    // Return Excel file
    const outputFilename = file.name.replace(".pdf", "") + "_priced.xlsx";

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
      },
    });
  } catch (err: unknown) {
    console.error("Price list convert error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to convert PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
