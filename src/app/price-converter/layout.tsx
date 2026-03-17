"use client";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

function PriceConverterGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#080a16]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Role check: only owner and superadmin can access
  if (user?.role !== "owner" && user?.role !== "superadmin") {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-[#080a16]">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
              <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-full">
                <ShieldAlert className="w-12 h-12 text-rose-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Access Restricted
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  The Price Converter is only available to Owners and
                  Superadmins.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#080a16]">
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function PriceConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <PriceConverterGuard>{children}</PriceConverterGuard>
    </AuthProvider>
  );
}
