"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Image as ImageIcon, Users, LogOut, ShieldCheck, User, Settings } from "lucide-react";
import { AuthProvider, useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";
import DateFilter from "../../components/DateFilter";

function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, organization, isLoading, logout, selectedUserId, setSelectedUserId, authHeaders, apiBase, dateRange, setDateRange } = useAuth();
  
  // State for team selection (for MANAGERS only)
  type TeamUser = { id: string; fullName: string; email: string };
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);

  useEffect(() => {
    if (user?.role === "MANAGER" && authHeaders) {
      fetch(`${apiBase}/api/web/users`, { headers: authHeaders, credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setTeamUsers(data.data);
          }
        })
        .catch((err) => console.error("Failed to load team users for dropdown", err));
    }
  }, [user, authHeaders, apiBase]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading Dashboard...</div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!user || !organization) {
    if (typeof window !== "undefined") {
      window.location.href = "/manager/sign-in";
    }
    return null;
  }

  const links = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Screenshots", href: "/dashboard/screenshots", icon: ImageIcon },
    { name: "Team & Invites", href: "/dashboard/team", icon: Users },
    ...(user.role === "MANAGER" ? [{ name: "Settings", href: "/dashboard/settings", icon: Settings }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <ShieldCheck className="h-6 w-6 text-indigo-600 mr-2" />
          <span className="font-bold text-xl text-slate-800">TeamLens</span>
        </div>
        
        <div className="px-4 py-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {organization.name}
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md group transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <link.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center px-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              {user.fullName.charAt(0)}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{user.fullName}</p>
              <p className="text-xs text-slate-500 truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-slate-400 group-hover:text-red-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h1 className="text-xl font-bold text-slate-800">
            {pathname === "/dashboard" ? "Overview" :
             pathname === "/dashboard/calendar" ? "Calendar" :
             pathname === "/dashboard/screenshots" ? "Screenshots" :
             pathname === "/dashboard/team" ? "Team & Invites" :
             pathname === "/dashboard/settings" ? "Settings" : "Dashboard"}
          </h1>
          <div className="flex items-center space-x-3">
            {/* DATE FILTER GLOBALLY APPLIED */}
            <DateFilter value={dateRange} onChange={setDateRange} />

            {/* MANAGER TEAM DROPDOWN */}
            {user.role === "MANAGER" && (
              <div className="flex items-center space-x-2 pl-3 border-l border-slate-200">
              <User className="w-5 h-5 text-slate-400" />
              <select
                className="block w-48 rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value={user.id}>My Data ({user.fullName})</option>
                <optgroup label="Team Members">
                  {teamUsers.filter(u => u.id !== user.id).map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            )}
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SidebarLayout>
        {children}
      </SidebarLayout>
    </AuthProvider>
  );
}
