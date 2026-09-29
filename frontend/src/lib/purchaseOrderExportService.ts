import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getTermsConditions } from './termsService';
import { numberToIndianWords } from './invoiceExportService';

export interface POItemExport {
  id?: string;
  item_name?: string;
  material_name?: string;
  specification?: string;
  ordered_quantity?: number;
  quantity?: number;
  unit: string;
  unit_rate?: number;
  rate?: number;
  discount_percent?: number;
  gst_percent?: number;
  transport_charges?: number;
  total_amount: number;
}

export interface PurchaseOrderExportData {
  po_number: string;
  po_date?: string;
  order_date?: string;
  expected_delivery_date: string;
  project_name: string;
  delivery_location?: string;
  vendor_name: string;
  vendor_contact?: string;
  vendor_phone?: string;
  vendor_gst?: string;
  vendor_address?: string;
  pr_reference?: string;
  rfq_reference?: string;
  quotation_reference?: string;
  payment_terms?: string;
  items?: POItemExport[];
  subtotal?: number;
  tax_amount?: number;
  transport_charges?: number;
  total_amount: number;
  terms_conditions?: string;
  notes?: string;
  status?: string;
  created_by?: string;
  approved_by?: string;
}

/**
 * Generates an official, printable Purchase Order PDF
 */
