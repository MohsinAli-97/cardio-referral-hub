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

// Insurance Reporting Fees Schedule from the NHC Cardiologist Brochure
// Fees NHC pays TO the cardiologist per test, by insurance provider
export interface InsuranceFeeRow {
  test: string;
  healix: number;
  axaPPP: number;
  allianz: number;
  cigna: number;
  wpa: number;
  bupa: number;
  vitality: number;
  aviva: number;
  selfPay: number;
  sfPatientCost: number;
}

export const INSURANCE_FEE_SCHEDULE: InsuranceFeeRow[] = [
  { test: 'Exercise Stress Echocardiogram', healix: 400, axaPPP: 375, allianz: 400, cigna: 400, wpa: 350, bupa: 350, vitality: 300, aviva: 350, selfPay: 350, sfPatientCost: 850 },
  { test: '14 Day Holter', healix: 400, axaPPP: 400, allianz: 400, cigna: 400, wpa: 400, bupa: 400, vitality: 300, aviva: 400, selfPay: 300, sfPatientCost: 900 },
  { test: '7 Day Holter', healix: 350, axaPPP: 300, allianz: 300, cigna: 350, wpa: 350, bupa: 300, vitality: 200, aviva: 300, selfPay: 250, sfPatientCost: 750 },
  { test: '72 Hour Holter', healix: 250, axaPPP: 200, allianz: 250, cigna: 250, wpa: 200, bupa: 100, vitality: 150, aviva: 200, selfPay: 200, sfPatientCost: 590 },
  { test: '48 Hour Holter', healix: 150, axaPPP: 200, allianz: 150, cigna: 150, wpa: 150, bupa: 100, vitality: 150, aviva: 150, selfPay: 200, sfPatientCost: 490 },
  { test: '24 Hour Holter', healix: 125, axaPPP: 100, allianz: 125, cigna: 125, wpa: 100, bupa: 100, vitality: 100, aviva: 100, selfPay: 150, sfPatientCost: 390 },
  { test: 'Echocardiogram', healix: 200, axaPPP: 150, allianz: 200, cigna: 130, wpa: 200, bupa: 130, vitality: 130, aviva: 150, selfPay: 180, sfPatientCost: 490 },
  { test: 'Bubble Echocardiogram', healix: 300, axaPPP: 300, allianz: 300, cigna: 300, wpa: 300, bupa: 300, vitality: 300, aviva: 300, selfPay: 300, sfPatientCost: 800 },
  { test: 'Exercise Tolerance Test', healix: 150, axaPPP: 90, allianz: 150, cigna: 150, wpa: 100, bupa: 90, vitality: 90, aviva: 150, selfPay: 125, sfPatientCost: 390 },
  { test: '24H Blood Pressure Monitor', healix: 150, axaPPP: 125, allianz: 150, cigna: 150, wpa: 150, bupa: 100, vitality: 150, aviva: 125, selfPay: 150, sfPatientCost: 390 },
  { test: 'Resting ECG', healix: 50, axaPPP: 50, allianz: 50, cigna: 50, wpa: 50, bupa: 50, vitality: 50, aviva: 50, selfPay: 50, sfPatientCost: 150 },
  { test: 'Full Blood Tests', healix: 150, axaPPP: 150, allianz: 150, cigna: 150, wpa: 150, bupa: 150, vitality: 150, aviva: 150, selfPay: 100, sfPatientCost: 590 },
  { test: 'Iron Infusion', healix: 100, axaPPP: 100, allianz: 100, cigna: 100, wpa: 100, bupa: 100, vitality: 100, aviva: 100, selfPay: 150, sfPatientCost: 800 },
  { test: 'Carotid Doppler', healix: 50, axaPPP: 50, allianz: 50, cigna: 50, wpa: 50, bupa: 50, vitality: 50, aviva: 50, selfPay: 50, sfPatientCost: 390 },
  { test: 'Arterial Doppler', healix: 50, axaPPP: 50, allianz: 50, cigna: 50, wpa: 50, bupa: 50, vitality: 50, aviva: 50, selfPay: 50, sfPatientCost: 400 },
  { test: 'Venous Doppler', healix: 50, axaPPP: 50, allianz: 50, cigna: 50, wpa: 50, bupa: 50, vitality: 50, aviva: 50, selfPay: 50, sfPatientCost: 400 },
];

// Map test column names to brochure fee schedule test names
export const TEST_TO_FEE_SCHEDULE_MAP: Record<string, string> = {
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

// Get reporting fee for a test based on insurance provider
export function getInsuranceFee(testColumn: string, insurance: string): number {
  const feeTestName = TEST_TO_FEE_SCHEDULE_MAP[testColumn];
  if (!feeTestName) return 0;
  const row = INSURANCE_FEE_SCHEDULE.find(r => r.test === feeTestName);
  if (!row) return 0;
  
  const insLower = insurance.toLowerCase();
  if (insLower.includes('healix')) return row.healix;
  if (insLower.includes('axa')) return row.axaPPP;
  if (insLower.includes('allianz')) return row.allianz;
  if (insLower.includes('cigna')) return row.cigna;
  if (insLower.includes('wpa')) return row.wpa;
  if (insLower.includes('bupa')) return row.bupa;
  if (insLower.includes('vitality')) return row.vitality;
  if (insLower.includes('aviva')) return row.aviva;
  if (insLower.includes('self')) return row.selfPay;
  // Default to self-pay for unknown
  return row.selfPay;
}

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
