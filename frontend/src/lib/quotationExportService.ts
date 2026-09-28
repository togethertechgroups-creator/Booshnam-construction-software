import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '../types';
import { getTermsConditions } from './termsService';

export function numberToIndianWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Zero Only';
  const val = Math.round(Math.abs(amount));

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let out = '';
    if (n >= 100) {
      out += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      out += tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '') + ' ';
    } else if (n > 0) {
      out += ones[n] + ' ';
    }
    return out.trim();
  }

  let crore = Math.floor(val / 10000000);
  let rem = val % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem %= 100000;
  let thousand = Math.floor(rem / 1000);
  rem %= 1000;
  let hundred = rem;

  let words = '';
  if (crore > 0) words += convertGroup(crore) + ' Crore ';
  if (lakh > 0) words += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) words += convertGroup(thousand) + ' Thousand ';
  if (hundred > 0) {
    if (words) words += '';
    words += convertGroup(hundred) + ' ';
  }

  return 'Rupees ' + words.trim() + ' Only';
}

export function exportQuotationToPDF(quote: Quotation): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Helper to draw official Booshnam footer matching user's exact specification
  const drawFooter = () => {
    const bottomY = pageHeight - 74;
    
    // Top primary red accent line
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1.5);
    doc.line(margin, bottomY, pageWidth - margin, bottomY);

    // Company Brand Name & Accreditation
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    doc.text('BOOSHNAM ASSOCIATES PVT. LTD.', margin, bottomY + 10);

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    doc.text('ISO & NABL Accredited Laboratory', margin, bottomY + 19);

    // Divider line above 4-column address block
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(margin, bottomY + 23, pageWidth - margin, bottomY + 23);

    // 4 Distinct Columns matching user uploaded image:
    // Col 1: Chennai Address | Col 2: Coimbatore Address | Col 3: Phones | Col 4: Email & Web
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(30, 41, 59);

    const c1X = margin;
    const c2X = margin + 148;
    const c3X = margin + 282;
    const c4X = pageWidth - margin;

    // Col 1: Chennai Address
    doc.text('Plot no: 8, Door no: 2, LIC Colony, 6th Street,', c1X, bottomY + 31);
    doc.text('(Near by Shankar Nagar, Pammal),', c1X, bottomY + 38);
    doc.text('Anakaputhur, Chennai - 600 075', c1X, bottomY + 45);

    // Col 2: Coimbatore Address
    doc.text('Old No. 80, New No. 36,', c2X, bottomY + 31);
    doc.text('Maniam Kaliappa Street, KK Pudur,', c2X, bottomY + 38);
    doc.text('Coimbatore - 641038', c2X, bottomY + 45);

    // Col 3: Phone
    doc.text('+91 96296 31255 | 96001 84996,', c3X, bottomY + 33);
    doc.text('95002 77170', c3X, bottomY + 41);

    // Col 4: Email & Web
    doc.text('booshnamassociates@gmail.com', c4X, bottomY + 33, { align: 'right' });
    doc.text('www.booshnamassociates.com', c4X, bottomY + 41, { align: 'right' });

    // Divider line below columns
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, bottomY + 50, pageWidth - margin, bottomY + 50);

    // Bottom Registration Meta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'GSTIN: 33AAKCB8628A1ZW | IT PAN: AAKCB8628A | CIN: U45309TN2022PTC153348',
      pageWidth / 2,
      bottomY + 58,
      { align: 'center' }
    );
  };

  // Helper to draw logo
  const drawLogo = (y = 45) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(220, 38, 38);
    doc.text('BOOSHNAM', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('— ASSOCIATES —', margin + 2, y + 10);
  };

  // =========================================================================
  // PAGE 1: Quotation Details & Itemized Scope
  // =========================================================================
  drawLogo(48);

  // Top Right Meta Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const metaRightX = pageWidth - margin;
  doc.text('GSTIN: 33AAKCB8628A1ZW', metaRightX, 36, { align: 'right' });
  doc.text(`QUOTATION No: ${quote.quotation_number || 'QBAG/3078/2026-27'}`, metaRightX, 47, { align: 'right' });
  doc.text('IT PAN No: AACB8628A', metaRightX, 58, { align: 'right' });
  doc.text('SACCODE: 998331', metaRightX, 69, { align: 'right' });

  // Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`${quote.date || '25th Sep 2026'}`, metaRightX, 92, { align: 'right' });

  // To Address
  let currentY = 85;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('To,', margin, currentY);
  currentY += 12;
  doc.text(quote.client_name || 'Mr. Prakash', margin, currentY);
  currentY += 12;
  doc.setFont('helvetica', 'normal');
  doc.text(quote.client_address || 'Chennai.', margin, currentY);

  // Subject Line
  currentY += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const subjectText = `SUB: Quotation for ${quote.project_title || 'Soil Investigations to be carried out for proposed structure at Arasankalai.'}`;
  const splitSubject = doc.splitTextToSize(subjectText, pageWidth - margin * 2);
  doc.text(splitSubject, margin, currentY);
  currentY += splitSubject.length * 11 + 6;

  // Table Body Rows
  const tableRows: any[] = [];
  const items = quote.items && quote.items.length > 0 ? quote.items : [
    { id: '1', item_code: '1.0', description: 'Mobilization and De-mobilisation of Men and Equipments to the site location where the soil investigations have to be carried out.', unit: 'LS', quantity: 1, unit_rate: 2500, amount: 2500 },
    { id: '2', item_code: '2.0', description: 'Boring through all type of soil strata and conducting SPT tests at the specified interval at the investigation location in accordance with I. S: 2131. Collection of SPT samples and disturbed samples in accordance with I.S:1498-1970 from the existing soil strata. Drilling in Soil', unit: '', quantity: 0, unit_rate: 0, amount: 0 },
    { id: '3', item_code: '2.1', description: '0.00m to 10.0m or a depth where SPT>60-whichever is met earlier and SPT @ 1.50m interval', unit: 'No.', quantity: 3, unit_rate: 9000, amount: 27000 },
    { id: '4', item_code: '2.2', description: '10.00m to 20.0m or a depth where SPT>60-whichever is met earlier and SPT @ 2.00 m interval', unit: 'RM', quantity: 0, unit_rate: 900, amount: 0 },
    { id: '5', item_code: '2.3', description: '20.00m to 30.0m or a depth where SPT>60-whichever is met earlier and SPT @ 2.00 m interval', unit: 'RM', quantity: 0, unit_rate: 950, amount: 0 },
    { id: '6', item_code: '2.4', description: 'Drilling in soil where SPT>60 / Weathered Rock', unit: 'RM', quantity: 0, unit_rate: 2500, amount: 0 },
    { id: '7', item_code: '2.5', description: 'Drilling in hard rock / strata using Diamond cutter', unit: 'RM', quantity: 0, unit_rate: 4500, amount: 0 },
    { id: '8', item_code: '3.0', description: 'Conducting Laboratory tests on the disturbed soil samples to arrive at the shear parameters of the soil. Determining the gradation characteristics through dry sieve and wet sieve analysis. Conducting Atterberg Limit tests on the clayey strata to determine the plasticity characteristics of strata.', unit: 'Per Bore', quantity: 3, unit_rate: 0, amount: 0 },
    { id: '9', item_code: '4.0', description: 'Compiling the field and laboratory test results in the form of report and suggesting the type of foundation system for the proposed structure with recommendations and submitting the same.', unit: 'LS', quantity: 0, unit_rate: 0, amount: 0 },
  ];

  items.forEach((it, idx) => {
    const code = it.item_code || `${idx + 1}.0`;
    const qtyStr = it.quantity && it.quantity > 0 ? it.quantity.toFixed(1) : '-';
    const rateStr = it.unit_rate && it.unit_rate > 0 ? it.unit_rate.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-';
    const isInclusive = it.amount === 0 && (code === '3.0' || code === '4.0' || it.description.toLowerCase().includes('report'));
    const amountStr = it.amount && it.amount > 0 
      ? it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) 
      : isInclusive ? 'Inclusive' : '-';

    tableRows.push([code, it.description, it.unit || '', qtyStr, rateStr, amountStr]);
  });

  const totalVal = quote.total_amount || 29500;
  const totalFormatted = totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  autoTable(doc, {
    startY: currentY,
    head: [
      [{ content: 'QUOTATION', colSpan: 6, styles: { halign: 'center', fontSize: 10, fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] } }],
      ['Item Code', 'Description of Work', 'Unit', 'Quantity', 'Rate', 'Amount'],
    ],
    body: tableRows,
    foot: [
      [{ content: 'Total', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: totalFormatted, styles: { halign: 'right', fontStyle: 'bold' } }],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      cellPadding: 3.5,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 42, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 38, halign: 'center' },
      3: { cellWidth: 40, halign: 'center' },
      4: { cellWidth: 52, halign: 'right' },
      5: { cellWidth: 55, halign: 'right' },
    },
    margin: { left: margin, right: margin, bottom: 85 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;

  // Overall Total In Words
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  const wordsStr = `Overall Total: ${numberToIndianWords(totalVal)} (Rs. ${totalFormatted})/-`;
  doc.text(wordsStr, pageWidth / 2, finalY, { align: 'center' });

  // Standard Booshnam proposal notes
  const notesList = [
    '1. GST 18% Will be added.',
    '2. 50% payment shall be made while issuing the work order, 50% shall be made while submitting the report.',
    '3. Site shall be cleared of any obstructions, obligations, etc.',
    '4. Water shall be provided for drilling purposes.',
  ];

  // Dynamic Quotation Terms & Conditions from Settings
  const activeQuotationTerms = (quote.terms_conditions || getTermsConditions().quotationTerms || '').trim();
  const customTermsList = activeQuotationTerms 
    ? activeQuotationTerms.split('\n').map(s => s.trim()).filter(Boolean)
    : [];

  // -------------------------------------------------------------------------
  // SMART PAGE LAYOUT:
  // If items are few (e.g. 1-4 items) and notes + signature fit on Page 1,
  // keep everything on a single page! Otherwise, create Page 2 for notes & signature.
  // -------------------------------------------------------------------------
  const fitsOnSinglePage = finalY + 165 < pageHeight - 85;

  if (fitsOnSinglePage) {
    // -----------------------------------------------------------------------
    // SINGLE-PAGE PROPOSAL (Page 1 fits everything)
    // -----------------------------------------------------------------------
    let notesY = finalY + 28;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('NOTES', margin, notesY);

    notesY += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);

    notesList.forEach((note) => {
      const splitNote = doc.splitTextToSize(note, pageWidth - margin * 2);
      doc.text(splitNote, margin, notesY);
      notesY += splitNote.length * 8 + 3;
    });

    if (customTermsList.length > 0) {
      notesY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      doc.text('TERMS & CONDITIONS:', margin, notesY);

      notesY += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);
      customTermsList.forEach((term) => {
        const splitTerm = doc.splitTextToSize(term, pageWidth - margin * 2);
        doc.text(splitTerm, margin, notesY);
        notesY += splitTerm.length * 8 + 2;
      });
    }

    notesY += 24;
    // Expecting your valuable order
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(9.5);
    doc.text('Expecting your valuable order', pageWidth / 2, notesY, { align: 'center' });

    // Signatory
    const signRightX = pageWidth - margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Er. A. Nivedhitha M.tech.,(Ph.D)', signRightX, notesY + 26, { align: 'right' });
    doc.setFontSize(7.5);
    doc.text('Geotechnical Engineer.', signRightX, notesY + 38, { align: 'right' });

    drawFooter();
  } else {
    // -----------------------------------------------------------------------
    // MULTI-PAGE PROPOSAL (Page 2 for overflow Notes & Signatory)
    // -----------------------------------------------------------------------
    drawFooter();

    doc.addPage();
    drawLogo(48);

    let page2Y = 95;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text('NOTES', margin, page2Y);

    page2Y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    notesList.forEach((note) => {
      const splitNote = doc.splitTextToSize(note, pageWidth - margin * 2);
      doc.text(splitNote, margin, page2Y);
      page2Y += splitNote.length * 12 + 6;
    });

    if (customTermsList.length > 0) {
      page2Y += 14;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(220, 38, 38);
      doc.text('TERMS & CONDITIONS:', margin, page2Y);

      page2Y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      customTermsList.forEach((term) => {
        const splitTerm = doc.splitTextToSize(term, pageWidth - margin * 2);
        doc.text(splitTerm, margin, page2Y);
        page2Y += splitTerm.length * 11 + 4;
      });
    }

    page2Y += 40;
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(11);
    doc.text('Expecting your valuable order', pageWidth / 2, page2Y, { align: 'center' });

    page2Y += 50;
    const signRightX = pageWidth - margin - 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Er. A. Nivedhitha M.tech.,(Ph.D)', signRightX, page2Y, { align: 'right' });
    doc.setFontSize(9);
    doc.text('Geotechnical Engineer.', signRightX, page2Y + 13, { align: 'right' });

    drawFooter();
  }

  // Save the PDF directly to device
  const safeName = (quote.quotation_number || 'QBAG_3078').replace(/[\/\\:]/g, '_');
  doc.save(`${safeName}_Booshnam_Quotation.pdf`);
}

