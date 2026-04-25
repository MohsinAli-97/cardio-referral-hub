// NHC Cardio Referral Hub — Data Context
// Global state for parsed Excel data with file upload support

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { loadWorkbook, parseClinicians, parseReferrals, parseSelfFundingPrices, parseAMBPTracking, parseWorkbookFromBuffer } from '@/lib/dataParser';
import { Clinician, Referral, SelfFundingPrice, AMBPTracking } from '@/lib/types';

interface DataState {
  clinicians: Clinician[];
  referrals: Referral[];
  prices: SelfFundingPrice[];
  ambpTracking: AMBPTracking[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  fileName: string | null;
  reload: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  clearUpload: () => void;
}

const DataContext = createContext<DataState | null>(null);

const EXCEL_URL = '/manus-storage/referral-data_93e2ca8b.xlsx';
const STORAGE_KEY = 'nhc-referral-data';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [prices, setPrices] = useState<SelfFundingPrice[]>([]);
  const [ambpTracking, setAmbpTracking] = useState<AMBPTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileBufferRef = useRef<ArrayBuffer | null>(null);

  const processWorkbook = useCallback((wb: import('xlsx').WorkBook) => {
    setClinicians(parseClinicians(wb));
    setReferrals(parseReferrals(wb));
    setPrices(parseSelfFundingPrices(wb));
    setAmbpTracking(parseAMBPTracking(wb));
    setLastUpdated(new Date());
  }, []);

  // Load from default URL or stored file
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if we have a stored file in IndexedDB
      const storedData = await getStoredFile();
      if (storedData) {
        const wb = parseWorkbookFromBuffer(storedData.buffer);
        processWorkbook(wb);
        setFileName(storedData.name);
        fileBufferRef.current = storedData.buffer;
      } else {
        // Fall back to the bundled default file
        const wb = await loadWorkbook(EXCEL_URL);
        processWorkbook(wb);
        setFileName('Default dataset');
      }
    } catch (err) {
      console.error('Failed to load Excel data:', err);
      setError('Failed to load data. Please upload an Excel file.');
    } finally {
      setLoading(false);
    }
  }, [processWorkbook]);

  // Upload a new Excel file
  const uploadFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = parseWorkbookFromBuffer(buffer);
      processWorkbook(wb);
      setFileName(file.name);
      fileBufferRef.current = buffer;
      // Store in IndexedDB for persistence
      await storeFile(buffer, file.name);
    } catch (err) {
      console.error('Failed to parse uploaded file:', err);
      setError('Failed to parse the uploaded file. Please ensure it matches the expected format.');
    } finally {
      setLoading(false);
    }
  }, [processWorkbook]);

  // Clear uploaded file and revert to default
  const clearUpload = useCallback(async () => {
    await removeStoredFile();
    fileBufferRef.current = null;
    setFileName(null);
    loadData();
  }, [loadData]);

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
        fileName,
        reload: loadData,
        uploadFile,
        clearUpload,
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

// ─── IndexedDB helpers for persisting uploaded files ───

const DB_NAME = 'nhc-referral-hub';
const STORE_NAME = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeFile(buffer: ArrayBuffer, name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ buffer, name, timestamp: Date.now() }, STORAGE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getStoredFile(): Promise<{ buffer: ArrayBuffer; name: string } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(STORAGE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function removeStoredFile(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(STORAGE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
