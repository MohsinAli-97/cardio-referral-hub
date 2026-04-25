// NHC Cardio Referral Hub — Analytics & Revenue Calculations
// All revenue/fee functions accept optional pricing overrides from PricingContext
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  parseISO, isWithinInterval, format, eachDayOfInterval,
  eachMonthOfInterval,
} from 'date-fns';
import {
  Referral, SelfFundingPrice, TimeFilter,
  ClinicianRevenue, TEST_TO_PRICE_MAP,
  getInsuranceFee as getStaticInsuranceFee,
  TEST_TO_FEE_SCHEDULE_MAP, INSURANCE_FEE_SCHEDULE,
} from './types';

// ─── Pricing override type ───
// When provided, these functions from PricingContext replace the static lookups
export interface PricingOverrides {
  getReportingFee: (testColumn: string, insurance: string) => number;
  getPatientCost: (testColumn: string) => number;
}

// Clinician name normalization — merges misspellings and variants
const CLINICIAN_ALIASES: Record<string, string> = {
  'Dr. Arujuna': 'Dr Arujuna',
  'Dr Pavilidis': 'Dr Pavlidis',
  'Dr Padwan': 'Dr Pradhan',
  'Prof Gard': 'Prof Garg',
  'Dr Dhamrit': 'Dr Dhamrait',
  'Dr Savvatiis': 'Dr Savvatis',
  'Dr Saheechi': 'Dr Saheecha',
  'Dr Barhami': 'Mr Bahrami',
  'Dr Bahrami': 'Mr Bahrami',
  'Dr J Cheong': 'Dr Cheong',
  'Dr D Augustine': 'Dr Augustine',
  'Dr P Heck': 'Dr Heck',
  'Dr M Chabok': 'Dr Chabok',
  'Professor Augustine': 'Prof Augustine',
  'Dr Sanjay Gupta': 'Dr Gupta',
  'De Behar': 'Dr Behar',
  'Dr Kahn': 'Dr M Kahn',
  'Dr Garg': 'Prof Garg',
  'Dr Kardos': 'Prof Kardos',
  'Dr Missouris': 'Prof Missouris',
  'Dr Damir': 'Dr Demir',
};

export function normalizeClinician(raw: string): string {
  if (!raw) return 'Unknown';
  const trimmed = raw.trim();
  return CLINICIAN_ALIASES[trimmed] || trimmed;
}

export function normalizeInsurance(raw: string): string {
  if (!raw) return 'Unknown';
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed || trimmed.length < 2) return 'Unknown';
  
  if (trimmed.includes('AXA')) return 'AXA';
  if (trimmed.includes('BUPA')) return 'BUPA';
  if (trimmed.includes('VITALITY') || trimmed.includes('VTIALITY') || trimmed.includes('VTALITY')) return 'Vitality';
  if (trimmed.includes('WPA')) return 'WPA';
  if (trimmed.includes('HEALIX')) return 'Healix';
  if (trimmed.includes('CIGNA')) return 'Cigna';
  if (trimmed.includes('AVIVA')) return 'Aviva';
  if (trimmed.includes('ALLIANZ')) return 'Allianz';
  if (trimmed.includes('EXETER')) return 'Exeter';
  if (trimmed.includes('SELF') || trimmed.includes('SF ') || trimmed === 'SF') return 'Self-Funded';
  if (trimmed.includes('NHS')) return 'NHS';
  if (trimmed.includes('EMBASSY') || trimmed.includes('MOD') || trimmed.includes('ATLAS')) return 'Other';
  if (trimmed.includes('HEALTH ON LINE') || trimmed.includes('HEALTH PARTNERS') || trimmed.includes('FREEDOM')) return 'Other';
  if (trimmed.includes('NOT DONE') || trimmed.includes('NOT HAPPENED') || trimmed.includes('CANCELLED') || trimmed.includes('BOOKED ELSEWHERE') || trimmed.includes('DNA')) return 'Cancelled';
  if (trimmed.includes('CONFIRM') || trimmed.includes('N/A') || trimmed === '?') return 'Unknown';
  
  return 'Other';
}

// ─── Helper: get fee for a test+insurance, using overrides if available ───
function getFee(testColumn: string, insurance: string, overrides?: PricingOverrides): number {
  if (overrides) {
    return overrides.getReportingFee(testColumn, insurance);
  }
  return getStaticInsuranceFee(testColumn, insurance);
}

function getRevenue(testColumn: string, insurance: string, overrides?: PricingOverrides): number {
  if (overrides) {
    return overrides.getPatientCost(testColumn);
  }
  // Static fallback
  const feeTestName = TEST_TO_FEE_SCHEDULE_MAP[testColumn];
  if (feeTestName) {
    const feeRow = INSURANCE_FEE_SCHEDULE.find(f => f.test === feeTestName);
    if (feeRow) return feeRow.sfPatientCost;
  }
  return 0;
}

// ─── Date helpers ───