export function exportQuotationToWord(quote: Quotation): void {
  const items = quote.items && quote.items.length > 0 ? quote.items : [
    { id: '1', item_code: '1.0', description: 'Mobilization and De-mobilisation of Men and Equipments to the site location where the soil investigations have to be carried out.', unit: 'LS', quantity: 1, unit_rate: 2500, amount: 2500 },
    { id: '2', item_code: '2.0', description: 'Boring through all type of soil strata and conducting SPT tests at the specified interval at the investigation location in accordance with I. S: 2131. Collection of SPT samples and disturbed samples in accordance with I.S:1498- 1970 from the existing soil strata. Drilling in Soil', unit: '', quantity: 0, unit_rate: 0, amount: 0 },
    { id: '3', item_code: '2.1', description: '0.00m to 10.0m or a depth where SPT>60-whichever is met earlier and SPT @ 1.50m interval', unit: 'No.', quantity: 3, unit_rate: 9000, amount: 27000 },
    { id: '4', item_code: '2.2', description: '10.00m to 20.0m or a depth where SPT>60-whichever is met earlier and SPT @ 2.00 m interval', unit: 'RM', quantity: 0, unit_rate: 900, amount: 0 },
    { id: '5', item_code: '2.3', description: '20.00m to 30.0m or a depth where SPT>60-whichever is met earlier and SPT @ 2.00 m interval', unit: 'RM', quantity: 0, unit_rate: 950, amount: 0 },
    { id: '6', item_code: '2.4', description: 'Drilling in soil where SPT>60 / Weathered Rock', unit: 'RM', quantity: 0, unit_rate: 2500, amount: 0 },
    { id: '7', item_code: '2.5', description: 'Drilling in hard rock / strata using Diamond cutter', unit: 'RM', quantity: 0, unit_rate: 4500, amount: 0 },
    { id: '8', item_code: '3.0', description: 'Conducting Laboratory tests on the disturbed soil samples to arrive at the shear parameters of the soil. Determining the gradation characteristics through dry sieve and wet sieve analysis. Conducting Atterberg Limit tests on the clayey strata to determine the plasticity characteristics of strata.', unit: 'Per Bore', quantity: 3, unit_rate: 0, amount: 0 },
    { id: '9', item_code: '4.0', description: 'Compiling the field and laboratory test results in the form of report and suggesting the type of foundation system for the proposed structure with recommendations and submitting the same.', unit: 'LS', quantity: 0, unit_rate: 0, amount: 0 },
  ];

  const totalVal = quote.total_amount || 29500;
  const totalFormatted = totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const wordsStr = `Overall Total: ${numberToIndianWords(totalVal)} (Rs. ${totalFormatted})/-`;
  const isSinglePage = items.length <= 4;

  let rowsHtml = '';
  items.forEach((it, idx) => {
    const code = it.item_code || `${idx + 1}.0`;
    const qtyStr = it.quantity && it.quantity > 0 ? it.quantity.toFixed(1) : '-';
    const rateStr = it.unit_rate && it.unit_rate > 0 ? it.unit_rate.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-';
    const isInclusive = it.amount === 0 && (code === '3.0' || code === '4.0' || it.description.toLowerCase().includes('report'));
    const amountStr = it.amount && it.amount > 0 
      ? it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) 
      : isInclusive ? 'Inclusive' : '-';

    rowsHtml += `
      <tr>
        <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">${code}</td>
        <td style="border: 1px solid black; padding: 4px; text-align: left;">${it.description}</td>
        <td style="border: 1px solid black; padding: 4px; text-align: center;">${it.unit || ''}</td>
        <td style="border: 1px solid black; padding: 4px; text-align: center;">${qtyStr}</td>
        <td style="border: 1px solid black; padding: 4px; text-align: right;">${rateStr}</td>
        <td style="border: 1px solid black; padding: 4px; text-align: right;">${amountStr}</td>
      </tr>
    `;
  });

  const footerHtml = `
    <div style="border-top: 2px solid #dc2626; margin-top: 25px; padding-top: 8px;">
      <table style="width: 100%; border: none; border-collapse: collapse;">
        <tr>
          <td colspan="4" style="border: none; padding-bottom: 4px;">
            <b style="color: #dc2626; font-size: 10pt;">BOOSHNAM ASSOCIATES PVT. LTD.</b><br/>
            <i style="color: #b91c1c; font-size: 8.5pt;">ISO & NABL Accredited Laboratory</i>
          </td>
        </tr>
        <tr style="border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
          <td style="border: none; padding: 6px 4px; font-size: 7.5pt; vertical-align: top; width: 30%;">
            Plot no: 8, Door no: 2, LIC Colony, 6th Street, (Near by Shankar Nagar, Pammal), Anakaputhur, <b>Chennai</b> - 600 075
          </td>
          <td style="border: none; padding: 6px 4px; font-size: 7.5pt; vertical-align: top; width: 25%;">
            Old No. 80, New No. 36, Maniam Kaliappa Street, KK Pudur, <b>Coimbatore</b> - 641038
          </td>
          <td style="border: none; padding: 6px 4px; font-size: 7.5pt; vertical-align: top; width: 22%;">
            +91 96296 31255 | 96001 84996,<br/>
            95002 77170
          </td>
          <td style="border: none; padding: 6px 4px; font-size: 7.5pt; vertical-align: top; text-align: right; width: 23%;">
            booshnamassociates@gmail.com<br/>
            www.booshnamassociates.com
          </td>
        </tr>
        <tr>
          <td colspan="4" style="border: none; text-align: center; padding-top: 6px; font-size: 7pt; color: #475569; font-weight: bold;">
            GSTIN: 33AAKCB8628A1ZW | IT PAN: AAKCB8628A | CIN: U45309TN2022PTC153348
          </td>
        </tr>
      </table>
    </div>
  `;

  const notesHtml = `
    <h3 style="margin-top: 30px; margin-bottom: 10px; font-size: 11pt;">NOTES</h3>
    <ol style="font-size: 9pt; line-height: 1.6; margin-left: 20px;">
      <li>GST 18% Will be added.</li>
      <li>50% payment shall be made while issuing the work order, 50% shall be made while submitting the report.</li>
      <li>Site shall be cleared of any obstructions, obligations, etc.</li>
      <li>Water shall be provided for drilling purposes.</li>
    </ol>
    <div style="margin-top: 15px; padding: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
      <h4 style="margin: 0 0 6px 0; font-size: 9.5pt; color: #dc2626;">TERMS & CONDITIONS:</h4>
      <p style="margin: 0; font-size: 8.5pt; color: #334155; line-height: 1.5;">${(quote.terms_conditions || getTermsConditions().quotationTerms || '').replace(/\n/g, '<br/>')}</p>
    </div>
    <p style="text-align: center; font-style: italic; font-weight: bold; margin-top: 36px; margin-bottom: 30px; font-size: 11pt;">
      Expecting your valuable order
    </p>
    <div style="text-align: right; margin-top: 25px; margin-bottom: 25px; line-height: 1.4;">
      <b>Er. A. Nivedhitha M.tech.,(Ph.D)</b><br/>
      <b>Geotechnical Engineer.</b>
    </div>
  `;

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Quotation - ${quote.quotation_number}</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; color: #111; line-height: 1.3; }
        table { border-collapse: collapse; width: 100%; }
        .red-brand { color: #dc2626; font-weight: bold; }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>
      <!-- Page 1 Header -->
      <table style="width: 100%; margin-bottom: 12px;">
        <tr>
          <td style="vertical-align: top;">
            <div style="font-size: 22pt; font-weight: bold; color: #dc2626;">BOOSHNAM</div>
            <div style="font-size: 9pt; color: #64748b; letter-spacing: 2px;">— ASSOCIATES —</div>
          </td>
          <td style="text-align: right; vertical-align: top; font-size: 8.5pt;">
            <b>GSTIN:</b> 33AAKCB8628A1ZW<br/>
            <b>QUOTATION No:</b> ${quote.quotation_number || 'QBAG/3078/2026-27'}<br/>
            <b>IT PAN No:</b> AACB8628A<br/>
            <b>SACCODE:</b> 998331<br/><br/>
            <b>${quote.date || '25th Sep 2026'}</b>
          </td>
        </tr>
      </table>

      <!-- To Section -->
      <p style="margin: 0; line-height: 1.3; font-size: 9.5pt;">
        <b>To,</b><br/>
        <b>${quote.client_name || 'Mr. Prakash'}</b><br/>
        ${quote.client_address || 'Chennai.'}
      </p>

      <p style="margin-top: 12px; margin-bottom: 12px; font-size: 10pt;">
        <b>SUB: Quotation for ${quote.project_title || 'Soil Investigations to be carried out for proposed structure at Arasankalai.'}</b>
      </p>

      <!-- Table -->
      <table style="border: 2px solid black; width: 100%; font-size: 8.5pt;">
        <thead>
          <tr>
            <th colspan="6" style="border: 1px solid black; padding: 5px; text-align: center; font-size: 10pt; font-weight: bold;">QUOTATION</th>
          </tr>
          <tr style="background-color: #f8fafc;">
            <th style="border: 1px solid black; padding: 4px; width: 50px;">Item Code</th>
            <th style="border: 1px solid black; padding: 4px;">Description of Work</th>
            <th style="border: 1px solid black; padding: 4px; width: 45px;">Unit</th>
            <th style="border: 1px solid black; padding: 4px; width: 45px;">Quantity</th>
            <th style="border: 1px solid black; padding: 4px; width: 65px;">Rate</th>
            <th style="border: 1px solid black; padding: 4px; width: 75px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr>
            <td colspan="5" style="border: 1px solid black; padding: 5px; text-align: right; font-weight: bold;">Total</td>
            <td style="border: 1px solid black; padding: 5px; text-align: right; font-weight: bold;">${totalFormatted}</td>
          </tr>
        </tbody>
      </table>

      <p style="text-align: center; font-weight: bold; margin-top: 10px; margin-bottom: 15px; font-size: 9.5pt;">
        ${wordsStr}
      </p>

      ${isSinglePage ? `
        <!-- Single Page: Notes, Sign-off & Footer on Page 1 -->
        ${notesHtml}
        ${footerHtml}
      ` : `
        <!-- Multi Page: Footer 1, Page Break, Page 2 Header, Notes & Footer 2 -->
        ${footerHtml}
        <div class="page-break"></div>
        <table style="width: 100%; margin-top: 20px; margin-bottom: 20px;">
          <tr>
            <td>
              <div style="font-size: 22pt; font-weight: bold; color: #dc2626;">BOOSHNAM</div>
              <div style="font-size: 9pt; color: #64748b; letter-spacing: 2px;">— ASSOCIATES —</div>
            </td>
          </tr>
        </table>
        ${notesHtml}
        ${footerHtml}
      `}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], {
    type: 'application/msword;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (quote.quotation_number || 'QBAG_3078').replace(/[\/\\:]/g, '_');
  a.download = `${safeName}_Booshnam_Quotation.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
