"use client";

import { useState } from "react";
import { pipelinesAPI, pricelistAPI } from "@/lib/api";
import Image from "next/image";
import {
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  ChevronDown,
  Percent,
  ImageIcon,
  Import,
  ArrowRightLeft,
} from "lucide-react";

const INR_TO_NPR = 1.6015;

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

interface PriceRow {
  cardId: string;
  imageUrl: string | null;
  name: string;
  details: string;
  quantity: number;
  price_inr: string;
}

export default function PriceConverterPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);

  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const [margin, setMargin] = useState(30);
  const [converting, setConverting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
    setStatus("idle");
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
          name: card.title || "Untitled Design",
          details: card.remarks || card.description || "",
          quantity: card.quantity || 1,
          price_inr: card.price_inr ? card.price_inr.toString() : "",
        }))
      );
    } catch (err) {
      console.error("Failed to fetch pipeline cards:", err);
    } finally {
      setLoadingCards(false);
    }
  };

  const updateRow = (index: number, field: "price_inr" | "quantity", value: string) => {
    // Only local state update - ephemeral (not saved to DB)
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  // Generate and download Excel
  const handleConvert = async () => {
    if (rows.length === 0 || !selectedPipeline) return;
    setConverting(true);
    setStatus("idle");

    try {
      const items = rows.map((row, i) => ({
        sn: i + 1,
        name: row.name,
        details: row.details,
        quantity: parseInt(String(row.quantity)) || 1,
        imageUrl: row.imageUrl,
        price_inr: parseFloat(row.price_inr) || 0,
      }));

      const response = await pricelistAPI.convert({
        items,
        margin,
        pipelineName: selectedPipeline.name,
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedPipeline.name.replace(/[^a-zA-Z0-9]/g, "_")}_priced.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatus("success");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setStatus("error");
      setErrorMsg(
        error.response?.data?.error ||
        error.message ||
        "Conversion failed. Please try again.",
      );
    } finally {
      setConverting(false);
    }
  };

  // Live NPR calculations
  const getUnitINR = (row: PriceRow) => {
    const price = parseFloat(row.price_inr) || 0;
    const qty = parseInt(String(row.quantity)) || 1;
    return qty > 0 ? price / qty : price;
  };

  const getUnitNPR = (row: PriceRow) => getUnitINR(row) * INR_TO_NPR;
  const getSellingNPR = (row: PriceRow) => getUnitNPR(row) * (1 + margin / 100);

  const totalINR = rows.reduce((sum, r) => sum + (parseFloat(r.price_inr) || 0), 0);
  const totalNPR = rows.reduce((sum, r) => sum + getSellingNPR(r) * (parseInt(String(r.quantity)) || 1), 0);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          Financial Automation
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-[52px] flex items-center gap-1.5">
          <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
          Import a Finance Invoice and generate NPR-priced Excel with one click
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => {
            fetchPipelines();
            setShowPipelineModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/25"
        >
          <Import className="w-4 h-4" />
          Import from Finance Invoice
        </button>

        {/* Margin Input */}
        {rows.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#12142a] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
            <Percent className="w-4 h-4 text-indigo-500" />
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Margin
            </label>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              min={0}
              max={200}
              className="w-16 px-2 py-1 text-sm border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-[#0a0b1a] text-slate-900 dark:text-white text-center"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">%</span>
          </div>
        )}

        {rows.length > 0 && (
          <button
            onClick={handleConvert}
            disabled={converting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-sm font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {converting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {converting ? "Generating..." : "Generate & Download Excel"}
          </button>
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
              ({rows.length} items)
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedPipeline(null);
              setRows([]);
              setStatus("idle");
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Messages */}
      {status === "success" && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-emerald-800 dark:text-emerald-300">
              Excel generated successfully!
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
              Your priced Excel file has been downloaded. Check your downloads folder.
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-300">
              Generation failed
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
              {errorMsg}
            </p>
          </div>
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
            <FileSpreadsheet className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">
            No invoice imported
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-md">
            Click &quot;Import from Finance Invoice&quot; to select a priced pipeline and generate an NPR-converted Excel spreadsheet.
          </p>
        </div>
      )}

      {/* Conversion Table */}
      {rows.length > 0 && !loadingCards && (
        <div className="bg-white dark:bg-[#12142a] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                INR → NPR Conversion Preview
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                1 INR = {INR_TO_NPR} NPR · Margin: {margin}%
              </p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-slate-500">Total INR</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Rs. {totalINR.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total NPR (Selling)</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Rs. {totalNPR.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/10">
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-400 w-10">
                    S.N.
                  </th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-400 w-20">
                    Photo
                  </th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-400">
                    Description
                  </th>
                  <th className="text-center px-3 py-3 font-semibold text-slate-600 dark:text-slate-400 w-16">
                    Qty
                  </th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-400 w-32">
                    Price (INR)
                  </th>
                  <th className="text-right px-3 py-3 font-semibold text-indigo-600 dark:text-indigo-400 w-28">
                    Unit (NPR)
                  </th>
                  <th className="text-right px-3 py-3 font-semibold text-emerald-600 dark:text-emerald-400 w-32">
                    Selling (NPR)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const unitNPR = getUnitNPR(row);
                  const sellingNPR = getSellingNPR(row);

                  return (
                    <tr
                      key={row.cardId}
                      className={`border-b border-slate-100 dark:border-white/5 ${
                        i % 2 === 0
                          ? "bg-white dark:bg-transparent"
                          : "bg-slate-50/50 dark:bg-white/[0.01]"
                      }`}
                    >
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-center font-medium">
                        {i + 1}
                      </td>
                      <td className="px-3 py-3">
                        <div className="w-14 h-[70px] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                          {row.imageUrl ? (
                            <Image
                              src={row.imageUrl}
                              alt="Design"
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-300 max-w-xs">
                        <p className="text-sm font-medium line-clamp-1">{row.name}</p>
                        {row.details && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{row.details}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-900 dark:text-white">
                        {row.quantity}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={row.price_inr}
                          onChange={(e) => updateRow(i, "price_inr", e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                        />
                      </td>
                      <td className="px-3 py-3 text-right text-indigo-600 dark:text-indigo-400 font-medium tabular-nums">
                        {unitNPR > 0
                          ? unitNPR.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-right text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                        {sellingNPR > 0
                          ? sellingNPR.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* How it works */}
      {!selectedPipeline && (
        <div className="mt-8 max-w-2xl p-5 rounded-xl bg-slate-50 dark:bg-[#12142a] border border-slate-200 dark:border-white/10">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
            How it works
          </h3>
          <div className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              Import a pipeline from the Finance Invoice (already priced in INR)
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              Review and adjust INR prices and margin percentage as needed
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              See live NPR conversion preview (1 INR = {INR_TO_NPR} NPR + margin)
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              Download a professional Excel with formulas, images, and NPR pricing
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-500">
        <span>1 INR = {INR_TO_NPR} NPR</span>
      </div>

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
