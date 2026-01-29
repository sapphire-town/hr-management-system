'use client';

import * as React from 'react';
import {
  Building2,
  Clock,
  Calendar,
  Briefcase,
  Bell,
  Mail,
  Save,
  RefreshCw,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { settingsAPI } from '@/lib/api-client';

interface LeavePolicies {
  sickLeavePerYear: number;
  casualLeavePerYear: number;
  earnedLeavePerYear: number;
  maxConsecutiveDays: number;
  carryForwardAllowed: boolean;
  maxCarryForward: number;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  reminderDaysBefore: number;
}

interface Settings {
  id: string;
  companyName: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: number[];
  leavePolicies: LeavePolicies;
  notificationPreferences: NotificationPreferences;
  updatedAt: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'company' | 'leave' | 'notifications'>('company');

  // Form states
  const [companyName, setCompanyName] = React.useState('');
  const [workingHoursStart, setWorkingHoursStart] = React.useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = React.useState('18:00');
  const [workingDays, setWorkingDays] = React.useState<number[]>([1, 2, 3, 4, 5]);

  const [leavePolicies, setLeavePolicies] = React.useState<LeavePolicies>({
    sickLeavePerYear: 6,
    casualLeavePerYear: 6,
    earnedLeavePerYear: 12,
    maxConsecutiveDays: 5,
    carryForwardAllowed: true,
    maxCarryForward: 5,
  });

  const [notificationPrefs, setNotificationPrefs] = React.useState<NotificationPreferences>({
    emailNotifications: true,
    inAppNotifications: true,
    reminderDaysBefore: 7,
  });

  const isDirector = user?.role === 'DIRECTOR';

  const fetchSettings = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getSettings();
      const settings: Settings = response.data;

      setCompanyName(settings.companyName || '');
      setWorkingHoursStart(settings.workingHoursStart || '09:00');
      setWorkingHoursEnd(settings.workingHoursEnd || '18:00');
      setWorkingDays(settings.workingDays || [1, 2, 3, 4, 5]);

      if (settings.leavePolicies) {
        setLeavePolicies(settings.leavePolicies);
      }
      if (settings.notificationPreferences) {
        setNotificationPrefs(settings.notificationPreferences);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isDirector) {
      fetchSettings();
    }
  }, [isDirector, fetchSettings]);

  const handleSaveCompany = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateCompany({
        companyName,
        workingHoursStart,
        workingHoursEnd,
        workingDays,
      });
      alert('Company settings saved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLeavePolicies = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateLeavePolicies(leavePolicies);
      alert('Leave policies saved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save leave policies');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await settingsAPI.updateNotifications(notificationPrefs);
      alert('Notification settings saved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkingDay = (day: number) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  if (!isDirector) {
    return (
      <DashboardLayout title="Settings" description="Access restricted">
        <div style={{
          padding: 40,
          textAlign: 'center',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            Access Denied
          </h2>
          <p style={{ color: '#64748b' }}>
            Only Directors can access company settings.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Settings" description="Configure company settings">
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
          Loading settings...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Company Settings"
      description="Configure company policies and preferences"
      actions={
        <Button variant="outline" onClick={fetchSettings}>
          <RefreshCw style={{ width: 16, height: 16, marginRight: 8 }} />
          Refresh
        </Button>
      }
    >
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar Tabs */}
        <div style={{
          width: 240,
          background: '#fff',
          borderRadius: 16,
          padding: 8,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          height: 'fit-content',
        }}>
          <button
            onClick={() => setActiveTab('company')}
            style={{
              width: '100%',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: activeTab === 'company' ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' : 'transparent',
              color: activeTab === 'company' ? '#fff' : '#374151',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'left',
              marginBottom: 4,
            }}
          >
            <Building2 style={{ width: 18, height: 18 }} />
            Company Info
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            style={{
              width: '100%',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: activeTab === 'leave' ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' : 'transparent',
              color: activeTab === 'leave' ? '#fff' : '#374151',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'left',
              marginBottom: 4,
            }}
          >
            <Briefcase style={{ width: 18, height: 18 }} />
            Leave Policies
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            style={{
              width: '100%',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: activeTab === 'notifications' ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' : 'transparent',
              color: activeTab === 'notifications' ? '#fff' : '#374151',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'left',
            }}
          >
            <Bell style={{ width: 18, height: 18 }} />
            Notifications
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1 }}>
          {/* Company Info Tab */}
          {activeTab === 'company' && (
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Building2 style={{ width: 24, height: 24, color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    Company Information
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                    Basic company details and working hours
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <Label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock style={{ width: 14, height: 14 }} />
                      Working Hours Start
                    </Label>
                    <Input
                      type="time"
                      value={workingHoursStart}
                      onChange={(e) => setWorkingHoursStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock style={{ width: 14, height: 14 }} />
                      Working Hours End
                    </Label>
                    <Input
                      type="time"
                      value={workingHoursEnd}
                      onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Calendar style={{ width: 14, height: 14 }} />
                    Working Days
                  </Label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => toggleWorkingDay(day.value)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 500,
                          background: workingDays.includes(day.value)
                            ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)'
                            : '#f1f5f9',
                          color: workingDays.includes(day.value) ? '#fff' : '#64748b',
                          transition: 'all 0.2s',
                        }}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
                <Button
                  onClick={handleSaveCompany}
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                    color: '#fff',
                  }}
                >
                  <Save style={{ width: 16, height: 16, marginRight: 8 }} />
                  {saving ? 'Saving...' : 'Save Company Settings'}
                </Button>
              </div>
            </div>
          )}

          {/* Leave Policies Tab */}
          {activeTab === 'leave' && (
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Briefcase style={{ width: 24, height: 24, color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    Leave Policies
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                    Configure annual leave allocations and rules
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{
                  padding: 16,
                  background: '#fef2f2',
                  borderRadius: 12,
                  border: '1px solid #fecaca',
                }}>
                  <Label style={{ color: '#dc2626' }}>Sick Leave (per year)</Label>
                  <Input
                    type="number"
                    value={leavePolicies.sickLeavePerYear}
                    onChange={(e) => setLeavePolicies({ ...leavePolicies, sickLeavePerYear: parseInt(e.target.value) || 0 })}
                    style={{ marginTop: 8 }}
                  />
                </div>
                <div style={{
                  padding: 16,
                  background: '#eff6ff',
                  borderRadius: 12,
                  border: '1px solid #bfdbfe',
                }}>
                  <Label style={{ color: '#2563eb' }}>Casual Leave (per year)</Label>
                  <Input
                    type="number"
                    value={leavePolicies.casualLeavePerYear}
                    onChange={(e) => setLeavePolicies({ ...leavePolicies, casualLeavePerYear: parseInt(e.target.value) || 0 })}
                    style={{ marginTop: 8 }}
                  />
                </div>
                <div style={{
                  padding: 16,
                  background: '#f0fdf4',
                  borderRadius: 12,
                  border: '1px solid #bbf7d0',
                }}>
                  <Label style={{ color: '#16a34a' }}>Earned Leave (per year)</Label>
                  <Input
                    type="number"
                    value={leavePolicies.earnedLeavePerYear}
                    onChange={(e) => setLeavePolicies({ ...leavePolicies, earnedLeavePerYear: parseInt(e.target.value) || 0 })}
                    style={{ marginTop: 8 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <Label>Max Consecutive Days</Label>
                  <Input
                    type="number"
                    value={leavePolicies.maxConsecutiveDays}
                    onChange={(e) => setLeavePolicies({ ...leavePolicies, maxConsecutiveDays: parseInt(e.target.value) || 0 })}
                  />
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Maximum consecutive leave days allowed
                  </p>
                </div>
                <div>
                  <Label>Max Carry Forward Days</Label>
                  <Input
                    type="number"
                    value={leavePolicies.maxCarryForward}
                    onChange={(e) => setLeavePolicies({ ...leavePolicies, maxCarryForward: parseInt(e.target.value) || 0 })}
                    disabled={!leavePolicies.carryForwardAllowed}
                  />
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Days that can be carried to next year
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 12,
                }}>
                  <input
                    type="checkbox"
                    checked={leavePolicies.carryForwardAllowed}
                    onChange={(e) => setLeavePolicies({ ...leavePolicies, carryForwardAllowed: e.target.checked })}
                    style={{ width: 20, height: 20, accentColor: '#7c3aed' }}
                  />
                  <div>
                    <div style={{ fontWeight: 500, color: '#1e293b' }}>Allow Leave Carry Forward</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      Enable employees to carry forward unused leaves to the next year
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
                <Button
                  onClick={handleSaveLeavePolicies}
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: '#fff',
                  }}
                >
                  <Save style={{ width: 16, height: 16, marginRight: 8 }} />
                  {saving ? 'Saving...' : 'Save Leave Policies'}
                </Button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Bell style={{ width: 24, height: 24, color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    Notification Preferences
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                    Configure how notifications are delivered
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Mail style={{ width: 20, height: 20, color: '#6b7280' }} />
                    <div>
                      <div style={{ fontWeight: 500, color: '#1e293b' }}>Email Notifications</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        Send notifications via email
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.emailNotifications}
                    onChange={(e) => setNotificationPrefs({ ...notificationPrefs, emailNotifications: e.target.checked })}
                    style={{ width: 24, height: 24, accentColor: '#7c3aed' }}
                  />
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Bell style={{ width: 20, height: 20, color: '#6b7280' }} />
                    <div>
                      <div style={{ fontWeight: 500, color: '#1e293b' }}>In-App Notifications</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        Show notifications within the application
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.inAppNotifications}
                    onChange={(e) => setNotificationPrefs({ ...notificationPrefs, inAppNotifications: e.target.checked })}
                    style={{ width: 24, height: 24, accentColor: '#7c3aed' }}
                  />
                </label>

                <div style={{
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 12,
                }}>
                  <Label style={{ marginBottom: 8, display: 'block' }}>
                    Reminder Days Before Due Date
                  </Label>
                  <Input
                    type="number"
                    value={notificationPrefs.reminderDaysBefore}
                    onChange={(e) => setNotificationPrefs({ ...notificationPrefs, reminderDaysBefore: parseInt(e.target.value) || 0 })}
                    min={1}
                    max={30}
                  />
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Days before a deadline to send reminder notifications
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
                <Button
                  onClick={handleSaveNotifications}
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                    color: '#fff',
                  }}
                >
                  <Save style={{ width: 16, height: 16, marginRight: 8 }} />
                  {saving ? 'Saving...' : 'Save Notification Settings'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
