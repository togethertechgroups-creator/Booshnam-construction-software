import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StaffMember } from './staffService';
import { numberToIndianWords } from './quotationExportService';

export interface PayslipCalculation {
  monthName: string;
  year: string;
  monthYearStr: string;
  grossSalary: number;
  basicPay: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
  pf: number;
  professionalTax: number;
  unpaidLeaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
  netSalaryWords: string;
  workingDays: number;
  paidDays: number;
  unpaidDays: number;
}

export function calculatePayslip(staff: StaffMember, monthStr?: string): PayslipCalculation {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  let monthName = 'January';
  let year = '2026';

  if (monthStr && monthStr.includes('-')) {
    const [y, m] = monthStr.split('-');
    const mIdx = parseInt(m, 10) - 1;
    monthName = months[mIdx] || 'January';
    year = y || '2026';
  } else {
    const d = new Date();
    monthName = months[d.getMonth()];
    year = String(d.getFullYear());
  }

  const grossSalary = Number(staff.salary) || 45000;
  const basicPay = Math.round(grossSalary * 0.50);
  const hra = Math.round(grossSalary * 0.30);
  const conveyance = Math.round(grossSalary * 0.10);
  const specialAllowance = Math.max(0, grossSalary - (basicPay + hra + conveyance));

  // Deductions
  const pf = Math.min(1800, Math.round(basicPay * 0.12));
  const professionalTax = 200;
  // 1 Unpaid absent day deduction
  const unpaidDays = 1;
  const workingDays = 30;
  const paidDays = workingDays - unpaidDays;
  const unpaidLeaveDeduction = Math.round((grossSalary / workingDays) * unpaidDays);

  const totalDeductions = pf + professionalTax + unpaidLeaveDeduction;
  const netSalary = Math.max(0, grossSalary - totalDeductions);
  const netSalaryWords = numberToIndianWords(netSalary);

  return {
    monthName,
    year,
    monthYearStr: `${monthName} ${year}`,
    grossSalary,
    basicPay,
    hra,
    conveyance,
    specialAllowance,
    pf,
    professionalTax,
    unpaidLeaveDeduction,
    totalDeductions,
    netSalary,
    netSalaryWords,
    workingDays,
    paidDays,
    unpaidDays
  };
}

