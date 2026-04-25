// Insurance Reporting Fees — NHC Fee Schedule (reads from PricingContext)
// Design: NHC branding — dark navy headers, burgundy accents, clean table
import { useMemo, useState } from 'react';
import { usePricing } from '@/contexts/PricingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  PoundSterling, Search, Info, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function InsuranceFees() {
  const { insurers, tests } = usePricing();
  const [search, setSearch] = useState('');
  const [highlightCol, setHighlightCol] = useState<string | null>(null);

  const columns = useMemo(() => [
    ...insurers.map(ins => ({ key: ins.key, label: ins.label })),
    { key: '_patientCost', label: 'Patient Cost' },
  ], [insurers]);

  const filteredTests = useMemo(() => {
    if (!search) return tests;
    const q = search.toLowerCase();
    return tests.filter(r => r.test.toLowerCase().includes(q));
  }, [search, tests]);

  // Calculate column averages
  const averages = useMemo(() => {
    const avgs: Record<string, number> = {};
    for (const col of columns) {
      if (col.key === '_patientCost') {
        const sum = tests.reduce((s, r) => s + r.patientCost, 0);
        avgs[col.key] = tests.length > 0 ? Math.round(sum / tests.length) : 0;
      } else {
        const sum = tests.reduce((s, r) => s + (r.fees[col.key] ?? 0), 0);
        avgs[col.key] = tests.length > 0 ? Math.round(sum / tests.length) : 0;
      }
    }
    return avgs;
  }, [columns, tests]);

  const exportCSV = () => {
    const headers = ['Test', ...columns.map(c => c.label)];
    const rows = tests.map(r =>
      [
        r.test,
        ...columns.map(c =>
          c.key === '_patientCost' ? `£${r.patientCost}` : `£${r.fees[c.key] ?? 0}`
        ),
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nhc-reporting-fees.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getVal = (row: typeof tests[0], colKey: string): number => {
    if (colKey === '_patientCost') return row.patientCost;
    return row.fees[colKey] ?? 0;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight font-[Tenor_Sans,serif] text-[#1e2a3a]">
            Reporting Fees
          </h1>
          <p className="text-muted-foreground mt-1">
            Fee schedule by insurance provider — from the NHC Cardiologist Brochure
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="border-l-4 border-l-[#9b2c5a] bg-[#9b2c5a]/5">
        <CardContent className="py-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-[#9b2c5a] mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How Reporting Fees Work</p>
            <p>
              These are the fees NHC pays to referring cardiologists for reviewing and approving test reports.
              Fees vary by insurance provider and test type. Reporting fees are processed on the{' '}
              <strong>20th of the month</strong> following the tests. The "Patient Cost" column shows what
              self-funding patients pay NHC directly. To edit these fees, go to the{' '}
              <a href="/pricing" className="text-[#9b2c5a] underline font-medium">Pricing Management</a> page.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Fee Schedule Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <PoundSterling className="h-5 w-5 text-[#9b2c5a]" />
            Reporting Fee Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1e2a3a] text-white">
                  <th className="text-left py-3 px-4 font-semibold sticky left-0 bg-[#1e2a3a] z-10 min-w-[200px]">
                    Test
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`text-center py-3 px-3 font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                        highlightCol === col.key ? 'bg-[#9b2c5a]' : 'hover:bg-[#2a3a4e]'
                      } ${col.key === '_patientCost' ? 'bg-[#9b2c5a]/80' : ''}`}
                      onClick={() => setHighlightCol(highlightCol === col.key ? null : col.key)}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{col.label}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {col.key === '_patientCost'
                            ? 'What self-funding patients pay NHC'
                            : `Fee paid to cardiologist for ${col.label} patients`}
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((row, i) => {
                  const insurerCols = columns.filter(c => c.key !== '_patientCost');
                  const feeValues = insurerCols.map(c => getVal(row, c.key));
                  const maxFee = Math.max(...feeValues);
                  const minFee = Math.min(...feeValues);

                  return (
                    <tr
                      key={row.test}
                      className={`border-b border-border/50 transition-colors hover:bg-muted/50 ${
                        i % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                      }`}
                    >
                      <td className={`py-3 px-4 font-medium sticky left-0 z-10 ${
                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        {row.test}
                      </td>
                      {columns.map((col) => {
                        const val = getVal(row, col.key);
                        const isPatientCost = col.key === '_patientCost';
                        const isMax = !isPatientCost && val === maxFee;
                        const isMin = !isPatientCost && val === minFee && maxFee !== minFee;

                        return (
                          <td
                            key={col.key}
                            className={`text-center py-3 px-3 tabular-nums transition-colors ${
                              highlightCol === col.key ? 'bg-[#9b2c5a]/10 font-semibold' : ''
                            } ${isPatientCost ? 'bg-[#9b2c5a]/5 font-semibold text-[#9b2c5a]' : ''}`}
                          >
                            <span className={`${isMax ? 'text-emerald-600 font-semibold' : ''} ${isMin ? 'text-amber-600' : ''}`}>
                              £{val}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              {/* Averages row */}
              <tfoot>
                <tr className="bg-muted/60 border-t-2 border-border font-semibold">
                  <td className="py-3 px-4 sticky left-0 bg-muted/60 z-10">
                    Average
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className={`text-center py-3 px-3 tabular-nums ${
                      col.key === '_patientCost' ? 'text-[#9b2c5a]' : ''
                    }`}>
                      £{averages[col.key]}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground px-1">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Highest fee for that test</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Lowest fee for that test</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#9b2c5a]" />
          <span>Patient cost (self-funding)</span>
        </div>
        <div className="text-xs italic">
          Click any column header to highlight it
        </div>
      </div>
    </div>
  );
}
