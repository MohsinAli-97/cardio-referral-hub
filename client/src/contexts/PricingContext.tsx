// NHC Cardio Referral Hub — Pricing Context
// Editable pricing for insurance reporting fees and self-pay costs
// Persists to localStorage so changes survive page reloads

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { INSURANCE_FEE_SCHEDULE, type InsuranceFeeRow } from '@/lib/types';

// ─── Types ───

export interface PricingInsurer {
  key: string;   // internal key, e.g. 'healix', 'axaPPP', 'custom_1'
  label: string;  // display name, e.g. 'Healix', 'AXA PPP'
}

export interface PricingTestRow {
  test: string;
  fees: Record<string, number>; // key = insurer key, value = fee amount
  patientCost: number;          // self-funding patient cost
}

export interface PricingState {
  insurers: PricingInsurer[];
  tests: PricingTestRow[];
  updateFee: (testName: string, insurerKey: string, value: number) => void;
  updatePatientCost: (testName: string, value: number) => void;
  addInsurer: (label: string) => void;
  removeInsurer: (key: string) => void;
  renameInsurer: (key: string, newLabel: string) => void;
  addTest: (testName: string) => void;
  removeTest: (testName: string) => void;
  renameTest: (oldName: string, newName: string) => void;
  resetToDefaults: () => void;
  getReportingFee: (testColumn: string, insurance: string) => number;
  getPatientCost: (testColumn: string) => number;
}

const PricingContext = createContext<PricingState | null>(null);

const STORAGE_KEY = 'nhc-pricing-config';

// Default insurers derived from the brochure fee schedule
const DEFAULT_INSURERS: PricingInsurer[] = [
  { key: 'healix', label: 'Healix' },
  { key: 'axaPPP', label: 'AXA PPP' },
  { key: 'allianz', label: 'Allianz' },
  { key: 'cigna', label: 'Cigna' },
  { key: 'wpa', label: 'WPA' },
  { key: 'bupa', label: 'BUPA' },
  { key: 'vitality', label: 'Vitality' },
  { key: 'aviva', label: 'Aviva' },
  { key: 'selfPay', label: 'Self-Pay' },
];

// Convert the static INSURANCE_FEE_SCHEDULE into editable rows
function buildDefaultTests(): PricingTestRow[] {
  return INSURANCE_FEE_SCHEDULE.map((row: InsuranceFeeRow) => ({
    test: row.test,
    fees: {
      healix: row.healix,
      axaPPP: row.axaPPP,
      allianz: row.allianz,
      cigna: row.cigna,
      wpa: row.wpa,
      bupa: row.bupa,
      vitality: row.vitality,
      aviva: row.aviva,
      selfPay: row.selfPay,
    },
    patientCost: row.sfPatientCost,
  }));
}

// ─── Map test column names to pricing test names ───
const TEST_COLUMN_TO_PRICING: Record<string, string> = {
  'ESE': 'Exercise Stress Echocardiogram',
  '14-day Holter': '14 Day Holter',
  '7-day Holter': '7 Day Holter',
  '72-hour Holter': '72 Hour Holter',
  '48-hour Holter': '48 Hour Holter',
  '24-hour Holter': '24 Hour Holter',
  'Echo': 'Echocardiogram',
  'Bubble Echo': 'Bubble Echocardiogram',
  'ETT': 'Exercise Tolerance Test',
  'AMBP': '24H Blood Pressure Monitor',
  'ECG': 'Resting ECG',
  'Bloods': 'Full Blood Tests',
  'FLM Panel': 'Full Blood Tests',
  'Iron infusion': 'Iron Infusion',
  'Carotid Doppler': 'Carotid Doppler',
  'Arterial Doppler': 'Arterial Doppler',
  'Venous Doppler': 'Venous Doppler',
};

