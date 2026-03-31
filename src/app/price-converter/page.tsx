"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { pricelistAPI } from "@/lib/api";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Percent,
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";

const STEPS = [
  "Uploading PDF...",
  "Reading pages with Gemini AI...",
  "Extracting jewel data & images...",
  "Generating Excel with NPR pricing...",
];

interface ExtractedItem {
  sn: number;
  name: string;
  details: string;
  quantity: number;
  weight: string;
  price_inr: number;
}

// Client-side AI extraction
async function extractWithVision(file: File): Promise<ExtractedItem[]> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API;
  if (!apiKey) throw new Error("NEXT_PUBLIC_GEMINI_API key is not configured");

  // Read file as Base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // remove data:application/pdf;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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
            data: base64Data,
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

export default function PriceConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [margin, setMargin] = useState(30);
  const [stepIndex, setStepIndex] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
      setStatus("idle");
      setErrorMsg("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleConvert = async () => {
    if (!file) return;
    setConverting(true);
    setStatus("idle");
    setStepIndex(0);

    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 4500); // Increased step time since AI takes longer

    try {
      // 1. Extract JSON client-side (bypasses Vercel timeout)
      const extractedItems = await extractWithVision(file);
      
      if (!extractedItems.length) {
        throw new Error("No items could be extracted from the PDF. Please ensure the PDF contains jewel price data.");
      }

      // 2. Send JSON and PDF to backend for Excel generation
      const formData = new FormData();
      formData.append("file", file);
      formData.append("items", JSON.stringify(extractedItems));
      formData.append("margin", margin.toString());

      const response = await pricelistAPI.convert(formData);

      clearInterval(stepInterval);

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(".pdf", "") + "_priced.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatus("success");
    } catch (err: unknown) {
      clearInterval(stepInterval);
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setStatus("error");
      setErrorMsg(
        error.response?.data?.error ||
        error.message ||
        "Conversion failed. Please try again or use a smaller PDF.",
      );
    } finally {
      setConverting(false);
      setStepIndex(0);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <FileSpreadsheet className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Financial Automation
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          AI-powered OCR — Upload a jewel PDF and automate NPR pricing in Excel
        </p>
      </div>

      <div className="max-w-2xl">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
              : file
                ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10"
                : "border-slate-200 bg-white dark:bg-[#12142a] hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm"
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <FileText className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-white font-medium">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB — Click or drag to replace
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-white font-medium">
                  {isDragActive
                    ? "Drop your PDF here"
                    : "Drag & drop a jewel price list PDF"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Scanned images or text PDFs — Max 10MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Margin Input */}
        <div className="mt-4 flex items-center gap-4 bg-white dark:bg-[#12142a] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 flex-1">
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
              className="w-20 px-2 py-1 text-sm border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-[#0a0b1a] text-slate-900 dark:text-white text-center"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">%</span>
          </div>
        </div>

        {/* Convert Button */}
        <button
          onClick={handleConvert}
          disabled={!file || converting}
          className="mt-4 w-full py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
        >
          {converting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {STEPS[stepIndex]}
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Convert & Download Excel
            </>
          )}
        </button>

        {/* Status Messages */}
        {status === "success" && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-300">
                Conversion complete!
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                Your Excel file has been downloaded. Check your downloads folder.
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">
                Conversion failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                {errorMsg}
              </p>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-8 p-5 rounded-xl bg-slate-50 dark:bg-[#12142a] border border-slate-200 dark:border-white/10">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            How it works
          </h3>
          <div className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              Upload a scanned or text-based PDF containing jewel pricing
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              AI Vision reads images, stones, quantities, weights & INR prices
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              Prices are converted: INR → NPR (×1.6015) with your margin applied
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              Download a professional Excel with formulas for easy adjustments
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-500">
          <span>1 INR = 1.6015 NPR</span>
        </div>
      </div>
    </div>
  );
}
