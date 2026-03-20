"use client";

import { useState, useEffect, useRef } from "react";
import { commentsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Send, Loader2, MessageCircle } from "lucide-react";

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  user: { id: string; name: string; role: string };
}

interface CommentThreadProps {
  designCardId: string;
  section: "reference" | "cad" | "final";
}

export default function CommentThread({ designCardId, section }: CommentThreadProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getPrefix = () => {
    if (section === "reference") return "[REF]";
    if (section === "cad") return "[CAD]";
    return "[FINAL]";
  };

  const fetchComments = async () => {
    try {
      const res = await commentsAPI.list(designCardId);
      const allComments: Comment[] = res.data.comments || [];
      const prefix = getPrefix();
      
      // Filter logic:
      // If reference section, show [REF] comments AND legacy comments (no prefix)
      // Otherwise, strictly match the prefix.
      const filtered = allComments.filter(c => {
        if (c.comment_text.startsWith(prefix)) return true;
        if (section === "reference" && !c.comment_text.startsWith("[")) return true;
        return false;
      }).map(c => ({
        ...c,
        comment_text: c.comment_text.startsWith(prefix) 
          ? c.comment_text.slice(prefix.length).trim() 
          : c.comment_text
      }));

      setComments(filtered);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [designCardId, section]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const payloadText = `${getPrefix()} ${text.trim()}`;
      const res = await commentsAPI.create(designCardId, payloadText);
      
      const newComment = res.data.comment;
      newComment.comment_text = text.trim(); // strip for UI

      setComments((prev) => [...prev, newComment]);
      setText("");
    } catch (err) {
      console.error("Failed to send comment:", err);
    } finally {
      setSending(false);
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case "owner": return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
      case "superadmin": return "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400";
      case "designer": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
      case "staff": return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/10">
        <MessageCircle className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Comments ({comments.length})
        </span>
      </div>

      {/* Thread */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No comments yet. Start the conversation!
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className={`flex flex-col gap-1 ${c.user.id === user?.id ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {c.user.name}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${roleColor(c.user.role)}`}>
                  {c.user.role}
                </span>
              </div>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  c.user.id === user?.id
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 rounded-bl-sm"
                }`}
              >
                {c.comment_text}
              </div>
              <span className="text-[10px] text-slate-400">
                {new Date(c.created_at).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 border-t border-slate-200 dark:border-white/10"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