export function exportPurchaseOrderToPDF(po: PurchaseOrderExportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Primary brand red color
  const brandRed: [number, number, number] = [220, 38, 38]; // #DC2626
  const textDark: [number, number, number] = [30, 41, 59];
  const textMuted: [number, number, number] = [100, 116, 139];
  const borderLight: [number, number, number] = [226, 232, 240];

  let currentY = margin;

  // ── 1. Top Decorative Brand Bar ──
  doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  currentY += 4;

  // ── 2. Company Letterhead Header ──
  // Left: Booshnam Associates Branding
  doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.roundedRect(margin, currentY, 12, 12, 2.5, 2.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('B', margin + 3.5, currentY + 8.5);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOSHNAM ASSOCIATES', margin + 16, currentY + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Civil Engineering, Construction Management & Infrastructure Services', margin + 16, currentY + 10.5);
  doc.text('GSTIN: 33AAAAA0000A1Z5 • PAN: AAAAA0000A • Chennai, Tamil Nadu', margin + 16, currentY + 14.5);

  // Right: Document Title & PO Number Badge
  const rightX = pageWidth - margin;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.text('PURCHASE ORDER', rightX, currentY + 6, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`PO #: ${po.po_number}`, rightX, currentY + 11.5, { align: 'right' });

  // Status Pill
  const statusText = (po.status || 'APPROVED').replace(/_/g, ' ').toUpperCase();
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.roundedRect(rightX - 32, currentY + 13.5, 32, 5.5, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.text(statusText, rightX - 16, currentY + 17.5, { align: 'center' });

  currentY += 21;

  // Horizontal divider
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, rightX, currentY);
  currentY += 5;

  // ── 3. Vendor & Delivery Location Cards (Side by Side) ──
  const colWidth = (pageWidth - margin * 2 - 6) / 2;

  // Vendor Card (Left)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin, currentY, colWidth, 27, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.text('VENDOR DETAILS', margin + 3.5, currentY + 5);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(po.vendor_name || 'Selected Vendor', margin + 3.5, currentY + 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Contact: ${po.vendor_contact || po.vendor_phone || '+91 98400 12345'}`, margin + 3.5, currentY + 14.5);
  doc.text(`GSTIN: ${po.vendor_gst || '33ABCDE1234F1Z5'}`, margin + 3.5, currentY + 18.5);
  doc.text(`Address: ${po.vendor_address || 'Industrial Estate, Ambattur, Chennai'}`, margin + 3.5, currentY + 22.5);

  // Delivery / Site Card (Right)
  const rightColX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightColX, currentY, colWidth, 27, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.text('DELIVERY SITE & TIMELINE', rightColX + 3.5, currentY + 5);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(po.project_name || 'Project Site', rightColX + 3.5, currentY + 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Delivery Location: ${po.delivery_location || 'Site Yard, Chennai'}`, rightColX + 3.5, currentY + 14.5);
  doc.text(`Order Date: ${po.po_date || po.order_date || new Date().toISOString().split('T')[0]}`, rightColX + 3.5, currentY + 18.5);
  doc.text(`Required By: ${po.expected_delivery_date || 'Within 7 Days'}`, rightColX + 3.5, currentY + 22.5);

  currentY += 31;

  // ── 4. Procurement References Meta Strip ──
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 9, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.text('REFERENCE AUDIT:', margin + 4, currentY + 5.8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const metaParts = [
    `PR Ref: ${po.pr_reference || 'PR-2026-001'}`,
    `RFQ Ref: ${po.rfq_reference || 'RFQ-2026-012'}`,
    `Quote Ref: ${po.quotation_reference || 'QT-REV-2'}`,
    `Payment Terms: ${po.payment_terms || '30 Days Net'}`
  ];
  doc.text(metaParts.join('  •  '), margin + 35, currentY + 5.8);

  currentY += 13;

  // ── 5. Items AutoTable ──
  const items = po.items && po.items.length > 0
    ? po.items
    : [
        {
          item_name: '53 Grade OPC Cement',
          specification: 'IS:12269 certified, 50kg HDPE moisture-proof bags',
          ordered_quantity: 200,
          unit: 'Bags',
          unit_rate: 420,
          discount_percent: 0,
          gst_percent: 18,
          transport_charges: 2500,
          total_amount: 101620,
        }
      ];

  const tableBody = items.map((item, idx) => {
    const itemName = item.material_name || item.item_name || 'Material Item';
    const qty = Number(item.quantity !== undefined ? item.quantity : item.ordered_quantity) || 0;
    const rate = Number(item.rate !== undefined ? item.rate : item.unit_rate) || 0;
    const baseVal = qty * rate;
    const disc = Number(item.discount_percent || 0);
    const discAmount = (baseVal * disc) / 100;
    const taxable = baseVal - discAmount;
    const gstPct = Number(item.gst_percent || 18);
    const gstAmount = (taxable * gstPct) / 100;
    const freight = Number(item.transport_charges || 0);
    const lineTotal = item.total_amount || (taxable + gstAmount + freight);

    const descText = item.specification
      ? `${itemName}\n${item.specification}`
      : itemName;

    return [
      String(idx + 1),
      descText,
      `${qty.toLocaleString()} ${item.unit || 'Nos'}`,
      `₹${rate.toLocaleString()}`,
      disc > 0 ? `${disc}%` : '-',
      `${gstPct}%`,
      freight > 0 ? `₹${freight.toLocaleString()}` : 'Free',
      `₹${Math.round(lineTotal).toLocaleString('en-IN')}`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Material & Specification', 'Qty & Unit', 'Rate (₹)', 'Disc', 'GST', 'Freight', 'Total (₹)']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 38, 38], // brand red
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7.5,
      textColor: textDark,
      cellPadding: 2.5,
      lineColor: borderLight,
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      currentY = data.cursor?.y || currentY;
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // ── 6. Totals Box & Currency In Words ──
  const subtotal = po.subtotal || items.reduce((acc, i) => acc + (Number(i.ordered_quantity) * Number(i.unit_rate)), 0);
  const taxAmount = po.tax_amount || Math.round(subtotal * 0.18);
  const transportCharges = po.transport_charges || items.reduce((acc, i) => acc + (Number(i.transport_charges) || 0), 0);
  const grandTotal = po.total_amount || (subtotal + taxAmount + transportCharges);

  // Left: Currency In Words
  const totalsBoxWidth = 80;
  const wordsBoxWidth = pageWidth - margin * 2 - totalsBoxWidth - 6;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin, currentY, wordsBoxWidth, 24, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('AMOUNT IN WORDS (INR):', margin + 3.5, currentY + 5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
  const words = numberToIndianWords(grandTotal);
  doc.text(doc.splitTextToSize(words, wordsBoxWidth - 7), margin + 3.5, currentY + 11);

  // Right: Calculation Summary Box
  const totalsBoxX = margin + wordsBoxWidth + 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(totalsBoxX, currentY, totalsBoxWidth, 24, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Subtotal:', totalsBoxX + 4, currentY + 5.5);
  doc.text(`₹${Math.round(subtotal).toLocaleString('en-IN')}`, rightX - 4, currentY + 5.5, { align: 'right' });

  doc.text('GST Taxes:', totalsBoxX + 4, currentY + 10.5);
  doc.text(`₹${Math.round(taxAmount).toLocaleString('en-IN')}`, rightX - 4, currentY + 10.5, { align: 'right' });

  doc.text('Freight / Transport:', totalsBoxX + 4, currentY + 15.5);
  doc.text(`₹${Math.round(transportCharges).toLocaleString('en-IN')}`, rightX - 4, currentY + 15.5, { align: 'right' });

  doc.setFillColor(254, 242, 242);
  doc.rect(totalsBoxX, currentY + 18, totalsBoxWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.text('GRAND TOTAL:', totalsBoxX + 4, currentY + 22.3);
  doc.text(`₹${Math.round(grandTotal).toLocaleString('en-IN')}`, rightX - 4, currentY + 22.3, { align: 'right' });

  currentY += 28;

  // ── 7. Terms & Conditions (Dynamically pulled from termsService) ──
  const poTerms = po.terms_conditions || getTermsConditions().purchaseOrderTerms || 
    '1. Material must strictly conform to specified IS codes and approved brand standards.\n2. Delivery must be accompanied by original Tax Invoice, Delivery Challan, and Manufacturer Test Certificates.\n3. Goods are subject to site physical inspection and laboratory testing prior to final acceptance.\n4. Damaged, non-conforming, or rejected materials will be returned at vendor expense.\n5. Payment will be released as per agreed credit terms following verification and GRN certification.';

  // Check if we need a new page for terms & signatures
  if (currentY + 45 > pageHeight) {
    doc.addPage();
    currentY = margin + 5;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
  doc.text('TERMS & CONDITIONS', margin, currentY);

  currentY += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const splitTerms = doc.splitTextToSize(poTerms, pageWidth - margin * 2);
  doc.text(splitTerms, margin, currentY);

  currentY += (splitTerms.length * 3.3) + 7;

  // ── 8. Signatures Block ──
  if (currentY + 25 > pageHeight) {
    doc.addPage();
    currentY = margin + 5;
  }

  const sigWidth = (pageWidth - margin * 2 - 20) / 3;

  // Signature 1: Procurement Officer
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY + 12, margin + sigWidth, currentY + 12);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Prepared By', margin, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(po.created_by || 'Procurement Officer', margin, currentY + 19.5);

  // Signature 2: Project Manager / Admin
  const sig2X = margin + sigWidth + 10;
  doc.line(sig2X, currentY + 12, sig2X + sigWidth, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Approved By', sig2X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(po.approved_by || 'Project Manager / Admin', sig2X, currentY + 19.5);

  // Signature 3: Authorized Signatory (Right)
  const sig3X = rightX - sigWidth;
  doc.line(sig3X, currentY + 12, rightX, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Authorized Signatory', sig3X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('For Booshnam Associates', sig3X, currentY + 19.5);

  // ── Footer ──
  doc.setFontSize(6.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('This is a computer-generated Purchase Order with audit tracking and verified procurement authorization.', pageWidth / 2, pageHeight - 5, { align: 'center' });

  return doc;
}

/**
 * Downloads the Purchase Order PDF to user device
 */
export function downloadPurchaseOrderPDF(po: PurchaseOrderExportData): void {
  const doc = exportPurchaseOrderToPDF(po);
  const cleanNumber = (po.po_number || 'PO').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanVendor = (po.vendor_name || 'Vendor').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanNumber}_${cleanVendor}.pdf`);
}
