import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authenticate, unauthorizedResponse } from "@/lib/auth-helpers";
import * as ExcelJS from "exceljs";
import { GoogleGenAI } from "@google/genai";
import { PDFDocument, PDFName, PDFDict, PDFStream, PDFRawStream } from "pdf-lib";

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
 * Extract embedded JPEG/PNG images from a PDF using pdf-lib low-level API.
 * Returns an array of image buffers in document order.
 */
async function extractImagesFromPDF(pdfBytes: Buffer): Promise<Buffer[]> {
  const images: Buffer[] = [];

  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const resources = page.node.get(PDFName.of("Resources"));
      if (!(resources instanceof PDFDict)) continue;

      const xObjectRef = resources.get(PDFName.of("XObject"));
      if (!xObjectRef) continue;

      const xObjects =
        xObjectRef instanceof PDFDict
          ? xObjectRef
          : (pdfDoc.context.lookup(xObjectRef) as PDFDict | null);
      if (!(xObjects instanceof PDFDict)) continue;

      // Get all XObject entries sorted by name for consistent ordering
      const entries = Array.from(xObjects.entries()).sort(([a], [b]) =>
        a.toString().localeCompare(b.toString()),
      );

      for (const [, ref] of entries) {
        const xObject = pdfDoc.context.lookup(ref);
        if (!xObject) continue;

        // Check if it's an Image XObject
        let dict: PDFDict;
        let streamBytes: Uint8Array;

        if (xObject instanceof PDFRawStream) {
          dict = xObject.dict;
          streamBytes = xObject.contents;
        } else if (xObject instanceof PDFStream) {
          dict = xObject.dict;
          streamBytes = (xObject as any).contents || (xObject as any).getContents?.();
          if (!streamBytes) continue;
        } else {
          continue;
        }

        const subtype = dict.get(PDFName.of("Subtype"));
        if (!subtype || subtype.toString() !== "/Image") continue;

        // Check filter to determine image type
        const filter = dict.get(PDFName.of("Filter"));
        const filterStr = filter?.toString() || "";

        if (filterStr.includes("DCTDecode")) {
          // JPEG image - raw bytes are usable directly
          images.push(Buffer.from(streamBytes));
        } else if (filterStr.includes("FlateDecode")) {
          // Could be PNG-like data, try to use it
          // For FlateDecode images we'd need to decompress + reconstruct PNG
          // Skip for now - most product photos are JPEG
          continue;
        }
      }
    }
  } catch (err) {
    console.error("PDF image extraction error:", err);
    // Return empty array - graceful fallback
  }

  return images;
}

/**
 * Send PDF to Gemini Vision API for structured extraction using the new SDK.
 */
async function extractWithVision(pdfBase64: string): Promise<ExtractedItem[]> {
  const apiKey = process.env.GEMINI_API;
  if (!apiKey) {
    throw new Error("GEMINI_API key is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a jewelry price list OCR expert. Extract ALL items from this PDF price list into a structured JSON array.

For each item, extract:
- "sn": serial number (integer)
- "name": item name/title
- "details": materials, stones, and specifications
- "quantity": total quantity (integer, default 1)
- "weight": weight string
- "price_inr": total price in Indian Rupees (number only)

Return a plain JSON array of objects.
Rules:
- Include every item row.
- If no items, return [].
- Strictly return valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64,
          },
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const content = response.text || "[]";

    const items: ExtractedItem[] = JSON.parse(content);
    return items.map((item, idx) => ({
      sn: item.sn || idx + 1,
      name: item.name || "Unknown Item",
      details: item.details || "",
      quantity: item.quantity || 1,
      weight: item.weight || "",
      price_inr: typeof item.price_inr === "number" ? item.price_inr : 0,
    }));
  } catch (err: any) {
    console.error("Gemini SDK Error:", err);
    if (err.message && err.message.includes("JSON")) {
      throw new Error("AI returned invalid JSON. Please try again.");
    }
    throw new Error(`Gemini Error: ${err.message || "Failed to extract data"}`);
  }
}

/**
 * Create a professional Excel workbook from extracted items with images and INR→NPR conversion.
 */