// ─── Insurance name → insurer key matching ───
function matchInsurerKey(insurance: string, insurers: PricingInsurer[]): string {
  const lower = insurance.toLowerCase();
  if (lower.includes('healix')) return 'healix';
  if (lower.includes('axa')) return 'axaPPP';
  if (lower.includes('allianz')) return 'allianz';
  if (lower.includes('cigna')) return 'cigna';
  if (lower.includes('wpa')) return 'wpa';
  if (lower.includes('bupa')) return 'bupa';
  if (lower.includes('vitality')) return 'vitality';
  if (lower.includes('aviva')) return 'aviva';
  if (lower.includes('self') || lower.includes('sf ') || lower === 'sf') return 'selfPay';
  if (lower.includes('nhs')) return 'selfPay'; // NHS defaults to self-pay rates

  // Check custom insurers by label
  for (const ins of insurers) {
    if (lower.includes(ins.label.toLowerCase())) return ins.key;
  }

  return 'selfPay'; // default fallback
}

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [insurers, setInsurers] = useState<PricingInsurer[]>(DEFAULT_INSURERS);
  const [tests, setTests] = useState<PricingTestRow[]>(buildDefaultTests);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.insurers && parsed.tests) {
          setInsurers(parsed.insurers);
          setTests(parsed.tests);
        }
      }
    } catch {
      // ignore parse errors, use defaults
    }
  }, []);

  // Persist to localStorage on every change
  const persist = useCallback((ins: PricingInsurer[], tst: PricingTestRow[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ insurers: ins, tests: tst }));
    } catch {
      // ignore storage errors
    }
  }, []);

  const updateFee = useCallback((testName: string, insurerKey: string, value: number) => {
    setTests(prev => {
      const next = prev.map(t =>
        t.test === testName ? { ...t, fees: { ...t.fees, [insurerKey]: value } } : t
      );
      persist(insurers, next);
      return next;
    });
  }, [insurers, persist]);

  const updatePatientCost = useCallback((testName: string, value: number) => {
    setTests(prev => {
      const next = prev.map(t =>
        t.test === testName ? { ...t, patientCost: value } : t
      );
      persist(insurers, next);
      return next;
    });
  }, [insurers, persist]);

  const addInsurer = useCallback((label: string) => {
    const key = `custom_${Date.now()}`;
    const newInsurer: PricingInsurer = { key, label };
    setInsurers(prev => {
      const next = [...prev, newInsurer];
      // Add 0 fee for this insurer to all tests
      setTests(prevTests => {
        const nextTests = prevTests.map(t => ({
          ...t,
          fees: { ...t.fees, [key]: 0 },
        }));
        persist(next, nextTests);
        return nextTests;
      });
      return next;
    });
  }, [persist]);

  const removeInsurer = useCallback((key: string) => {
    setInsurers(prev => {
      const next = prev.filter(i => i.key !== key);
      setTests(prevTests => {
        const nextTests = prevTests.map(t => {
          const { [key]: _, ...restFees } = t.fees;
          return { ...t, fees: restFees };
        });
        persist(next, nextTests);
        return nextTests;
      });
      return next;
    });
  }, [persist]);

  const renameInsurer = useCallback((key: string, newLabel: string) => {
    setInsurers(prev => {
      const next = prev.map(i => i.key === key ? { ...i, label: newLabel } : i);
      persist(next, tests);
      return next;
    });
  }, [tests, persist]);

  const addTest = useCallback((testName: string) => {
    const fees: Record<string, number> = {};
    insurers.forEach(ins => { fees[ins.key] = 0; });
    const newTest: PricingTestRow = { test: testName, fees, patientCost: 0 };
    setTests(prev => {
      const next = [...prev, newTest];
      persist(insurers, next);
      return next;
    });
  }, [insurers, persist]);

  const removeTest = useCallback((testName: string) => {
    setTests(prev => {
      const next = prev.filter(t => t.test !== testName);
      persist(insurers, next);
      return next;
    });
  }, [insurers, persist]);

  const renameTest = useCallback((oldName: string, newName: string) => {
    setTests(prev => {
      const next = prev.map(t => t.test === oldName ? { ...t, test: newName } : t);
      persist(insurers, next);
      return next;
    });
  }, [insurers, persist]);

  const resetToDefaults = useCallback(() => {
    const defIns = DEFAULT_INSURERS;
    const defTests = buildDefaultTests();
    setInsurers(defIns);
    setTests(defTests);
    persist(defIns, defTests);
  }, [persist]);

  // Get reporting fee for a test column name and insurance string
  const getReportingFee = useCallback((testColumn: string, insurance: string): number => {
    const pricingTestName = TEST_COLUMN_TO_PRICING[testColumn];
    if (!pricingTestName) return 0;
    const row = tests.find(t => t.test === pricingTestName);
    if (!row) return 0;
    const insurerKey = matchInsurerKey(insurance, insurers);
    return row.fees[insurerKey] ?? 0;
  }, [tests, insurers]);

  // Get patient cost for a test column name
  const getPatientCost = useCallback((testColumn: string): number => {
    const pricingTestName = TEST_COLUMN_TO_PRICING[testColumn];
    if (!pricingTestName) return 0;
    const row = tests.find(t => t.test === pricingTestName);
    return row?.patientCost ?? 0;
  }, [tests]);

  return (
    <PricingContext.Provider
      value={{
        insurers,
        tests,
        updateFee,
        updatePatientCost,
        addInsurer,
        removeInsurer,
        renameInsurer,
        addTest,
        removeTest,
        renameTest,
        resetToDefaults,
        getReportingFee,
        getPatientCost,
      }}
    >
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing(): PricingState {
  const ctx = useContext(PricingContext);
  if (!ctx) throw new Error('usePricing must be used within PricingProvider');
  return ctx;
}
