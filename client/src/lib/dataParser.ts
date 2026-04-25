// NHC Cardio Referral Hub — Excel Data Parser
// Parses the SharePoint Excel file into structured data

import * as XLSX from 'xlsx';
import {
  Clinician,
  Referral,
  SelfFundingPrice,
  AMBPTracking,
  TEST_COLUMNS,
} from './types';

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  if (typeof val === 'string') {
    const str = val.trim();
    if (str === 'N/A' || str === '' || str === 'DIYA' || str.length < 6) return null;
    // Try parsing as date
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

function safeString(val: unknown): string {
  if (val === null || val === undefined || val === false) return '';
  return String(val).trim();
}

export function parseClinicians(wb: XLSX.WorkBook): Clinician[] {
  const ws = wb.Sheets['Contact details'];
  if (!ws) return [];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return data
    .filter((row) => {
      const name = safeString(row['Clinician']);
      return name && name.length > 1 && !name.includes('ECG on demand');
    })
    .map((row) => ({
      name: safeString(row['Clinician']),
      email: safeString(row['Email']),
      telephone: safeString(row['Telephone number']),
      secretary: safeString(row['Name (secretary)']),
      extraInfo: safeString(row['Extra info']),
      bankCompany: safeString(row['Bank company']),
      bankName: safeString(row['Name']),
      sortCode: safeString(row['Sort Code']),
      account: safeString(row['Account']),
    }));
}

export function parseReferrals(wb: XLSX.WorkBook): Referral[] {
  const ws = wb.Sheets['Referrals'];
  if (!ws) return [];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return data
    .filter((row) => {
      const consultant = safeString(row['Referring Consultant']);
      return consultant && consultant.length > 1;
    })
    .map((row) => {
      const tests: Record<string, boolean> = {};
      for (const col of TEST_COLUMNS) {
        const val = row[col];
        tests[col] = val === true || val === 'TRUE' || val === 1;
      }
      return {
        referringConsultant: safeString(row['Referring Consultant']),
        patientName: safeString(row['Patient name']),
        dob: parseDate(row['DOB']),
        testsNeeded: safeString(row['Tests needed']),
        referralReceived: parseDate(row['Referral received']),
        comments: safeString(row['Comments']),
        dateOfAppt: parseDate(row['Date of appt/postage']),
        sentResults: parseDate(row['Sent results']),
        insuranceDetails: safeString(row['Insurance details']),
        specialty: safeString(row['Specialty']),
        tests,
      };
    });
}

export function parseSelfFundingPrices(wb: XLSX.WorkBook): SelfFundingPrice[] {
  const ws = wb.Sheets['Self-funding prices'];
  if (!ws) return [];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return data
    .filter((row) => safeString(row['Test']).length > 0)
    .map((row) => ({
      test: safeString(row['Test']),
      sfPrice: Number(row['SF price']) || 0,
      reportingFee: Number(row['Reporting fees']) || 0,
      drDastidarPrice: row['Dr Dastidar price'] ? Number(row['Dr Dastidar price']) : null,
      drGiardiniPrice: row['Dr Giardini price'] ? Number(row['Dr Giardini price']) : null,
      drMaaroufPrice: row['Dr Maarouf price'] ? Number(row['Dr Maarouf price']) : null,
      drDastidarReportingFee: row['Dr Dastidar reporting fee'] ? Number(row['Dr Dastidar reporting fee']) : null,
      drGiardiniReportingFee: row['Dr Giardini reporting fee'] ? Number(row['Dr Giardini reporting fee']) : null,
      drMaaroufReportingFee: row['Dr Maarouf reporting fee'] ? Number(row['Dr Maarouf reporting fee']) : null,
    }));
}

export function parseAMBPTracking(wb: XLSX.WorkBook): AMBPTracking[] {
  const ws = wb.Sheets['AMBP tracking '];
  if (!ws) {
    // Try without trailing space
    const ws2 = wb.Sheets['AMBP tracking'];
    if (!ws2) return [];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws2);
    return parseAMBPData(data);
  }
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return parseAMBPData(data);
}

function parseAMBPData(data: Record<string, unknown>[]): AMBPTracking[] {
  return data
    .filter((row) => safeString(row['Patient name']).length > 0)
    .map((row) => ({
      monitorSerial: safeString(row['Monitor serial number']),
      patientName: safeString(row['Patient name']),
      dateInitialised: safeString(row['Date initialised']),
      dateReturned: safeString(row['Date returned']),
      dateDataDownloaded: safeString(row['Date data downloaded']),
      dateReportUploadedSemble: safeString(row['Date report uploaded to Semble']),
      dateReportUploadedUL: safeString(row['Date report uploaded to UL']),
    }));
}

export async function loadWorkbook(url: string): Promise<XLSX.WorkBook> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
}
