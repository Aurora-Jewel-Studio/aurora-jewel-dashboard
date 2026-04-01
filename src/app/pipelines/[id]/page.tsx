"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { pipelinesAPI, designCardsAPI, authAPI, commentsAPI } from "@/lib/api";
import DesignCardGrid, { DesignCard } from "@/components/DesignCardGrid";
import DesignCardModal from "@/components/DesignCardModal";
import { useParams, useRouter } from "next/navigation";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Plus,
  Loader2,
  X,
  Archive,
  Layers,
  Trash2,
  FileSpreadsheet,
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


interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface DesignerUser {
  id: string;
  name: string;
  role: string;
}

export default function PipelineDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const pipelineId = params.id as string;

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [cards, setCards] = useState<DesignCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<DesignCard | null>(null);

  // Create card state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [designers, setDesigners] = useState<DesignerUser[]>([]);
  const [cardForm, setCardForm] = useState({
    title: "",
    description: "",
    quantity: 1,
    assigned_designer_id: "",
  });
  const [refImageFile, setRefImageFile] = useState<File | null>(null);

  // Cropper State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [exporting, setExporting] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || "");
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, "reference.jpg");
      if (croppedFile) {
        setRefImageFile(croppedFile);
        setShowCropper(false);
        setImageSrc(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCropping(false);
    }
  };


  const canCreate = !!user; // All authenticated users can manage pipelines now
  const isArchived = pipeline?.status === "archived";

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await pipelinesAPI.get(pipelineId);
      setPipeline(res.data.pipeline);
      setCards(res.data.cards || []);
    } catch (err) {
      console.error("Failed to fetch pipeline:", err);
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  const fetchDesigners = useCallback(async () => {
    try {
      const res = await authAPI.listUsers();
      const allUsers = res.data.users || [];
      setDesigners(allUsers.filter((u: DesignerUser) => u.role === "designer"));
    } catch (err) {
      console.error("Failed to fetch designers:", err);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  useEffect(() => {
    if (canCreate && designers.length === 0) {
      fetchDesigners();
    }
  }, [canCreate, designers.length, fetchDesigners]);

  const handleStageChange = async (cardId: string, newStage: string) => {
    // Optimistic update
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, stage: newStage, updated_at: new Date().toISOString() } : c
      )
    );

    try {
      await designCardsAPI.updateStage(cardId, newStage);
    } catch (err) {
      console.error("Failed to update stage:", err);
      fetchPipeline(); // Revert on error
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refImageFile) return;
    setCreating(true);

    try {
      const formData = new FormData();
      formData.append("pipeline_id", pipelineId);
      formData.append("title", cardForm.title.trim());
      formData.append("description", cardForm.description.trim());
      formData.append("quantity", cardForm.quantity.toString());
      if (cardForm.assigned_designer_id) {
        formData.append("assigned_designer_id", cardForm.assigned_designer_id);
      }
      if (refImageFile) {
        formData.append("reference_image", refImageFile);
      }

      const res = await designCardsAPI.create(formData);
      setCards((prev) => [...prev, res.data.card]);
      setShowCreate(false);
      setCardForm({ title: "", description: "", quantity: 1, assigned_designer_id: "" });
      setRefImageFile(null);
    } catch (err) {
      console.error("Failed to create card:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleCardUpdate = (updated: DesignCard) => {
    setCards((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setSelectedCard(updated);
  };

  const handleArchive = async () => {
    try {
      await pipelinesAPI.archive(pipelineId);
      fetchPipeline();
    } catch (err) {
      console.error("Failed to archive:", err);
    }
  };

  const handleUnarchive = async () => {
    try {
      await pipelinesAPI.unarchive(pipelineId);
      fetchPipeline();
    } catch (err) {
      console.error("Failed to unarchive:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this pipeline and all its design cards? This action cannot be undone.")) {
      return;
    }
    try {
      await pipelinesAPI.delete(pipelineId);
      router.push("/pipelines");
    } catch (err) {
      console.error("Failed to delete pipeline:", err);
    }
  };

  const handleExportExcel = async () => {
    if (cards.length === 0) return;
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet(pipeline?.name || "Design Pipeline");

      const IMAGE_ROW_HEIGHT = 150; // 150 points is ~200 pixels

      // Title
      ws.mergeCells("A1:F1");
      const titleCell = ws.getCell("A1");
      titleCell.value = `${pipeline?.name || "Pipeline"} — Design Export`;
      titleCell.font = { name: "Calibri", bold: true, size: 14, color: { argb: "FF1a1a2e" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 30;

      // Headers
      const headers = ["S.N.", "Reference Image", "Quantity", "Description / Caption", "Final Design", "Comments"];
      const headerRow = ws.addRow(headers);
      const headerStyle: any = {
        font: { name: "Calibri", bold: true, size: 11, color: { argb: "FFFFFFFF" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a1a2e" } },
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
        border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } },
      };
      headerRow.eachCell((cell: any) => { cell.style = headerStyle; });
      headerRow.height = 28;

      // Column widths (1 char ≈ 7.2px; 25 chars ≈ 180px)
      ws.getColumn(1).width = 6;   // S.N.
      ws.getColumn(2).width = 25;  // Reference Image
      ws.getColumn(3).width = 10;  // Quantity
      ws.getColumn(4).width = 35;  // Description
      ws.getColumn(5).width = 25;  // Final Design
      ws.getColumn(6).width = 40;  // Comments

      const cellBorder: any = {
        top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" },
      };

      // Sort cards by created_at descending
      const sortedCards = [...cards].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      for (let i = 0; i < sortedCards.length; i++) {
        const card = sortedCards[i];
        const excelRow = i + 3; // 1-indexed, row 1 = title, row 2 = headers

        // Fetch comments for this card
        let commentText = "";
        try {
          const commentsRes = await commentsAPI.list(card.id);
          const allComments: { comment_text: string; user: { name: string }; created_at: string }[] = commentsRes.data.comments || [];
          if (allComments.length > 0) {
            commentText = allComments
              .map((c) => {
                const cleanText = c.comment_text.replace(/^\[(REF|CAD|FINAL)\]\s*/, "");
                return `${c.user.name}: ${cleanText}`;
              })
              .join("\n");
          }
        } catch (err) {
          console.error("Failed to fetch comments for card:", card.id, err);
        }

        const row = ws.addRow([
          i + 1,
          "", // placeholder for reference image
          card.quantity || 1,
          card.description || "",
          "", // placeholder for final design image
          commentText,
        ]);

        row.eachCell((cell: any) => {
          cell.font = { name: "Calibri", size: 11 };
          cell.border = cellBorder;
          cell.alignment = { vertical: "middle", wrapText: true };
        });
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
        row.height = IMAGE_ROW_HEIGHT;

        if (i % 2 === 0) {
          row.eachCell((cell: any) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5FF" } };
          });
        }

        // Embed reference image — perfectly sized to 144x180 (4:5 ratio)
        if (card.reference_image_url) {
          try {
            const imgResp = await fetch(card.reference_image_url);
            const imgBlob = await imgResp.blob();
            const imgBuffer = await imgBlob.arrayBuffer();
            const ext = card.reference_image_url.includes(".png") ? "png" : "jpeg";
            const imageId = workbook.addImage({ buffer: imgBuffer, extension: ext });
            ws.addImage(imageId, {
              tl: { col: 1.1, row: excelRow - 1 + 0.1 } as any,
              ext: { width: 144, height: 180 },
            });
          } catch (imgErr) {
            console.error("Failed to embed reference image:", imgErr);
          }
        }

        // Embed final design image — perfectly sized to 144x180 (4:5 ratio)
        if (card.final_design_url) {
          try {
            const imgResp = await fetch(card.final_design_url);
            const imgBlob = await imgResp.blob();
            const imgBuffer = await imgBlob.arrayBuffer();
            const ext = card.final_design_url.includes(".png") ? "png" : "jpeg";
            const imageId = workbook.addImage({ buffer: imgBuffer, extension: ext });
            ws.addImage(imageId, {
              tl: { col: 4.1, row: excelRow - 1 + 0.1 } as any,
              ext: { width: 144, height: 180 },
            });
          } catch (imgErr) {
            console.error("Failed to embed final design image:", imgErr);
          }
        }
      }

      ws.views = [{ state: "frozen", ySplit: 2 }];

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pipeline?.name || "pipeline"}_designs.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Layers className="w-12 h-12 mb-4" />
        <p>Pipeline not found</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => router.push("/pipelines")}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
              {pipeline.name}
            </h1>
            {isArchived && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400 font-medium shrink-0">
                Archived
              </span>
            )}
          </div>
          {pipeline.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {pipeline.description}
            </p>
          )}
        </div>
      </div>

      {/* Admin actions (desktop) */}
      {canCreate && (
        <div className="hidden sm:flex gap-3 mb-6 ml-12">
          {isArchived ? (
            <>
              <button
                onClick={handleUnarchive}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-indigo-300 bg-indigo-50 text-sm font-semibold text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition shadow-sm"
              >
                <Archive className="w-4 h-4" />
                Unarchive
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-rose-300 bg-rose-50 text-sm font-semibold text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleArchive}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-white/15 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition shadow-sm"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
              <button
                onClick={() => handleExportExcel()}
                disabled={cards.length === 0 || exporting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-sm font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                {exporting ? "Exporting..." : "Export Excel"}
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/25"
              >
                <Plus className="w-4 h-4" />
                Add Design
              </button>
            </>
          )}
        </div>
      )}

      {/* Card count */}
      <div className="flex items-center gap-2 mb-4 ml-12 sm:ml-12">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {cards.length} {cards.length === 1 ? "design" : "designs"}
        </span>
      </div>

      {/* Design Card Grid */}
      <DesignCardGrid
        cards={cards}
        onCardClick={(card) => setSelectedCard(card)}
        onStageChange={handleStageChange}
        userRole={user?.role}
        isArchived={isArchived}
      />

      {/* Mobile FAB — Add Design */}
      {canCreate && !isArchived && (
        <button
          onClick={() => setShowCreate(true)}
          className="sm:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Create Card Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white dark:bg-[#0c0e1a] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full sm:max-w-md p-6 max-h-[85vh] overflow-y-auto">
            {/* Drag handle (mobile) */}
            <div className="sm:hidden w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Add Design
              </h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Design Title (Optional)
                </label>
                <input
                  type="text"
                  value={cardForm.title}
                  onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
                  placeholder="e.g. Diamond Pendant #42"
                  className="w-full px-3 py-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cardForm.quantity}
                    onChange={(e) => setCardForm({ ...cardForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assign Designer
                  </label>
                  <select
                    value={cardForm.assigned_designer_id}
                    onChange={(e) => setCardForm({ ...cardForm, assigned_designer_id: e.target.value })}
                    className="w-full px-3 py-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    <option value="">Unassigned</option>
                    {designers.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={cardForm.description}
                  onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                  placeholder="Caption or description (e.g. Needs 2mm moissanite)..."
                  rows={2}
                  className="w-full px-3 py-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reference Image *
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-500/20 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-500/30 cursor-pointer"
                />
                {refImageFile && (
                  <p className="text-xs text-emerald-600 mt-2">✓ Image cropped and ready</p>
                )}
              </div>
              <button
                type="submit"
                disabled={creating || !refImageFile}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Design
              </button>
            </form>

            {/* Cropper Modal Overlay */}
            {showCropper && imageSrc && (
              <div className="absolute inset-0 z-50 bg-white dark:bg-[#0c0e1a] rounded-t-2xl sm:rounded-2xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Crop Image</h3>
                  <button onClick={() => setShowCropper(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative flex-1 bg-slate-100 dark:bg-black rounded-xl overflow-hidden min-h-[300px]">
                  <Cropper
                    image={imageSrc}
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
                  disabled={isCropping}
                  className="w-full mt-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition flex justify-center items-center gap-2"
                >
                  {isCropping ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Crop"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Design Card Modal */}
      {selectedCard && (
        <DesignCardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onCardUpdate={handleCardUpdate}
          isArchived={isArchived}
        />
      )}
    </div>
  );
}
