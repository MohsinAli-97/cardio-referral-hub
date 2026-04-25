// Insurance Analysis — Breakdown by insurance provider
// Design: NHC branding — dark navy, burgundy accents, clean data tables
import { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { usePricing } from '@/contexts/PricingContext';
import {
  getInsuranceAnalysis, filterReferralsByDate, getDateRange,
  normalizeInsurance, countTestsForReferral, getTestBreakdown,
  normalizeClinician,
} from '@/lib/analytics';
import type { TimeFilter } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Shield, TrendingUp, PoundSterling, Users, Download,
  BarChart3, PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = [
  '#1e2a3a', '#9b2c5a', '#2563eb', '#059669', '#d97706',
  '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#c026d3',
];

export default function InsuranceAnalysis() {
  const { referrals, prices } = useData();
  const { getReportingFee, getPatientCost } = usePricing();
  const pricingOverrides = useMemo(() => ({ getReportingFee, getPatientCost }), [getReportingFee, getPatientCost]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const { start, end } = useMemo(() => getDateRange(timeFilter), [timeFilter]);
  const filtered = useMemo(
    () => filterReferralsByDate(referrals, start, end),
    [referrals, start, end]
  );

  const analysis = useMemo(
    () => getInsuranceAnalysis(filtered, prices, pricingOverrides),
    [filtered, prices, pricingOverrides]
  );

  // Pie chart data for referral distribution
  const pieData = useMemo(
    () => analysis.slice(0, 10).map(a => ({
      name: a.insurance,
      value: a.totalReferrals,
    })),
    [analysis]
  );

  // Bar chart data for reporting fees by insurance
  const feeBarData = useMemo(
    () => analysis.slice(0, 10).map(a => ({
      name: a.insurance,
      fees: a.reportingFees,
      revenue: a.estimatedRevenue,
    })),
    [analysis]
  );

  // Test breakdown per insurance (top 5 insurers, top 8 tests)
  const testByInsurance = useMemo(() => {
    const top5 = analysis.slice(0, 5);
    const allTests: Record<string, Record<string, number>> = {};

    for (const ins of top5) {
      const insRefs = filtered.filter(
        r => normalizeInsurance(r.insuranceDetails) === ins.insurance
      );
      const breakdown = getTestBreakdown(insRefs);
      for (const [test, count] of Object.entries(breakdown)) {
        if (!allTests[test]) allTests[test] = {};
        allTests[test][ins.insurance] = count;
      }
    }

    return Object.entries(allTests)
      .map(([test, byIns]) => ({
        test,
        total: Object.values(byIns).reduce((a, b) => a + b, 0),
        ...byIns,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [analysis, filtered]);

  const topInsurers = analysis.slice(0, 5).map(a => a.insurance);

  // Totals
  const totals = useMemo(() => ({
    referrals: analysis.reduce((s, a) => s + a.totalReferrals, 0),
    tests: analysis.reduce((s, a) => s + a.totalTests, 0),
    fees: analysis.reduce((s, a) => s + a.reportingFees, 0),
    revenue: analysis.reduce((s, a) => s + a.estimatedRevenue, 0),
  }), [analysis]);

  const exportCSV = () => {
    const headers = ['Insurance', 'Referrals', '% of Total', 'Tests', 'Avg Tests/Ref', 'Clinicians', 'Reporting Fees', 'Est. Revenue'];
    const rows = analysis.map(a =>
      [a.insurance, a.totalReferrals, `${a.percentOfTotal.toFixed(1)}%`, a.totalTests,
       a.avgTestsPerReferral, a.uniqueClinicians,
       `£${a.reportingFees.toLocaleString()}`, `£${a.estimatedRevenue.toLocaleString()}`].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nhc-insurance-analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-[Tenor_Sans,serif] text-[#1e2a3a]">
            Insurance Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Referral and revenue breakdown by insurance provider
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Today</SelectItem>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Insurance Providers</p>
                <p className="text-2xl font-bold mt-1">{analysis.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#1e2a3a]/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-[#1e2a3a]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Referrals</p>
                <p className="text-2xl font-bold mt-1">{totals.referrals.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reporting Fees</p>
                <p className="text-2xl font-bold mt-1">£{totals.fees.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#9b2c5a]/10 flex items-center justify-center">
                <PoundSterling className="h-5 w-5 text-[#9b2c5a]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Est. Revenue</p>
                <p className="text-2xl font-bold mt-1">£{totals.revenue.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Referral Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChartIcon className="h-5 w-5 text-[#9b2c5a]" />
              Referral Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => [`${val} referrals`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reporting Fees Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-[#9b2c5a]" />
              Reporting Fees by Insurance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={feeBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val: number) => [`£${val.toLocaleString()}`, '']} />
                <Bar dataKey="fees" fill="#9b2c5a" radius={[0, 4, 4, 0]} name="Reporting Fees" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Test Breakdown by Insurance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-[#1e2a3a]" />
            Test Types by Top Insurers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={testByInsurance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="test" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              {topInsurers.map((ins, i) => (
                <Bar key={ins} dataKey={ins} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Detailed Insurance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1e2a3a] text-white">
                  <th className="text-left py-3 px-4 font-semibold">Insurance</th>
                  <th className="text-center py-3 px-3 font-semibold">Referrals</th>
                  <th className="text-center py-3 px-3 font-semibold">% of Total</th>
                  <th className="text-center py-3 px-3 font-semibold">Tests</th>
                  <th className="text-center py-3 px-3 font-semibold">Avg Tests/Ref</th>
                  <th className="text-center py-3 px-3 font-semibold">Clinicians</th>
                  <th className="text-right py-3 px-4 font-semibold">Reporting Fees</th>
                  <th className="text-right py-3 px-4 font-semibold">Est. Revenue</th>
                </tr>
              </thead>
              <tbody>
                {analysis.map((row, i) => (
                  <tr
                    key={row.insurance}
                    className={`border-b border-border/50 transition-colors hover:bg-muted/50 ${
                      i % 2 === 0 ? '' : 'bg-muted/20'
                    }`}
                  >
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        {row.insurance}
                      </div>
                    </td>
                    <td className="text-center py-3 px-3 tabular-nums">{row.totalReferrals}</td>
                    <td className="text-center py-3 px-3 tabular-nums">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#9b2c5a]"
                            style={{ width: `${Math.min(row.percentOfTotal, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs">{row.percentOfTotal.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-3 tabular-nums">{row.totalTests}</td>
                    <td className="text-center py-3 px-3 tabular-nums">{row.avgTestsPerReferral}</td>
                    <td className="text-center py-3 px-3 tabular-nums">{row.uniqueClinicians}</td>
                    <td className="text-right py-3 px-4 tabular-nums font-medium text-[#9b2c5a]">
                      £{row.reportingFees.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 tabular-nums font-medium">
                      £{row.estimatedRevenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 border-t-2 border-border font-bold">
                  <td className="py-3 px-4">Total</td>
                  <td className="text-center py-3 px-3">{totals.referrals}</td>
                  <td className="text-center py-3 px-3">100%</td>
                  <td className="text-center py-3 px-3">{totals.tests}</td>
                  <td className="text-center py-3 px-3">
                    {totals.referrals > 0 ? (totals.tests / totals.referrals).toFixed(1) : '0'}
                  </td>
                  <td className="text-center py-3 px-3">—</td>
                  <td className="text-right py-3 px-4 text-[#9b2c5a]">
                    £{totals.fees.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4">
                    £{totals.revenue.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
