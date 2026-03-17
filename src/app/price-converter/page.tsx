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
} from "lucide-react";

export default function PriceConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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

    try {
      const response = await pricelistAPI.convert(file);

      // Download the Excel file
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(".pdf", "") + "_converted.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatus("success");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setStatus("error");
      setErrorMsg(
        error.response?.data?.error ||
          "Conversion failed. Make sure the PDF contains a table.",
      );
    } finally {
      setConverting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <FileSpreadsheet className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Price List Converter
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload a PDF price list and convert it to a formatted Excel
          spreadsheet
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
                    : "Drag & drop a PDF price list"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  or click to browse — Max 10MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Convert Button */}
        <button
          onClick={handleConvert}
          disabled={!file || converting}
          className="w-full mt-6 py-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
        >
          {converting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Converting...
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
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Excel file downloaded successfully! Check your downloads folder.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-sm text-rose-700 dark:text-rose-400">
              {errorMsg}
            </p>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            How it works
          </h3>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </span>
              Upload a PDF containing a price table with selectable text
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </span>
              The system extracts Item, Weight, and Price columns automatically
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </span>
              Excel file includes Cost Price (blank), Selling Price, and Margin
              formula
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
