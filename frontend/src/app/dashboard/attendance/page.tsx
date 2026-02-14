'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  LogOut,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { attendanceAPI } from '@/lib/api-client';
import { format, isToday } from 'date-fns';

interface CalendarDay {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  status: string | null;
  notes: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  workingHours: number | null;
  leaveType: string | null;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  description?: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  halfDay: number;
  paidLeave: number;
  unpaidLeave: number;
  holiday: number;
  total: number;
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

export default function AttendancePage() {
  const { user } = useAuthStore();
  const isHRHead = user?.role === 'HR_HEAD';
  const isDirector = user?.role === 'DIRECTOR';
  const canManageHolidays = isHRHead || isDirector;

  return (
    <DashboardLayout
      title="My Attendance"
      description="Track your attendance and view your calendar"
    >
      <PersonalCalendarView canManageHolidays={canManageHolidays} />
    </DashboardLayout>
  );
}

/* ============================================================
   PERSONAL CALENDAR VIEW (for all roles)
   ============================================================ */
function PersonalCalendarView({ canManageHolidays }: { canManageHolidays: boolean }) {
  const { user } = useAuthStore();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [calendarData, setCalendarData] = React.useState<CalendarDay[]>([]);
  const [summary, setSummary] = React.useState<AttendanceSummary | null>(null);
  const [todayStatus, setTodayStatus] = React.useState<{
    marked: boolean; status: string | null; checkInTime: string | null; checkOutTime: string | null; workingHours: number | null;
  } | null>(null);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [marking, setMarking] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState<CalendarDay | null>(null);
  const [holidayModalOpen, setHolidayModalOpen] = React.useState(false);
  const [editingHoliday, setEditingHoliday] = React.useState<Holiday | null>(null);
  const [holidayForm, setHolidayForm] = React.useState({ date: '', name: '', description: '' });

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [calendarRes, summaryRes, todayRes, holidaysRes] = await Promise.all([
        attendanceAPI.getCalendarWithHolidays(month, year),
        attendanceAPI.getSummary(month, year),
        attendanceAPI.getTodayStatus(),
        attendanceAPI.getHolidaysForMonth(month, year),
      ]);
      setCalendarData(calendarRes.data);
      setSummary(summaryRes.data);
      setTodayStatus(todayRes.data);
      setHolidays(holidaysRes.data);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchData(); }, [month, year]);

  const handleMarkAttendance = async (status: 'PRESENT' | 'HALF_DAY') => {
    try {
      setMarking(true);
      await attendanceAPI.mark({ status });
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarking(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setMarking(true);
      await attendanceAPI.checkOut();
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to check out');
    } finally {
      setMarking(false);
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
    try { await attendanceAPI.deleteHoliday(id); await fetchData(); } catch (error: any) { alert(error.response?.data?.message || 'Failed to delete holiday'); }
  };

  const getDayStyle = (day: CalendarDay) => {
    if (day.isHoliday) return { background: '#f3e8ff', border: '2px solid #a855f7' };
    if (day.isWeekend) return { background: '#f5f5f5' };
    if (day.status) { const c = STATUS_COLORS[day.status]; return { background: c?.bg || '#fff' }; }
    return {};
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Today's Status */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '24px', color: 'white' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Today&apos;s Attendance</h3>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          {todayStatus?.marked ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: '20px', fontWeight: 600 }}>
                {STATUS_COLORS[todayStatus.status || '']?.label || todayStatus.status}
              </div>
              {todayStatus.checkInTime && (
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  <span>In: {new Date(todayStatus.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {todayStatus.checkOutTime && <span style={{ marginLeft: '12px' }}>Out: {new Date(todayStatus.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                  {todayStatus.workingHours != null && <span style={{ marginLeft: '12px' }}>({todayStatus.workingHours}h)</span>}
                </div>
              )}
              {todayStatus.checkInTime && !todayStatus.checkOutTime && (
                <Button onClick={handleCheckOut} disabled={marking} style={{ background: '#ef4444', border: 'none', color: '#fff', fontWeight: 600 }}>
                  <LogOut style={{ height: '16px', width: '16px', marginRight: '8px' }} />
                  {marking ? 'Checking out...' : 'Check Out'}
                </Button>
              )}
              {todayStatus.checkOutTime && (
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle style={{ height: '14px', width: '14px' }} /> Day Complete
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button onClick={() => handleMarkAttendance('PRESENT')} disabled={marking} style={{ background: '#22c55e', border: 'none' }}>
                <CheckCircle style={{ height: '16px', width: '16px', marginRight: '8px' }} /> {marking ? 'Marking...' : 'Present'}
              </Button>
              <Button variant="outline" onClick={() => handleMarkAttendance('HALF_DAY')} disabled={marking} style={{ background: 'rgba(255,255,255,0.9)', color: '#374151' }}>
                <Clock style={{ height: '16px', width: '16px', marginRight: '8px' }} /> Half Day
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Present', value: summary.present, color: '#22c55e' },
            { label: 'Absent', value: summary.absent, color: '#ef4444' },
            { label: 'Half Days', value: summary.halfDay, color: '#f59e0b' },
            { label: 'Paid Leave', value: summary.paidLeave, color: '#3b82f6' },
            { label: 'Unpaid Leave', value: summary.unpaidLeave, color: '#6b7280' },
            { label: 'Holidays', value: summary.holiday, color: '#a855f7' },
          ].map((stat) => (
            <div key={stat.label} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${stat.color}` }}>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{stat.label}</p>
              <p style={{ fontSize: '28px', fontWeight: 700, margin: '4px 0 0 0', color: '#111827' }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button onClick={() => setCurrentDate(new Date(year, month - 2, 1))} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>
            <ChevronLeft style={{ height: '20px', width: '20px' }} />
          </button>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{format(currentDate, 'MMMM yyyy')}</h3>
          <button onClick={() => setCurrentDate(new Date(year, month, 1))} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>
            <ChevronRight style={{ height: '20px', width: '20px' }} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {dayNames.map((d) => (
            <div key={d} style={{ textAlign: 'center', padding: '8px', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>{d}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading calendar...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {calendarData.length > 0 && Array.from({ length: calendarData[0].dayOfWeek }).map((_, i) => (
              <div key={`e-${i}`} style={{ padding: '12px' }} />
            ))}
            {calendarData.map((day) => {
              const dayDate = new Date(day.date);
              const isCurrent = isToday(dayDate);
              const ds = getDayStyle(day);
              return (
                <div key={day.date} onClick={() => setSelectedDay(day)} style={{ padding: '12px 8px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', border: isCurrent ? '2px solid #667eea' : '1px solid #e5e7eb', ...ds }}>
                  <div style={{ fontWeight: isCurrent ? 700 : 500, fontSize: '14px', color: day.isWeekend ? '#9ca3af' : '#111827' }}>{dayDate.getDate()}</div>
                  {day.isHoliday && <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{day.holidayName}</div>}
                  {day.status && !day.isHoliday && <div style={{ fontSize: '10px', marginTop: '2px', color: STATUS_COLORS[day.status]?.text || '#6b7280' }}>{STATUS_COLORS[day.status]?.label || day.status}</div>}
                  {day.checkInTime && !day.isHoliday && <div style={{ fontSize: '9px', marginTop: '1px', color: '#6b7280' }}>{new Date(day.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                  {day.leaveType && !day.isHoliday && <div style={{ fontSize: '9px', marginTop: '1px', color: '#1e40af', fontWeight: 500 }}>{day.leaveType}</div>}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
          {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'NOT_MARKED').map(([key, value]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: value.bg }} />
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{value.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Holiday Management */}
      {canManageHolidays && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
              <Calendar style={{ height: '18px', width: '18px', display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
              Holidays in {format(currentDate, 'MMMM yyyy')}
            </h3>
            <Button onClick={() => { setEditingHoliday(null); setHolidayForm({ date: '', name: '', description: '' }); setHolidayModalOpen(true); }}>
              <Plus style={{ height: '14px', width: '14px', marginRight: '6px' }} /> Add Holiday
            </Button>
          </div>
          {holidays.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No holidays in this month</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {holidays.map((h) => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9fafb', borderRadius: '10px' }}>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0, color: '#111827' }}>{h.name}</p>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>{format(new Date(h.date), 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setEditingHoliday(h); setHolidayForm({ date: format(new Date(h.date), 'yyyy-MM-dd'), name: h.name, description: h.description || '' }); setHolidayModalOpen(true); }} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>
                      <Edit2 style={{ height: '14px', width: '14px', color: '#6b7280' }} />
                    </button>
                    <button onClick={() => handleDeleteHoliday(h.id)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer' }}>
                      <Trash2 style={{ height: '14px', width: '14px', color: '#dc2626' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Day Details */}
      {selectedDay && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0' }}>{format(new Date(selectedDay.date), 'EEEE, MMMM d, yyyy')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>Status</p>
              <p style={{ fontWeight: 600, margin: 0, color: selectedDay.status ? STATUS_COLORS[selectedDay.status]?.text : '#6b7280' }}>
                {selectedDay.isHoliday ? `Holiday: ${selectedDay.holidayName}` : selectedDay.isWeekend ? 'Weekend' : selectedDay.status ? STATUS_COLORS[selectedDay.status]?.label : 'Not Marked'}
              </p>
            </div>
            {selectedDay.checkInTime && (
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px' }}>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>Check-In</p>
                <p style={{ fontWeight: 600, margin: 0, color: '#111827' }}>{new Date(selectedDay.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
              </div>
            )}
            {selectedDay.checkOutTime && (
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px' }}>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>Check-Out</p>
                <p style={{ fontWeight: 600, margin: 0, color: '#111827' }}>{new Date(selectedDay.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
              </div>
            )}
            {selectedDay.workingHours != null && selectedDay.workingHours > 0 && (
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px' }}>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>Working Hours</p>
                <p style={{ fontWeight: 600, margin: 0, color: '#111827' }}>{selectedDay.workingHours} hours</p>
              </div>
            )}
            {selectedDay.leaveType && (
              <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '10px' }}>
                <p style={{ fontSize: '14px', color: '#1e40af', margin: '0 0 4px 0' }}>Leave Type</p>
                <p style={{ fontWeight: 600, margin: 0, color: '#1e40af' }}>{selectedDay.leaveType} Leave</p>
              </div>
            )}
            {selectedDay.notes && (
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px', gridColumn: selectedDay.checkInTime ? 'span 2' : undefined }}>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>Notes</p>
                <p style={{ fontWeight: 500, margin: 0, color: '#111827' }}>{selectedDay.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      <Modal
        isOpen={holidayModalOpen}
        onClose={() => { setHolidayModalOpen(false); setEditingHoliday(null); setHolidayForm({ date: '', name: '', description: '' }); }}
        title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><Label htmlFor="hDate2">Date</Label><Input id="hDate2" type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} /></div>
          <div><Label htmlFor="hName2">Holiday Name</Label><Input id="hName2" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="e.g., Republic Day" /></div>
          <div><Label htmlFor="hDesc2">Description (Optional)</Label><Input id="hDesc2" value={holidayForm.description} onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
            <Button variant="outline" onClick={() => setHolidayModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveHoliday} disabled={!holidayForm.date || !holidayForm.name}>{editingHoliday ? 'Update' : 'Create'} Holiday</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
