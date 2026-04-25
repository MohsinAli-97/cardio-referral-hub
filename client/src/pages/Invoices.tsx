// NHC Cardio Referral Hub — Invoice Generator Page
// Generate and download PDF invoices for reporting fees paid to cardiologists

import { useState, useMemo, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Download, Printer, Loader2, AlertCircle, Eye,
} from 'lucide-react';
import { getReportingFeesByClinicianAndTest, normalizeClinician } from '@/lib/analytics';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Invoices() {
  const { referrals, prices, clinicians, loading, error } = useData();

  const lastMonth = subMonths(new Date(), 1);
  const [selectedClinician, setSelectedClinician] = useState('');
  const [startDate, setStartDate] = useState(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
  const [invoiceNumber, setInvoiceNumber] = useState(`NHC-${format(new Date(), 'yyyyMMdd')}-001`);
  const [showPreview, setShowPreview] = useState(false);

  const referringClinicians = useMemo(() => {
    const set = new Set(referrals.map((r) => normalizeClinician(r.referringConsultant)));
    return Array.from(set).sort();
  }, [referrals]);

  const invoiceItems = useMemo(() => {
    if (!selectedClinician) return [];
    return getReportingFeesByClinicianAndTest(
      referrals, selectedClinician, prices, startDate, endDate
    );
  }, [referrals, selectedClinician, prices, startDate, endDate]);

  const totalAmount = useMemo(
    () => invoiceItems.reduce((sum, item) => sum + item.total, 0),
    [invoiceItems]
  );

  const clinicianDetails = useMemo(() => {
    if (!selectedClinician) return null;
    // Try to find matching clinician in contact details
    const cleanName = selectedClinician.replace(/^(Dr|Prof|Mr|Mrs|Ms)\s+/i, '');
    return clinicians.find((c) => {
      const cName = c.name.toLowerCase();
      return cName.includes(cleanName.toLowerCase()) || cleanName.toLowerCase().includes(cName.split(',')[0].toLowerCase());
    });
  }, [selectedClinician, clinicians]);

  const generatePDF = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header - NHC branding
    doc.setFillColor(26, 32, 44); // #1a202c
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('THE NATIONAL HEART CLINIC', 20, 18);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('COMPLETE CARDIAC CARE', 20, 25);
    doc.text('69 Harley Street, W1G 8QW, London', 20, 31);
    doc.text('+44 7957 534 391', 20, 36);

    // Invoice title
    doc.setTextColor(146, 64, 85); // #924055
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTING FEE INVOICE', 20, 55);

    // Invoice details
    doc.setTextColor(26, 32, 44);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const detailsY = 65;
    doc.text(`Invoice Number: ${invoiceNumber}`, 20, detailsY);
    doc.text(`Date: ${format(new Date(), 'dd MMMM yyyy')}`, 20, detailsY + 6);
    doc.text(`Period: ${format(parseISO(startDate), 'dd MMM yyyy')} – ${format(parseISO(endDate), 'dd MMM yyyy')}`, 20, detailsY + 12);

    // Bill To
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', pageWidth - 80, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedClinician, pageWidth - 80, detailsY + 6);
    if (clinicianDetails) {
      if (clinicianDetails.bankName) {
        doc.text(clinicianDetails.bankName, pageWidth - 80, detailsY + 12);
      }
    }

    // Separator
    doc.setDrawColor(26, 32, 44);
    doc.setLineWidth(0.5);
    doc.line(20, detailsY + 22, pageWidth - 20, detailsY + 22);

    // Table
    const tableData = invoiceItems.map((item) => [
      item.test,
      item.count.toString(),
      `£${item.unitFee.toFixed(2)}`,
      `£${item.total.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: detailsY + 28,
      head: [['Test Type', 'Quantity', 'Unit Fee', 'Total']],
      body: tableData,
      foot: [['', '', 'TOTAL', `£${totalAmount.toFixed(2)}`]],
      headStyles: {
        fillColor: [26, 32, 44],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [245, 245, 245],
        textColor: [26, 32, 44],
        fontSize: 11,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [55, 65, 81],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 252],
      },
      margin: { left: 20, right: 20 },
      theme: 'grid',
      styles: {
        lineColor: [229, 231, 235],
        lineWidth: 0.3,
      },
    });

    // Bank details
    const finalY = (doc as any).lastAutoTable?.finalY || 180;

    if (clinicianDetails && clinicianDetails.sortCode) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 32, 44);
      doc.text('PAYMENT DETAILS', 20, finalY + 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Bank: ${clinicianDetails.bankCompany || '—'}`, 20, finalY + 23);
      doc.text(`Account Name: ${clinicianDetails.bankName || '—'}`, 20, finalY + 29);
      doc.text(`Sort Code: ${clinicianDetails.sortCode || '—'}`, 20, finalY + 35);
      doc.text(`Account Number: ${clinicianDetails.account || '—'}`, 20, finalY + 41);
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFillColor(26, 32, 44);
    doc.rect(0, footerY - 5, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('The National Heart Clinic | 69 Harley Street, London W1G 8QW | thenationalheartclinic.co.uk', pageWidth / 2, footerY + 2, { align: 'center' });

    doc.save(`Invoice-${invoiceNumber}-${selectedClinician.replace(/\s+/g, '-')}.pdf`);
  }, [invoiceItems, selectedClinician, clinicianDetails, invoiceNumber, startDate, endDate, totalAmount]);

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
      <div>
        <h1 className="text-2xl lg:text-3xl font-normal text-foreground tracking-wide">
          Invoice Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate reporting fee invoices for referring clinicians
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice form */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-normal tracking-wide">Invoice Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Clinician
              </Label>
              <Select value={selectedClinician} onValueChange={setSelectedClinician}>
                <SelectTrigger>
                  <SelectValue placeholder="Select clinician..." />
                </SelectTrigger>
                <SelectContent>
                  {referringClinicians.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Invoice Number
              </Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  From
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  To
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {clinicianDetails && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bank Details</p>
                <p className="text-sm text-foreground">{clinicianDetails.bankName || 'Not on file'}</p>
                <p className="text-xs text-muted-foreground">
                  {clinicianDetails.sortCode ? `SC: ${clinicianDetails.sortCode}` : ''}{' '}
                  {clinicianDetails.account ? `Acc: ${clinicianDetails.account}` : ''}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setShowPreview(true)}
                variant="outline"
                className="flex-1 gap-2"
                disabled={!selectedClinician || invoiceItems.length === 0}
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button
                onClick={generatePDF}
                className="flex-1 gap-2 bg-[#1a202c] hover:bg-[#2d3748] text-white"
                disabled={!selectedClinician || invoiceItems.length === 0}
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoice preview */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-normal tracking-wide">Invoice Preview</CardTitle>
              {totalAmount > 0 && (
                <Badge className="bg-[#1a202c] text-white text-sm px-3 py-1">
                  Total: £{totalAmount.toFixed(2)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedClinician ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663356836006/RQqaze6xfCNMtzHwku4N5p/empty-state-NnN6fMcvT5Cq66rVTvvRJF.webp"
                  alt="Select a clinician"
                  className="w-32 h-32 opacity-40 mb-4"
                />
                <p className="text-sm text-muted-foreground">
                  Select a clinician and date range to generate an invoice
                </p>
              </div>
            ) : invoiceItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No reportable tests found for {selectedClinician} in this period
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Invoice header */}
                <div className="bg-[#1a202c] text-white p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold tracking-wider" style={{ fontFamily: "'Tenor Sans', serif" }}>
                        THE NATIONAL HEART CLINIC
                      </h3>
                      <p className="text-xs text-white/60 uppercase tracking-widest mt-1">
                        Complete Cardiac Care
                      </p>
                      <p className="text-xs text-white/50 mt-2">69 Harley Street, W1G 8QW, London</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#c97d8e] font-semibold text-lg">INVOICE</p>
                      <p className="text-xs text-white/60 mt-1">{invoiceNumber}</p>
                      <p className="text-xs text-white/60">{format(new Date(), 'dd MMMM yyyy')}</p>
                    </div>
                  </div>
                </div>

                {/* Bill to */}
                <div className="p-6 bg-card border-b">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
                      <p className="text-sm font-semibold text-foreground">{selectedClinician}</p>
                      {clinicianDetails?.bankName && (
                        <p className="text-xs text-muted-foreground mt-1">{clinicianDetails.bankName}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Period</p>
                      <p className="text-sm text-foreground">
                        {format(parseISO(startDate), 'dd MMM yyyy')} – {format(parseISO(endDate), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Test Type</th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Qty</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Unit Fee</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoiceItems.map((item) => (
                        <tr key={item.test} className="hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{item.test}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.patients.slice(0, 3).join(', ')}
                              {item.patients.length > 3 && ` +${item.patients.length - 3} more`}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{item.count}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">£{item.unitFee.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">£{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#1a202c] text-white">
                        <td colSpan={3} className="px-4 py-4 text-right font-semibold text-sm uppercase tracking-wider">
                          Total Amount Due
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-lg">
                          £{totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Payment details */}
                {clinicianDetails && clinicianDetails.sortCode && (
                  <div className="p-6 bg-muted/30 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Payment Details</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Bank</p>
                        <p className="font-medium text-foreground">{clinicianDetails.bankCompany || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Name</p>
                        <p className="font-medium text-foreground">{clinicianDetails.bankName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sort Code</p>
                        <p className="font-medium text-foreground">{clinicianDetails.sortCode}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account No.</p>
                        <p className="font-medium text-foreground">{clinicianDetails.account}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
