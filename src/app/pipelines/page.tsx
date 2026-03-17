"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { pipelinesAPI, authAPI } from "@/lib/api";
import Link from "next/link";
import {
  Plus,
  Loader2,
  Layers,
  Archive,
  Calendar,
  Trash2,
  Palette,
  Eye,
  X,
  ChevronRight,
} from "lucide-react";

import StatusBadge from "@/components/StatusBadge";

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  status: string;
  card_count: number;
  created_at: string;
}

export default function PipelinesPage() {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [archivedPipelines, setArchivedPipelines] = useState<Pipeline[]>([]);
  const [allCards, setAllCards] = useState<any[]>([]); // For 'All Designs' grid
  const [viewMode, setViewMode] = useState<"pipelines" | "all_designs">("pipelines");
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const canCreate =
    user?.role === "owner" || user?.role === "superadmin";

  const fetchPipelines = async () => {
    try {
      const res = await pipelinesAPI.list();
      const sorted = (res.data.pipelines || []).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setPipelines(sorted);
    } catch (err) {
      console.error("Failed to fetch pipelines:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchived = async () => {
    try {
      const res = await pipelinesAPI.listArchived();
      setArchivedPipelines(res.data.pipelines || []);
    } catch (err) {
      console.error("Failed to fetch archived:", err);
    }
  };

  const fetchAllCards = async () => {
    try {
      const res = await pipelinesAPI.list(); // Hack to get api route, we need a new route! Actually let's just use `designCardsAPI.list("")` which fetches all without pipeline_id.
      // Wait, designCardsAPI.list requires a string. Let's pass empty string.
      const cardsRes = await fetch("/api/design-cards", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("aurora_token")}`,
        },
      });
      const data = await cardsRes.json();
      const sortedCards = (data.cards || []).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setAllCards(sortedCards);
    } catch (err) {
      console.error("Failed to fetch all cards:", err);
    }
  };

  useEffect(() => {
    fetchPipelines();
    fetchAllCards();
  }, []);

  useEffect(() => {
    if (showArchived) fetchArchived();
  }, [showArchived]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await pipelinesAPI.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      setShowCreate(false);
      setForm({ name: "", description: "" });
      fetchPipelines();
    } catch (err) {
      console.error("Failed to create pipeline:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await pipelinesAPI.archive(id);
      fetchPipelines();
      if (showArchived) fetchArchived();
    } catch (err) {
      console.error("Failed to archive:", err);
    }
  };

  const handleUnarchive = async (id: string) => {
    try {
      await pipelinesAPI.unarchive(id);
      fetchPipelines();
      fetchArchived();
    } catch (err) {
      console.error("Failed to unarchive:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this pipeline and all its design cards? This action cannot be undone.")) {
      return;
    }
    try {
      await pipelinesAPI.delete(id);
      fetchPipelines();
      if (showArchived) fetchArchived();
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Layers className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Design Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your jewellery design pipelines and library
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-slate-100 dark:bg-[#12142a] p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-white/6">
          <button
            onClick={() => setViewMode("pipelines")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "pipelines"
                ? "bg-white dark:bg-[#1b1f3b] text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <Layers className="w-4 h-4" />
            Pipelines
          </button>
          <button
            onClick={() => setViewMode("all_designs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "all_designs"
                ? "bg-white dark:bg-[#1b1f3b] text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <Palette className="w-4 h-4" />
            All Designs
          </button>
        </div>
      </div>

      {viewMode === "pipelines" && (
        <>
          <div className="flex justify-end gap-3 mb-6">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                showArchived
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
              }`}
            >
              <Archive className="w-4 h-4" />
              Archived
            </button>
            {canCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                New Pipeline
              </button>
            )}
          </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white dark:bg-[#0c0e1a] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Create Pipeline
              </h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pipeline Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Spring 2026 Collection"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !form.name.trim()}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Pipeline
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Active Pipelines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {pipelines.map((p) => (
          <Link
            key={p.id}
            href={`/pipelines/${p.id}`}
            className="group block bg-white dark:bg-[#0c0e1a] border border-slate-200 dark:border-white/10 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {p.name}
            </h3>
            {p.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                {p.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>{p.card_count} cards</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(p.created_at).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
        {pipelines.length === 0 && (
          <div className="col-span-full text-center py-16">
            <Layers className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-400 dark:text-slate-500">
              No active pipelines
            </h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              {canCreate
                ? "Create your first pipeline to get started"
                : "No pipelines have been created yet"}
            </p>
          </div>
        )}
      </div>

      {/* Archived Pipelines */}
      {showArchived && (
        <div>
          <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Archived Pipelines
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedPipelines.map((p) => (
              <div
                key={p.id}
                className="group relative block bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-2xl p-5 opacity-70 hover:opacity-100 transition-opacity"
              >
                <Link href={`/pipelines/${p.id}`} className="block mb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                      <Archive className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400 font-medium">
                      Archived
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>{p.card_count} cards</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
                {canCreate && (
                  <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-white/5 mt-3">
                    <button
                      onClick={() => handleUnarchive(p.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-indigo-200 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      <Archive className="w-3 h-3" />
                      Unarchive
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                      title="Delete Permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {archivedPipelines.length === 0 && (
              <p className="text-sm text-slate-400 col-span-full">No archived pipelines</p>
            )}
          </div>
        </div>
      )}
      </>
      )}

      {/* ----------- ALL DESIGNS GRID VIEW ----------- */}
      {viewMode === "all_designs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allCards.map((card) => (
            <Link
              key={card.id}
              href={`/pipelines/${card.pipeline_id}`} // Go to its Kanban board
              className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 overflow-hidden hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md shadow-sm transition-all group block"
            >
              <div className="h-40 bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                {card.reference_image_url || card.final_design_url ? (
                  <img
                    src={(card.final_design_url || card.reference_image_url)!}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Palette className="w-10 h-10 text-slate-300" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <StatusBadge status={card.stage} />
                </div>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {card.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{new Date(card.created_at).toLocaleDateString()}</span>
                  {card.assigned_designer ? (
                    <span className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-[8px] font-bold">
                        {card.assigned_designer.name.charAt(0)}
                      </div>
                      {card.assigned_designer.name}
                    </span>
                  ) : (
                    <span>Unassigned</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {allCards.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Palette className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No design cards found across any pipelines</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
