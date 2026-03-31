"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, User } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Palette,
  Layers,
  Instagram,
  BarChart3,
  LogOut,
  Menu,
  X,
  Users,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Financial Automation",
    href: "/price-converter",
    icon: FileSpreadsheet,
    roles: ["owner", "superadmin"],
  },
  {
    name: "Design Hub",
    href: "/pipelines",
    icon: Layers,
    roles: ["owner", "superadmin", "staff", "designer"],
  },
  {
    name: "Instagram Leads",
    href: "/leads",
    icon: Instagram,
    roles: ["owner", "staff"],
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["owner", "staff", "superadmin"],
  },
  {
    name: "User Management",
    href: "/dashboard/users",
    icon: Users,
    roles: ["superadmin"],
  },
];

interface SidebarContentProps {
  pathname: string;
  user: User | null;
  logout: () => void;
  filteredNav: NavItem[];
  setMobileOpen: (open: boolean) => void;
}

const SidebarContent = ({
  pathname,
  user,
  logout,
  filteredNav,
  setMobileOpen,
}: SidebarContentProps) => (
  <>
    {/* Logo */}
    <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-200 dark:border-white/6">
      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center bg-white">
        <img 
          src="/Logo green BG.svg" 
          alt="Aurora Jewel Logo" 
          className="w-full h-full object-cover"
        />
      </div>
      <div>
        <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
          Aurora Jewel
        </h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          Studio Platform
        </p>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 px-3 py-4 space-y-1">
      {filteredNav.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
            }`}
          >
            <item.icon
              className={`w-5 h-5 transition-colors ${
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white"
              }`}
            />
            {item.name}
            {isActive && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-sm shadow-indigo-600/50" />
            )}
          </Link>
        );
      })}
    </nav>

    {/* Theme Toggle & User Profile */}
    <div className="px-4 py-4 border-t border-slate-200 dark:border-white/6">
      <div className="mb-2">
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-400">
          {user?.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {user?.name}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
            {user?.role}
          </p>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-all"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  </>
);

interface BottomNavProps {
  pathname: string;
  filteredNav: NavItem[];
  setMobileOpen: (open: boolean) => void;
}

const BottomNav = ({ pathname, filteredNav, setMobileOpen }: BottomNavProps) => (
  <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-white dark:bg-[#080a16] border-t border-slate-200 dark:border-white/6 z-50 lg:hidden flex justify-around items-center px-2 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
    {filteredNav.slice(0, 4).map((item) => {
      const isActive = pathname === item.href;
      return (
        <Link
          key={item.name}
          href={item.href}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <item.icon
            className={`w-5 h-5 ${
              isActive ? "fill-indigo-100 dark:fill-indigo-900/30" : ""
            }`}
          />
          <span className="text-[10px] font-medium text-center leading-none">
            {item.name.split(" ")[0]}
          </span>
        </Link>
      );
    })}
    {/* Mobile More/Menu button for items that didn't fit */}
    <button
      onClick={() => setMobileOpen(true)}
      className="flex flex-col items-center justify-center w-full h-full gap-1 transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
    >
      <Menu className="w-5 h-5" />
      <span className="text-[10px] font-medium text-center leading-none">
        More
      </span>
    </button>
  </div>
);

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navigation.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <>
      {/* Minimal Mobile Top Header */}
      <div className="fixed top-0 left-0 right-0 h-[60px] bg-white/90 dark:bg-[#080a16]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/6 z-40 lg:hidden flex items-center justify-center px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 bg-white">
            <img 
              src="/Logo green BG.svg" 
              alt="Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">
            Aurora Jewel
          </h1>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        pathname={pathname}
        filteredNav={filteredNav}
        setMobileOpen={setMobileOpen}
      />

      {/* Mobile "More" Fullscreen Overlay Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-slate-50 dark:bg-[#080a16] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
            <h2 className="text-lg font-bold">Menu</h2>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-full bg-slate-200 dark:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-[90px]">
            <SidebarContent
              pathname={pathname}
              user={user}
              logout={logout}
              filteredNav={filteredNav}
              setMobileOpen={setMobileOpen}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="fixed top-0 left-0 h-screen w-[260px] bg-white dark:bg-[#080a16] border-r border-slate-200 dark:border-white/6 hidden lg:flex flex-col z-50 shadow-sm">
        <SidebarContent
          pathname={pathname}
          user={user}
          logout={logout}
          filteredNav={filteredNav}
          setMobileOpen={setMobileOpen}
        />
      </aside>

      {/* Desktop spacer */}
      <div className="hidden lg:block w-[260px] shrink-0" />
    </>
  );
}
