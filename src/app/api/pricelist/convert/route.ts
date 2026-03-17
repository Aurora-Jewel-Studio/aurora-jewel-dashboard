import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticate, unauthorizedResponse } from "@/lib/auth-helpers";
import * as ExcelJS from "exceljs";
import * as pdf from "pdf-parse";

/**
 * Extract table rows from PDF text.
 * Detects lines with tab/multi-space separated values.
 */
function extractTableRows(text: string): string[][] {
  const lines = text.split("\n").filter((line) => line.trim());
  const rows: string[][] = [];

  for (const line of lines) {
    // Split by tabs or 2+ consecutive spaces
    const cells = line
      .split(/\t|  +/)
      .map((c) => c.trim())
      .filter((c) => c);

    // Only include lines that look like table rows (2+ cells)
    if (cells.length >= 2) {
      rows.push(cells);
    }
  }

  return rows;
}

/**
 * Create a formatted Excel workbook from extracted table data.
 */
async function createExcel(rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Price List");

  // Style definitions
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { name: "Calibri", bold: true, size: 12, color: { argb: "FFFFFFFF" } },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1a1a2e" },
    },
    alignment: { horizontal: "center", vertical: "middle" },
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

  // Output headers
  const outputHeaders = [
    "Item",
    "Weight",
    "Cost Price",
    "Selling Price",
    "Margin (%)",
  ];

  // Write headers
  const headerRow = ws.addRow(outputHeaders);
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });

  if (!rows.length) {
    // Return empty template
    ws.columns = [
      { width: 30 },
      { width: 15 },
      { width: 18 },
      { width: 18 },
      { width: 15 },
    ];

    const buf = (await workbook.xlsx.writeBuffer()) as any;
    return Buffer.from(buf);
  }

  // Detect columns
  const firstRow = rows[0];
  let itemCol = -1;
  let weightCol = -1;
  let priceCol = -1;

  for (let i = 0; i < firstRow.length; i++) {
    const h = firstRow[i].toLowerCase();
    if (
      itemCol === -1 &&
      ["item", "name", "product", "description"].some((kw) => h.includes(kw))
    ) {
      itemCol = i;
    } else if (
      weightCol === -1 &&
      ["weight", "wt", "gram"].some((kw) => h.includes(kw))
    ) {
      weightCol = i;
    } else if (
      priceCol === -1 &&
      ["price", "cost", "rate", "amount", "mrp"].some((kw) => h.includes(kw))
    ) {
      priceCol = i;
    }
  }

  // Fallback
  if (itemCol === -1) itemCol = 0;
  if (weightCol === -1) weightCol = firstRow.length > 1 ? 1 : 0;
  if (priceCol === -1) priceCol = firstRow.length > 2 ? 2 : 1;

  // Determine if first row is header
  const isHeader = ["item", "name", "product", "sr", "no", "#", "description"].some(
    (kw) => firstRow[0].toLowerCase().includes(kw)
  );
  const dataRows = isHeader ? rows.slice(1) : rows;

  // Write data
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const excelRowNum = i + 2; // 1-indexed, after header

    const itemVal = itemCol < row.length ? row[itemCol] : "";
    const weightVal = weightCol < row.length ? row[weightCol] : "";
    const priceRaw = priceCol < row.length ? row[priceCol] : "";

    let numericPrice: number | string = priceRaw;
    try {
      const cleaned = priceRaw
        .replace(/,/g, "")
        .replace(/₹/g, "")
        .replace(/Rs/g, "")
        .trim();
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) numericPrice = parsed;
    } catch {
      // keep as string
    }

    const dataRow = ws.addRow([
      itemVal,
      weightVal,
      null, // Cost Price — blank
      numericPrice,
      {
        formula: `IF(D${excelRowNum}>0,IF(C${excelRowNum}>0,(D${excelRowNum}-C${excelRowNum})/D${excelRowNum}*100,0),0)`,
      },
    ]);

    dataRow.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11 };
      cell.border = cellBorder;
    });

    // Format currency columns
    dataRow.getCell(3).numFmt = "#,##0.00";
    dataRow.getCell(4).numFmt = "#,##0.00";
    dataRow.getCell(5).numFmt = "0.00";
  }

  // Column widths
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 15;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 15;

  // Freeze header row
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = (await workbook.xlsx.writeBuffer()) as any;
  return Buffer.from(buf);
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return unauthorizedResponse();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());

    // Extract text from PDF
    const pdfData = await (pdf as any)(pdfBuffer);
    const rows = extractTableRows(pdfData.text);

    if (!rows.length) {
      return NextResponse.json(
        { error: "No tables found in the PDF" },
        { status: 422 }
      );
    }

    // Generate Excel
    const excelBuffer = await createExcel(rows);

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
    });

    // Return Excel file
    const outputFilename = file.name.replace(".pdf", "") + "_converted.xlsx";

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
      },
    });
  } catch (err) {
    console.error("Price list convert error:", err);
    return NextResponse.json(
      { error: "Failed to convert PDF" },
      { status: 500 }
    );
  }
}
