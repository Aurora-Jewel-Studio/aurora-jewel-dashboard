"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { designCardsAPI } from "@/lib/api";
import CommentThread from "@/components/CommentThread";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import {
  X,
  Image as ImageIcon,
  FileBox,
  Sparkles,
  Upload,
  Loader2,
  Download,
  User,
  Clock,
  ChevronDown,
  Check,
  ArrowLeft,
  Edit2,
} from "lucide-react";
import type { Point, Area } from "react-easy-crop";

const Cropper = dynamic(() => import("react-easy-crop"), { ssr: false }) as any;

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string = "cropped.jpg"
): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      resolve(new File([blob], fileName, { type: "image/jpeg" }));
    }, "image/jpeg", 0.95);
  });
}


import { DesignCard } from "./DesignCardGrid";

interface Props {
  card: DesignCard;
  onClose: () => void;
  onCardUpdate: (updated: DesignCard) => void;
  isArchived?: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  reference: "Reference Added",
  cad_in_progress: "CAD In Progress",
  cad_uploaded: "CAD Uploaded",
  final_uploaded: "Final Design Uploaded",
  completed: "Completed",
};

const STAGE_COLORS: Record<string, string> = {
  reference: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  cad_in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  cad_uploaded: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  final_uploaded: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
};

const STAGE_DOTS: Record<string, string> = {
  reference: "bg-blue-500",
  cad_in_progress: "bg-amber-500",
  cad_uploaded: "bg-purple-500",
  final_uploaded: "bg-emerald-500",
  completed: "bg-green-500",
};

const ALL_STAGES = ["reference", "cad_in_progress", "cad_uploaded", "final_uploaded", "completed"];

