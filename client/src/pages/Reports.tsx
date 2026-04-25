// NHC Cardio Referral Hub — Revenue Reports Page
// Revenue breakdown by clinician with daily/weekly/monthly/yearly filters

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { usePricing } from '@/contexts/PricingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Calendar, PoundSterling, Download, Loader2, AlertCircle, Search,
} from 'lucide-react';
import { TimeFilter } from '@/lib/types';
import {
  filterReferralsByDate, getDateRange, getClinicianRevenue,
  calculateEstimatedRevenue, calculateReportingFees,
  getTestBreakdown,
} from '@/lib/analytics';
import { format } from 'date-fns';

const CHART_COLORS = [
  '#1a202c', '#924055', '#2d8a4e', '#3b82f6', '#d97706',
  '#6366f1', '#ec4899', '#14b8a6',
];

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'yearly', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

export default function Reports() {
  const { referrals, prices, loading, error } = useData();
  const { getReportingFee, getPatientCost } = usePricing();
  const pricingOverrides = useMemo(() => ({ getReportingFee, getPatientCost }), [getReportingFee, getPatientCost]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [search, setSearch] = useState('');

  const { start, end } = useMemo(() => getDateRange(timeFilter), [timeFilter]);

  const filtered = useMemo(
    () => filterReferralsByDate(referrals, start, end),
    [referrals, start, end]
  );

  const clinicianData = useMemo(
    () => getClinicianRevenue(filtered, prices, pricingOverrides),
    [filtered, prices, pricingOverrides]
  );

  const searchedClinicians = useMemo(() => {
    if (!search) return clinicianData;
    const q = search.toLowerCase();
    return clinicianData.filter((c) => c.clinician.toLowerCase().includes(q));
  }, [clinicianData, search]);

  const totalRevenue = useMemo(
    () => calculateEstimatedRevenue(filtered, prices, pricingOverrides),
    [filtered, prices, pricingOverrides]
  );

  const totalFees = useMemo(
    () => calculateReportingFees(filtered, prices, pricingOverrides),
    [filtered, prices, pricingOverrides]
  );

  const topRevenueChart = useMemo(
    () =>
      clinicianData
        .slice(0, 10)
        .map((c) => ({
          name: c.clinician.replace('Dr ', '').replace('Prof ', '').replace('Mr ', ''),
          revenue: c.estimatedRevenue,
          fees: c.reportingFees,
        })),
    [clinicianData]
  );

  const testRevenueData = useMemo(() => {
    const breakdown = getTestBreakdown(filtered);
    const priceMap = new Map(prices.map((p) => [p.test, p.sfPrice]));
    const feeMap = new Map(prices.map((p) => [p.test, p.reportingFee]));

    const testToPrice: Record<string, string> = {
      'Echo': 'Echocardiogram',
      'ECG': 'ECG',
      'AMBP': '24-hour blood pressure monitor',
      '24-hour Holter': '24-hour Holter monitor',
      '48-hour Holter': '48-hour Holter monitor',
      '72-hour Holter': '72-hour Holter monitor',
      '7-day Holter': '7-day Holter monitor',
      '14-day Holter': '14-day Holter monitor',
      'ESE': 'ESE',
      'ETT': 'ETT',
      'Bloods': 'Blood test (full cardiac panel)',
      'Carotid Doppler': 'Carotid Doppler',
      'Arterial Doppler': 'Arterial/Venous Doppler',
    };

    return Object.entries(breakdown)
      .map(([test, count]) => {
        const pk = testToPrice[test];
        const price = pk ? priceMap.get(pk) || 0 : 0;
        const fee = pk ? feeMap.get(pk) || 0 : 0;
        return { test, count, revenue: count * price, fees: count * fee };
      })
      .filter((d) => d.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [filtered, prices]);

  function exportCSV() {
    const headers = ['Clinician', 'Referrals', 'Est. Revenue (£)', 'Reporting Fees (£)'];
    const rows = searchedClinicians.map((c) => [
      c.clinician,
      c.referralCount,
      c.estimatedRevenue,
      c.reportingFees,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-normal text-foreground tracking-wide">
            Revenue Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Financial breakdown by clinician and test type
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
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Est. Revenue</p>
            <p className="text-2xl font-semibold text-foreground mt-2">£{totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Reporting Fees</p>
            <p className="text-2xl font-semibold text-foreground mt-2">£{totalFees.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net After Fees</p>
            <p className="text-2xl font-semibold text-[#2d8a4e] mt-2">£{(totalRevenue - totalFees).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by clinician chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-normal tracking-wide">Revenue by Clinician (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topRevenueChart} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, '']}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#1a202c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fees" name="Reporting Fees" fill="#924055" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Test revenue breakdown */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-normal tracking-wide">Revenue by Test Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Test</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Count</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Revenue</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Reporting Fees</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {testRevenueData.map((d) => (
                  <tr key={d.test} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{d.test}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{d.count}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">£{d.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-[#924055]">£{d.fees.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#2d8a4e]">£{(d.revenue - d.fees).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{testRevenueData.reduce((s, d) => s + d.count, 0)}</td>
                  <td className="px-4 py-3 text-right">£{testRevenueData.reduce((s, d) => s + d.revenue, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-[#924055]">£{testRevenueData.reduce((s, d) => s + d.fees, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-[#2d8a4e]">£{testRevenueData.reduce((s, d) => s + d.revenue - d.fees, 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Clinician detail table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-normal tracking-wide">Clinician Revenue Detail</CardTitle>
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clinicians..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Clinician</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Referrals</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Est. Revenue</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Reporting Fees</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {searchedClinicians.map((c) => (
                  <tr key={c.clinician} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{c.clinician}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{c.referralCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">£{c.estimatedRevenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-[#924055]">£{c.reportingFees.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#2d8a4e]">
                      £{(c.estimatedRevenue - c.reportingFees).toLocaleString()}
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
