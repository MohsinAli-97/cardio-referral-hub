// NHC Cardio Referral Hub — Clinicians Directory Page
// Contact details and bank info for all referring clinicians

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, Mail, Phone, Building2, User, Loader2, AlertCircle,
} from 'lucide-react';
import { normalizeClinician } from '@/lib/analytics';

export default function Clinicians() {
  const { clinicians, referrals, loading, error } = useData();
  const [search, setSearch] = useState('');

  // Count referrals per clinician
  const referralCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of referrals) {
      const name = normalizeClinician(r.referringConsultant);
      counts[name] = (counts[name] || 0) + 1;
    }
    return counts;
  }, [referrals]);

  const filtered = useMemo(() => {
    if (!search) return clinicians;
    const q = search.toLowerCase();
    return clinicians.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.secretary.toLowerCase().includes(q)
    );
  }, [clinicians, search]);

  // Separate main clinicians from secretaries
  const mainClinicians = useMemo(
    () => filtered.filter((c) => !c.name.toLowerCase().includes('sec')),
    [filtered]
  );

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-normal text-foreground tracking-wide">
            Clinicians
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mainClinicians.length} referring clinicians on file
          </p>
        </div>
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, secretary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mainClinicians.map((c) => {
          // Find matching referral count
          const matchKey = Object.keys(referralCounts).find((k) => {
            const cleanK = k.replace(/^(Dr|Prof|Mr|Mrs|Ms)\s+/i, '').toLowerCase();
            const cleanC = c.name.split(',')[0].toLowerCase().trim();
            return cleanK.includes(cleanC) || cleanC.includes(cleanK);
          });
          const count = matchKey ? referralCounts[matchKey] : 0;

          return (
            <Card key={c.name} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1a202c] flex items-center justify-center text-white text-sm font-semibold">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{c.name}</p>
                      {c.secretary && (
                        <p className="text-xs text-muted-foreground">
                          Sec: {c.secretary}
                        </p>
                      )}
                    </div>
                  </div>
                  {count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {count} referrals
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {c.email && c.email !== '#' && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <a
                        href={`mailto:${c.email}`}
                        className="text-xs hover:text-foreground transition-colors truncate"
                      >
                        {c.email}
                      </a>
                    </div>
                  )}
                  {c.telephone && c.telephone !== 'NHS CONSULTANT' && c.telephone !== 'Use secretary' && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs">{c.telephone}</span>
                    </div>
                  )}
                  {c.bankCompany && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs">{c.bankCompany} — {c.bankName || '—'}</span>
                    </div>
                  )}
                </div>

                {c.extraInfo && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t italic">
                    {c.extraInfo}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