async function createExcel(
  items: ExtractedItem[],
  images: Buffer[],
  marginPercent: number,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Price List");

  const IMAGE_ROW_HEIGHT = 100; // pixels for image rows
  const IMAGE_COL_WIDTH = 18; // column B width for pictures

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
  ws.mergeCells("A1:K1");
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
  ws.mergeCells("A2:K2");
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

  // ── Headers (row 3) — now with Picture column ──
  const headers = [
    "S.N.",
    "Picture",
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
  headerRow.eachCell((cell: ExcelJS.Cell) => {
    cell.style = headerStyle;
  });
  headerRow.height = 28;

  // ── Data rows (starting row 4) ──
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const excelRow = i + 4; // row 4 onwards

    const unitPriceINR =
      item.quantity > 0 ? item.price_inr / item.quantity : item.price_inr;
    const unitPriceNPR = unitPriceINR * INR_TO_NPR;
    const sellingPrice = unitPriceNPR * (1 + marginPercent / 100);

    // Column layout: A=SN, B=Picture(blank), C=Name, D=Details, E=Qty, F=Weight,
    //                G=TotalINR, H=UnitINR, I=UnitNPR, J=Margin, K=SellingNPR
    const row = ws.addRow([
      item.sn,
      "", // Picture placeholder
      item.name,
      item.details,
      item.quantity,
      item.weight,
      item.price_inr,
      {
        formula: `IF(E${excelRow}>0,G${excelRow}/E${excelRow},G${excelRow})`,
        result: unitPriceINR,
      },
      { formula: `H${excelRow}*${INR_TO_NPR}`, result: unitPriceNPR },
      marginPercent,
      { formula: `I${excelRow}*(1+J${excelRow}/100)`, result: sellingPrice },
    ]);

    row.eachCell((cell: ExcelJS.Cell) => {
      cell.font = { name: "Calibri", size: 11 };
      cell.border = cellBorder;
      cell.alignment = { vertical: "middle" };
    });

    // Set row height for images
    row.height = IMAGE_ROW_HEIGHT;

    // Number formatting
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(7).numFmt = "#,##0.00";
    row.getCell(8).numFmt = "#,##0.00";
    row.getCell(9).numFmt = "#,##0.00";
    row.getCell(10).numFmt = "0";
    row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(11).numFmt = "#,##0.00";

    // Alternate row shading
    if (i % 2 === 0) {
      row.eachCell((cell: ExcelJS.Cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F5FF" },
        };
      });
    }

    // ── Embed image if available ──
    if (i < images.length && images[i].length > 0) {
      try {
        const imageId = workbook.addImage({
          buffer: new Uint8Array(images[i]) as any,
          extension: "jpeg",
        });
        ws.addImage(imageId, {
          tl: { col: 1.1, row: excelRow - 1 + 0.1 } as any,
          br: { col: 1.9, row: excelRow - 1 + 0.9 } as any,
        });
      } catch (imgErr) {
        console.error(`Failed to embed image for item ${i + 1}:`, imgErr);
        // Skip image - data will still be in the row
      }
    }
  }

  // ── Totals row ──
  if (items.length > 0) {
    const lastDataRow = items.length + 3;
    const totalsRow = ws.addRow([
      "",
      "",
      "TOTAL",
      "",
      {
        formula: `SUM(E4:E${lastDataRow})`,
        result: items.reduce((a, b) => a + b.quantity, 0),
      },
      "",
      {
        formula: `SUM(G4:G${lastDataRow})`,
        result: items.reduce((a, b) => a + b.price_inr, 0),
      },
      "",
      "",
      "",
      { formula: `SUM(K4:K${lastDataRow})`, result: 0 },
    ]);

    totalsRow.eachCell((cell: ExcelJS.Cell) => {
      cell.font = { name: "Calibri", bold: true, size: 11 };
      cell.border = cellBorder;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE8E8FF" },
      };
    });
    totalsRow.getCell(7).numFmt = "#,##0.00";
    totalsRow.getCell(11).numFmt = "#,##0.00";
  }

  // ── Column widths ──
  ws.getColumn(1).width = 6; // S.N.
  ws.getColumn(2).width = IMAGE_COL_WIDTH; // Picture
  ws.getColumn(3).width = 24; // Item Name
  ws.getColumn(4).width = 32; // Details
  ws.getColumn(5).width = 8; // Qty
  ws.getColumn(6).width = 12; // Weight
  ws.getColumn(7).width = 18; // Total Price INR
  ws.getColumn(8).width = 16; // Unit Price INR
  ws.getColumn(9).width = 16; // Unit Price NPR
  ws.getColumn(10).width = 12; // Margin
  ws.getColumn(11).width = 18; // Selling Price NPR

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
    const fileUrl = formData.get("file_url") as string | null;
    const fileName = (formData.get("file_name") as string | null) || "document.pdf";
    const marginStr = formData.get("margin") as string | null;
    const marginPercent = marginStr ? parseFloat(marginStr) : 30;

    let pdfBuffer: Buffer;

    if (fileUrl) {
      // Fetch the file from the provided URL (Storage path)
      const fileResp = await fetch(fileUrl);
      if (!fileResp.ok) {
        return NextResponse.json(
          { error: `Failed to fetch file from storage: ${fileResp.statusText}` },
          { status: 400 },
        );
      }
      pdfBuffer = Buffer.from(await fileResp.arrayBuffer());
    } else {
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: "Only PDF files are accepted" },
          { status: 400 },
        );
      }
      pdfBuffer = Buffer.from(await file.arrayBuffer());
    }

    const pdfBase64 = pdfBuffer.toString("base64");

    // Extract items using Vision AI + images from PDF in parallel
    const [items, images] = await Promise.all([
      extractWithVision(pdfBase64),
      extractImagesFromPDF(pdfBuffer),
    ]);

    if (!items.length) {
      return NextResponse.json(
        {
          error:
            "No items could be extracted from the PDF. Please ensure the PDF contains jewel price data.",
        },
        { status: 422 },
      );
    }

    // Generate Excel with images
    const excelBuffer = await createExcel(items, images, marginPercent);

    // Store PDF reference in database
    const pdfPath = `pricelists/${user.id}/${Date.now()}_${fileName}`;
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
    const outputFilename = fileName.replace(".pdf", "") + "_priced.xlsx";

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
