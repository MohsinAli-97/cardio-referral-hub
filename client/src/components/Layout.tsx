// NHC Cardio Referral Hub — Sidebar Layout
// Dark navy sidebar matching NHC branding with upload capability

import { useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, FileText, Receipt,
  Activity, ChevronLeft, ChevronRight, RefreshCw,
  Menu, Upload, X, FileSpreadsheet, CheckCircle2,
  Shield, PoundSterling, Settings2,
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/referrals', label: 'Referrals', icon: Activity },
  { path: '/reports', label: 'Revenue Reports', icon: FileText },
  { path: '/insurance-fees', label: 'Reporting Fees', icon: PoundSterling },
  { path: '/insurance-analysis', label: 'Insurance Analysis', icon: Shield },
  { path: '/invoices', label: 'Invoices', icon: Receipt },
  { path: '/pricing', label: 'Pricing', icon: Settings2 },
  { path: '/clinicians', label: 'Clinicians', icon: Users },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [location] = useLocation();
  const { lastUpdated, reload, loading, fileName, uploadFile, clearUpload } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const isExcel = validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!isExcel) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    try {
      await uploadFile(file);
      setShowUploadModal(false);
      toast.success(`Data updated from "${file.name}"`, {
        description: 'All reports and dashboards have been refreshed.',
      });
    } catch {
      toast.error('Failed to process the file. Please check the format.');
    }
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Global drag overlay */}
      {isDragging && (
        <div
          className="fixed inset-0 z-[100] bg-[#1a202c]/80 backdrop-blur-sm flex items-center justify-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="bg-white rounded-2xl p-12 shadow-2xl text-center max-w-md mx-4">
            <div className="w-20 h-20 rounded-full bg-[#924055]/10 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-10 h-10 text-[#924055]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1a202c] mb-2" style={{ fontFamily: "'Tenor Sans', serif" }}>
              Drop Excel File Here
            </h3>
            <p className="text-sm text-gray-500">
              Release to upload and refresh all data
            </p>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
          <div
            className="bg-card rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Tenor Sans', serif" }}>
                Upload Spreadsheet
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {/* Current file info */}
              {fileName && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-[#2d8a4e] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Current data source</p>
                    <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
                  </div>
                  {fileName !== 'Default dataset' && (
                    <button
                      onClick={async () => {
                        clearUpload();
                        setShowUploadModal(false);
                        toast.info('Reverted to default dataset');
                      }}
                      className="text-xs text-[#924055] hover:underline shrink-0"
                    >
                      Revert
                    </button>
                  )}
                </div>
              )}

              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-[#924055]/40 hover:bg-[#924055]/5 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="w-14 h-14 rounded-full bg-[#1a202c]/10 flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-7 h-7 text-[#1a202c]" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Click to browse or drag & drop
                </p>
                <p className="text-xs text-muted-foreground">
                  Upload your updated Excel spreadsheet (.xlsx)
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-3">
                  The file should match the same format as the original spreadsheet with Referrals, Contact details, and Self-funding prices sheets
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
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

          {/* Upload button in nav */}
          <div className="pt-2 mt-2 border-t border-sidebar-border">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full
                text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground
                transition-all duration-200"
            >
              <Upload className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">Upload Data</span>
              )}
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-sidebar-border shrink-0">
          {!collapsed && lastUpdated && (
            <div className="px-1 mb-2">
              <p className="text-[11px] text-sidebar-foreground/40">
                Data: {format(lastUpdated, 'dd MMM yyyy, HH:mm')}
              </p>
              {fileName && fileName !== 'Default dataset' && (
                <p className="text-[10px] text-sidebar-foreground/30 truncate mt-0.5" title={fileName}>
                  Source: {fileName}
                </p>
              )}
            </div>
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
      <div
        className="flex-1 flex flex-col overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
          }
        }}
      >
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-sm font-semibold" style={{ fontFamily: "'Tenor Sans', serif" }}>
              NHC Referral Hub
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
