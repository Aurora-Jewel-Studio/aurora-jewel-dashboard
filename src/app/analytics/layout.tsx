"use client";

import { AuthProvider } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-slate-50 dark:bg-[#080a16]">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}
