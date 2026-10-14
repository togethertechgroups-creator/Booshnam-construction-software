import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getTermsConditions } from './termsService';
import { SalesInvoice } from '../types';

export interface InvoiceItem {
  id?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  unit_rate: number;
  amount: number;
}

export interface InvoiceExportData {
  invoice_number: string;
  invoice_date?: string;
  due_date?: string;
  party_name: string;
  party_phone?: string;
  party_gst?: string;
  party_address?: string;
  project_name?: string;
  items?: InvoiceItem[];
  subtotal?: number;
  tax_rate?: number; // e.g. 18 for 18% GST
  tax_amount?: number;
  total_amount: number;
  notes?: string;
  terms_conditions?: string;
  payment_status?: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
}

/**
 * Converts a number to Indian currency words
 */
export function numberToIndianWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + Math.floor(Math.abs(num))).substr(-9);
  const crore = parseInt(n.substr(0, 2), 10);
  const lakh = parseInt(n.substr(2, 2), 10);
  const thousand = parseInt(n.substr(4, 2), 10);
  const hundred = parseInt(n.substr(6, 1), 10);
  const doubleDigit = parseInt(n.substr(7, 2), 10);

  let words = '';

  const formatTwoDigits = (val: number): string => {
    if (val === 0) return '';
    if (val < 20) return a[val];
    return b[Math.floor(val / 10)] + ' ' + a[val % 10];
  };

  if (crore > 0) words += formatTwoDigits(crore) + 'Crore ';
  if (lakh > 0) words += formatTwoDigits(lakh) + 'Lakh ';
  if (thousand > 0) words += formatTwoDigits(thousand) + 'Thousand ';
  if (hundred > 0) words += a[hundred] + 'Hundred ';
  if (doubleDigit > 0) {
    if (words !== '') words += 'and ';
    words += formatTwoDigits(doubleDigit);
  }

  return 'Rupees ' + words.trim() + ' Only';
}

/**
 * Exports a formal Tax Invoice PDF with customized Invoice Terms & Conditions
 */
