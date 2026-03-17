"use client";

import { useEffect, useState } from "react";
import { authAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  UserPlus,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Users,
  Mail,
  Shield,
  Trash2,
  Search,
  X,
  Plus,
  Calendar,
  Crown,
  Palette,
  Briefcase,
} from "lucide-react";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Crown; description: string }
> = {
  superadmin: {
    label: "Superadmin",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    icon: Crown,
    description: "System Control",
  },
  owner: {
    label: "Owner",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
    icon: Shield,
    description: "Full Management",
  },
  designer: {
    label: "Designer",
    color:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
    icon: Palette,
    description: "CAD & Models",
  },
  staff: {
    label: "Staff",
    color:
      "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
    icon: Briefcase,
    description: "Sales & Ops",
  },
};

export default function UsersManagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await authAPI.listUsers();
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await authAPI.register(form);
      setSuccess(true);
      setForm({ name: "", email: "", password: "", role: "staff" });
      setTimeout(() => setSuccess(false), 3000);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${name}? This will permanently remove their access.`,
      )
    ) {
      return;
    }

    try {
      await authAPI.deleteUser(id);
      fetchUsers();
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete user. They might have active dependencies.");
      setTimeout(() => setError(""), 4000);
    }
  };

  if (user?.role !== "superadmin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-full">
          <ShieldAlert className="w-12 h-12 text-rose-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Access Denied
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            You do not have permission to access the User Management dashboard.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  // Role stats
  const roleCounts = {
    total: users.length,
    designer: users.filter((u) => u.role === "designer").length,
    staff: users.filter((u) => u.role === "staff").length,
    owner: users.filter((u) => u.role === "owner").length,
    superadmin: users.filter((u) => u.role === "superadmin").length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Team
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {roleCounts.total} member{roleCounts.total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Desktop Add Button */}
        <button
          onClick={() => setShowCreate(true)}
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Role Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Designers",
            count: roleCounts.designer,
            icon: Palette,
            color: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-50 dark:bg-indigo-500/10",
          },
          {
            label: "Staff",
            count: roleCounts.staff,
            icon: Briefcase,
            color: "text-slate-600 dark:text-slate-400",
            bg: "bg-slate-100 dark:bg-white/5",
          },
          {
            label: "Owners",
            count: roleCounts.owner,
            icon: Shield,
            color: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-500/10",
          },
          {
            label: "Admins",
            count: roleCounts.superadmin,
            icon: Crown,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-500/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#12142a]/80 border border-slate-200 dark:border-white/6 rounded-xl p-4 flex items-center gap-3"
          >
            <div
              className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}
            >
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {stat.count}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-[#0f1120] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Error Toast */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError("")}
            className="shrink-0 hover:text-rose-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Cards Grid */}
      {usersLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-500 dark:text-slate-400">
            {search ? "No users match your search" : "No team members yet"}
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            {search ? "Try a different search term" : "Add your first team member to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const isSelf = u.id === user?.id;
            const roleConfig = ROLE_CONFIG[u.role] || ROLE_CONFIG.staff;
            const RoleIcon = roleConfig.icon;

            return (
              <div
                key={u.id}
                className={`bg-white dark:bg-[#0f1120] border rounded-2xl overflow-hidden transition-all ${
                  isSelf
                    ? "border-indigo-200 dark:border-indigo-500/30 ring-1 ring-indigo-100 dark:ring-indigo-500/10"
                    : "border-slate-200 dark:border-white/10 hover:shadow-md hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="p-5">
                  {/* Top row: Avatar + Role badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold ${
                          isSelf
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                            : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400"
                        }`}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {u.name}
                          </h3>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Role + Date row */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${roleConfig.color}`}
                    >
                      <RoleIcon className="w-3 h-3" />
                      {roleConfig.label}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Action footer — only for non-self users */}
                {!isSelf && (
                  <div className="px-5 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                    <button
                      onClick={() => handleDelete(u.id, u.name)}
                      className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove access
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-24 right-5 z-40 sm:hidden w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowCreate(false);
              setError("");
            }}
          />
          <div className="relative bg-white dark:bg-[#0c0e1a] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 fade-in duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add Team Member
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setError("");
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5">
              {error && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  User created successfully!
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                      placeholder="e.g. Jane Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                      placeholder="jane@aurorajewel.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setForm({ ...form, role: key })}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-all ${
                            form.role === key
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-500/20"
                              : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 ${
                              form.role === key
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-slate-400"
                            }`}
                          />
                          <div>
                            <p
                              className={`font-semibold text-xs ${
                                form.role === key
                                  ? "text-indigo-700 dark:text-indigo-400"
                                  : "text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {config.label}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {config.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 mt-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UserPlus className="w-5 h-5" />
                  )}
                  Create Account
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
