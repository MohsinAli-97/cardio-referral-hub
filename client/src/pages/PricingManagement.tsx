// Pricing Management — Editable reporting fees and self-pay pricing
// Design: NHC branding — dark navy headers, burgundy accents, inline editing
import { useState, useRef, useEffect, useMemo } from 'react';
import { usePricing } from '@/contexts/PricingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  PoundSterling, Search, Plus, Trash2, RotateCcw,
  Settings2, Building2, TestTube, Save, Pencil, Check, X, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';

// ─── Inline Editable Cell ───
function EditableCell({
  value,
  onChange,
  className = '',
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const num = parseFloat(draft);
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    } else {
      setDraft(String(value));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-xs">£</span>
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); }
          }}
          className="w-16 px-1.5 py-0.5 text-sm text-center border border-[#924055] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#924055] tabular-nums"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`group inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[#924055]/10 transition-colors tabular-nums text-sm ${className}`}
      title="Click to edit"
    >
      £{value}
      <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
    </button>
  );
}

// ─── Editable Insurer Header ───
function EditableInsurerHeader({
  label,
  insurerKey,
  onRename,
  onRemove,
  isCustom,
}: {
  label: string;
  insurerKey: string;
  onRename: (key: string, newLabel: string) => void;
  onRemove: (key: string) => void;
  isCustom: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) {
      onRename(insurerKey, trimmed);
    } else {
      setDraft(label);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setDraft(label); setEditing(false); }
          }}
          className="w-20 px-1.5 py-0.5 text-xs text-center border border-white/40 rounded bg-white/10 text-white focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`cursor-pointer hover:underline ${isCustom ? 'text-amber-200' : ''}`}
        onClick={() => isCustom && setEditing(true)}
        title={isCustom ? 'Click to rename' : ''}
      >
        {label}
      </span>
      {isCustom && (
        <button
          onClick={() => onRemove(insurerKey)}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/30 transition-all"
          title="Remove insurer"
        >
          <Trash2 className="w-3 h-3 text-red-300" />
        </button>
      )}
    </div>
  );
}

