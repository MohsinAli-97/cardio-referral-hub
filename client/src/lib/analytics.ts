// NHC Cardio Referral Hub — Analytics & Revenue Calculations
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  parseISO, isWithinInterval, format, eachDayOfInterval,
  eachWeekOfInterval, eachMonthOfInterval,
} from 'date-fns';
import {
  Referral, SelfFundingPrice, TimeFilter,
  ClinicianRevenue, TEST_TO_PRICE_MAP, NORMALIZED_INSURANCE,
} from './types';

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
  
  // Fuzzy keyword matching for insurance types
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

export function calculateReportingFees(
  referrals: Referral[],
  prices: SelfFundingPrice[]
): number {
  const priceMap = new Map<string, number>();
  for (const p of prices) {
    priceMap.set(p.test, p.reportingFee);
  }

  let total = 0;
  for (const r of referrals) {
    for (const [test, done] of Object.entries(r.tests)) {
      if (done) {
        const priceKey = TEST_TO_PRICE_MAP[test];
        if (priceKey) {
          const fee = priceMap.get(priceKey);
          if (fee) total += fee;
        }
      }
    }
  }
  return total;
}

export function calculateEstimatedRevenue(
  referrals: Referral[],
  prices: SelfFundingPrice[]
): number {
  const priceMap = new Map<string, number>();
  for (const p of prices) {
    priceMap.set(p.test, p.sfPrice);
  }

  let total = 0;
  for (const r of referrals) {
    for (const [test, done] of Object.entries(r.tests)) {
      if (done) {
        const priceKey = TEST_TO_PRICE_MAP[test];
        if (priceKey) {
          const price = priceMap.get(priceKey);
          if (price) total += price;
        }
      }
    }
  }
  return total;
}

export function getClinicianRevenue(
  referrals: Referral[],
  prices: SelfFundingPrice[]
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
      estimatedRevenue: calculateEstimatedRevenue(refs, prices),
      reportingFees: calculateReportingFees(refs, prices),
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
  limit = 10
): ClinicianRevenue[] {
  return getClinicianRevenue(referrals, prices).slice(0, limit);
}

export function getReportingFeesByClinicianAndTest(
  referrals: Referral[],
  clinicianName: string,
  prices: SelfFundingPrice[],
  startDate: string,
  endDate: string
): { test: string; count: number; unitFee: number; total: number; patients: string[] }[] {
  const priceMap = new Map<string, number>();
  for (const p of prices) {
    priceMap.set(p.test, p.reportingFee);
  }

  const filtered = referrals.filter(
    (r) =>
      normalizeClinician(r.referringConsultant) === clinicianName &&
      r.referralReceived &&
      r.referralReceived >= startDate &&
      r.referralReceived <= endDate
  );

  const testMap = new Map<string, { count: number; patients: string[] }>();

  for (const r of filtered) {
    for (const [test, done] of Object.entries(r.tests)) {
      if (done) {
        const priceKey = TEST_TO_PRICE_MAP[test];
        if (priceKey && priceMap.has(priceKey)) {
          if (!testMap.has(test)) testMap.set(test, { count: 0, patients: [] });
          const entry = testMap.get(test)!;
          entry.count++;
          if (r.patientName) entry.patients.push(r.patientName);
        }
      }
    }
  }

  return Array.from(testMap.entries())
    .map(([test, data]) => {
      const priceKey = TEST_TO_PRICE_MAP[test];
      const unitFee = priceKey ? priceMap.get(priceKey) || 0 : 0;
      return {
        test,
        count: data.count,
        unitFee,
        total: data.count * unitFee,
        patients: data.patients,
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}
