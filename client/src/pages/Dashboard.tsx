// NHC Cardio Referral Hub — Dashboard Page
// Enhanced with patient counts, net revenue, insurance filters, per-doctor breakdown, top tests by revenue

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { usePricing } from '@/contexts/PricingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  Activity, Users, TestTubes, PoundSterling, TrendingUp,
  Calendar, Loader2, AlertCircle, Search, ArrowUpDown,
} from 'lucide-react';
import { TimeFilter } from '@/lib/types';
import {
  filterReferralsByDate, getDateRange, getTestBreakdown,
  calculateReportingFees, calculateEstimatedRevenue,
  getInsuranceBreakdown, getTimeSeriesData,
  countTestsForReferral, getUniquePatientCount,
  getPrivateNHSSplit, getClinicianBreakdown,
  getRevenueByInsurer, getTestsByRevenue,
  filterReferralsByInsurers, normalizeInsurance,
} from '@/lib/analytics';
import type { ClinicianBreakdown } from '@/lib/analytics';

// Insurance-specific colors matching NHC branding
const INSURER_COLORS: Record<string, string> = {
  'BUPA': '#006a4e',
  'AXA': '#c0392b',
  'Healix': '#b8860b',
  'Aviva': '#4a5c3e',
  'Self-Funded': '#d4a574',
  'Vitality': '#2c3e50',
  'Cigna': '#7f8c8d',
  'NHS': '#95a5a6',
  'WPA': '#8e44ad',
  'Allianz': '#2980b9',
  'Exeter': '#e67e22',
  'Other': '#bdc3c7',
};

const CHART_COLORS = [
  '#006a4e', '#c0392b', '#b8860b', '#4a5c3e', '#d4a574',
  '#2c3e50', '#7f8c8d', '#95a5a6', '#8e44ad', '#2980b9',
  '#e67e22', '#bdc3c7',
];

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'yearly', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

type SortField = 'rank' | 'patients' | 'tests' | 'revenue' | 'reportingFees' | 'net' | 'percentOfTotal';
type StatusFilter = 'all' | 'above' | 'below' | 'dormant';

