'use client';

import * as React from 'react';
import { Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { CalendarWidget, type CalendarEvent } from '@/components/dashboard/calendar-widget';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { useAuthStore } from '@/store/auth-store';
import { useExport } from '@/hooks/use-export';

// Mock data
const mockCalendarEvents: CalendarEvent[] = [
  { date: new Date(), type: 'present' },
  { date: new Date(Date.now() - 86400000), type: 'present' },
  { date: new Date(Date.now() - 2 * 86400000), type: 'present' },
  { date: new Date(Date.now() - 3 * 86400000), type: 'half_day' },
  { date: new Date(Date.now() - 4 * 86400000), type: 'present' },
  { date: new Date(Date.now() - 5 * 86400000), type: 'holiday' },
  { date: new Date(Date.now() - 6 * 86400000), type: 'holiday' },
  { date: new Date(Date.now() - 7 * 86400000), type: 'present' },
  { date: new Date(Date.now() - 8 * 86400000), type: 'leave' },
  { date: new Date(Date.now() - 9 * 86400000), type: 'present' },
];

const mockStats = {
  present: 18,
  absent: 1,
  halfDay: 1,
  leaves: 2,
  workingDays: 22,
};

const mockTodayStatus = {
  marked: true,
  status: 'PRESENT',
  checkIn: '09:15 AM',
  checkOut: null as string | null,
};

const badgeStyles: Record<string, React.CSSProperties> = {
  success: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '9999px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  warning: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '9999px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  destructive: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '9999px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
};

export default function AttendancePage() {
  const { user } = useAuthStore();
  const { exportAttendance } = useExport();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [todayStatus, setTodayStatus] = React.useState(mockTodayStatus);

  const handleMarkAttendance = (status: 'PRESENT' | 'HALF_DAY' | 'ABSENT') => {
    setTodayStatus({
      marked: true,
      status,
      checkIn: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      checkOut: null,
    });
  };

  const handleCheckOut = () => {
    setTodayStatus((prev) => ({
      ...prev,
      checkOut: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }));
  };

  const getBadgeStyle = (status: string) => {
    if (status === 'PRESENT') return badgeStyles.success;
    if (status === 'HALF_DAY') return badgeStyles.warning;
    return badgeStyles.destructive;
  };

  return (
    <DashboardLayout
      title="Attendance"
      description="Track your attendance and work hours"
      actions={
        <button
          onClick={() => exportAttendance([])}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            color: '#374151',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Download style={{ height: '16px', width: '16px' }} />
          Export
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Today's Status */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <h3 style={{ fontWeight: 600, fontSize: '16px', margin: 0, color: '#111827' }}>
                  Today's Attendance
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {todayStatus.marked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={getBadgeStyle(todayStatus.status)}>
                      {todayStatus.status.replace('_', ' ')}
                    </span>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                      Check-in: {todayStatus.checkIn}
                      {todayStatus.checkOut && ` | Check-out: ${todayStatus.checkOut}`}
                    </p>
                  </div>
                  {!todayStatus.checkOut && (
                    <button
                      onClick={handleCheckOut}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Check Out
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleMarkAttendance('PRESENT')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#22c55e',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <CheckCircle style={{ height: '16px', width: '16px' }} />
                    Present
                  </button>
                  <button
                    onClick={() => handleMarkAttendance('HALF_DAY')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Clock style={{ height: '16px', width: '16px' }} />
                    Half Day
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatsGrid>
          <StatsCard
            title="Present Days"
            value={mockStats.present}
            icon={CheckCircle}
            iconColor="text-green-600"
          />
          <StatsCard
            title="Absent Days"
            value={mockStats.absent}
            icon={XCircle}
            iconColor="text-red-600"
          />
          <StatsCard
            title="Half Days"
            value={mockStats.halfDay}
            icon={Clock}
            iconColor="text-yellow-600"
          />
          <StatsCard
            title="Leaves Taken"
            value={mockStats.leaves}
            trend={{
              value: Math.round(
                ((mockStats.present + mockStats.halfDay * 0.5) /
                  mockStats.workingDays) *
                  100
              ),
              label: '% attendance',
            }}
          />
        </StatsGrid>

        {/* Calendar and Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
          }}
        >
          <CalendarWidget
            events={mockCalendarEvents}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            title="Monthly Attendance"
          />

          {/* Selected Date Details */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '24px',
            }}
          >
            <h3 style={{ fontWeight: 600, fontSize: '16px', margin: 0, marginBottom: '16px', color: '#111827' }}>
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Select a date'}
            </h3>
            {selectedDate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#f9fafb',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Status</span>
                  <span style={badgeStyles.success}>Present</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#f9fafb',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Check-in</span>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>09:15 AM</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#f9fafb',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Check-out</span>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>06:30 PM</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#f9fafb',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Working Hours</span>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>9h 15m</span>
                </div>
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Click on a date in the calendar to view details
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
