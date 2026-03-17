"use client";

import { useEffect, useState } from "react";
import { leadsAPI } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import {
  Instagram,
  Plus,
  X,
  Loader2,
  ChevronDown,
  MessageSquare,
  Clock,
  Search,
} from "lucide-react";

interface Lead {
  id: string;
  instagram_username: string;
  message_count: number;
  interest_level: string;
  product_asked: string | null;
  price_given: number | null;
  status: string;
  first_message_time: string;
  last_message_time: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState({ status: "", interest_level: "" });
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    instagram_username: "",
    message_count: "",
    product_asked: "",
    price_given: "",
    status: "new",
  });

  const fetchLeads = async () => {
    try {
      const params: Record<string, string> = {};
      if (filter.status) params.status = filter.status;
      if (filter.interest_level) params.interest_level = filter.interest_level;
      const res = await leadsAPI.list(params);
      setLeads(res.data.leads || []);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await leadsAPI.create({
        instagram_username: form.instagram_username,
        message_count: parseInt(form.message_count) || 0,
        product_asked: form.product_asked || null,
        price_given: form.price_given ? parseFloat(form.price_given) : null,
        status: form.status,
      });
      setShowAdd(false);
      setForm({
        instagram_username: "",
        message_count: "",
        product_asked: "",
        price_given: "",
        status: "new",
      });
      fetchLeads();
    } catch (err) {
      console.error("Add lead failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await leadsAPI.update(id, { status: newStatus });
      fetchLeads();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const filteredLeads = leads.filter((lead) =>
    lead.instagram_username.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Instagram className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Instagram Leads
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track and manage customer inquiries from Instagram DMs
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#12142a] border border-slate-200 dark:border-white/6 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-[#12142a] border border-slate-200 dark:border-white/6 rounded-xl text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-colors focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="interested">Interested</option>
            <option value="ghosted">Ghosted</option>
            <option value="bought">Bought</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filter.interest_level}
            onChange={(e) =>
              setFilter({ ...filter, interest_level: e.target.value })
            }
            className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-[#12142a] border border-slate-200 dark:border-white/6 rounded-xl text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-colors focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Interest</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Leads */}
      {loading ? (
        <div className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-8 animate-pulse h-96 shadow-sm" />
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-16">
          <Instagram className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No leads found</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-400">
                      {lead.instagram_username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        @{lead.instagram_username}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <MessageSquare className="w-3 h-3" />
                          {lead.message_count} msgs
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(lead.last_message_time).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={lead.interest_level} type="interest" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/6">
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    {lead.product_asked && <p>Product: <span className="text-slate-700 dark:text-slate-300">{lead.product_asked}</span></p>}
                    {lead.price_given != null && <p>Price: <span className="text-slate-700 dark:text-slate-300">₹{lead.price_given.toLocaleString()}</span></p>}
                  </div>
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    className="bg-white dark:bg-[#080a16] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="new">New</option>
                    <option value="interested">Interested</option>
                    <option value="ghosted">Ghosted</option>
                    <option value="bought">Bought</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-[#12142a]/80 rounded-2xl border border-slate-200 dark:border-white/6 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/6 bg-slate-50/50 dark:bg-white/5">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Messages
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Interest
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Price Given
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-slate-100 dark:border-white/6 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-400">
                            {lead.instagram_username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            @{lead.instagram_username}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5  text-sm text-slate-600 dark:text-slate-400">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          {lead.message_count}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={lead.interest_level}
                          type="interest"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {lead.product_asked || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {lead.price_given
                          ? `₹${lead.price_given.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            handleStatusChange(lead.id, e.target.value)
                          }
                          className="bg-transparent border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="new">New</option>
                          <option value="interested">Interested</option>
                          <option value="ghosted">Ghosted</option>
                          <option value="bought">Bought</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(lead.last_message_time).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Lead Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12142a] rounded-2xl border border-slate-200 dark:border-white/6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Add New Lead
              </h2>
              <button
                onClick={() => setShowAdd(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Instagram Username *
                </label>
                <input
                  type="text"
                  value={form.instagram_username}
                  onChange={(e) =>
                    setForm({ ...form, instagram_username: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-[#080a16] border border-slate-200 dark:border-white/6 rounded-xl text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 text-sm transition-colors"
                  placeholder="username"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Message Count
                  </label>
                  <input
                    type="number"
                    value={form.message_count}
                    onChange={(e) =>
                      setForm({ ...form, message_count: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white dark:bg-[#080a16] border border-slate-200 dark:border-white/6 rounded-xl text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 text-sm transition-colors"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white dark:bg-[#080a16] border border-slate-200 dark:border-white/6 rounded-xl text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 text-sm transition-colors"
                  >
                    <option value="new">New</option>
                    <option value="interested">Interested</option>
                    <option value="ghosted">Ghosted</option>
                    <option value="bought">Bought</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Product Asked
                </label>
                <input
                  type="text"
                  value={form.product_asked}
                  onChange={(e) =>
                    setForm({ ...form, product_asked: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-[#080a16] border border-slate-200 dark:border-white/6 rounded-xl text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 text-sm transition-colors"
                  placeholder="e.g. Silver Ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Price Given (₹)
                </label>
                <input
                  type="number"
                  value={form.price_given}
                  onChange={(e) =>
                    setForm({ ...form, price_given: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-[#080a16] border border-slate-200 dark:border-white/6 rounded-xl text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 text-sm transition-colors"
                  placeholder="0"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Lead"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
