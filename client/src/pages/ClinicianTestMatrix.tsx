// Clinician Test Matrix — Which clinician orders which tests
// Shows test counts, percentages, and highlights gaps (tests NOT ordered)
// Design: NHC branding — dark navy, burgundy accents, heatmap cells
import { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { normalizeClinician, getTestBreakdown } from '@/lib/analytics';
import type { Referral } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Download, Grid3X3, Search, AlertTriangle, TrendingUp,
  Users, ArrowUpDown, Eye, EyeOff,
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';

// Core test types we track for the matrix (the main revenue-generating ones)
const CORE_TESTS = [
  'Echo', 'ECG', 'AMBP', 'ESE', 'ETT',
  '24-hour Holter', '48-hour Holter', '72-hour Holter',
  '7-day Holter', '14-day Holter',
  'Bloods', 'FLM Panel', 'Carotid Doppler',
  'Arterial Doppler', 'Venous Doppler',
  'Bubble Echo', 'Iron infusion',
];

// Short labels for table headers
const TEST_SHORT_LABELS: Record<string, string> = {
  'Echo': 'Echo',
  'ECG': 'ECG',
  'AMBP': 'AMBP',
  'ESE': 'ESE',
  'ETT': 'ETT',
  '24-hour Holter': '24h Holter',
  '48-hour Holter': '48h Holter',
  '72-hour Holter': '72h Holter',
  '7-day Holter': '7d Holter',
  '14-day Holter': '14d Holter',
  'Bloods': 'Bloods',
  'FLM Panel': 'FLM',
  'Carotid Doppler': 'Carotid',
  'Arterial Doppler': 'Arterial',
  'Venous Doppler': 'Venous',
  'Bubble Echo': 'Bubble',
  'Iron infusion': 'Iron Inf.',
};

type SortField = 'name' | 'referrals' | 'tests' | 'gaps';
type SortDir = 'asc' | 'desc';
type ViewMode = 'counts' | 'percentages' | 'heatmap';

interface ClinicianTestData {
  clinician: string;
  totalReferrals: number;
  totalTests: number;
  testCounts: Record<string, number>;
  testPercentages: Record<string, number>; // % of this clinician's referrals that include this test
  gapTests: string[]; // tests with 0 orders
  gapCount: number;
}

export default function ClinicianTestMatrix() {
  const { referrals } = useData();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('referrals');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [minReferrals, setMinReferrals] = useState<string>('5');
  const [showGapsOnly, setShowGapsOnly] = useState(false);

  // Build the clinician test data
  const matrixData = useMemo(() => {
    // Group referrals by normalized clinician
    const grouped = new Map<string, Referral[]>();
    for (const r of referrals) {
      const name = normalizeClinician(r.referringConsultant);
      if (!name || name === 'Unknown') continue;
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name)!.push(r);
    }

    const data: ClinicianTestData[] = [];
    for (const [clinician, refs] of Array.from(grouped)) {
      const breakdown = getTestBreakdown(refs);
      const totalTests = Object.values(breakdown).reduce((s, c) => s + c, 0);
      const testCounts: Record<string, number> = {};
      const testPercentages: Record<string, number> = {};
      const gapTests: string[] = [];

      for (const test of CORE_TESTS) {
        const count = breakdown[test] || 0;
        testCounts[test] = count;
        testPercentages[test] = refs.length > 0 ? Math.round((count / refs.length) * 1000) / 10 : 0;
        if (count === 0) gapTests.push(test);
      }

      data.push({
        clinician,
        totalReferrals: refs.length,
        totalTests,
        testCounts,
        testPercentages,
        gapTests,
        gapCount: gapTests.length,
      });
    }

    return data;
  }, [referrals]);

  // Filter and sort
  const filteredData = useMemo(() => {
    const minRef = parseInt(minReferrals) || 0;
    let result = matrixData.filter(d => d.totalReferrals >= minRef);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(d => d.clinician.toLowerCase().includes(q));
    }

    if (showGapsOnly) {
      result = result.filter(d => d.gapCount > 0);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.clinician.localeCompare(b.clinician); break;
        case 'referrals': cmp = a.totalReferrals - b.totalReferrals; break;
        case 'tests': cmp = a.totalTests - b.totalTests; break;
        case 'gaps': cmp = a.gapCount - b.gapCount; break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [matrixData, search, sortField, sortDir, minReferrals, showGapsOnly]);

  // Summary stats
  const summary = useMemo(() => {
    const minRef = parseInt(minReferrals) || 0;
    const eligible = matrixData.filter(d => d.totalReferrals >= minRef);
    const totalGaps = eligible.reduce((s, d) => s + d.gapCount, 0);
    const avgGaps = eligible.length > 0 ? Math.round((totalGaps / eligible.length) * 10) / 10 : 0;

    // Most underutilized tests (tests with most clinicians NOT ordering)
    const testGapCounts: Record<string, number> = {};
    for (const test of CORE_TESTS) {
      testGapCounts[test] = eligible.filter(d => d.testCounts[test] === 0).length;
    }
    const underutilized = Object.entries(testGapCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Most popular tests
    const testTotalCounts: Record<string, number> = {};
    for (const test of CORE_TESTS) {
      testTotalCounts[test] = eligible.reduce((s, d) => s + (d.testCounts[test] || 0), 0);
    }
    const popular = Object.entries(testTotalCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { eligible: eligible.length, totalGaps, avgGaps, underutilized, popular };
  }, [matrixData, minReferrals]);

  // Heatmap color scale
  const getHeatColor = (count: number, maxCount: number) => {
    if (count === 0) return 'bg-red-50 text-red-400';
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    if (intensity > 0.7) return 'bg-emerald-100 text-emerald-800';
    if (intensity > 0.4) return 'bg-emerald-50 text-emerald-700';
    if (intensity > 0.15) return 'bg-amber-50 text-amber-700';
    return 'bg-orange-50 text-orange-600';
  };

  const maxTestCount = useMemo(() => {
    let max = 0;
    for (const d of filteredData) {
      for (const test of CORE_TESTS) {
        if (d.testCounts[test] > max) max = d.testCounts[test];
      }
    }
    return max;
  }, [filteredData]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['Clinician', 'Referrals', 'Total Tests', 'Gap Count',
      ...CORE_TESTS.map(t => `${t} (Count)`),
      ...CORE_TESTS.map(t => `${t} (%)`),
      'Tests Not Ordered',
    ];
    const rows = filteredData.map(d => [
      d.clinician,
      d.totalReferrals,
      d.totalTests,
      d.gapCount,
      ...CORE_TESTS.map(t => d.testCounts[t] || 0),
      ...CORE_TESTS.map(t => `${d.testPercentages[t]}%`),
      d.gapTests.join('; '),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nhc-clinician-test-matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCellContent = (d: ClinicianTestData, test: string) => {
    const count = d.testCounts[test] || 0;
    const pct = d.testPercentages[test] || 0;
    if (viewMode === 'counts') return count > 0 ? count.toString() : '—';
    if (viewMode === 'percentages') return count > 0 ? `${pct}%` : '—';
    return count > 0 ? count.toString() : '—';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-[Tenor_Sans,serif] text-[#1e2a3a]">
            Clinician Test Matrix
          </h1>
          <p className="text-muted-foreground mt-1">
            Which clinician orders which tests — identify gaps and opportunities for outreach
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="heatmap">Heatmap</SelectItem>
              <SelectItem value="counts">Counts</SelectItem>
              <SelectItem value="percentages">Percentages</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clinicians</p>
                <p className="text-2xl font-bold mt-1">{summary.eligible}</p>
                <p className="text-xs text-muted-foreground">with {minReferrals}+ referrals</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#1e2a3a]/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-[#1e2a3a]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Gaps</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{summary.totalGaps}</p>
                <p className="text-xs text-muted-foreground">test-clinician opportunities</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Gaps/Clinician</p>
                <p className="text-2xl font-bold mt-1">{summary.avgGaps}</p>
                <p className="text-xs text-muted-foreground">tests not ordered</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Grid3X3 className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Test Types Tracked</p>
                <p className="text-2xl font-bold mt-1">{CORE_TESTS.length}</p>
                <p className="text-xs text-muted-foreground">core test categories</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Most Underutilized Tests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Biggest Opportunities — Tests NOT Being Ordered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              These tests have the most clinicians not ordering them — great outreach targets
            </p>
            <div className="space-y-2">
              {summary.underutilized.map(([test, gapCount]) => (
                <div key={test} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{test}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{ width: `${(gapCount / summary.eligible) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-red-600 font-semibold w-20 text-right">
                      {gapCount} / {summary.eligible}
                    </span>
                    <span className="text-xs text-muted-foreground w-14 text-right">
                      ({Math.round((gapCount / Math.max(summary.eligible, 1)) * 100)}% gap)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Popular Tests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Most Ordered Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              These tests are most frequently ordered across all clinicians
            </p>
            <div className="space-y-2">
              {summary.popular.map(([test, count]) => {
                const maxPop = summary.popular[0]?.[1] || 1;
                return (
                  <div key={test} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{test}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${(count / maxPop) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-emerald-700 font-semibold w-20 text-right">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clinicians..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Min referrals:</span>
              <Select value={minReferrals} onValueChange={setMinReferrals}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="5">5+</SelectItem>
                  <SelectItem value="10">10+</SelectItem>
                  <SelectItem value="20">20+</SelectItem>
                  <SelectItem value="50">50+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={showGapsOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowGapsOnly(!showGapsOnly)}
              className="gap-2"
            >
              {showGapsOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showGapsOnly ? 'Showing gaps only' : 'Show gaps only'}
            </Button>
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredData.length} clinicians shown
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="font-medium text-muted-foreground">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-red-50 border border-red-200" />
          <span className="text-muted-foreground">Not ordered (opportunity)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-orange-50 border border-orange-200" />
          <span className="text-muted-foreground">Low volume</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-amber-50 border border-amber-200" />
          <span className="text-muted-foreground">Moderate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-emerald-50 border border-emerald-200" />
          <span className="text-muted-foreground">Good volume</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300" />
          <span className="text-muted-foreground">High volume</span>
        </div>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Grid3X3 className="h-5 w-5 text-[#1e2a3a]" />
            Test Matrix
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (click column headers to sort)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1e2a3a] text-white">
                  <th
                    className="text-left py-2.5 px-3 font-semibold cursor-pointer hover:bg-[#2a3a4e] transition-colors sticky left-0 bg-[#1e2a3a] z-10 min-w-[140px]"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Clinician
                      {sortField === 'name' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th
                    className="text-center py-2.5 px-2 font-semibold cursor-pointer hover:bg-[#2a3a4e] transition-colors min-w-[50px]"
                    onClick={() => toggleSort('referrals')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Refs
                      {sortField === 'referrals' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th
                    className="text-center py-2.5 px-2 font-semibold cursor-pointer hover:bg-[#2a3a4e] transition-colors min-w-[50px]"
                    onClick={() => toggleSort('gaps')}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1">
                          Gaps
                          {sortField === 'gaps' && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Number of test types not ordered</TooltipContent>
                    </Tooltip>
                  </th>
                  {CORE_TESTS.map(test => (
                    <th key={test} className="text-center py-2.5 px-1 font-semibold min-w-[55px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{TEST_SHORT_LABELS[test] || test}</span>
                        </TooltipTrigger>
                        <TooltipContent>{test}</TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((d, i) => (
                  <tr
                    key={d.clinician}
                    className={`border-b border-border/30 transition-colors hover:bg-muted/40 ${
                      i % 2 === 0 ? '' : 'bg-muted/10'
                    }`}
                  >
                    <td className="py-2 px-3 font-medium sticky left-0 bg-white z-10 border-r border-border/20">
                      <div className={i % 2 !== 0 ? 'bg-muted/10' : ''}>
                        {d.clinician}
                      </div>
                    </td>
                    <td className="text-center py-2 px-2 tabular-nums font-semibold">
                      {d.totalReferrals}
                    </td>
                    <td className="text-center py-2 px-2 tabular-nums">
                      {d.gapCount > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                          {d.gapCount}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                          0
                        </span>
                      )}
                    </td>
                    {CORE_TESTS.map(test => {
                      const count = d.testCounts[test] || 0;
                      const pct = d.testPercentages[test] || 0;
                      const cellColor = viewMode === 'heatmap'
                        ? getHeatColor(count, maxTestCount)
                        : count === 0
                          ? 'bg-red-50 text-red-400'
                          : '';

                      return (
                        <td key={test} className="text-center py-1.5 px-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`inline-flex items-center justify-center w-full min-w-[40px] h-7 rounded text-[11px] font-medium transition-colors ${cellColor} ${
                                  count === 0 ? 'border border-red-200 border-dashed' : ''
                                }`}
                              >
                                {getCellContent(d, test)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px]">
                              <div className="text-xs">
                                <p className="font-semibold">{d.clinician} — {test}</p>
                                {count > 0 ? (
                                  <>
                                    <p>{count} orders ({pct}% of referrals)</p>
                                  </>
                                ) : (
                                  <p className="text-red-400 font-medium">
                                    Never ordered — potential outreach opportunity
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Grid3X3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No clinicians match the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gap Analysis Detail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Outreach Opportunities — Clinicians with Most Gaps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            These clinicians have the most test types they have never ordered. Consider reaching out to discuss these services.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="text-left py-2.5 px-4 font-semibold">Clinician</th>
                  <th className="text-center py-2.5 px-3 font-semibold">Referrals</th>
                  <th className="text-center py-2.5 px-3 font-semibold">Gaps</th>
                  <th className="text-left py-2.5 px-4 font-semibold">Tests Not Ordered</th>
                </tr>
              </thead>
              <tbody>
                {filteredData
                  .filter(d => d.gapCount > 0)
                  .sort((a, b) => {
                    // Sort by referral count desc first (high-value clinicians with gaps)
                    if (b.totalReferrals !== a.totalReferrals) return b.totalReferrals - a.totalReferrals;
                    return b.gapCount - a.gapCount;
                  })
                  .slice(0, 20)
                  .map((d, i) => (
                    <tr
                      key={d.clinician}
                      className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${
                        i % 2 === 0 ? '' : 'bg-muted/10'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium">{d.clinician}</td>
                      <td className="text-center py-2.5 px-3 tabular-nums">{d.totalReferrals}</td>
                      <td className="text-center py-2.5 px-3">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                          {d.gapCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {d.gapTests.map(test => (
                            <span
                              key={test}
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs border border-red-200"
                            >
                              {test}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