export function exportInvoiceToPDF(inv: InvoiceExportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Retrieve current active Terms & Conditions
  const activeTerms = inv.terms_conditions || getTermsConditions().invoiceTerms;

  // Helper to draw footer
  const drawFooter = () => {
    const bottomY = pageHeight - 65;
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1.5);
    doc.line(margin, bottomY, pageWidth - margin, bottomY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text('BOOSHNAM ASSOCIATES PVT. LTD.', margin, bottomY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Civil Engineering, Construction Management & Technical Consulting', margin, bottomY + 20);

    const signText = 'Registered Office: Plot 42, Pattabiram Main Rd, Chennai - 600072 | Phone: +91 96296 31255 | GSTIN: 33AAKCB8628A1ZW';
    doc.setFontSize(6.5);
    doc.text(signText, pageWidth / 2, bottomY + 31, { align: 'center' });
  };

  // 1. Header Banner & Letterhead
  let currentY = 40;

  // Red accent top bar
  doc.setFillColor(220, 38, 38);
  doc.rect(margin, currentY, pageWidth - margin * 2, 4, 'F');

  currentY += 24;

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(220, 38, 38);
  doc.text('BOOSHNAM', margin, currentY);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('— ASSOCIATES —', margin + 128, currentY - 2);

  // Right Side: TAX INVOICE title pill
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(pageWidth - margin - 130, currentY - 18, 130, 26, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.text('TAX INVOICE', pageWidth - margin - 65, currentY - 1, { align: 'center' });

  currentY += 14;

  // Subtitle
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Engineering Design, Architectural Planning & General Construction Execution', margin, currentY);

  currentY += 16;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 16;

  // 2. Metadata Grid (Bill To & Invoice Details)
  const colWidth = (pageWidth - margin * 2) / 2;

  // Left Column: Bill To / Client Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BILLED TO (PARTY DETAILS):', margin, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(inv.party_name || 'Valued Client', margin, currentY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  if (inv.party_address) {
    doc.text(inv.party_address, margin, currentY + 26);
  }
  if (inv.party_phone) {
    doc.text(`Phone: ${inv.party_phone}`, margin, currentY + (inv.party_address ? 38 : 26));
  }
  if (inv.party_gst) {
    doc.text(`GSTIN: ${inv.party_gst}`, margin, currentY + (inv.party_address ? 50 : 38));
  }

  // Right Column: Invoice Details Box
  const rightX = margin + colWidth + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('INVOICE METADATA:', rightX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const dateVal = inv.invoice_date || new Date().toISOString().split('T')[0];
  const dueVal = inv.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  doc.text(`Invoice No: `, rightX, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text(inv.invoice_number, rightX + 55, currentY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Date of Issue: `, rightX, currentY + 26);
  doc.setFont('helvetica', 'bold');
  doc.text(dateVal, rightX + 58, currentY + 26);

  doc.setFont('helvetica', 'normal');
  doc.text(`Due Date: `, rightX, currentY + 38);
  doc.setFont('helvetica', 'bold');
  doc.text(dueVal, rightX + 48, currentY + 38);

  if (inv.project_name) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Project Ref: `, rightX, currentY + 50);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(inv.project_name, rightX + 52, currentY + 50);
  }

  currentY += 68;

  // 3. Table of Line Items
  const items: InvoiceItem[] = inv.items && inv.items.length > 0 ? inv.items : [
    {
      description: inv.notes || 'Civil & Structural Construction Services / Milestone Execution',
      quantity: 1,
      unit: 'LS',
      unit_rate: inv.total_amount,
      amount: inv.total_amount,
    }
  ];

  const tableRows: any[] = [];
  items.forEach((it, idx) => {
    tableRows.push([
      (idx + 1).toString(),
      it.description,
      it.hsnCode || '9954',
      it.quantity.toString(),
      it.unit || 'Nos',
      `₹ ${it.unit_rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `₹ ${it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    ]);
  });

  const subtotal = inv.subtotal || inv.total_amount;
  const taxRate = inv.tax_rate !== undefined ? inv.tax_rate : 0;
  const taxAmount = inv.tax_amount || (subtotal * (taxRate / 100));
  const grandTotal = inv.total_amount;

  autoTable(doc, {
    startY: currentY,
    head: [
      ['#', 'Item & Scope Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Amount'],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 4.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.6,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 48, halign: 'center' },
      3: { cellWidth: 32, halign: 'center' },
      4: { cellWidth: 35, halign: 'center' },
      5: { cellWidth: 65, halign: 'right' },
      6: { cellWidth: 75, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin, bottom: 80 },
  });

  const finalTableY = (doc as any).lastAutoTable.finalY + 12;

  // 4. Totals Block & Total in Words
  let summaryY = finalTableY;

  // Summary box on the right
  const summaryBoxWidth = 200;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(summaryBoxX, summaryY, summaryBoxWidth, 68, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryBoxX, summaryY, summaryBoxWidth, 68, 4, 4, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', summaryBoxX + 12, summaryY + 16);
  doc.setFont('helvetica', 'bold');
  doc.text(`₹ ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBoxX + summaryBoxWidth - 12, summaryY + 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text(`Tax (${taxRate}% GST):`, summaryBoxX + 12, summaryY + 32);
  doc.setFont('helvetica', 'bold');
  doc.text(`₹ ${taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBoxX + summaryBoxWidth - 12, summaryY + 32, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(summaryBoxX + 10, summaryY + 42, summaryBoxX + summaryBoxWidth - 10, summaryY + 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(220, 38, 38);
  doc.text('Grand Total:', summaryBoxX + 12, summaryY + 58);
  doc.text(`₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBoxX + summaryBoxWidth - 12, summaryY + 58, { align: 'right' });

  // Bank Account Payment Details on left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('BANK DETAILS FOR PAYMENT:', margin, summaryY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Account Name: Booshnam Associates Private Limited', margin, summaryY + 26);
  doc.text('Account Number: 50200062491238 | IFSC: HDFC0001248', margin, summaryY + 38);
  doc.text('Bank: HDFC Bank, Pattabiram Branch, Chennai', margin, summaryY + 50);

  // Total in Words
  summaryY += 80;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Amount in Words: ${numberToIndianWords(grandTotal)}`, margin, summaryY);

  summaryY += 16;

  // 5. TERMS & CONDITIONS SECTION (DYNAMICALLY LOADED FROM SAVED SETTINGS)
  doc.setFillColor(254, 252, 232); // subtle light warm highlight
  doc.setDrawColor(254, 240, 138);

  const termsBoxY = summaryY;
  const termsTextLines = doc.splitTextToSize(activeTerms, pageWidth - margin * 2 - 20);
  const termsBoxHeight = Math.max(38, termsTextLines.length * 10 + 20);

  doc.roundedRect(margin, termsBoxY, pageWidth - margin * 2, termsBoxHeight, 4, 4, 'F');
  doc.roundedRect(margin, termsBoxY, pageWidth - margin * 2, termsBoxHeight, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(133, 77, 14);
  doc.text('TERMS & CONDITIONS:', margin + 10, termsBoxY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(termsTextLines, margin + 10, termsBoxY + 24);

  // 6. Signatory
  const signY = termsBoxY + termsBoxHeight + 32;
  const signRightX = pageWidth - margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('For BOOSHNAM ASSOCIATES PVT. LTD.', signRightX, signY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signatory / Finance Department', signRightX, signY + 28, { align: 'right' });

  drawFooter();

  // Save PDF file
  const safeFilename = `${inv.invoice_number.replace(/[^a-zA-Z0-9_-]/g, '_')}_Tax_Invoice.pdf`;
  doc.save(safeFilename);
}

/**
 * Export SalesInvoice directly to PDF
 */
export function exportSalesInvoiceToPDF(inv: SalesInvoice, projectName?: string): void {
  const exportData: InvoiceExportData = {
    invoice_number: inv.invoice_number,
    invoice_date: inv.invoice_date,
    due_date: new Date(new Date(inv.invoice_date || Date.now()).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    party_name: inv.client_name,
    project_name: projectName || inv.project_id,
    items: inv.items.map(it => ({
      id: it.id,
      description: it.item_name || it.description || '',
      quantity: it.invoiced_quantity,
      unit: it.unit,
      unit_rate: it.unit_rate,
      amount: it.total_amount
    })),
    subtotal: inv.sub_total || inv.total_amount,
    tax_rate: inv.gst_amount ? Math.round((inv.gst_amount / (inv.sub_total || 1)) * 100) : 18,
    tax_amount: inv.gst_amount || 0,
    total_amount: inv.total_amount,
    payment_status: inv.balance_due === 0 ? 'PAID' : ((inv.settled_amount || 0) > 0 ? 'PARTIALLY_PAID' : 'UNPAID')
  };
  exportInvoiceToPDF(exportData);
}

/**
 * Export SalesInvoice directly to Excel (.xlsx)
 */
export function exportSalesInvoiceToExcel(inv: SalesInvoice, projectName?: string): void {
  const wb = XLSX.utils.book_new();

  // Header rows
  const rows: (string | number)[][] = [
    ['TAX INVOICE - BOOSHNAM ASSOCIATES PVT. LTD.'],
    ['Invoice Number:', inv.invoice_number],
    ['Invoice Date:', inv.invoice_date || ''],
    ['Client / Billed To:', inv.client_name || ''],
    ['Project:', projectName || inv.project_id || ''],
    ['BOQ Number:', inv.boq_number || ''],
    ['Due Date:', new Date(new Date(inv.invoice_date || Date.now()).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]],
    ['Status:', inv.status || 'APPROVED'],
    [],
    ['S.No', 'Item Description', 'Invoiced Qty', 'Unit', 'Unit Rate (₹)', 'GST %', 'GST Amount (₹)', 'Total Amount (₹)']
  ];

  // Item rows
  inv.items.forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.item_name || item.description || '',
      item.invoiced_quantity,
      item.unit || 'nos',
      item.unit_rate,
      item.gst_percent || 0,
      item.gst_amount || 0,
      item.total_amount
    ]);
  });

  const subTotal = inv.sub_total || inv.total_amount;
  const gstAmount = inv.gst_amount || 0;
  const totalAmount = inv.total_amount;
  const settledAmount = inv.settled_amount || 0;
  const balanceDue = inv.balance_due ?? (totalAmount - settledAmount);

  rows.push(
    [],
    ['', '', '', '', '', 'Sub Total:', `₹ ${subTotal.toLocaleString('en-IN')}`],
    ['', '', '', '', '', 'CGST (9%):', `₹ ${Math.round(gstAmount / 2).toLocaleString('en-IN')}`],
    ['', '', '', '', '', 'SGST (9%):', `₹ ${Math.round(gstAmount / 2).toLocaleString('en-IN')}`],
    ['', '', '', '', '', 'Total Amount:', `₹ ${totalAmount.toLocaleString('en-IN')}`],
    ['', '', '', '', '', 'Settled Amount:', `₹ ${settledAmount.toLocaleString('en-IN')}`],
    ['', '', '', '', '', 'Balance Due:', `₹ ${balanceDue.toLocaleString('en-IN')}`],
    [],
    ['Bank Details:', `${inv.bank_name || 'Axis Bank'} - AC: ${inv.bank_account || '922020058090700'}`],
    ['Terms & Conditions:', 'Late payments may result in late payment fees. All disputes subject to India jurisdiction only.']
  );

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Invoice');

  const safeFilename = `${inv.invoice_number.replace(/[^a-zA-Z0-9_-]/g, '_')}_Invoice.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}
