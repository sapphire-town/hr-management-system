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
