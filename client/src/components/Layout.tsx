// NHC Cardio Referral Hub — Sidebar Layout
// Dark navy sidebar matching NHC branding with Tenor Sans headings

import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, FileText, Receipt,
  Activity, ChevronLeft, ChevronRight, RefreshCw,
  Menu, X
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/referrals', label: 'Referrals', icon: Activity },
  { path: '/reports', label: 'Revenue Reports', icon: FileText },
  { path: '/invoices', label: 'Invoices', icon: Receipt },
  { path: '/clinicians', label: 'Clinicians', icon: Users },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { lastUpdated, reload, loading } = useData();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 h-full flex flex-col
          bg-sidebar text-sidebar-foreground
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-[260px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold tracking-wide truncate" style={{ fontFamily: "'Tenor Sans', serif" }}>
                NHC Referral Hub
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">
                Complete Cardiac Care
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-all duration-200 group
                    ${isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }
                  `}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-sidebar-primary' : ''}`} />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-sidebar-border shrink-0">
          {!collapsed && lastUpdated && (
            <p className="text-[11px] text-sidebar-foreground/40 mb-2 px-1">
              Data: {format(lastUpdated, 'dd MMM yyyy, HH:mm')}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={reload}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs
                text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50
                transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {!collapsed && 'Refresh'}
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto p-1.5 rounded-md text-sidebar-foreground/40
                hover:text-sidebar-foreground hover:bg-sidebar-accent/50
                transition-colors hidden lg:flex"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b bg-card shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold" style={{ fontFamily: "'Tenor Sans', serif" }}>
            NHC Referral Hub
          </p>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
