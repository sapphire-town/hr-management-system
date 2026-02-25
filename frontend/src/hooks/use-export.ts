'use client';

import { useCallback } from 'react';
import { useToast } from './use-toast';
import {
  exportToExcel,
  exportToPDF,
  exportEmployeesToExcel,
  exportAttendanceToExcel,
  exportLeavesToExcel,
} from '@/lib/export-utils';

interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

export function useExport() {
  const { toast } = useToast();

  const handleExport = useCallback(
    async (
      format: 'excel' | 'pdf',
      options: {
        filename: string;
        title?: string;
        columns: ExportColumn[];
        data: any[];
      }
    ) => {
      try {
        if (options.data.length === 0) {
          toast({
            title: 'No data to export',
            description: 'There is no data available to export.',
            variant: 'warning',
          });
          return;
        }

        if (format === 'excel') {
          await exportToExcel(options);
        } else {
          await exportToPDF(options);
        }

        toast({
          title: 'Export successful',
          description: `Data exported to ${format.toUpperCase()} successfully.`,
          variant: 'success',
        });
      } catch (error) {
        console.error('Export error:', error);
        toast({
          title: 'Export failed',
          description: 'An error occurred while exporting data.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const exportEmployees = useCallback(
    async (employees: any[]) => {
      try {
        await exportEmployeesToExcel(employees);
        toast({
          title: 'Export successful',
          description: 'Employee data exported to Excel.',
          variant: 'success',
        });
      } catch (error) {
        console.error('Export error:', error);
        toast({
          title: 'Export failed',
          description: 'An error occurred while exporting.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const exportAttendance = useCallback(
    async (records: any[]) => {
      try {
        await exportAttendanceToExcel(records);
        toast({
          title: 'Export successful',
          description: 'Attendance data exported to Excel.',
          variant: 'success',
        });
      } catch (error) {
        console.error('Export error:', error);
        toast({
          title: 'Export failed',
          description: 'An error occurred while exporting.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const exportLeaves = useCallback(
    async (leaves: any[]) => {
      try {
        await exportLeavesToExcel(leaves);
        toast({
          title: 'Export successful',
          description: 'Leave data exported to Excel.',
          variant: 'success',
        });
      } catch (error) {
        console.error('Export error:', error);
        toast({
          title: 'Export failed',
          description: 'An error occurred while exporting.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  return {
    exportToExcel: (options: Parameters<typeof handleExport>[1]) =>
      handleExport('excel', options),
    exportToPDF: (options: Parameters<typeof handleExport>[1]) =>
      handleExport('pdf', options),
    exportEmployees,
    exportAttendance,
    exportLeaves,
  };
}