export default function PricingManagement() {
  const {
    insurers, tests,
    updateFee, updatePatientCost,
    addInsurer, removeInsurer, renameInsurer,
    addTest, removeTest, renameTest,
    resetToDefaults,
  } = usePricing();

  const [search, setSearch] = useState('');
  const [showAddInsurer, setShowAddInsurer] = useState(false);
  const [showAddTest, setShowAddTest] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newInsurerName, setNewInsurerName] = useState('');
  const [newTestName, setNewTestName] = useState('');
  const [editingTestName, setEditingTestName] = useState<string | null>(null);
  const [testNameDraft, setTestNameDraft] = useState('');
  const testNameInputRef = useRef<HTMLInputElement>(null);

  const filteredTests = useMemo(() => {
    if (!search) return tests;
    const q = search.toLowerCase();
    return tests.filter(t => t.test.toLowerCase().includes(q));
  }, [tests, search]);

  // Calculate totals per insurer
  const insurerTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const ins of insurers) {
      totals[ins.key] = tests.reduce((sum, t) => sum + (t.fees[ins.key] ?? 0), 0);
    }
    return totals;
  }, [insurers, tests]);

  const totalPatientCost = useMemo(() =>
    tests.reduce((sum, t) => sum + t.patientCost, 0),
  [tests]);

  const handleAddInsurer = () => {
    const trimmed = newInsurerName.trim();
    if (!trimmed) {
      toast.error('Please enter an insurer name');
      return;
    }
    if (insurers.some(i => i.label.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('This insurer already exists');
      return;
    }
    addInsurer(trimmed);
    setNewInsurerName('');
    setShowAddInsurer(false);
    toast.success(`Added "${trimmed}" as a new insurance provider`);
  };

  const handleAddTest = () => {
    const trimmed = newTestName.trim();
    if (!trimmed) {
      toast.error('Please enter a test name');
      return;
    }
    if (tests.some(t => t.test.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('This test already exists');
      return;
    }
    addTest(trimmed);
    setNewTestName('');
    setShowAddTest(false);
    toast.success(`Added "${trimmed}" as a new test type`);
  };

  const handleRemoveInsurer = (key: string) => {
    const ins = insurers.find(i => i.key === key);
    removeInsurer(key);
    toast.success(`Removed "${ins?.label || key}"`);
  };

  const handleRemoveTest = (testName: string) => {
    removeTest(testName);
    toast.success(`Removed "${testName}"`);
  };

  const handleReset = () => {
    resetToDefaults();
    setShowResetConfirm(false);
    toast.success('Pricing reset to NHC brochure defaults');
  };

  const startEditTestName = (testName: string) => {
    setEditingTestName(testName);
    setTestNameDraft(testName);
    setTimeout(() => testNameInputRef.current?.focus(), 50);
  };

  const commitTestNameEdit = () => {
    if (editingTestName && testNameDraft.trim() && testNameDraft.trim() !== editingTestName) {
      renameTest(editingTestName, testNameDraft.trim());
      toast.success(`Renamed to "${testNameDraft.trim()}"`);
    }
    setEditingTestName(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight font-[Tenor_Sans,serif] text-[#1e2a3a]">
            Pricing Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure reporting fees for each insurance provider and self-pay pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowResetConfirm(true)}
            variant="outline"
            className="gap-2 text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Defaults
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-l-4 border-l-[#1e2a3a] bg-[#1e2a3a]/5">
        <CardContent className="py-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-[#1e2a3a] mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How to Use This Page</p>
            <p>
              Click any fee amount to edit it inline. Changes are saved automatically and will immediately
              update all revenue calculations, reports, and invoices across the app. You can add new insurance
              providers or test types using the buttons below. Use "Reset Defaults" to revert to the original
              NHC brochure pricing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => setShowAddInsurer(true)}
          variant="outline"
          className="gap-2"
        >
          <Building2 className="h-4 w-4" />
          Add Insurer
        </Button>
        <Button
          onClick={() => setShowAddTest(true)}
          variant="outline"
          className="gap-2"
        >
          <TestTube className="h-4 w-4" />
          Add Test
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-[#1e2a3a] to-[#2a3a4e] text-white">
          <CardContent className="py-4">
            <p className="text-xs text-white/60 uppercase tracking-wider">Insurance Providers</p>
            <p className="text-2xl font-bold mt-1">{insurers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#924055] to-[#b05068] text-white">
          <CardContent className="py-4">
            <p className="text-xs text-white/60 uppercase tracking-wider">Test Types</p>
            <p className="text-2xl font-bold mt-1">{tests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Fee / Test</p>
            <p className="text-2xl font-bold mt-1 text-[#1e2a3a]">
              £{tests.length > 0 ? Math.round(
                tests.reduce((sum, t) => {
                  const feeValues = Object.values(t.fees);
                  return sum + (feeValues.length > 0 ? feeValues.reduce((a, b) => a + b, 0) / feeValues.length : 0);
                }, 0) / tests.length
              ) : 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Highest Fee</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">
              £{Math.max(...tests.flatMap(t => Object.values(t.fees)), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Patient Cost</p>
            <p className="text-2xl font-bold mt-1 text-[#924055]">
              £{tests.length > 0 ? Math.round(totalPatientCost / tests.length) : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Editable Fee Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5 text-[#924055]" />
            Fee Schedule
            <span className="text-xs font-normal text-muted-foreground ml-2">
              (click any value to edit)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1e2a3a] text-white">
                  <th className="text-left py-3 px-4 font-semibold sticky left-0 bg-[#1e2a3a] z-10 min-w-[220px]">
                    Test
                  </th>
                  {insurers.map((ins) => {
                    const isCustom = ins.key.startsWith('custom_');
                    return (
                      <th
                        key={ins.key}
                        className="text-center py-3 px-3 font-semibold whitespace-nowrap group relative min-w-[100px]"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={isCustom ? 'text-amber-200' : ''}>
                            {ins.label}
                          </span>
                          {isCustom && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                onClick={() => {
                                  const newName = prompt('Rename insurer:', ins.label);
                                  if (newName?.trim()) renameInsurer(ins.key, newName.trim());
                                }}
                                className="p-0.5 rounded hover:bg-white/20 transition-colors"
                                title="Rename"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleRemoveInsurer(ins.key)}
                                className="p-0.5 rounded hover:bg-red-500/30 transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="w-3 h-3 text-red-300" />
                              </button>
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="text-center py-3 px-3 font-semibold whitespace-nowrap bg-[#924055]/80 min-w-[120px]">
                    Patient Cost
                  </th>
                  <th className="text-center py-3 px-3 font-semibold whitespace-nowrap w-[60px]">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((row, i) => (
                  <tr
                    key={row.test}
                    className={`border-b border-border/50 transition-colors hover:bg-muted/50 ${
                      i % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                    }`}
                  >
                    <td className={`py-2 px-4 font-medium sticky left-0 z-10 ${
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}>
                      {editingTestName === row.test ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={testNameInputRef}
                            type="text"
                            value={testNameDraft}
                            onChange={(e) => setTestNameDraft(e.target.value)}
                            onBlur={commitTestNameEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitTestNameEdit();
                              if (e.key === 'Escape') setEditingTestName(null);
                            }}
                            className="w-full px-2 py-1 text-sm border border-[#924055] rounded focus:outline-none focus:ring-1 focus:ring-[#924055]"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group/name">
                          <span>{row.test}</span>
                          <button
                            onClick={() => startEditTestName(row.test)}
                            className="opacity-0 group-hover/name:opacity-100 p-0.5 rounded hover:bg-muted transition-all"
                            title="Rename test"
                          >
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </td>
                    {insurers.map((ins) => (
                      <td key={ins.key} className="text-center py-1 px-1">
                        <EditableCell
                          value={row.fees[ins.key] ?? 0}
                          onChange={(v) => updateFee(row.test, ins.key, v)}
                        />
                      </td>
                    ))}
                    <td className="text-center py-1 px-1 bg-[#924055]/5">
                      <EditableCell
                        value={row.patientCost}
                        onChange={(v) => updatePatientCost(row.test, v)}
                        className="font-semibold text-[#924055]"
                      />
                    </td>
                    <td className="text-center py-1 px-2">
                      <button
                        onClick={() => handleRemoveTest(row.test)}
                        className="p-1.5 rounded hover:bg-red-50 text-muted-foreground/40 hover:text-red-500 transition-colors"
                        title="Remove test"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-muted/60 border-t-2 border-border font-semibold">
                  <td className="py-3 px-4 sticky left-0 bg-muted/60 z-10">
                    Total ({tests.length} tests)
                  </td>
                  {insurers.map((ins) => (
                    <td key={ins.key} className="text-center py-3 px-3 tabular-nums">
                      £{insurerTotals[ins.key] ?? 0}
                    </td>
                  ))}
                  <td className="text-center py-3 px-3 tabular-nums text-[#924055]">
                    £{totalPatientCost}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground px-1">
        <div className="flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5" />
          <span>Click any value to edit inline</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-500 font-semibold text-xs">Custom</span>
          <span>Custom-added insurers (can be renamed/removed)</span>
        </div>
        <div className="flex items-center gap-2">
          <Save className="w-3.5 h-3.5" />
          <span>All changes save automatically</span>
        </div>
      </div>

      {/* ─── Add Insurer Dialog ─── */}
      <Dialog open={showAddInsurer} onOpenChange={setShowAddInsurer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#924055]" />
              Add Insurance Provider
            </DialogTitle>
            <DialogDescription>
              Add a new insurance company. A column will be created in the fee schedule with all fees set to £0.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g. Exeter, Freedom Health..."
              value={newInsurerName}
              onChange={(e) => setNewInsurerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddInsurer()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddInsurer(false)}>Cancel</Button>
            <Button onClick={handleAddInsurer} className="bg-[#924055] hover:bg-[#7a3548] text-white gap-2">
              <Plus className="h-4 w-4" />
              Add Insurer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Test Dialog ─── */}
      <Dialog open={showAddTest} onOpenChange={setShowAddTest}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-[#924055]" />
              Add Test Type
            </DialogTitle>
            <DialogDescription>
              Add a new test type. A row will be created in the fee schedule with all fees set to £0.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g. CT Coronary Angiogram, Stress MRI..."
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTest()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTest(false)}>Cancel</Button>
            <Button onClick={handleAddTest} className="bg-[#924055] hover:bg-[#7a3548] text-white gap-2">
              <Plus className="h-4 w-4" />
              Add Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reset Confirmation Dialog ─── */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Reset to Defaults?
            </DialogTitle>
            <DialogDescription>
              This will revert all pricing to the original NHC brochure values. Any custom insurers, tests, or fee changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
            <Button onClick={handleReset} variant="destructive" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset All Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
