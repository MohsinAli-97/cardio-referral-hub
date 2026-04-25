// NHC Cardio Referral Hub — Dashboard Page
// KPI cards, referral trends chart, top clinicians, test breakdown, insurance split

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  Activity, Users, TestTubes, PoundSterling, TrendingUp,
  Calendar, Loader2, AlertCircle,
} from 'lucide-react';
import { TimeFilter } from '@/lib/types';
import {
  filterReferralsByDate, getDateRange, getTestBreakdown,
  calculateReportingFees, calculateEstimatedRevenue,
  getTopClinicians, getInsuranceBreakdown, getTimeSeriesData,
  countTestsForReferral,
} from '@/lib/analytics';
import { format } from 'date-fns';

const CHART_COLORS = [
  '#1a202c', '#924055', '#2d8a4e', '#3b82f6', '#d97706',
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
  '#06b6d4', '#84cc16',
];

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'yearly', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

export default function Dashboard() {
  const { referrals, prices, loading, error } = useData();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const { start, end } = useMemo(() => getDateRange(timeFilter), [timeFilter]);

  const filtered = useMemo(
    () => filterReferralsByDate(referrals, start, end),
    [referrals, start, end]
  );

  const totalTests = useMemo(
    () => filtered.reduce((sum, r) => sum + countTestsForReferral(r), 0),
    [filtered]
  );

  const estimatedRevenue = useMemo(
    () => calculateEstimatedRevenue(filtered, prices),
    [filtered, prices]
  );

  const reportingFees = useMemo(
    () => calculateReportingFees(filtered, prices),
    [filtered, prices]
  );

  const testBreakdown = useMemo(() => {
    const raw = getTestBreakdown(filtered);
    return Object.entries(raw)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [filtered]);

  const topClinicians = useMemo(
    () => getTopClinicians(filtered, prices, 8),
    [filtered, prices]
  );

  const insuranceData = useMemo(() => {
    const raw = getInsuranceBreakdown(filtered);
    return Object.entries(raw)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.name !== 'Unknown' && d.name !== 'Cancelled' && d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  const timeSeriesData = useMemo(
    () => getTimeSeriesData(filtered, timeFilter, start, end),
    [filtered, timeFilter, start, end]
  );

  const uniqueClinicians = useMemo(
    () => new Set(filtered.map((r) => r.referringConsultant)).size,
    [filtered]
  );

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Referrals"
          value={filtered.length.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
          subtitle={`${uniqueClinicians} clinicians`}
          color="bg-[#1a202c]"
        />
        <KPICard
          title="Tests Performed"
          value={totalTests.toLocaleString()}
          icon={<TestTubes className="w-5 h-5" />}
          subtitle={`${(totalTests / Math.max(filtered.length, 1)).toFixed(1)} avg per referral`}
          color="bg-[#924055]"
        />
        <KPICard
          title="Est. Revenue"
          value={`£${estimatedRevenue.toLocaleString()}`}
          icon={<PoundSterling className="w-5 h-5" />}
          subtitle="Based on self-funding prices"
          color="bg-[#2d8a4e]"
        />
        <KPICard
          title="Reporting Fees"
          value={`£${reportingFees.toLocaleString()}`}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="Owed to clinicians"
          color="bg-[#3b82f6]"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Referral Trend */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-normal tracking-wide">Referral Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a202c" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1a202c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#1a202c"
                    strokeWidth={2}
                    fill="url(#colorCount)"
                    name="Referrals"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Breakdown */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-normal tracking-wide">Insurance Split</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insuranceData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {insuranceData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Clinicians */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-normal tracking-wide">Top Referring Clinicians</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topClinicians.map((c) => ({
                    name: c.clinician.replace('Dr ', '').replace('Prof ', ''),
                    referrals: c.referralCount,
                    fees: c.reportingFees,
                  }))}
                  layout="vertical"
                  margin={{ left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11, fill: '#374151' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) =>
                      name === 'fees' ? [`£${value.toLocaleString()}`, 'Reporting Fees'] : [value, 'Referrals']
                    }
                  />
                  <Bar dataKey="referrals" fill="#1a202c" radius={[0, 4, 4, 0]} name="Referrals" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Test Breakdown */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-normal tracking-wide">Test Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testBreakdown} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                    {testBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({
  title, value, icon, subtitle, color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle: string;
  color: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-semibold text-foreground tracking-tight">
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`${color} text-white p-2.5 rounded-lg`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