export function getDateRange(filter: TimeFilter, customDate?: Date): { start: Date; end: Date } {
  const now = customDate || new Date();
  switch (filter) {
    case 'daily':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'weekly':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'monthly':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'yearly':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'all':
    default:
      return { start: new Date(2020, 0, 1), end: new Date(2030, 11, 31) };
  }
}

export function filterReferralsByDate(
  referrals: Referral[],
  start: Date,
  end: Date
): Referral[] {
  return referrals.filter((r) => {
    if (!r.referralReceived) return false;
    try {
      const date = parseISO(r.referralReceived);
      return isWithinInterval(date, { start, end });
    } catch {
      return false;
    }
  });
}

export function filterReferralsByDateRange(
  referrals: Referral[],
  startDate: string,
  endDate: string
): Referral[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  return filterReferralsByDate(referrals, start, end);
}

export function countTestsForReferral(referral: Referral): number {
  return Object.values(referral.tests).filter(Boolean).length;
}

export function getTestBreakdown(referrals: Referral[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const r of referrals) {
    for (const [test, done] of Object.entries(r.tests)) {
      if (done) {
        breakdown[test] = (breakdown[test] || 0) + 1;
      }
    }
  }
  return breakdown;
}

// ─── Revenue / Fee calculations (with optional pricing overrides) ───

export function calculateReportingFees(
  referrals: Referral[],
  prices: SelfFundingPrice[],
  overrides?: PricingOverrides
): number {
  let total = 0;
  for (const r of referrals) {
    const insurance = normalizeInsurance(r.insuranceDetails);
    for (const [test, done] of Object.entries(r.tests)) {
      if (done) {
        const fee = getFee(test, insurance, overrides);
        if (fee > 0) {
          total += fee;
        } else if (!overrides) {
          // Fallback to self-funding prices sheet only when no overrides
          const priceKey = TEST_TO_PRICE_MAP[test];
          if (priceKey) {
            const p = prices.find(pr => pr.test === priceKey);
            if (p) total += p.reportingFee;
          }
        }
      }
    }
  }
  return total;
}

export function calculateEstimatedRevenue(
  referrals: Referral[],
  prices: SelfFundingPrice[],
  overrides?: PricingOverrides
): number {
  let total = 0;
  for (const r of referrals) {
    const insurance = normalizeInsurance(r.insuranceDetails);
    for (const [test, done] of Object.entries(r.tests)) {
      if (done) {
        const rev = getRevenue(test, insurance, overrides);
        if (rev > 0) {
          total += rev;
          continue;
        }
        if (!overrides) {
          // Fallback to self-funding prices sheet
          const priceKey = TEST_TO_PRICE_MAP[test];
          if (priceKey) {
            const p = prices.find(pr => pr.test === priceKey);
            if (p) total += p.sfPrice;
          }
        }
      }
    }
  }
  return total;
}

export function getClinicianRevenue(
  referrals: Referral[],
  prices: SelfFundingPrice[],
  overrides?: PricingOverrides
): ClinicianRevenue[] {
  const grouped = new Map<string, Referral[]>();
  for (const r of referrals) {
    const name = normalizeClinician(r.referringConsultant);
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name)!.push(r);
  }

  return Array.from(grouped.entries())
    .map(([clinician, refs]) => ({
      clinician,
      referralCount: refs.length,
      testBreakdown: getTestBreakdown(refs),
      estimatedRevenue: calculateEstimatedRevenue(refs, prices, overrides),
      reportingFees: calculateReportingFees(refs, prices, overrides),
    }))
    .sort((a, b) => b.referralCount - a.referralCount);
}

export function getInsuranceBreakdown(referrals: Referral[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const r of referrals) {
    const ins = normalizeInsurance(r.insuranceDetails);
    breakdown[ins] = (breakdown[ins] || 0) + 1;
  }
  return breakdown;
}

