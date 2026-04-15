import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticate, unauthorizedResponse } from "@/lib/auth-helpers";
import * as ExcelJS from "exceljs";

export const maxDuration = 60;

const INR_TO_NPR = 1.6015;

interface ConvertItem {
  sn: number;
  name: string;
  details: string;
  quantity: number;
  imageUrl: string | null;
  price_inr: number;
}

/**
 * Fetch an image from a URL and return it as a Buffer.
 */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const arrayBuf = await resp.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

/**
 * Create a professional Excel workbook with INR→NPR conversion.
 * Images are fetched from Supabase URLs (design card reference images).
 */
async function createExcel(
  items: ConvertItem[],
  marginPercent: number,
  pipelineName: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(pipelineName || "Price List");

  const IMAGE_ROW_HEIGHT = 100;
  const IMAGE_COL_WIDTH = 18;

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { name: "Calibri", bold: true, size: 11, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a1a2e" } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } },
  };

  const cellBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" },
  };

  // Title
  ws.mergeCells("A1:K1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `${pipelineName} - Price List (NPR)`;
  titleCell.font = { name: "Calibri", bold: true, size: 14, color: { argb: "FF1a1a2e" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  // Subtitle
  ws.mergeCells("A2:K2");
  const subtitleCell = ws.getCell("A2");
  subtitleCell.value = `Conversion Rate: 1 INR = ${INR_TO_NPR} NPR  |  Margin: ${marginPercent}%`;
  subtitleCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF666666" } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 20;

  // Headers
  const headers = [
    "S.N.", "Picture", "Item Name", "Details / Specs", "Qty",
    "Total Price (INR)", "Unit Price (INR)", "Unit Price (NPR)", "Margin (%)", "Selling Price (NPR)",
  ];
  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell: ExcelJS.Cell) => { cell.style = headerStyle; });
  headerRow.height = 28;

  // Fetch all images in parallel
  const imageBuffers = await Promise.all(
    items.map((item) =>
      item.imageUrl ? fetchImageBuffer(item.imageUrl) : Promise.resolve(null)
    )
  );

  // Data rows
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const excelRow = i + 4; // 1-indexed, row 1 = title, row 2 = subtitle, row 3 = headers

    const unitPriceINR = item.quantity > 0 ? item.price_inr / item.quantity : item.price_inr;
    const unitPriceNPR = unitPriceINR * INR_TO_NPR;
    const sellingPrice = unitPriceNPR * (1 + marginPercent / 100);

    const row = ws.addRow([
      item.sn, "", item.name, item.details, item.quantity, item.price_inr,
      { formula: `IF(E${excelRow}>0,F${excelRow}/E${excelRow},F${excelRow})`, result: unitPriceINR },
      { formula: `G${excelRow}*${INR_TO_NPR}`, result: unitPriceNPR },
      marginPercent,
      { formula: `H${excelRow}*(1+I${excelRow}/100)`, result: sellingPrice },
    ]);

    row.eachCell((cell: ExcelJS.Cell) => {
      cell.font = { name: "Calibri", size: 11 };
      cell.border = cellBorder;
      cell.alignment = { vertical: "middle" };
    });

    row.height = IMAGE_ROW_HEIGHT;
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(6).numFmt = "#,##0.00";
    row.getCell(7).numFmt = "#,##0.00";
    row.getCell(8).numFmt = "#,##0.00";
    row.getCell(9).numFmt = "0";
    row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(10).numFmt = "#,##0.00";

    if (i % 2 === 0) {
      row.eachCell((cell: ExcelJS.Cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5FF" } };
      });
    }

    // Embed image from URL
    const imgBuf = imageBuffers[i];
    if (imgBuf && imgBuf.length > 0) {
      try {
        const ext = item.imageUrl?.includes(".png") ? "png" as const : "jpeg" as const;
        const imageId = workbook.addImage({ buffer: new Uint8Array(imgBuf) as any, extension: ext });
        ws.addImage(imageId, {
          tl: { col: 1.1, row: excelRow - 1 + 0.1 } as any,
          br: { col: 1.9, row: excelRow - 1 + 0.9 } as any,
        });
      } catch (imgErr) {
        console.error(`Failed to embed image for item ${i + 1}:`, imgErr);
      }
    }
  }

  // Totals row
  if (items.length > 0) {
    const lastDataRow = items.length + 3;
    const totalsRow = ws.addRow([
      "", "", "TOTAL", "",
      { formula: `SUM(E4:E${lastDataRow})`, result: items.reduce((a, b) => a + b.quantity, 0) },
      { formula: `SUM(F4:F${lastDataRow})`, result: items.reduce((a, b) => a + b.price_inr, 0) },
      "", "", "",
      { formula: `SUM(J4:J${lastDataRow})`, result: 0 },
    ]);
    totalsRow.eachCell((cell: ExcelJS.Cell) => {
      cell.font = { name: "Calibri", bold: true, size: 11 };
      cell.border = cellBorder;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8FF" } };
    });
    totalsRow.getCell(6).numFmt = "#,##0.00";
    totalsRow.getCell(10).numFmt = "#,##0.00";
  }

  // Column widths
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = IMAGE_COL_WIDTH;
  ws.getColumn(3).width = 24;
  ws.getColumn(4).width = 32;
  ws.getColumn(5).width = 8;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 16;
  ws.getColumn(8).width = 16;
  ws.getColumn(9).width = 12;
  ws.getColumn(10).width = 18;

  ws.views = [{ state: "frozen", ySplit: 3 }];

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { items, margin, pipelineName } = body as {
      items: ConvertItem[];
      margin: number;
      pipelineName: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided. Please select a pipeline with priced items." },
        { status: 400 },
      );
    }

    const marginPercent = typeof margin === "number" ? margin : 30;

    // Generate Excel
    const excelBuffer = await createExcel(items, marginPercent, pipelineName || "Pipeline");

    // Store record
    await supabaseAdmin.from("price_lists").insert({
      uploaded_by: user.id,
      items_count: items.length,
      pdf_url: null, // No PDF — data comes from Finance invoice
    });

    const outputFilename = `${(pipelineName || "pipeline").replace(/[^a-zA-Z0-9]/g, "_")}_priced.xlsx`;

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
      },
    });
  } catch (err: unknown) {
    console.error("Price list convert error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate Excel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
