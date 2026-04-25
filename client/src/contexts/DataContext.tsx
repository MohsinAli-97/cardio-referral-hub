// NHC Cardio Referral Hub — Data Context
// Global state for parsed Excel data

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadWorkbook, parseClinicians, parseReferrals, parseSelfFundingPrices, parseAMBPTracking } from '@/lib/dataParser';
import { Clinician, Referral, SelfFundingPrice, AMBPTracking } from '@/lib/types';

interface DataState {
  clinicians: Clinician[];
  referrals: Referral[];
  prices: SelfFundingPrice[];
  ambpTracking: AMBPTracking[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  reload: () => Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

const EXCEL_URL = '/manus-storage/referral-data_5e839392.xlsx';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [prices, setPrices] = useState<SelfFundingPrice[]>([]);
  const [ambpTracking, setAmbpTracking] = useState<AMBPTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wb = await loadWorkbook(EXCEL_URL);
      setClinicians(parseClinicians(wb));
      setReferrals(parseReferrals(wb));
      setPrices(parseSelfFundingPrices(wb));
      setAmbpTracking(parseAMBPTracking(wb));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load Excel data:', err);
      setError('Failed to load data. Please check the file is accessible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DataContext.Provider
      value={{
        clinicians,
        referrals,
        prices,
        ambpTracking,
        loading,
        error,
        lastUpdated,
        reload: loadData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