export function exportPayslipToPDF(staff: StaffMember, monthStr?: string): void {
  const calc = calculatePayslip(staff, monthStr);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // 1. Company Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(220, 38, 38);
  doc.text('BOOSHNAM ASSOCIATES PVT. LTD.', margin, 48);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28);
  doc.text('ISO & NABL Accredited Laboratory', margin, 60);

  // Legal / Meta info top right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const metaX = pageWidth - margin;
  doc.text('GSTIN: 33AAKCB8628A1ZW', metaX, 42, { align: 'right' });
  doc.text('IT PAN: AAKCB8628A', metaX, 52, { align: 'right' });
  doc.text('CIN: U45309TN2022PTC153348', metaX, 62, { align: 'right' });

  // Red Accent Divider
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1.5);
  doc.line(margin, 70, pageWidth - margin, 70);

  // Address subtitle
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Plot no: 8, Door no: 2, LIC Colony, 6th Street, Pammal, Anakaputhur, Chennai - 600 075 | KK Pudur, Coimbatore - 641038',
    pageWidth / 2,
    81,
    { align: 'center' }
  );

  // 2. Payslip Title Bar
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.rect(margin, 92, pageWidth - margin * 2, 24, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`SALARY PAYSLIP — ${calc.monthYearStr.toUpperCase()}`, pageWidth / 2, 108, { align: 'center' });

  // 3. Employee Info Table
  autoTable(doc, {
    startY: 124,
    body: [
      [
        { content: 'Employee Name:', styles: { fontStyle: 'bold', cellWidth: 95 } },
        { content: staff.name, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: 'Employee Code:', styles: { fontStyle: 'bold', cellWidth: 95 } },
        { content: staff.employee_code, styles: { fontStyle: 'bold', textColor: [220, 38, 38] } }
      ],
      [
        { content: 'Designation:', styles: { fontStyle: 'bold' } },
        { content: staff.designation || 'Site Engineer' },
        { content: 'Department:', styles: { fontStyle: 'bold' } },
        { content: staff.department || 'Civil Construction' }
      ],
      [
        { content: 'Date of Joining:', styles: { fontStyle: 'bold' } },
        { content: staff.doj || '01-01-2024' },
        { content: 'Employment Type:', styles: { fontStyle: 'bold' } },
        { content: staff.employment_type || 'Full-time' }
      ],
      [
        { content: 'Bank Account:', styles: { fontStyle: 'bold' } },
        { content: 'HDFC Bank (Direct Deposit)' },
        { content: 'Payment Mode:', styles: { fontStyle: 'bold' } },
        { content: 'NEFT / Online Transfer' }
      ],
      [
        { content: 'Working Days:', styles: { fontStyle: 'bold' } },
        { content: `${calc.workingDays} Days` },
        { content: 'Paid Days / LOP:', styles: { fontStyle: 'bold' } },
        { content: `${calc.paidDays} Paid / ${calc.unpaidDays} Unpaid` }
      ],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 4.5,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.5
    },
    margin: { left: margin, right: margin }
  });

  const employeeTableFinalY = (doc as any).lastAutoTable.finalY;

  // 4. Earnings & Deductions Dual Table
  autoTable(doc, {
    startY: employeeTableFinalY + 12,
    head: [
      [
        { content: 'EARNINGS', colSpan: 2, styles: { halign: 'center', fillColor: [239, 246, 255], textColor: [30, 58, 138], fontStyle: 'bold' } },
        { content: 'DEDUCTIONS', colSpan: 2, styles: { halign: 'center', fillColor: [254, 242, 242], textColor: [153, 27, 27], fontStyle: 'bold' } }
      ],
      [
        { content: 'Particulars', styles: { fontStyle: 'bold' } },
        { content: 'Amount (Rs.)', styles: { fontStyle: 'bold', halign: 'right' } },
        { content: 'Particulars', styles: { fontStyle: 'bold' } },
        { content: 'Amount (Rs.)', styles: { fontStyle: 'bold', halign: 'right' } }
      ]
    ],
    body: [
      [
        'Basic Salary',
        calc.basicPay.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        'Provident Fund (PF)',
        calc.pf.toLocaleString('en-IN', { minimumFractionDigits: 2 })
      ],
      [
        'House Rent Allowance (HRA)',
        calc.hra.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        'Professional Tax (PT)',
        calc.professionalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })
      ],
      [
        'Conveyance & Travel Allowance',
        calc.conveyance.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        'Loss of Pay (1 Day Unpaid)',
        calc.unpaidLeaveDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })
      ],
      [
        'Special / Performance Allowance',
        calc.specialAllowance.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        'Income Tax / TDS',
        '0.00'
      ],
    ],
    foot: [
      [
        { content: 'Gross Earnings', styles: { fontStyle: 'bold', textColor: [30, 58, 138] } },
        { content: `Rs. ${calc.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [30, 58, 138] } },
        { content: 'Total Deductions', styles: { fontStyle: 'bold', textColor: [153, 27, 27] } },
        { content: `Rs. ${calc.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [153, 27, 27] } }
      ]
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.5
    },
    headStyles: {
      lineWidth: 0.5,
      lineColor: [203, 213, 225]
    },
    columnStyles: {
      0: { cellWidth: 165 },
      1: { cellWidth: 92, halign: 'right' },
      2: { cellWidth: 165 },
      3: { cellWidth: 93, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  const salaryTableFinalY = (doc as any).lastAutoTable.finalY;

  // 5. Net Payable Highlight Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(1.2);
  doc.roundedRect(margin, salaryTableFinalY + 12, pageWidth - margin * 2, 42, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(22, 101, 52);
  doc.text('NET SALARY PAYABLE:', margin + 14, salaryTableFinalY + 28);

  doc.setFontSize(14);
  doc.setTextColor(21, 128, 61);
  doc.text(`Rs. ${calc.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin - 14, salaryTableFinalY + 29, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text(`Amount in words: ${calc.netSalaryWords}`, margin + 14, salaryTableFinalY + 44);

  // 6. Signatures and Official Stamp Notice
  const signY = salaryTableFinalY + 88;

  // Employee Signature Box
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.line(margin + 20, signY, margin + 140, signY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Employee Signature', margin + 80, signY + 12, { align: 'center' });

  // Employer Signature Box
  doc.line(pageWidth - margin - 140, signY, pageWidth - margin - 20, signY);
  doc.text('Authorized Signatory', pageWidth - margin - 80, signY + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Booshnam Associates Pvt. Ltd.', pageWidth - margin - 80, signY + 22, { align: 'center' });

  // Computer Generated Notice
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Note: This is a system-generated salary slip and does not require a physical seal or signature.', pageWidth / 2, signY + 48, { align: 'center' });

  // 7. Official Bottom Footer
  const footerY = pageHeight - 50;
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Phone: +91 96296 31255 | 96001 84996 | Email: booshnamassociates@gmail.com | Web: www.booshnamassociates.com', pageWidth / 2, footerY + 12, { align: 'center' });
  doc.text('Booshnam Associates Pvt. Ltd. — Confidential & Proprietary Document', pageWidth / 2, footerY + 22, { align: 'center' });

  // Trigger browser download
  const safeStaffName = staff.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${safeStaffName}_Payslip_${calc.monthName}_${calc.year}.pdf`);
}

export function exportPayslipToWord(staff: StaffMember, monthStr?: string): void {
  const calc = calculatePayslip(staff, monthStr);

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Payslip - ${staff.name} - ${calc.monthYearStr}</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; color: #1e293b; line-height: 1.4; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 9pt; }
        .no-border td { border: none; padding: 4px; }
        .red-header { color: #dc2626; font-weight: bold; }
        .highlight-box { background-color: #f0fdf4; border: 2px solid #22c55e; padding: 12px; margin-top: 15px; }
        .center { text-align: center; }
        .right { text-align: right; }
      </style>
    </head>
    <body>
      <!-- Header -->
      <table class="no-border" style="width: 100%; border-bottom: 2px solid #dc2626; padding-bottom: 8px;">
        <tr>
          <td style="vertical-align: top;">
            <div style="font-size: 20pt; font-weight: bold; color: #dc2626;">BOOSHNAM ASSOCIATES PVT. LTD.</div>
            <div style="font-size: 9pt; color: #b91c1c; font-style: italic;">ISO & NABL Accredited Laboratory</div>
            <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">
              Plot no: 8, Door no: 2, LIC Colony, 6th Street, Pammal, Anakaputhur, Chennai - 600 075<br/>
              Phone: +91 96296 31255 | 96001 84996 • Email: booshnamassociates@gmail.com
            </div>
          </td>
          <td class="right" style="vertical-align: top; font-size: 8.5pt;">
            <b>GSTIN:</b> 33AAKCB8628A1ZW<br/>
            <b>IT PAN:</b> AAKCB8628A<br/>
            <b>CIN:</b> U45309TN2022PTC153348<br/><br/>
            <b>Date of Issue:</b> ${new Date().toLocaleDateString('en-GB')}
          </td>
        </tr>
      </table>

      <!-- Title -->
      <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; font-size: 12pt; margin-top: 10px; margin-bottom: 12px;">
        SALARY PAYSLIP — ${calc.monthYearStr.toUpperCase()}
      </div>

      <!-- Employee Details Table -->
      <table>
        <tr>
          <td style="font-weight: bold; width: 25%; background-color: #f8fafc;">Employee Name</td>
          <td style="width: 25%; font-weight: bold; color: #0f172a;">${staff.name}</td>
          <td style="font-weight: bold; width: 25%; background-color: #f8fafc;">Employee Code</td>
          <td style="width: 25%; font-weight: bold; color: #dc2626;">${staff.employee_code}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">Designation</td>
          <td>${staff.designation || 'Site Engineer'}</td>
          <td style="font-weight: bold; background-color: #f8fafc;">Department</td>
          <td>${staff.department || 'Civil Construction'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">Date of Joining</td>
          <td>${staff.doj || '01-01-2024'}</td>
          <td style="font-weight: bold; background-color: #f8fafc;">Employment Type</td>
          <td>${staff.employment_type || 'Full-time'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">Bank Account</td>
          <td>HDFC Bank (Direct Deposit)</td>
          <td style="font-weight: bold; background-color: #f8fafc;">Payment Mode</td>
          <td>NEFT / Online Transfer</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">Working Days</td>
          <td>${calc.workingDays} Days</td>
          <td style="font-weight: bold; background-color: #f8fafc;">Paid / Unpaid Days</td>
          <td>${calc.paidDays} Paid / ${calc.unpaidDays} Unpaid</td>
        </tr>
      </table>

      <!-- Earnings & Deductions Table -->
      <table>
        <thead>
          <tr style="background-color: #e2e8f0; font-weight: bold;">
            <th colspan="2" style="text-align: center; color: #1e3a8a;">EARNINGS</th>
            <th colspan="2" style="text-align: center; color: #991b1b;">DEDUCTIONS</th>
          </tr>
          <tr style="background-color: #f8fafc;">
            <th>Particulars</th>
            <th class="right">Amount (₹)</th>
            <th>Particulars</th>
            <th class="right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Basic Salary</td>
            <td class="right">${calc.basicPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td>Provident Fund (PF)</td>
            <td class="right">${calc.pf.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>House Rent Allowance (HRA)</td>
            <td class="right">${calc.hra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td>Professional Tax (PT)</td>
            <td class="right">${calc.professionalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Conveyance & Travel Allowance</td>
            <td class="right">${calc.conveyance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td>Loss of Pay (1 Day Unpaid)</td>
            <td class="right">${calc.unpaidLeaveDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Special / Performance Allowance</td>
            <td class="right">${calc.specialAllowance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td>Income Tax / TDS</td>
            <td class="right">0.00</td>
          </tr>
          <tr style="font-weight: bold; background-color: #f1f5f9;">
            <td>Total Gross Earnings</td>
            <td class="right" style="color: #1e3a8a;">₹ ${calc.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td>Total Deductions</td>
            <td class="right" style="color: #991b1b;">₹ ${calc.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <!-- Net Pay -->
      <div class="highlight-box">
        <table class="no-border" style="margin: 0;">
          <tr>
            <td style="font-size: 11pt; font-weight: bold; color: #166534;">NET SALARY PAYABLE:</td>
            <td class="right" style="font-size: 16pt; font-weight: bold; color: #15803d;">
              ₹ ${calc.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="font-size: 8.5pt; color: #166534;">
              <b>In Words:</b> ${calc.netSalaryWords}
            </td>
          </tr>
        </table>
      </div>

      <!-- Signatures -->
      <table class="no-border" style="margin-top: 60px;">
        <tr>
          <td style="width: 50%; text-align: center;">
            <div style="width: 180px; border-top: 1px solid #94a3b8; margin: 0 auto; padding-top: 4px;">
              <b>Employee Signature</b>
            </div>
          </td>
          <td style="width: 50%; text-align: center;">
            <div style="width: 180px; border-top: 1px solid #94a3b8; margin: 0 auto; padding-top: 4px;">
              <b>Authorized Signatory</b><br/>
              <span style="font-size: 8pt; color: #64748b;">Booshnam Associates Pvt. Ltd.</span>
            </div>
          </td>
        </tr>
      </table>

      <p style="text-align: center; font-size: 7.5pt; color: #94a3b8; margin-top: 40px;">
        Note: This is a computer-generated salary slip and does not require a physical seal or signature.
      </p>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + html], {
    type: 'application/msword;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeStaffName = staff.name.replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `${safeStaffName}_Payslip_${calc.monthName}_${calc.year}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportPayslipToPNG(staff: StaffMember, monthStr?: string): Promise<void> {
  const calc = calculatePayslip(staff, monthStr);

  // Generate an HTML element offscreen, render with high-res Canvas and download PNG
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '750px';
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '32px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.color = '#0f172a';
  container.style.boxSizing = 'border-box';
  container.style.border = '1px solid #e2e8f0';

  container.innerHTML = `
    <div style="border-bottom: 2px solid #dc2626; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <div style="font-size: 20px; font-weight: 900; color: #dc2626; font-family: serif;">BOOSHNAM ASSOCIATES PVT. LTD.</div>
        <div style="font-size: 11px; font-weight: bold; color: #b91c1c; font-style: italic;">ISO & NABL Accredited Laboratory</div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 4px;">
          Plot no: 8, Door no: 2, LIC Colony, 6th Street, Pammal, Chennai - 600 075
        </div>
      </div>
      <div style="text-align: right; font-size: 10px; color: #475569; font-weight: 600;">
        <div>GSTIN: 33AAKCB8628A1ZW</div>
        <div>IT PAN: AAKCB8628A</div>
        <div style="margin-top: 4px; color: #dc2626; font-weight: bold;">SALARY SLIP</div>
      </div>
    </div>

    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; font-size: 13px; margin: 12px 0; border-radius: 6px;">
      PAYSLIP FOR ${calc.monthYearStr.toUpperCase()}
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; background: #fff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 14px;">
      <div><b>Employee Name:</b> <span style="font-weight: 700; color: #0f172a;">${staff.name}</span></div>
      <div><b>Employee Code:</b> <span style="color: #dc2626; font-weight: 700;">${staff.employee_code}</span></div>
      <div><b>Designation:</b> ${staff.designation || 'Site Engineer'}</div>
      <div><b>Department:</b> ${staff.department || 'Civil Construction'}</div>
      <div><b>Working Days:</b> ${calc.workingDays} Days</div>
      <div><b>Paid / LOP:</b> ${calc.paidDays} Paid / ${calc.unpaidDays} Unpaid</div>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px;">
      <thead>
        <tr style="background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
          <th style="padding: 6px; text-align: left; color: #1e3a8a;">EARNINGS</th>
          <th style="padding: 6px; text-align: right; color: #1e3a8a;">AMOUNT (₹)</th>
          <th style="padding: 6px; text-align: left; color: #991b1b;">DEDUCTIONS</th>
          <th style="padding: 6px; text-align: right; color: #991b1b;">AMOUNT (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 5px;">Basic Salary</td>
          <td style="padding: 5px; text-align: right;">${calc.basicPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 5px;">Provident Fund (PF)</td>
          <td style="padding: 5px; text-align: right;">${calc.pf.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 5px;">House Rent Allowance (HRA)</td>
          <td style="padding: 5px; text-align: right;">${calc.hra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 5px;">Professional Tax (PT)</td>
          <td style="padding: 5px; text-align: right;">${calc.professionalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 5px;">Conveyance & Field Allowance</td>
          <td style="padding: 5px; text-align: right;">${calc.conveyance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 5px;">Loss of Pay (1 Day)</td>
          <td style="padding: 5px; text-align: right;">${calc.unpaidLeaveDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 5px;">Special Allowance</td>
          <td style="padding: 5px; text-align: right;">${calc.specialAllowance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 5px;">Income Tax / TDS</td>
          <td style="padding: 5px; text-align: right;">0.00</td>
        </tr>
        <tr style="font-weight: bold; background: #f8fafc;">
          <td style="padding: 6px; color: #1e3a8a;">Gross Earnings</td>
          <td style="padding: 6px; text-align: right; color: #1e3a8a;">₹ ${calc.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 6px; color: #991b1b;">Total Deductions</td>
          <td style="padding: 6px; text-align: right; color: #991b1b;">₹ ${calc.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <div style="background: #f0fdf4; border: 1.5px solid #22c55e; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 11px; font-weight: bold; color: #166534;">NET SALARY PAYABLE:</div>
        <div style="font-size: 9.5px; color: #15803d; margin-top: 2px;">${calc.netSalaryWords}</div>
      </div>
      <div style="font-size: 18px; font-weight: 900; color: #15803d;">
        ₹ ${calc.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 36px; padding: 0 20px;">
      <div style="text-align: center; border-top: 1px solid #94a3b8; width: 140px; padding-top: 4px; font-size: 9.5px; font-weight: bold; color: #64748b;">
        Employee Signature
      </div>
      <div style="text-align: center; border-top: 1px solid #94a3b8; width: 140px; padding-top: 4px; font-size: 9.5px; font-weight: bold; color: #64748b;">
        Authorized Signatory<br/>
        <span style="font-size: 8px; font-weight: normal;">Booshnam Associates</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Dynamic import of html2canvas if available, or SVG canvas fallback
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default || (html2canvasModule as any);
    const canvas = await html2canvas(container, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = imgData;
    const safeStaffName = staff.name.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `${safeStaffName}_Payslip_${calc.monthName}_${calc.year}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error('Failed to capture PNG via html2canvas', e);
  } finally {
    document.body.removeChild(container);
  }
}
