'use client';

import * as React from 'react';
import {
  CheckCircle,
  XCircle,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Users,
  Download,
  Search,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { attendanceAPI, settingsAPI } from '@/lib/api-client';
import { format } from 'date-fns';

interface Holiday {
  id: string;
  date: string;
  name: string;
  description?: string;
}

interface EmployeeAttendance {
  id: string;
  name: string;
  role: string;
  status: string;
  notes: string | null;
  markedBy: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PRESENT: { bg: '#dcfce7', text: '#166534', label: 'Present' },
  HALF_DAY: { bg: '#fef3c7', text: '#92400e', label: 'Half Day' },
  ABSENT: { bg: '#fee2e2', text: '#991b1b', label: 'Absent' },
  PAID_LEAVE: { bg: '#dbeafe', text: '#1e40af', label: 'Paid Leave' },
  UNPAID_LEAVE: { bg: '#e5e7eb', text: '#374151', label: 'Unpaid Leave' },
  ABSENT_DOUBLE_DEDUCTION: { bg: '#fecaca', text: '#7f1d1d', label: 'Absent (2x)' },
  OFFICIAL_HOLIDAY: { bg: '#f3e8ff', text: '#6b21a8', label: 'Holiday' },
  NOT_MARKED: { bg: '#f3f4f6', text: '#6b7280', label: 'Not Marked' },
};

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const selectStyle: React.CSSProperties = {
  height: '40px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  padding: '0 12px',
  fontSize: '14px',
  background: 'white',
};

export default function ManageAttendancePage() {
  const { user } = useAuthStore();
  const isHRHead = user?.role === 'HR_HEAD';
  const isDirector = user?.role === 'DIRECTOR';
  const canManage = isHRHead || isDirector;

  if (!canManage) {
    return (
      <DashboardLayout title="Manage Attendance" description="Access restricted">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <Shield style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
            <p style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Access Restricted</p>
            <p style={{ margin: 0 }}>This page is available to HR Head only.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Manage Attendance"
      description="Mark and manage attendance for all employees"
    >
      <HRManageView />
    </DashboardLayout>
  );
}

function HRManageView() {
  const [selectedDate, setSelectedDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [employees, setEmployees] = React.useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [bulkMarking, setBulkMarking] = React.useState(false);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [holidayModalOpen, setHolidayModalOpen] = React.useState(false);
  const [editingHoliday, setEditingHoliday] = React.useState<Holiday | null>(null);
  const [holidayForm, setHolidayForm] = React.useState({ date: '', name: '', description: '' });
  const [overrideModalOpen, setOverrideModalOpen] = React.useState(false);
  const [overrideEmployee, setOverrideEmployee] = React.useState<EmployeeAttendance | null>(null);
  const [workingDays, setWorkingDays] = React.useState<number[]>([1, 2, 3, 4, 5]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, holRes, settingsRes] = await Promise.all([
        attendanceAPI.getAllEmployeesAttendance(selectedDate),
        attendanceAPI.getHolidays(new Date(selectedDate).getFullYear()),
        settingsAPI.getWorkingDays(),
      ]);
      setEmployees(empRes.data || []);
      setHolidays(holRes.data || []);
      if (settingsRes.data?.workingDays) {
        setWorkingDays(settingsRes.data.workingDays);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleQuickMark = async (employeeId: string, status: string) => {
    try {
      await attendanceAPI.override({
        employeeId,
        date: selectedDate,
        status,
      });
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const handleBulkMarkPresent = async () => {
    const unmarked = employees.filter((e) => e.status === 'NOT_MARKED');
    if (unmarked.length === 0) {
      alert('All employees already have attendance marked for this date.');
      return;
    }
    if (!confirm(`Mark ${unmarked.length} unmarked employee(s) as Present?`)) return;
    try {
      setBulkMarking(true);
      await attendanceAPI.bulkMark({
        date: selectedDate,
        records: unmarked.map((e) => ({ employeeId: e.id, status: 'PRESENT' })),
      });
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Bulk mark failed');
    } finally {
      setBulkMarking(false);
    }
  };

  const handleBulkMarkAbsent = async () => {
    const unmarked = employees.filter((e) => e.status === 'NOT_MARKED');
    if (unmarked.length === 0) {
      alert('All employees already have attendance marked for this date.');
      return;
    }
    if (!confirm(`Mark ${unmarked.length} unmarked employee(s) as Absent?`)) return;
    try {
      setBulkMarking(true);
      await attendanceAPI.bulkMark({
        date: selectedDate,
        records: unmarked.map((e) => ({ employeeId: e.id, status: 'ABSENT' })),
      });
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Bulk mark failed');
    } finally {
      setBulkMarking(false);
    }
  };

  const handleExport = async () => {
    try {
      const d = new Date(selectedDate);
      const startDate = format(new Date(d.getFullYear(), d.getMonth(), 1), 'yyyy-MM-dd');
      const endDate = format(new Date(d.getFullYear(), d.getMonth() + 1, 0), 'yyyy-MM-dd');
      const res = await attendanceAPI.exportCsv(startDate, endDate);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to export');
    }
  };

  const handleSaveHoliday = async () => {
    try {
      if (editingHoliday) {
        await attendanceAPI.updateHoliday(editingHoliday.id, holidayForm);
      } else {
        await attendanceAPI.createHoliday(holidayForm);
      }
      setHolidayModalOpen(false);
      setEditingHoliday(null);
      setHolidayForm({ date: '', name: '', description: '' });
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save holiday');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await attendanceAPI.deleteHoliday(id);
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete holiday');
    }
  };

  const handleOverrideSave = async (status: string, notes: string) => {
    if (!overrideEmployee) return;
    try {
      await attendanceAPI.override({
        employeeId: overrideEmployee.id,
        date: selectedDate,
        status,
        notes,
      });
      setOverrideModalOpen(false);
      setOverrideEmployee(null);
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to override');
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: employees.length,
    present: employees.filter((e) => e.status === 'PRESENT').length,
    halfDay: employees.filter((e) => e.status === 'HALF_DAY').length,
    absent: employees.filter((e) => e.status === 'ABSENT' || e.status === 'ABSENT_DOUBLE_DEDUCTION').length,
    paidLeave: employees.filter((e) => e.status === 'PAID_LEAVE').length,
    unpaidLeave: employees.filter((e) => e.status === 'UNPAID_LEAVE').length,
    notMarked: employees.filter((e) => e.status === 'NOT_MARKED').length,
  };

  const isHoliday = holidays.some((h) => {
    const hDate = new Date(h.date).toISOString().split('T')[0];
    return hDate === selectedDate;
  });

  const selectedDow = new Date(selectedDate).getDay();
  const isWeekend = !workingDays.includes(selectedDow);

  const selMonth = new Date(selectedDate).getMonth();
  const selYear = new Date(selectedDate).getFullYear();
  const monthHolidays = holidays.filter((h) => {
    const d = new Date(h.date);
    return d.getMonth() === selMonth && d.getFullYear() === selYear;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Date Selector + Actions Bar */}
      <div style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ ...selectStyle, width: '180px' }}
            />
          </div>
          {(isHoliday || isWeekend) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', background: isHoliday ? '#f3e8ff' : '#f5f5f5' }}>
              <AlertTriangle style={{ height: '14px', width: '14px', color: isHoliday ? '#7c3aed' : '#6b7280' }} />
              <span style={{ fontSize: '13px', fontWeight: 500, color: isHoliday ? '#7c3aed' : '#6b7280' }}>
                {isHoliday ? 'Official Holiday' : 'Weekend'}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button onClick={handleBulkMarkPresent} disabled={bulkMarking || stats.notMarked === 0} style={{ background: '#22c55e', border: 'none' }}>
            <CheckCircle style={{ height: '14px', width: '14px', marginRight: '6px' }} />
            {bulkMarking ? 'Marking...' : `Mark All Present (${stats.notMarked})`}
          </Button>
          <Button onClick={handleBulkMarkAbsent} disabled={bulkMarking || stats.notMarked === 0} style={{ background: '#ef4444', border: 'none' }}>
            <XCircle style={{ height: '14px', width: '14px', marginRight: '6px' }} />
            Mark Unmarked Absent
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download style={{ height: '14px', width: '14px', marginRight: '6px' }} />
            Export Month CSV
          </Button>
          <Button onClick={() => { setEditingHoliday(null); setHolidayForm({ date: selectedDate, name: '', description: '' }); setHolidayModalOpen(true); }}>
            <Plus style={{ height: '14px', width: '14px', marginRight: '6px' }} />
            Add Holiday
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Total Employees', value: stats.total, color: '#7c3aed' },
          { label: 'Present', value: stats.present, color: '#22c55e' },
          { label: 'Half Day', value: stats.halfDay, color: '#f59e0b' },
          { label: 'Absent', value: stats.absent, color: '#ef4444' },
          { label: 'Paid Leave', value: stats.paidLeave, color: '#3b82f6' },
          { label: 'Unpaid Leave', value: stats.unpaidLeave, color: '#9ca3af' },
          { label: 'Not Marked', value: stats.notMarked, color: '#6b7280' },
        ].map((s) => (
          <div key={s.label} style={{ ...cardStyle, padding: '16px', borderLeft: `4px solid ${s.color}` }}>
            <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0 0', color: '#111827' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', height: '16px', width: '16px', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by name or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...selectStyle, width: '100%', paddingLeft: '36px' }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">All Status</option>
          <option value="PRESENT">Present</option>
          <option value="HALF_DAY">Half Day</option>
          <option value="ABSENT">Absent</option>
          <option value="ABSENT_DOUBLE_DEDUCTION">Absent (Double)</option>
          <option value="PAID_LEAVE">Paid Leave</option>
          <option value="UNPAID_LEAVE">Unpaid Leave</option>
          <option value="NOT_MARKED">Not Marked</option>
        </select>
      </div>

      {/* Employee Attendance Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Employee</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Role</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Notes</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Quick Mark</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Override</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No employees found</td></tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const sc = STATUS_COLORS[emp.status] || STATUS_COLORS.NOT_MARKED;
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 500, color: '#111827' }}>{emp.name}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{emp.role}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
                          backgroundColor: sc.bg, color: sc.text,
                        }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {emp.notes || '—'}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleQuickMark(emp.id, 'PRESENT')}
                            title="Present"
                            style={{
                              padding: '4px 10px', borderRadius: '6px', border: '1px solid #22c55e', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                              backgroundColor: emp.status === 'PRESENT' ? '#22c55e' : '#dcfce7',
                              color: emp.status === 'PRESENT' ? '#fff' : '#166534',
                            }}
                          >
                            Full
                          </button>
                          <button
                            onClick={() => handleQuickMark(emp.id, 'HALF_DAY')}
                            title="Half Day"
                            style={{
                              padding: '4px 10px', borderRadius: '6px', border: '1px solid #f59e0b', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                              backgroundColor: emp.status === 'HALF_DAY' ? '#f59e0b' : '#fef3c7',
                              color: emp.status === 'HALF_DAY' ? '#fff' : '#92400e',
                            }}
                          >
                            Half
                          </button>
                          <button
                            onClick={() => handleQuickMark(emp.id, 'ABSENT')}
                            title="Absent"
                            style={{
                              padding: '4px 10px', borderRadius: '6px', border: '1px solid #ef4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                              backgroundColor: emp.status === 'ABSENT' ? '#ef4444' : '#fee2e2',
                              color: emp.status === 'ABSENT' ? '#fff' : '#991b1b',
                            }}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => { setOverrideEmployee(emp); setOverrideModalOpen(true); }}
                          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}
                          title="Override with notes"
                        >
                          <Edit2 style={{ height: '14px', width: '14px', color: '#6b7280' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Holiday Calendar for the month */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            <Calendar style={{ height: '18px', width: '18px', display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Official Holidays — {format(new Date(selectedDate), 'MMMM yyyy')}
          </h3>
        </div>
        {monthHolidays.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No holidays this month</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {monthHolidays.map((h) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9fafb', borderRadius: '10px' }}>
                <div>
                  <p style={{ fontWeight: 600, margin: 0, color: '#111827' }}>{h.name}</p>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>{format(new Date(h.date), 'EEEE, MMMM d, yyyy')}</p>
                  {h.description && <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>{h.description}</p>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => { setEditingHoliday(h); setHolidayForm({ date: format(new Date(h.date), 'yyyy-MM-dd'), name: h.name, description: h.description || '' }); setHolidayModalOpen(true); }}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}
                  >
                    <Edit2 style={{ height: '14px', width: '14px', color: '#6b7280' }} />
                  </button>
                  <button
                    onClick={() => handleDeleteHoliday(h.id)}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer' }}
                  >
                    <Trash2 style={{ height: '14px', width: '14px', color: '#dc2626' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Holiday Modal */}
      <Modal
        isOpen={holidayModalOpen}
        onClose={() => { setHolidayModalOpen(false); setEditingHoliday(null); setHolidayForm({ date: '', name: '', description: '' }); }}
        title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Label htmlFor="hDate">Date</Label>
            <Input id="hDate" type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="hName">Holiday Name</Label>
            <Input id="hName" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="e.g., Republic Day" />
          </div>
          <div>
            <Label htmlFor="hDesc">Description (Optional)</Label>
            <Input id="hDesc" value={holidayForm.description} onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })} placeholder="Optional description" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
            <Button variant="outline" onClick={() => setHolidayModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveHoliday} disabled={!holidayForm.date || !holidayForm.name}>{editingHoliday ? 'Update' : 'Create'} Holiday</Button>
          </div>
        </div>
      </Modal>

      {/* Override Modal */}
      <OverrideWithNotesModal
        isOpen={overrideModalOpen}
        onClose={() => { setOverrideModalOpen(false); setOverrideEmployee(null); }}
        employee={overrideEmployee}
        date={selectedDate}
        onSave={handleOverrideSave}
      />
    </div>
  );
}

function OverrideWithNotesModal({
  isOpen,
  onClose,
  employee,
  date,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeAttendance | null;
  date: string;
  onSave: (status: string, notes: string) => Promise<void>;
}) {
  const [status, setStatus] = React.useState('PRESENT');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (employee) {
      setStatus(employee.status === 'NOT_MARKED' ? 'PRESENT' : employee.status);
      setNotes('');
    }
  }, [employee]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(status, notes);
    } catch {
      // handled in parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Override Attendance">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <Label>Employee</Label>
          <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>{employee?.name || ''} ({employee?.role || ''})</p>
        </div>
        <div>
          <Label>Date</Label>
          <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>{date ? format(new Date(date), 'MMMM d, yyyy') : ''}</p>
        </div>
        <div>
          <Label>Current Status</Label>
          <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>{STATUS_COLORS[employee?.status || 'NOT_MARKED']?.label || employee?.status}</p>
        </div>
        <div>
          <Label htmlFor="ovStatus">New Status</Label>
          <select id="ovStatus" value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
            <option value="PRESENT">Present</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ABSENT">Absent</option>
            <option value="PAID_LEAVE">Paid Leave</option>
            <option value="UNPAID_LEAVE">Unpaid Leave</option>
            <option value="ABSENT_DOUBLE_DEDUCTION">Absent (Double Deduction)</option>
          </select>
        </div>
        <div>
          <Label htmlFor="ovNotes">Reason for Override</Label>
          <Input id="ovNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for override (audit trail)" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Override Attendance'}</Button>
        </div>
      </div>
    </Modal>
  );
}