export function getTimeSeriesData(
  referrals: Referral[],
  filter: TimeFilter,
  start: Date,
  end: Date
): { date: string; count: number }[] {
  let intervals: Date[];
  let formatStr: string;

  switch (filter) {
    case 'daily':
    case 'weekly':
      intervals = eachDayOfInterval({ start, end });
      formatStr = 'MMM dd';
      break;
    case 'monthly':
      intervals = eachDayOfInterval({ start, end });
      formatStr = 'MMM dd';
      break;
    case 'yearly':
      intervals = eachMonthOfInterval({ start, end });
      formatStr = 'MMM yyyy';
      break;
    case 'all':
    default:
      intervals = eachMonthOfInterval({ start, end });
      formatStr = 'MMM yyyy';
      break;
  }

  const counts = new Map<string, number>();
  for (const d of intervals) {
    counts.set(format(d, formatStr), 0);
  }

  for (const r of referrals) {
    if (!r.referralReceived) continue;
    try {
      const date = parseISO(r.referralReceived);
      const key = format(date, formatStr);
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    } catch {
      // skip
    }
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

export function getTopClinicians(
  referrals: Referral[],
  prices: SelfFundingPrice[],
  limit = 10,
  overrides?: PricingOverrides
): ClinicianRevenue[] {
  return getClinicianRevenue(referrals, prices, overrides).slice(0, limit);
}

export function getReportingFeesByClinicianAndTest(
  referrals: Referral[],
  clinicianName: string,
  prices: SelfFundingPrice[],
  startDate: string,
  endDate: string,
  overrides?: PricingOverrides
): { test: string; count: number; unitFee: number; total: number; patients: string[]; insurance: string }[] {
  const filtered = referrals.filter(
    (r) =>
      normalizeClinician(r.referringConsultant) === clinicianName &&
      r.referralReceived &&
      r.referralReceived >= startDate &&
      r.referralReceived <= endDate
  );

  const testInsMap = new Map<string, { count: number; patients: string[]; insurance: string }>();

  for (const r of filtered) {
    const insurance = normalizeInsurance(r.insuranceDetails);
    for (const [test, done] of Object.entries(r.tests)) {
      if (done) {
        const fee = getFee(test, insurance, overrides);
        if (fee > 0) {
          const key = `${test}|${insurance}`;
          if (!testInsMap.has(key)) testInsMap.set(key, { count: 0, patients: [], insurance });
          const entry = testInsMap.get(key)!;
          entry.count++;
          if (r.patientName) entry.patients.push(r.patientName);
        }
      }
    }
  }

  return Array.from(testInsMap.entries())
    .map(([key, data]) => {
      const [test] = key.split('|');
      const unitFee = getFee(test, data.insurance, overrides);
      return {
        test,
        count: data.count,
        unitFee,
        total: data.count * unitFee,
        patients: data.patients,
        insurance: data.insurance,
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}

// Insurance Analysis — breakdown by insurance provider with revenue
export function getInsuranceAnalysis(
  referrals: Referral[],
  prices: SelfFundingPrice[],
  overrides?: PricingOverrides
): {
  insurance: string;
  totalReferrals: number;
  percentOfTotal: number;
  totalTests: number;
  avgTestsPerReferral: number;
  uniqueClinicians: number;
  reportingFees: number;
  estimatedRevenue: number;
}[] {
  const grouped = new Map<string, Referral[]>();
  for (const r of referrals) {
    const ins = normalizeInsurance(r.insuranceDetails);
    if (ins === 'Cancelled' || ins === 'Unknown') continue;
    if (!grouped.has(ins)) grouped.set(ins, []);
    grouped.get(ins)!.push(r);
  }

  const totalCount = referrals.length;

  return Array.from(grouped.entries())
    .map(([insurance, refs]) => {
      const totalTests = refs.reduce((sum, r) => sum + countTestsForReferral(r), 0);
      const clinicians = new Set(refs.map(r => normalizeClinician(r.referringConsultant)));
      return {
        insurance,
        totalReferrals: refs.length,
        percentOfTotal: totalCount > 0 ? (refs.length / totalCount) * 100 : 0,
        totalTests,
        avgTestsPerReferral: refs.length > 0 ? Math.round((totalTests / refs.length) * 10) / 10 : 0,
        uniqueClinicians: clinicians.size,
        reportingFees: calculateReportingFees(refs, prices, overrides),
        estimatedRevenue: calculateEstimatedRevenue(refs, prices, overrides),
      };
    })
    .sort((a, b) => b.totalReferrals - a.totalReferrals);
}

// Turnaround metrics
export function getTurnaroundMetrics(referrals: Referral[]): {
  avgReferralToAppt: number;
  avgApptToResults: number;
  medianReferralToAppt: number;
  medianApptToResults: number;
  completionRate: number;
  resultsSent: number;
  resultsPending: number;
} {
  const refToApptDays: number[] = [];
  const apptToResultDays: number[] = [];
  let resultsSent = 0;
  let resultsPending = 0;

  for (const r of referrals) {
    const hasResults = !!r.sentResults;
    if (hasResults) resultsSent++;
    else resultsPending++;

    if (r.referralReceived && r.dateOfAppt) {
      try {
        const refDate = parseISO(r.referralReceived);
        const apptDate = parseISO(r.dateOfAppt);
        const diff = Math.round((apptDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff < 365) refToApptDays.push(diff);
      } catch { /* skip */ }
    }

    if (r.dateOfAppt && r.sentResults) {
      try {
        const apptDate = parseISO(r.dateOfAppt);
        const resultDate = parseISO(r.sentResults);
        const diff = Math.round((resultDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff < 365) apptToResultDays.push(diff);
      } catch { /* skip */ }
    }
  }

  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

  return {
    avgReferralToAppt: avg(refToApptDays),
    avgApptToResults: avg(apptToResultDays),
    medianReferralToAppt: median(refToApptDays),
    medianApptToResults: median(apptToResultDays),
    completionRate: referrals.length > 0 ? Math.round((resultsSent / referrals.length) * 1000) / 10 : 0,
    resultsSent,
    resultsPending,
  };
}