export default function DesignCardModal({ card, onClose, onCardUpdate, isArchived }: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<"cad" | "final" | "reference" | null>(null);
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);

  // Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleEditReference = () => {
    setShowCropper(true);
  };

  const handleCropConfirm = async () => {
    if (!card.reference_image_url || !croppedAreaPixels) return;
    setUploading("reference");
    try {
      // Due to CORS on image rendering in canvas, we must ensure it's loaded safely or proxy it.
      // But since it's from our own supabase bucket which should have CORS allowed, it works.
      const croppedFile = await getCroppedImg(card.reference_image_url, croppedAreaPixels, "reference.jpg");
      if (croppedFile) {
        const formData = new FormData();
        formData.append("reference_image", croppedFile);
        const res = await designCardsAPI.updateReference(card.id, formData);
        onCardUpdate({ ...card, ...res.data.card, comment_count: card.comment_count });
        setShowCropper(false);
      }
    } catch (err) {
      console.error("Failed to update reference image:", err);
    } finally {
      setUploading(null);
    }
  };


  const isAdmin = user?.role === "owner" || user?.role === "superadmin";

  const handleCadUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading("cad");
    try {
      const formData = new FormData();
      formData.append("cad_file", file);
      const res = await designCardsAPI.uploadCad(card.id, formData);
      onCardUpdate({ ...card, ...res.data.card, comment_count: card.comment_count });
    } catch (err) {
      console.error("CAD upload failed:", err);
    } finally {
      setUploading(null);
    }
  }, [card, onCardUpdate]);

  const handleFinalUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading("final");
    try {
      const formData = new FormData();
      formData.append("final_design", file);
      const res = await designCardsAPI.uploadFinal(card.id, formData);
      onCardUpdate({ ...card, ...res.data.card, comment_count: card.comment_count });
    } catch (err) {
      console.error("Final design upload failed:", err);
    } finally {
      setUploading(null);
    }
  }, [card, onCardUpdate]);

  const handleStageChange = async (newStage: string) => {
    setStageDropdownOpen(false);
    try {
      await designCardsAPI.updateStage(card.id, newStage);
      onCardUpdate({ ...card, stage: newStage, updated_at: new Date().toISOString() });
    } catch (err) {
      console.error("Failed to update stage:", err);
    }
  };

  // Progress steps for visual indicator
  const progressSteps = [
    { key: "reference", label: "Ref", done: !!card.reference_image_url, icon: <ImageIcon className="w-4 h-4" /> },
    { key: "cad", label: "CAD", done: !!card.cad_file_url, icon: <FileBox className="w-4 h-4" /> },
    { key: "final", label: "Final", done: !!card.final_design_url, icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — full screen on mobile, centered card on desktop */}
      <div className="relative w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] bg-white dark:bg-[#0c0e1a] sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e1a] sticky top-0 z-10">
          <button
            onClick={onClose}
            className="p-2 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">{card.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {card.assigned_designer && (
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <User className="w-3 h-3" />
                  {card.assigned_designer.name}
                </span>
              )}
            </div>
          </div>

          {/* Stage badge / dropdown */}
          {isAdmin ? (
            <div className="relative">
              <button
                onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${STAGE_COLORS[card.stage] || ""}`}
              >
                {STAGE_LABELS[card.stage]}
                <ChevronDown className="w-3 h-3" />
              </button>
              {stageDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setStageDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white dark:bg-[#12142a] rounded-xl border border-slate-200 dark:border-white/10 shadow-xl py-1">
                    {ALL_STAGES.map((stg) => (
                      <button
                        key={stg}
                        onClick={() => handleStageChange(stg)}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition"
                      >
                        <div className={`w-2 h-2 rounded-full ${STAGE_DOTS[stg]}`} />
                        <span className="flex-1">{STAGE_LABELS[stg]}</span>
                        {card.stage === stg && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 ${STAGE_COLORS[card.stage] || ""}`}>
              {STAGE_LABELS[card.stage]}
            </span>
          )}
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Visual Progress Bar */}
          <div className="px-4 py-4 bg-slate-50 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center justify-between">
              {progressSteps.map((step, i) => (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        step.done
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"
                      }`}
                    >
                      {step.icon}
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${
                        step.done
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < progressSteps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 rounded-full -mt-4 mx-1 ${
                        step.done
                          ? "bg-emerald-300 dark:bg-emerald-500/40"
                          : "bg-slate-200 dark:bg-white/10"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reference Image Section */}
          <div className="px-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden h-fit">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reference Image</span>
                  {card.reference_uploaded_at && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(card.reference_uploaded_at).toLocaleDateString()}
                    </span>
                  )}
                  {!isArchived && card.reference_image_url && (
                    <button
                      onClick={handleEditReference}
                      className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
                      title="Crop Image"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {card.reference_image_url ? (
                  <div className="relative w-full h-64">
                    <NextImage
                      src={card.reference_image_url}
                      alt="Reference"
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-contain bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="md:col-span-3 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/30 dark:bg-white/2" style={{ minHeight: "350px" }}>
                <CommentThread designCardId={card.id} section="reference" />
              </div>
            </div>
          </div>

          {/* CAD Section */}
          <div className="px-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden h-fit">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <FileBox className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">CAD File</span>
                  {card.cad_uploaded_at && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(card.cad_uploaded_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  {card.cad_file_url ? (
                    <a
                      href={card.cad_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-sm font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download CAD File
                    </a>
                  ) : !isArchived ? (
                    <label className="flex items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-500/20 cursor-pointer hover:border-purple-400 dark:hover:border-purple-500/40 hover:bg-purple-50/50 dark:hover:bg-purple-500/5 transition text-sm text-purple-600 dark:text-purple-400 font-medium">
                      {uploading === "cad" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                      {uploading === "cad" ? "Uploading..." : "Upload CAD File"}
                      <input
                        type="file"
                        accept=".stl,.step,.obj,.3dm"
                        onChange={handleCadUpload}
                        className="hidden"
                        disabled={!!uploading}
                      />
                    </label>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-2">No CAD file uploaded</p>
                  )}
                </div>
              </div>
              <div className="md:col-span-3 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/30 dark:bg-white/2" style={{ minHeight: "350px" }}>
                <CommentThread designCardId={card.id} section="cad" />
              </div>
            </div>
          </div>

          {/* Final Design Section */}
          <div className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden h-fit">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Final Design</span>
                  {card.final_uploaded_at && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(card.final_uploaded_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {card.final_design_url ? (
                  <div className="relative w-full h-64">
                    <NextImage
                      src={card.final_design_url}
                      alt="Final Design"
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-contain bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                ) : !isArchived ? (
                  <div className="p-3">
                    <label className="flex items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-500/20 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      {uploading === "final" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                      {uploading === "final" ? "Uploading..." : "Upload Final Design"}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        onChange={handleFinalUpload}
                        className="hidden"
                        disabled={!!uploading}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <Sparkles className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="md:col-span-3 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/30 dark:bg-white/2" style={{ minHeight: "350px" }}>
                <CommentThread designCardId={card.id} section="final" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cropper Modal Overlay */}
      {showCropper && card.reference_image_url && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCropper(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0c0e1a] rounded-2xl shadow-2xl p-6 m-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Crop Reference Image</h3>
              <button onClick={() => setShowCropper(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full h-[400px] bg-slate-100 dark:bg-black rounded-xl overflow-hidden">
              <Cropper
                image={card.reference_image_url}
                crop={crop}
                zoom={zoom}
                aspect={4 / 5}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <button
              onClick={handleCropConfirm}
              disabled={uploading === "reference"}
              className="w-full mt-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex justify-center items-center gap-2"
            >
              {uploading === "reference" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Crop"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
