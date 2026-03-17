"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { pipelinesAPI, designCardsAPI, authAPI } from "@/lib/api";
import DesignCardGrid, { DesignCard } from "@/components/DesignCardGrid";
import DesignCardModal from "@/components/DesignCardModal";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Loader2,
  X,
  Archive,
  Layers,
  Trash2,
} from "lucide-react";

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
    assigned_designer_id: "",
  });
  const [refImageFile, setRefImageFile] = useState<File | null>(null);

  const canCreate = user?.role === "owner" || user?.role === "superadmin";
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
    if (!cardForm.title.trim()) return;
    setCreating(true);

    try {
      const formData = new FormData();
      formData.append("pipeline_id", pipelineId);
      formData.append("title", cardForm.title.trim());
      if (cardForm.assigned_designer_id) {
        formData.append("assigned_designer_id", cardForm.assigned_designer_id);
      }
      if (refImageFile) {
        formData.append("reference_image", refImageFile);
      }

      const res = await designCardsAPI.create(formData);
      setCards((prev) => [...prev, res.data.card]);
      setShowCreate(false);
      setCardForm({ title: "", assigned_designer_id: "" });
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
        <div className="hidden sm:flex gap-2 mb-6 ml-12">
          {isArchived ? (
            <>
              <button
                onClick={handleUnarchive}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-xs text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 transition"
              >
                <Archive className="w-3.5 h-3.5" />
                Unarchive
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 hover:bg-rose-100 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleArchive}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
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
                  Design Title *
                </label>
                <input
                  type="text"
                  value={cardForm.title}
                  onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
                  placeholder="e.g. Diamond Pendant #42"
                  className="w-full px-3 py-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reference Image
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => setRefImageFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-500/20 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-500/30 cursor-pointer"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !cardForm.title.trim()}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Design
              </button>
            </form>
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
