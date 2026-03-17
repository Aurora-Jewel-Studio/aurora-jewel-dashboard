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
  MoreVertical,
} from "lucide-react";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function UsersManagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");

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
    if (id === user?.id) {
      setError("You cannot delete your own account.");
      return;
    }

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
            Please contact the system administrator if you believe this is an
            error.
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            User Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Provision and manage access for Aurora Jewel Studio staff.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Register Form */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-[#12142a]/80 border border-slate-200 dark:border-white/6 rounded-2xl overflow-hidden shadow-sm sticky top-8">
            <div className="p-6 border-b border-slate-100 dark:border-white/6 bg-slate-50/50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Add New User
                </h2>
              </div>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  User created successfully!
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="w-full pl-11 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                      placeholder="e.g. Jane Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="w-full pl-11 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                      placeholder="jane@aurorajewel.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                    Initial Password
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="w-full pl-11 pr-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                    Access Level
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm appearance-none"
                  >
                    <option value="staff">Staff (Sales/Operations)</option>
                    <option value="designer">Designer (CAD/Models)</option>
                    <option value="owner">Owner (Full Management)</option>
                    <option value="superadmin">
                      Superadmin (System Control)
                    </option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 mt-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UserPlus className="w-5 h-5" />
                  )}
                  Create User Account
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: User Management / Info */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#12142a]/80 border border-slate-200 dark:border-white/6 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-white/6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Active Team Members
              </h2>
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-white/5 text-left">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/6">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto" />
                        <p className="text-slate-500 mt-2 text-sm">
                          Loading users...
                        </p>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Users className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                          No users found.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {u.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                            ${
                              u.role === "superadmin"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                : u.role === "owner"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                                  : u.role === "designer"
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                                    : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(u.id, u.name)}
                              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Access or Note section */}
          <div className="bg-indigo-600 dark:bg-indigo-500/90 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/20">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Information
            </h3>
            <p className="mt-2 text-indigo-100 text-sm leading-relaxed">
              As a superadmin, you are responsible for provisioning accounts.
              Users created here will receive an immediate activation on their
              email. Ensure role assignments are correct as they determine
              access to sensitive financial data and design files.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
