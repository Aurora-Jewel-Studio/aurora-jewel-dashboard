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
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase-client";

const STEPS = [
  "Uploading PDF to secure storage...",
  "Reading pages with Gemini AI...",
  "Extracting jewel data & images...",
  "Generating Excel with NPR pricing...",
];

export default function PriceConverterPage() {
  const { token } = useAuth();
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

    // Animate through steps
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 4500);

    try {
      // 1. Get a Signed Upload URL from our backend (Bypasses RLS issues)
      const { data: uploadInfo } = await pricelistAPI.getUploadUrl(file.name);
      const { uploadUrl, filePath } = uploadInfo;

      // 2. Upload directly to Supabase via the signed URL (Bypasses Vercel 4.5MB payload limit)
      const uploadResp = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      });

      if (!uploadResp.ok) {
        // Fallback for smaller files if signed upload fails
        if (file.size < 4 * 1024 * 1024) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("margin", margin.toString());
          const directResponse = await pricelistAPI.convert(formData);
          processResponse(directResponse.data);
          return;
        }
        throw new Error("Secure storage upload failed. File might be too large or storage is unavailable.");
      }

      // 3. Call conversion API with the filePath (Backend and Storage are now synced)
      const formData = new FormData();
      formData.append("file_path", filePath);
      formData.append("file_name", file.name);
      formData.append("margin", margin.toString());

      const response = await pricelistAPI.convert(formData);
      processResponse(response.data);
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setConverting(false);
      clearInterval(stepInterval);
    }
  };

  const processResponse = (data: any) => {
    const blob = new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (file?.name || "price_list").replace(".pdf", "") + "_priced.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    setStatus("success");
  };

  const handleError = (err: any) => {
    const error = err as { response?: { data?: { error?: string } } };
    setStatus("error");
    setErrorMsg(
      error.response?.data?.error ||
        err.message ||
        "Conversion failed. Please try again or use a smaller PDF.",
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <FileSpreadsheet className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Price List Converter
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          AI-powered OCR — Upload a jewel PDF and get NPR pricing in Excel
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
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={margin}
              onChange={(e) => setMargin(parseInt(e.target.value))}
              className="w-32 accent-indigo-600"
            />
            <input
              type="number"
              min="0"
              max="200"
              value={margin}
              onChange={(e) => setMargin(parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1.5 text-sm text-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              %
            </span>
          </div>
        </div>

        {/* Convert Button */}
        <button
          onClick={handleConvert}
          disabled={!file || converting}
          className="w-full mt-4 py-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
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
          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Excel file downloaded! INR prices have been converted to NPR with{" "}
              {margin}% margin applied.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-sm text-rose-700 dark:text-rose-400">
              {errorMsg}
            </p>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            How it works
          </h3>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
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

        {/* Conversion Rate Info */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-500">
          <span>1 INR = 1.6015 NPR</span>
        </div>
      </div>
    </div>
  );
}