export default function Dashboard() {
  const { referrals, prices, loading, error } = useData();
  const { getReportingFee, getPatientCost } = usePricing();
  const pricingOverrides = useMemo(() => ({ getReportingFee, getPatientCost }), [getReportingFee, getPatientCost]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedInsurers, setSelectedInsurers] = useState<string[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { start, end } = useMemo(() => getDateRange(timeFilter), [timeFilter]);

  const dateFiltered = useMemo(
    () => filterReferralsByDate(referrals, start, end),
    [referrals, start, end]
  );

  // Get all available insurers from the data
  const availableInsurers = useMemo(() => {
    const breakdown = getInsuranceBreakdown(dateFiltered);
    return Object.entries(breakdown)
      .filter(([name]) => name !== 'Unknown' && name !== 'Cancelled')
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [dateFiltered]);

  // Apply insurance filter
  const filtered = useMemo(
    () => selectedInsurers.length > 0 ? filterReferralsByInsurers(dateFiltered, selectedInsurers) : dateFiltered,
    [dateFiltered, selectedInsurers]
  );

  const totalTests = useMemo(
    () => filtered.reduce((sum, r) => sum + countTestsForReferral(r), 0),
    [filtered]
  );

  const estimatedRevenue = useMemo(
    () => calculateEstimatedRevenue(filtered, prices, pricingOverrides),
    [filtered, prices, pricingOverrides]
  );

  const reportingFees = useMemo(
    () => calculateReportingFees(filtered, prices, pricingOverrides),
    [filtered, prices, pricingOverrides]
  );

  const netRevenue = useMemo(() => estimatedRevenue - reportingFees, [estimatedRevenue, reportingFees]);

  const uniquePatients = useMemo(() => getUniquePatientCount(filtered), [filtered]);

  const privateNHSSplit = useMemo(
    () => getPrivateNHSSplit(filtered, prices, pricingOverrides),
    [filtered, prices, pricingOverrides]
  );

  const clinicianBreakdown = useMemo(
    () => getClinicianBreakdown(filtered, prices, pricingOverrides),
    [filtered, prices, pricingOverrides]
  );

  const revenueByInsurer = useMemo(
    () => getRevenueByInsurer(filtered, prices, pricingOverrides),
    [filtered, prices, pricingOverrides]
  );

  const testsByRevenue = useMemo(
    () => getTestsByRevenue(filtered, prices, pricingOverrides),
    [filtered, prices, pricingOverrides]
  );

  const insuranceData = useMemo(() => {
    const raw = getInsuranceBreakdown(filtered);
    return Object.entries(raw)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.name !== 'Unknown' && d.name !== 'Cancelled' && d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const timeSeriesData = useMemo(
    () => getTimeSeriesData(filtered, timeFilter, start, end),
    [filtered, timeFilter, start, end]
  );

  const reportingFeeShare = useMemo(
    () => estimatedRevenue > 0 ? ((reportingFees / estimatedRevenue) * 100).toFixed(1) : '0',
    [reportingFees, estimatedRevenue]
  );

  // Sorted and filtered clinician table
  const sortedClinicians = useMemo(() => {
    let rows = [...clinicianBreakdown];
    if (statusFilter !== 'all') rows = rows.filter(r => r.status === statusFilter);
    if (doctorSearch) {
      const q = doctorSearch.toLowerCase();
      rows = rows.filter(r => r.clinician.toLowerCase().includes(q));
    }
    rows.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string') return sortAsc ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return rows;
  }, [clinicianBreakdown, statusFilter, doctorSearch, sortField, sortAsc]);

  const toggleInsurer = (insurer: string) => {
    setSelectedInsurers(prev =>
      prev.includes(insurer) ? prev.filter(i => i !== insurer) : [...prev, insurer]
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading referral data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-normal text-foreground tracking-wide">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Referral activity and revenue overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[160px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards — enhanced with Private/NHS split and Net Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={`Total Revenue (${timeFilter === 'weekly' ? 'Week' : timeFilter === 'monthly' ? 'Month' : timeFilter === 'yearly' ? 'Year' : timeFilter === 'daily' ? 'Today' : 'All'})`}
          value={`£${estimatedRevenue.toLocaleString()}`}
          icon={<PoundSterling className="w-5 h-5" />}
          subtitle={`Private £${privateNHSSplit.privateRevenue.toLocaleString()} · NHS £${privateNHSSplit.nhsRevenue.toLocaleString()}`}
          color="bg-[#924055]"
        />
        <KPICard
          title="Net Revenue"
          value={`£${netRevenue.toLocaleString()}`}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle={`After £${reportingFees.toLocaleString()} reporting fees`}
          color="bg-[#1a202c]"
        />
        <KPICard
          title="Referral Patients"
          value={uniquePatients.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
          subtitle={`NHS ${privateNHSSplit.nhsPatients} · Private ${privateNHSSplit.privatePatients}`}
          color="bg-[#2d8a4e]"
        />
        <KPICard
          title="Total Tests"
          value={totalTests.toLocaleString()}
          icon={<TestTubes className="w-5 h-5" />}
          subtitle={`Reporting fee share ${reportingFeeShare}%`}
          color="bg-[#3b82f6]"
        />
      </div>

      {/* Insurance Filter Pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Filter by Insurer
            {selectedInsurers.length > 0 && (
              <span className="ml-2 normal-case">
                Showing {selectedInsurers.length} of {availableInsurers.length} · £{calculateEstimatedRevenue(filtered, prices, pricingOverrides).toLocaleString()} · {totalTests} tests
              </span>
            )}
          </p>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setSelectedInsurers([...availableInsurers])}
              className={`px-2 py-0.5 rounded transition-colors ${selectedInsurers.length === availableInsurers.length ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ALL
            </button>
            <button
              onClick={() => setSelectedInsurers([])}
              className={`px-2 py-0.5 rounded transition-colors ${selectedInsurers.length === 0 ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              NONE
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableInsurers.map((ins) => {
            const isSelected = selectedInsurers.includes(ins);
            const color = INSURER_COLORS[ins] || '#6b7280';
            return (
              <button
                key={ins}
                onClick={() => toggleInsurer(ins)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: isSelected ? color : 'transparent',
                  color: isSelected ? '#fff' : color,
                  border: `1.5px solid ${color}`,
                  opacity: isSelected ? 1 : 0.7,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isSelected ? '#fff' : color }}
                />
                {ins}
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts row 1: Revenue by Insurer + Test Volume Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Insurer */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Revenue by Insurer</p>
            <CardTitle className="text-lg font-normal tracking-wide">Who paid{timeFilter === 'weekly' ? ' this week' : timeFilter === 'monthly' ? ' this month' : ''}?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByInsurer.slice(0, 8)} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="insurer"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => [`£${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {revenueByInsurer.slice(0, 8).map((entry, i) => (
                      <Cell key={i} fill={INSURER_COLORS[entry.insurer] || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Test Volume Mix */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Test Volume Mix</p>
            <CardTitle className="text-lg font-normal tracking-wide">{totalTests.toLocaleString()} tests performed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insuranceData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {insuranceData.map((entry, i) => (
                      <Cell key={i} fill={INSURER_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string, entry: any) => {
                      const item = insuranceData.find(d => d.name === value);
                      return <span className="text-foreground">{value} <span className="text-muted-foreground ml-1">{item?.value || 0}</span></span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Trend */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-normal tracking-wide">Referral Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#924055" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#924055" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="count" stroke="#924055" strokeWidth={2} fill="url(#colorCount)" name="Referrals" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Tests by Revenue — ranked bar list */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Breakdown</p>
          <CardTitle className="text-lg font-normal tracking-wide">Top tests by revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testsByRevenue.slice(0, 10).map((t, i) => {
              const maxRev = testsByRevenue[0]?.revenue || 1;
              const barWidth = (t.revenue / maxRev) * 100;
              return (
                <div key={`test-rev-${i}`} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-6 text-right font-mono">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{t.test}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-foreground">£{t.revenue.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground font-mono w-12 text-right">{t.percentOfTotal.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: '#924055',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-Doctor Breakdown Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Performance</p>
              <CardTitle className="text-lg font-normal tracking-wide">Per-doctor breakdown</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search doctor..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="pl-8 h-8 w-[180px] text-xs"
                />
              </div>
              <div className="flex rounded-lg overflow-hidden border border-border">
                {(['all', 'above', 'below', 'dormant'] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      statusFilter === s
                        ? 'bg-foreground text-background'
                        : 'bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <SortHeader label="Rank" field="rank" current={sortField} asc={sortAsc} onSort={handleSort} className="w-16" />
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Doctor</th>
                  <SortHeader label="Patients" field="patients" current={sortField} asc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Tests" field="tests" current={sortField} asc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Revenue" field="revenue" current={sortField} asc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Rep. Fees" field="reportingFees" current={sortField} asc={sortAsc} onSort={handleSort} />
                  <SortHeader label="Net" field="net" current={sortField} asc={sortAsc} onSort={handleSort} />
                  <SortHeader label="% of Total" field="percentOfTotal" current={sortField} asc={sortAsc} onSort={handleSort} />
                  <th className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedClinicians.map((row) => (
                  <tr key={row.clinician} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono">{row.rank}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{row.clinician}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{row.patients}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{row.tests}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">£{row.revenue.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                      {row.reportingFees > 0 ? `£${row.reportingFees.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">£{row.net.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{row.percentOfTotal.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedClinicians.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No clinicians match the current filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Month-to-date Doctor Payouts — ranked bar chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            {timeFilter === 'monthly' ? 'Month-to-date figures' : timeFilter === 'weekly' ? 'Week-to-date figures' : 'Period figures'} · Doctor payouts are reported monthly
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {clinicianBreakdown
              .filter(c => c.reportingFees > 0)
              .slice(0, 20)
              .map((c, i) => {
                const maxFee = clinicianBreakdown[0]?.reportingFees || 1;
                const barWidth = (c.reportingFees / maxFee) * 100;
                return (
                  <div key={`payout-${i}`} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-6 text-right font-mono">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-foreground">{c.clinician}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-foreground">£{c.reportingFees.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground font-mono w-12 text-right">{c.percentOfTotal.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${barWidth}%`, backgroundColor: '#924055' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ───

function KPICard({ title, value, icon, subtitle, color }: {
  title: string; value: string; icon: React.ReactNode; subtitle: string; color: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{title}</p>
            <p className="text-2xl font-semibold text-[#924055] tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`${color} text-white p-2.5 rounded-lg`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: 'above' | 'below' | 'dormant' }) {
  const styles = {
    above: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    below: 'bg-amber-50 text-amber-700 border-amber-200',
    dormant: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${styles[status]}`}>
      {status}
    </span>
  );
}

function SortHeader({ label, field, current, asc, onSort, className }: {
  label: string; field: SortField; current: SortField; asc: boolean; onSort: (f: SortField) => void; className?: string;
}) {
  const isActive = current === field;
  return (
    <th
      className={`py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none ${className || ''}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${isActive ? 'text-foreground' : 'text-muted-foreground/40'}`} />
      </div>
    </th>
  );
}
