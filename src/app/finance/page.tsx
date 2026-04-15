"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { pipelinesAPI } from "@/lib/api";
import Image from "next/image";
import {
  IndianRupee,
  Download,
  Import,
  Loader2,
  X,
  FileText,
  ChevronDown,
  ImageIcon,
  CheckCircle2,
} from "lucide-react";

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  status: string;
  card_count: number;
  created_at: string;
}

interface DesignCard {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  reference_image_url: string | null;
  final_design_url: string | null;
  stage: string;
  created_at: string;
  price_inr?: number;
  remarks?: string;
}

interface FinanceRow {
  cardId: string;
  imageUrl: string | null;
  quantity: number;
  description: string;
  price: string;
  remarks: string;
}

export default function FinancePage() {
  const { user } = useAuth();
  const tableRef = useRef<HTMLDivElement>(null);

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);

  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Fetch active pipelines
  const fetchPipelines = async () => {
    setLoadingPipelines(true);
    try {
      const res = await pipelinesAPI.list();
      const active = (res.data.pipelines || []).filter(
        (p: Pipeline) => p.status !== "archived"
      );
      setPipelines(active);
    } catch (err) {
      console.error("Failed to fetch pipelines:", err);
    } finally {
      setLoadingPipelines(false);
    }
  };

  // Import a pipeline
  const handleSelectPipeline = async (pipeline: Pipeline) => {
    setShowPipelineModal(false);
    setSelectedPipeline(pipeline);
    setLoadingCards(true);
    try {
      const res = await pipelinesAPI.get(pipeline.id);
      const cards: DesignCard[] = res.data.cards || [];
      const sorted = [...cards].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRows(
        sorted.map((card) => ({
          cardId: card.id,
          imageUrl: card.reference_image_url || card.final_design_url,
          quantity: card.quantity || 1,
          description: card.description || card.title || "",
          price: card.price_inr ? card.price_inr.toString() : "",
          remarks: card.remarks || "",
        }))
      );
    } catch (err) {
      console.error("Failed to fetch pipeline cards:", err);
    } finally {
      setLoadingCards(false);
    }
  };

  const updateRow = (index: number, field: "price" | "remarks", value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  // Auto-save effect
  useEffect(() => {
    if (!selectedPipeline || rows.length === 0) return;

    setSaveStatus("saving");
    const timeoutId = setTimeout(async () => {
      try {
        const payload = rows.map((r) => ({
          cardId: r.cardId,
          price_inr: r.price,
          remarks: r.remarks,
        }));
        await pipelinesAPI.saveFinance(selectedPipeline.id, payload);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Failed to auto-save finance data:", err);
        setSaveStatus("idle");
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timeoutId);
  }, [rows, selectedPipeline]);

  // Helper: fetch image as base64 data URL
  const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // Export as PDF — spreadsheet-style (like Excel export)
  const handleExportPDF = async () => {
    if (rows.length === 0) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageW = 297;
      const pageH = 210;
      const margin = 10;
      const usableW = pageW - margin * 2;

      // Column config: [S.N., Photo, Qty, Description, Price (INR), Remarks]
      const colWidths = [12, 34, 16, usableW - 12 - 34 - 16 - 38 - 55, 38, 55];
      const headers = ["S.N.", "Photo", "Qty", "Description", "Price (INR)", "Remarks"];
      const rowHeight = 36; // enough for image thumbnails
      const headerHeight = 10;
      const titleHeight = 12;

      // Colors
      const darkBg: [number, number, number] = [26, 26, 46]; // #1a1a2e
      const altRowBg: [number, number, number] = [245, 245, 255]; // #F5F5FF
      const white: [number, number, number] = [255, 255, 255];
      const textDark: [number, number, number] = [15, 23, 42]; // slate-900
      const textMid: [number, number, number] = [71, 85, 105]; // slate-600
      const emerald: [number, number, number] = [16, 185, 129]; // emerald-500

      let y = margin;

      // === Title Row ===
      pdf.setFillColor(...darkBg);
      pdf.rect(margin, y, usableW, titleHeight, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...white);
      pdf.text(`${selectedPipeline?.name || "Pipeline"} - Finance Invoice`, pageW / 2, y + titleHeight / 2 + 1, { align: "center" });
      y += titleHeight;

      // === Date subtitle ===
      pdf.setFillColor(240, 240, 245);
      pdf.rect(margin, y, usableW, 7, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...textMid);
      const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      pdf.text(`Generated on ${dateStr}`, pageW / 2, y + 4.5, { align: "center" });
      y += 7;

      // === Header Row ===
      const drawHeaders = (startY: number) => {
        pdf.setFillColor(...darkBg);
        pdf.rect(margin, startY, usableW, headerHeight, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(...white);

        let x = margin;
        headers.forEach((h, i) => {
          pdf.text(h, x + colWidths[i] / 2, startY + headerHeight / 2 + 1, { align: "center" });
          // Header cell borders
          pdf.setDrawColor(50, 50, 70);
          pdf.rect(x, startY, colWidths[i], headerHeight);
          x += colWidths[i];
        });

        return startY + headerHeight;
      };

      y = drawHeaders(y);

      // Pre-fetch all images
      const imagePromises = rows.map(async (row) => {
        if (row.imageUrl) {
          return await fetchImageAsBase64(row.imageUrl);
        }
        return null;
      });
      const images = await Promise.all(imagePromises);

      // === Data Rows ===
      for (let i = 0; i < rows.length; i++) {
        // Check if we need a new page
        if (y + rowHeight > pageH - margin - 12) {
          pdf.addPage();
          y = margin;
          y = drawHeaders(y);
        }

        const row = rows[i];
        const isAlt = i % 2 === 0;

        // Row background
        pdf.setFillColor(...(isAlt ? altRowBg : white));
        pdf.rect(margin, y, usableW, rowHeight, "F");

        // Cell borders
        pdf.setDrawColor(200, 200, 210);
        let x = margin;
        colWidths.forEach((w) => {
          pdf.rect(x, y, w, rowHeight);
          x += w;
        });

        x = margin;
        pdf.setTextColor(...textDark);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);

        // Col 0: S.N.
        pdf.text(String(i + 1), x + colWidths[0] / 2, y + rowHeight / 2 + 1, { align: "center" });
        x += colWidths[0];

        // Col 1: Photo (embedded image)
        if (images[i]) {
          try {
            const imgW = 22; // mm
            const imgH = 27.5; // 4:5 ratio
            const imgX = x + (colWidths[1] - imgW) / 2;
            const imgY = y + (rowHeight - imgH) / 2;
            pdf.addImage(images[i]!, "JPEG", imgX, imgY, imgW, imgH);
          } catch {
            // Skip if image fails
          }
        }
        x += colWidths[1];

        // Col 2: Qty
        pdf.setFont("helvetica", "bold");
        pdf.text(String(row.quantity), x + colWidths[2] / 2, y + rowHeight / 2 + 1, { align: "center" });
        x += colWidths[2];

        // Col 3: Description (word-wrapped)
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        const descLines = pdf.splitTextToSize(row.description || "—", colWidths[3] - 4);
        const descStartY = y + (rowHeight - descLines.length * 4) / 2 + 3;
        pdf.text(descLines, x + 2, descStartY);
        x += colWidths[3];

        // Col 4: Price (INR)
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        const priceVal = parseFloat(row.price) || 0;
        const priceText = priceVal > 0 ? `Rs. ${priceVal.toLocaleString("en-IN")}` : "-";
        pdf.text(priceText, x + colWidths[4] - 4, y + rowHeight / 2 + 1, { align: "right" });
        x += colWidths[4];

        // Col 5: Remarks (clipped to cell)
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        const remarkLines = pdf.splitTextToSize(row.remarks || "", colWidths[5] - 6);
        const maxLines = Math.min(remarkLines.length, 4); // limit to 4 lines
        const clippedRemarks = remarkLines.slice(0, maxLines);
        const remarkStartY = y + (rowHeight - maxLines * 3.5) / 2 + 2;
        pdf.text(clippedRemarks, x + 3, remarkStartY);

        y += rowHeight;
      }

      // === Total Row ===
      if (y + 10 > pageH - margin) {
        pdf.addPage();
        y = margin;
      }

      pdf.setFillColor(...darkBg);
      pdf.rect(margin, y, usableW, 10, "F");
      pdf.setDrawColor(50, 50, 70);
      pdf.rect(margin, y, usableW, 10);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(...white);

      const totalX = margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
      pdf.text("Total:", totalX - 3, y + 6.5, { align: "right" });

      pdf.setTextColor(110, 231, 183); // emerald-300
      pdf.text(
        `Rs. ${total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalX + colWidths[4] - 4,
        y + 6.5,
        { align: "right" }
      );

      pdf.save(`${selectedPipeline?.name || "finance"}_invoice.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Calculate total
  const total = rows.reduce((sum, row) => {
    const price = parseFloat(row.price) || 0;
    return sum + price * row.quantity;
  }, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Finance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-[52px]">
            Import a pipeline, add pricing, and export as PDF invoice.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => {
            fetchPipelines();
            setShowPipelineModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/25"
        >
          <Import className="w-4 h-4" />
          Import Pipeline
        </button>

        {rows.length > 0 && (
          <div className="flex items-center gap-4 ml-auto">
            {saveStatus === "saving" && (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> auto-saved
              </span>
            )}
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-sm font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {exporting ? "Exporting..." : "Export as PDF"}
            </button>
          </div>
        )}
      </div>

      {/* Selected Pipeline Info */}
      {selectedPipeline && (
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
              {selectedPipeline.name}
            </span>
            <span className="text-xs text-indigo-500 dark:text-indigo-400/70">
              ({rows.length} designs)
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedPipeline(null);
              setRows([]);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Cards */}
      {loadingCards && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Empty State */}
      {!selectedPipeline && !loadingCards && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-5">
            <IndianRupee className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">
            No pipeline imported
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            Click &quot;Import Pipeline&quot; to select a design pipeline and start building your invoice.
          </p>
        </div>
      )}

      {/* Finance Table */}
      {rows.length > 0 && !loadingCards && (
        <div
          ref={tableRef}
          className="bg-white dark:bg-[#12142a] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden"
        >
          {/* Table Header (for PDF title) */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {selectedPipeline?.name} — Invoice
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/3 border-b border-slate-200 dark:border-white/10">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 w-12">
                    S.N.
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 w-24">
                    Photo
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 w-16">
                    Qty
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">
                    Description
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 w-32">
                    Price (INR)
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 w-48">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.cardId}
                    className={`border-b border-slate-100 dark:border-white/5 ${
                      i % 2 === 0
                        ? "bg-white dark:bg-transparent"
                        : "bg-slate-50/50 dark:bg-white/1"
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-center font-medium">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                        {row.imageUrl ? (
                          <Image
                            src={row.imageUrl}
                            alt="Design"
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">
                      {row.quantity}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs">
                      <p className="line-clamp-3 text-sm">{row.description || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.price}
                        onChange={(e) => updateRow(i, "price", e.target.value)}
                        placeholder="0.00"
                        className="w-full text-right px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => updateRow(i, "remarks", e.target.value)}
                        placeholder="Add remarks..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-white/3 border-t-2 border-slate-200 dark:border-white/10">
                  <td colSpan={4} className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white text-base">
                    Total
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-base">
                    ₹ {total.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Pipeline Selection Modal */}
      {showPipelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowPipelineModal(false)}
          />
          <div className="relative w-full max-w-md mx-4 bg-white dark:bg-[#12142a] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Select Pipeline
              </h3>
              <button
                onClick={() => setShowPipelineModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pipeline List */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {loadingPipelines ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : pipelines.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No active pipelines found.
                </div>
              ) : (
                pipelines.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPipeline(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-white/5 transition group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {p.card_count} designs · {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90 group-hover:text-indigo-500 transition" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
