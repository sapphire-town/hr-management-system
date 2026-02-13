import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

interface ExportOptions {
  filename: string;
  title?: string;
  columns: ExportColumn[];
  data: any[];
}

export function exportToExcel({ filename, title, columns, data }: ExportOptions): void {
  // Prepare data with headers
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      // Handle nested objects and dates
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value ?? '';
    })
  );

  const worksheetData = [headers, ...rows];

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();

  // Set column widths
  const colWidths = columns.map((col) => ({
    wch: col.width || Math.max(col.header.length, 15),
  }));
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, title || 'Sheet1');

  // Generate and download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToPDF({ filename, title, columns, data }: ExportOptions): void {
  const doc = new jsPDF();

  // Add title
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 22);
  }

  // Prepare table data
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return String(value ?? '');
    })
  );

  // Add table
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: title ? 30 : 20,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [26, 115, 232],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  // Add footer with date
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // Download
  doc.save(`${filename}.pdf`);
}

// Convenience functions for common exports
export function exportEmployeesToExcel(employees: any[]): void {
  exportToExcel({
    filename: `employees_${new Date().toISOString().split('T')[0]}`,
    title: 'Employee List',
    columns: [
      { key: 'firstName', header: 'First Name', width: 15 },
      { key: 'lastName', header: 'Last Name', width: 15 },
      { key: 'email', header: 'Email', width: 25 },
      { key: 'role', header: 'Role', width: 15 },
      { key: 'department', header: 'Department', width: 15 },
      { key: 'joinDate', header: 'Join Date', width: 12 },
      { key: 'status', header: 'Status', width: 10 },
    ],
    data: employees.map((e) => ({
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.user?.email || e.email,
      role: e.user?.role || e.role,
      department: e.role?.name || e.department,
      joinDate: e.joinDate,
      status: e.user?.isActive ? 'Active' : 'Inactive',
    })),
  });
}

export function exportAttendanceToExcel(records: any[]): void {
  exportToExcel({
    filename: `attendance_${new Date().toISOString().split('T')[0]}`,
    title: 'Attendance Report',
    columns: [
      { key: 'date', header: 'Date', width: 12 },
      { key: 'employee', header: 'Employee', width: 20 },
      { key: 'status', header: 'Status', width: 15 },
      { key: 'notes', header: 'Notes', width: 30 },
    ],
    data: records.map((r) => ({
      date: new Date(r.date).toLocaleDateString(),
      employee: r.employee
        ? `${r.employee.firstName} ${r.employee.lastName}`
        : '',
      status: r.status,
      notes: r.notes || '',
    })),
  });
}

