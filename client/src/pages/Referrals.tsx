// NHC Cardio Referral Hub — Referrals Table Page
// Searchable, filterable table of all referral data

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { normalizeInsurance, normalizeClinician } from '@/lib/analytics';
import { format, parseISO } from 'date-fns';

const PAGE_SIZE = 25;

const INSURANCE_BADGE_COLORS: Record<string, string> = {
  'AXA': 'bg-blue-100 text-blue-800',
  'BUPA': 'bg-indigo-100 text-indigo-800',
  'Vitality': 'bg-green-100 text-green-800',
  'WPA': 'bg-purple-100 text-purple-800',
  'Healix': 'bg-orange-100 text-orange-800',
  'Self-Funded': 'bg-amber-100 text-amber-800',
};

export default function Referrals() {
  const { referrals, loading, error } = useData();
  const [search, setSearch] = useState('');
  const [clinicianFilter, setCliniciansFilter] = useState('all');
  const [insuranceFilter, setInsuranceFilter] = useState('all');
  const [page, setPage] = useState(1);

  const clinicians = useMemo(() => {
    const set = new Set(referrals.map((r) => normalizeClinician(r.referringConsultant)));
    return Array.from(set).sort();
  }, [referrals]);

  const insuranceTypes = useMemo(() => {
    const set = new Set(referrals.map((r) => normalizeInsurance(r.insuranceDetails)));
    return Array.from(set).filter((i) => i !== 'Unknown').sort();
  }, [referrals]);

  const filtered = useMemo(() => {
    let result = referrals;

    if (clinicianFilter !== 'all') {
      result = result.filter((r) => normalizeClinician(r.referringConsultant) === clinicianFilter);
    }

    if (insuranceFilter !== 'all') {
      result = result.filter((r) => normalizeInsurance(r.insuranceDetails) === insuranceFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.patientName.toLowerCase().includes(q) ||
          r.referringConsultant.toLowerCase().includes(q) ||
          r.testsNeeded.toLowerCase().includes(q) ||
          r.comments.toLowerCase().includes(q)
      );
    }

    return result;
  }, [referrals, clinicianFilter, insuranceFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function formatDate(d: string | null) {
    if (!d) return '—';
    try {
      return format(parseISO(d), 'dd MMM yyyy');
    } catch {
      return d;
    }
  }

  function getActiveTests(tests: Record<string, boolean>): string[] {
    return Object.entries(tests)
      .filter(([, v]) => v)
      .map(([k]) => k);
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
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal text-foreground tracking-wide">
          Referrals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filtered.length.toLocaleString()} referrals found
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search patients, clinicians, tests..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={clinicianFilter} onValueChange={(v) => { setCliniciansFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Clinician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clinicians</SelectItem>
                {clinicians.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={insuranceFilter} onValueChange={(v) => { setInsuranceFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Insurance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Insurance</SelectItem>
                {insuranceTypes.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Clinician</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Referral Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Insurance</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tests</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((r, i) => {
                const ins = normalizeInsurance(r.insuranceDetails);
                const activeTests = getActiveTests(r.tests);
                const hasResults = !!r.sentResults;
                return (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{r.patientName || '—'}</p>
                        {r.dob && (
                          <p className="text-xs text-muted-foreground">DOB: {formatDate(r.dob)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{normalizeClinician(r.referringConsultant)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.referralReceived)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${INSURANCE_BADGE_COLORS[ins] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {ins}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[250px]">
                        {activeTests.slice(0, 3).map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                            {t}
                          </Badge>
                        ))}
                        {activeTests.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{activeTests.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={hasResults
                          ? 'bg-green-100 text-green-800 text-xs'
                          : 'bg-yellow-100 text-yellow-800 text-xs'
                        }
                      >
                        {hasResults ? 'Completed' : 'Pending'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
