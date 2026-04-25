// NHC Cardio Referral Hub — Data Types
// Matches the Excel spreadsheet structure from SharePoint

export interface Clinician {
  name: string;
  email: string;
  telephone: string;
  secretary: string;
  extraInfo: string;
  bankCompany: string;
  bankName: string;
  sortCode: string;
  account: string;
}

export interface Referral {
  referringConsultant: string;
  patientName: string;
  dob: string | null;
  testsNeeded: string;
  referralReceived: string | null;
  comments: string;
  dateOfAppt: string | null;
  sentResults: string | null;
  insuranceDetails: string;
  specialty: string;
  tests: Record<string, boolean>;
}

export interface SelfFundingPrice {
  test: string;
  sfPrice: number;
  reportingFee: number;
  drDastidarPrice: number | null;
  drGiardiniPrice: number | null;
  drMaaroufPrice: number | null;
  drDastidarReportingFee: number | null;
  drGiardiniReportingFee: number | null;
  drMaaroufReportingFee: number | null;
}

export interface AMBPTracking {
  monitorSerial: string;
  patientName: string;
  dateInitialised: string | null;
  dateReturned: string | null;
  dateDataDownloaded: string | null;
  dateReportUploadedSemble: string | null;
  dateReportUploadedUL: string | null;
}

export type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

export interface RevenueData {
  period: string;
  totalReferrals: number;
  totalTests: number;
  estimatedRevenue: number;
  reportingFees: number;
}

export interface ClinicianRevenue {
  clinician: string;
  referralCount: number;
  testBreakdown: Record<string, number>;
  estimatedRevenue: number;
  reportingFees: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  clinician: Clinician;
  items: InvoiceItem[];
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
}

export interface InvoiceItem {
  testType: string;
  quantity: number;
  unitPrice: number;
  total: number;
  patientNames: string[];
}

export const TEST_COLUMNS = [
  'Echo', 'ECG', 'AMBP', '24-hour Holter', '48-hour Holter',
  '72-hour Holter', '4-day Holter', '5-day Holter', '7-day Holter',
  '11-day Holter', '14-day Holter', 'ESE', 'ETT', 'FLM Panel',
  'Bloods', 'CTCA', 'CMR', 'Carotid Doppler', 'Arterial Doppler',
  'Venous Doppler', 'Renal artery Doppler', 'Bubble Echo', 'CXR',
  'Liver US', 'Thyroid US', 'Abdo US', 'US Testes', 'Kidney US',
  'Tilt Table Test', 'DSE', 'CT chest', 'CT adrenals', 'Urinalysis',
  'Iron infusion', 'MRI of adrenal glands and liver'
] as const;

// Mapping test names to reporting fee keys from the Self-funding prices sheet
export const TEST_TO_PRICE_MAP: Record<string, string> = {
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
  'Venous Doppler': 'Arterial/Venous Doppler',
  'Iron infusion': 'Iron infusion',
};

export const INSURANCE_TYPES = [
  'AXA', 'BUPA', 'Vitality', 'VITALITY', 'WPA', 'Healix', 'HEALIX',
  'SELF FUNDED', 'SELF FUNDING', 'SELF-FUNDING', 'Self funded', 'SELF PAY',
  'SE:LF FUNDING', 'SELF FUNDING '
] as const;

export const NORMALIZED_INSURANCE: Record<string, string> = {
  'AXA': 'AXA',
  'AXA - NOT HAPPENED': 'AXA',
  'AXA - NOT HAPPENED ': 'AXA',
  'BUPA': 'BUPA',
  'BUPA ': 'BUPA',
  'BUPA - CANCELLED': 'BUPA',
  'BUPA - NOT DONE ': 'BUPA',
  'Vitality': 'Vitality',
  'VITALITY': 'Vitality',
  'Vitality ': 'Vitality',
  'WPA': 'WPA',
  'Healix': 'Healix',
  'HEALIX': 'Healix',
  'SELF FUNDED': 'Self-Funded',
  'SELF FUNDED ': 'Self-Funded',
  'SELF FUNDING': 'Self-Funded',
  'SELF FUNDING ': 'Self-Funded',
  'SELF-FUNDING': 'Self-Funded',
  'Self funded': 'Self-Funded',
  'SELF PAY': 'Self-Funded',
  'SE:LF FUNDING': 'Self-Funded',
  'SELF FUNDING. Bloods BUPA': 'Self-Funded',
};