export function exportDailyReportPerformanceToPDF(
  performance: {
    employeeName: string;
    roleName: string;
    parameters: Array<{
      paramLabel: string;
      target: number;
      totalTarget: number;
      totalActual: number;
      achievementPct: number;
      averageDaily: number;
      daysReported: number;
    }>;
    overallAchievementPct: number;
    submissionRate: number;
    totalReports: number;
    totalWorkingDays: number;
    bestParameter: { label: string; pct: number } | null;
    worstParameter: { label: string; pct: number } | null;
  },
  periodLabel: string,
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Purple gradient header
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFillColor(139, 92, 246);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Daily Report Performance', 14, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${performance.employeeName} | ${performance.roleName}`, 14, 28);
  doc.text(`Period: ${periodLabel}`, 14, 35);

  // Summary metrics
  let y = 50;
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Summary', 14, y);
  y += 4;

  doc.autoTable({
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Overall Achievement', `${performance.overallAchievementPct.toFixed(1)}%`],
      ['Submission Rate', `${performance.submissionRate.toFixed(1)}%`],
      ['Total Reports Submitted', `${performance.totalReports}`],
      ['Working Days in Period', `${performance.totalWorkingDays}`],
      ['Best Parameter', performance.bestParameter ? `${performance.bestParameter.label} (${performance.bestParameter.pct.toFixed(1)}%)` : 'N/A'],
      ['Needs Improvement', performance.worstParameter ? `${performance.worstParameter.label} (${performance.worstParameter.pct.toFixed(1)}%)` : 'N/A'],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 243, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
  });

  // Parameter details
  y = (doc as any).lastAutoTable.finalY + 14;
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Parameter Details', 14, y);
  y += 4;

  doc.autoTable({
    startY: y,
    head: [['Parameter', 'Daily Target', 'Period Target', 'Actual', 'Achievement %', 'Avg/Day', 'Days Reported']],
    body: performance.parameters.map((p) => [
      p.paramLabel,
      p.target.toString(),
      p.totalTarget.toString(),
      p.totalActual.toString(),
      `${p.achievementPct.toFixed(1)}%`,
      p.averageDaily.toFixed(1),
      p.daysReported.toString(),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 243, 255] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | HR Management System | Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10,
    );
  }

  doc.save(`performance_report_${performance.employeeName.replace(/\s+/g, '_')}_${periodLabel.replace(/\s+/g, '_')}.pdf`);
}

export function exportPayslipToPDF(
  payslip: {
    month: string;
    baseSalary: number;
    workingDays: number;
    actualWorkingDays: number;
    unpaidLeaves: number;
    unapprovedAbsences: number;
    holidaySandwich: number;
    rewards: number;
    reimbursements: number;
    grossPay: number;
    deductions: number;
    netPay: number;
    generatedAt: string;
    employee: {
      firstName: string;
      lastName: string;
      role?: { name: string };
    };
  },
  leaveBalance?: { sick: number; casual: number; earned: number; total: number } | null,
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`;
  const roleName = payslip.employee.role?.name || '';
  const monthDate = new Date(payslip.month + '-01');
  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Purple gradient header
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setFillColor(139, 92, 246);
  doc.rect(0, 0, pageWidth, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Payslip', 14, 20);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(monthLabel, 14, 30);
  doc.setFontSize(11);
  doc.text(`${employeeName} | ${roleName}`, 14, 39);

  const perDay = payslip.workingDays > 0 ? payslip.baseSalary / payslip.workingDays : 0;
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

  // Earnings
  let y = 55;
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings', 14, y);
  y += 4;

  doc.autoTable({
    startY: y,
    head: [['Component', 'Amount (INR)']],
    body: [
      ['Base Salary', fmt(payslip.baseSalary)],
      ['Rewards', fmt(payslip.rewards)],
      ['Reimbursements', fmt(payslip.reimbursements)],
      ['Gross Pay', fmt(payslip.grossPay)],
    ],
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 243, 255] },
    columnStyles: { 1: { halign: 'right' } },
  });

  // Deductions
  y = (doc as any).lastAutoTable.finalY + 12;
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions', 14, y);
  y += 4;

  const deductionRows: string[][] = [];
  if (payslip.unpaidLeaves > 0) {
    deductionRows.push([`Unpaid Leaves (${payslip.unpaidLeaves} days)`, fmt(payslip.unpaidLeaves * perDay)]);
  }
  if (payslip.unapprovedAbsences > 0) {
    deductionRows.push([`Unapproved Absences (${payslip.unapprovedAbsences} days x2)`, fmt(payslip.unapprovedAbsences * perDay * 2)]);
  }
  if (payslip.holidaySandwich > 0) {
    deductionRows.push([`Holiday Sandwich (${payslip.holidaySandwich} days)`, fmt(payslip.holidaySandwich * perDay)]);
  }
  if (deductionRows.length === 0) {
    deductionRows.push(['No deductions', '0']);
  }
  deductionRows.push(['Total Deductions', fmt(payslip.deductions)]);

  doc.autoTable({
    startY: y,
    head: [['Component', 'Amount (INR)']],
    body: deductionRows,
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    columnStyles: { 1: { halign: 'right' } },
  });

  // Attendance
  y = (doc as any).lastAutoTable.finalY + 12;
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Attendance Summary', 14, y);
  y += 4;

  doc.autoTable({
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Total Working Days', String(payslip.workingDays)],
      ['Actual Days Worked', String(payslip.actualWorkingDays)],
      ['Per Day Rate', `INR ${fmt(perDay)}`],
    ],
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    columnStyles: { 1: { halign: 'right' } },
  });

  // Leave balance
  if (leaveBalance) {
    y = (doc as any).lastAutoTable.finalY + 12;
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Leave Balance', 14, y);
    y += 4;

    doc.autoTable({
      startY: y,
      head: [['Leave Type', 'Remaining Days']],
      body: [
        ['Sick Leave', String(leaveBalance.sick)],
        ['Casual Leave', String(leaveBalance.casual)],
        ['Earned Leave', String(leaveBalance.earned)],
        ['Total', String(leaveBalance.total)],
      ],
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: { 1: { halign: 'right' } },
    });
  }

  // Net pay highlight
  y = (doc as any).lastAutoTable.finalY + 14;
  doc.setFillColor(124, 58, 237);
  doc.roundedRect(14, y, pageWidth - 28, 28, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Net Pay', 24, y + 12);
  doc.setFontSize(18);
  doc.text(`INR ${fmt(payslip.netPay)}`, pageWidth - 24, y + 14, { align: 'right' });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | HR Management System | Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10,
    );
  }

  doc.save(`payslip_${employeeName.replace(/\s+/g, '_')}_${payslip.month}.pdf`);
}

export function exportLeavesToExcel(leaves: any[]): void {
  exportToExcel({
    filename: `leaves_${new Date().toISOString().split('T')[0]}`,
    title: 'Leave Requests',
    columns: [
      { key: 'employee', header: 'Employee', width: 20 },
      { key: 'type', header: 'Leave Type', width: 12 },
      { key: 'startDate', header: 'Start Date', width: 12 },
      { key: 'endDate', header: 'End Date', width: 12 },
      { key: 'status', header: 'Status', width: 15 },
      { key: 'reason', header: 'Reason', width: 30 },
    ],
    data: leaves.map((l) => ({
      employee: l.employee
        ? `${l.employee.firstName} ${l.employee.lastName}`
        : '',
      type: l.leaveType,
      startDate: new Date(l.startDate).toLocaleDateString(),
      endDate: new Date(l.endDate).toLocaleDateString(),
      status: l.status,
      reason: l.reason,
    })),
  });
}
