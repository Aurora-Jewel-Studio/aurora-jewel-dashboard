"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MessageCircle,
  ImageIcon,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";

export interface DesignCard {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  stage: string;
  reference_image_url: string | null;
  cad_file_url: string | null;
  final_design_url: string | null;
  assigned_designer?: { id: string; name: string } | null;
  reference_uploaded_at: string | null;
  cad_uploaded_at: string | null;
  final_uploaded_at: string | null;
  comment_count: number;
  created_at: string;
  updated_at: string;
  [key: string]: string | number | boolean | null | undefined | object;
}

interface DesignCardGridProps {
  cards: DesignCard[];
  onCardClick: (card: DesignCard) => void;
  onStageChange?: (cardId: string, newStage: string) => void;
  userRole?: string;
  isArchived?: boolean;
}

const STAGE_OPTIONS = [
  { id: "reference", label: "Reference", dot: "bg-blue-500" },
  { id: "cad_in_progress", label: "CAD WIP", dot: "bg-amber-500" },
  { id: "cad_uploaded", label: "CAD Done", dot: "bg-purple-500" },
  { id: "final_uploaded", label: "Final", dot: "bg-emerald-500" },
  { id: "completed", label: "Done", dot: "bg-green-500" },
];

const STAGE_COLORS: Record<string, string> = {
  reference: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  cad_in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  cad_uploaded: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  final_uploaded: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
};

const STAGE_LABELS: Record<string, string> = {
  reference: "Reference",
  cad_in_progress: "CAD in Progress",
  cad_uploaded: "CAD Uploaded",
  final_uploaded: "Final Uploaded",
  completed: "Completed",
};

// ——— Stage Dropdown (admin only) ———
function StageDropdown({
  currentStage,
  onStageChange,
  cardId,
}: {
  currentStage: string;
  onStageChange: (cardId: string, newStage: string) => void;
  cardId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${STAGE_COLORS[currentStage] || "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"}`}
      >
        {STAGE_LABELS[currentStage] || currentStage}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white dark:bg-[#12142a] rounded-xl border border-slate-200 dark:border-white/10 shadow-xl py-1 overflow-hidden">
            {STAGE_OPTIONS.map((stage) => (
              <button
                key={stage.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onStageChange(cardId, stage.id);
                  setOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                <span className="flex-1">{stage.label}</span>
                {currentStage === stage.id && (
                  <Check className="w-3.5 h-3.5 text-indigo-500" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ——— Single Design Card ———
function DesignCardItem({
  card,
  onCardClick,
  onStageChange,
  isAdmin,
}: {
  card: DesignCard;
  onCardClick: (card: DesignCard) => void;
  onStageChange?: (cardId: string, newStage: string) => void;
  isAdmin: boolean;
}) {
  // Pick the best image to show
  const imageUrl = card.final_design_url || card.reference_image_url;

  // Progress indicator
  const steps = [
    { done: !!card.reference_image_url, label: "Reference" },
    { done: !!card.cad_file_url, label: "CAD" },
    { done: !!card.final_design_url, label: "Final" },
  ];

  return (
    <div
      onClick={() => onCardClick(card)}
      className="bg-white dark:bg-[#0f1120] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all active:scale-[0.98] group"
    >
      {/* Image */}
      <div className="relative aspect-4/5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={card.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-slate-200 dark:text-slate-700" />
          </div>
        )}

        {/* Stage badge (top-right) */}
        <div className="absolute top-2.5 right-2.5">
          {isAdmin && onStageChange ? (
            <StageDropdown
              currentStage={card.stage}
              onStageChange={onStageChange}
              cardId={card.id}
            />
          ) : (
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${STAGE_COLORS[card.stage] || "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"}`}>
              {STAGE_LABELS[card.stage] || card.stage}
            </span>
          )}
        </div>

        {/* Comment count badge */}
        {card.comment_count > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-white text-[9px] font-medium">
            <MessageCircle className="w-2.5 h-2.5" />
            {card.comment_count}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-2.5">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
          {card.title}
        </h3>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  step.done
                    ? "bg-emerald-500"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
              <span
                className={`text-[9px] font-medium ${
                  step.done
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Designer + date */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
          {card.assigned_designer ? (
            <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
              <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                <span className="text-[8px] font-bold text-indigo-700 dark:text-indigo-400">
                  {card.assigned_designer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              {card.assigned_designer.name}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Unassigned</span>
          )}
          <span className="text-[9px] text-slate-400">
            {new Date(card.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ——— Main Grid ———
export default function DesignCardGrid({
  cards,
  onCardClick,
  onStageChange,
  userRole,
  isArchived,
}: DesignCardGridProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = userRole === "owner" || userRole === "superadmin";

  // Filter and sort cards
  const filteredCards = cards
    .filter((card) => {
      return (
        !searchQuery ||
        card.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div>
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search designs..."
          className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-[#0f1120] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
        {filteredCards.map((card) => (
          <DesignCardItem
            key={card.id}
            card={card}
            onCardClick={onCardClick}
            onStageChange={isAdmin && !isArchived ? onStageChange : undefined}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredCards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-500 dark:text-slate-400">
            {searchQuery ? "No designs match your search" : "No designs yet"}
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            {searchQuery
              ? "Try a different search term"
              : "Add your first design to get started"}
          </p>
        </div>
      )}
    </div>
  );
}
