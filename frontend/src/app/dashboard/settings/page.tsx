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
  FileText,
  Upload,
  X,
  Palette,
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

interface PayslipTemplate {
  companyAddress: string;
  registrationNumber: string;
  signatoryName: string;
  signatoryTitle: string;
  footerText: string;
  primaryColor: string;
}

interface Settings {
  id: string;
  companyName: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: number[];
  leavePolicies: LeavePolicies;
  notificationPreferences: NotificationPreferences;
  companyLogo: string | null;
  payslipTemplate: PayslipTemplate;
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
  const [activeTab, setActiveTab] = React.useState<'company' | 'leave' | 'notifications' | 'payslip'>('company');

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

  // Payslip template state
  const [payslipTemplate, setPayslipTemplate] = React.useState<PayslipTemplate>({
    companyAddress: '',
    registrationNumber: '',
    signatoryName: '',
    signatoryTitle: '',
    footerText: '',
    primaryColor: '#7c3aed',
  });
  const [currentLogoPath, setCurrentLogoPath] = React.useState<string | null>(null);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const isDirector = user?.role === 'DIRECTOR';
  const isHRHead = user?.role === 'HR_HEAD';
  const canAccessSettings = isDirector || isHRHead;

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
      if (settings.companyLogo) {
        setCurrentLogoPath(settings.companyLogo);
        setLogoPreview(settingsAPI.getLogoUrl(settings.companyLogo));
      }
      if (settings.payslipTemplate) {
        const tmpl = settings.payslipTemplate as PayslipTemplate;
        setPayslipTemplate({
          companyAddress: tmpl.companyAddress || '',
          registrationNumber: tmpl.registrationNumber || '',
          signatoryName: tmpl.signatoryName || '',
          signatoryTitle: tmpl.signatoryTitle || '',
          footerText: tmpl.footerText || '',
          primaryColor: tmpl.primaryColor || '#7c3aed',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (canAccessSettings) {
      fetchSettings();
    }
  }, [canAccessSettings, fetchSettings]);

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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file must be less than 2MB');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setCurrentLogoPath(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleSavePayslipTemplate = async () => {
    try {
      setSaving(true);
      // Upload logo if changed
      if (logoFile) {
        await settingsAPI.uploadLogo(logoFile);
        setLogoFile(null);
      }
      await settingsAPI.updatePayslipTemplate(payslipTemplate);
      alert('Payslip template saved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save payslip template');
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

  if (!canAccessSettings) {
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
            Only Directors and HR Heads can access company settings.
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
          <button
            onClick={() => setActiveTab('payslip')}
            style={{
              width: '100%',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: activeTab === 'payslip' ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' : 'transparent',
              color: activeTab === 'payslip' ? '#fff' : '#374151',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'left',
              marginTop: 4,
            }}
          >
            <FileText style={{ width: 18, height: 18 }} />
            Payslip Template
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

          {/* Payslip Template Tab */}
          {activeTab === 'payslip' && (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {/* Template Configuration */}
              <div style={{
                flex: '1 1 420px',
                minWidth: 0,
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
                    <FileText style={{ width: 24, height: 24, color: '#fff' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                      Payslip Template
                    </h2>
                    <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                      Customize your company&apos;s payslip branding
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 20 }}>
                  {/* Company Logo Upload */}
                  <div>
                    <Label style={{ marginBottom: 8, display: 'block' }}>Company Logo</Label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoSelect}
                      style={{ display: 'none' }}
                    />
                    {logoPreview ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        padding: 16,
                        background: '#f8fafc',
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                      }}>
                        <img
                          src={logoPreview}
                          alt="Company logo"
                          style={{
                            width: 64,
                            height: 64,
                            objectFit: 'contain',
                            borderRadius: 8,
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                            {logoFile?.name || 'Current logo'}
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                            {logoFile ? `${(logoFile.size / 1024).toFixed(1)} KB` : 'Uploaded'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => logoInputRef.current?.click()}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              background: '#fff',
                              fontSize: 13,
                              cursor: 'pointer',
                              color: '#374151',
                            }}
                          >
                            Change
                          </button>
                          <button
                            onClick={handleRemoveLogo}
                            style={{
                              padding: '6px',
                              borderRadius: 8,
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              cursor: 'pointer',
                              color: '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <X style={{ width: 16, height: 16 }} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        style={{
                          width: '100%',
                          padding: '24px',
                          borderRadius: 12,
                          border: '2px dashed #cbd5e1',
                          background: '#f8fafc',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          color: '#64748b',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#7c3aed';
                          e.currentTarget.style.background = '#faf5ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.background = '#f8fafc';
                        }}
                      >
                        <Upload style={{ width: 24, height: 24 }} />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>Click to upload logo</span>
                        <span style={{ fontSize: 12 }}>PNG, JPG, SVG, WebP (max 2MB)</span>
                      </button>
                    )}
                  </div>

                  {/* Company Address */}
                  <div>
                    <Label>Company Address</Label>
                    <textarea
                      value={payslipTemplate.companyAddress}
                      onChange={(e) => setPayslipTemplate({ ...payslipTemplate, companyAddress: e.target.value })}
                      placeholder="123 Business Park, City, State - 123456"
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 14,
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        marginTop: 4,
                      }}
                    />
                  </div>

                  {/* Registration Number */}
                  <div>
                    <Label>Registration / Tax Number</Label>
                    <Input
                      value={payslipTemplate.registrationNumber}
                      onChange={(e) => setPayslipTemplate({ ...payslipTemplate, registrationNumber: e.target.value })}
                      placeholder="e.g., CIN: U12345MH2020PTC123456"
                    />
                  </div>

                  {/* Signatory */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <Label>Authorized Signatory Name</Label>
                      <Input
                        value={payslipTemplate.signatoryName}
                        onChange={(e) => setPayslipTemplate({ ...payslipTemplate, signatoryName: e.target.value })}
                        placeholder="e.g., John Smith"
                      />
                    </div>
                    <div>
                      <Label>Signatory Title</Label>
                      <Input
                        value={payslipTemplate.signatoryTitle}
                        onChange={(e) => setPayslipTemplate({ ...payslipTemplate, signatoryTitle: e.target.value })}
                        placeholder="e.g., HR Manager"
                      />
                    </div>
                  </div>

                  {/* Footer Text */}
                  <div>
                    <Label>Footer Text</Label>
                    <Input
                      value={payslipTemplate.footerText}
                      onChange={(e) => setPayslipTemplate({ ...payslipTemplate, footerText: e.target.value })}
                      placeholder="This is a system-generated payslip"
                    />
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Appears at the bottom of every payslip page
                    </p>
                  </div>

                  {/* Primary Color */}
                  <div>
                    <Label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Palette style={{ width: 14, height: 14 }} />
                      Brand Color
                    </Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <input
                        type="color"
                        value={payslipTemplate.primaryColor}
                        onChange={(e) => setPayslipTemplate({ ...payslipTemplate, primaryColor: e.target.value })}
                        style={{
                          width: 48,
                          height: 40,
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      />
                      <Input
                        value={payslipTemplate.primaryColor}
                        onChange={(e) => setPayslipTemplate({ ...payslipTemplate, primaryColor: e.target.value })}
                        style={{ maxWidth: 120 }}
                      />
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        Header, tables, and net pay box color
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
                  <Button
                    onClick={handleSavePayslipTemplate}
                    disabled={saving}
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                      color: '#fff',
                    }}
                  >
                    <Save style={{ width: 16, height: 16, marginRight: 8 }} />
                    {saving ? 'Saving...' : 'Save Payslip Template'}
                  </Button>
                </div>
              </div>

              {/* Live Preview */}
              <div style={{
                flex: '1 1 320px',
                minWidth: 0,
                background: '#fff',
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                alignSelf: 'flex-start',
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 16px 0' }}>
                  Preview
                </h3>
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  overflow: 'hidden',
                  fontSize: 10,
                  lineHeight: 1.4,
                }}>
                  {/* Mini header */}
                  <div style={{
                    background: payslipTemplate.primaryColor || '#7c3aed',
                    padding: '12px 14px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}>
                    {logoPreview && (
                      <img
                        src={logoPreview}
                        alt="Logo"
                        style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, background: '#fff' }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{companyName || 'Company Name'}</div>
                      {payslipTemplate.companyAddress && (
                        <div style={{ fontSize: 8, opacity: 0.85, marginTop: 2 }}>
                          {payslipTemplate.companyAddress}
                        </div>
                      )}
                      {payslipTemplate.registrationNumber && (
                        <div style={{ fontSize: 7, opacity: 0.7, marginTop: 1 }}>
                          Reg: {payslipTemplate.registrationNumber}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 11 }}>Payslip</div>
                      <div style={{ fontSize: 8, opacity: 0.85 }}>January 2026</div>
                    </div>
                  </div>

                  {/* Mini body */}
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Earnings</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', marginBottom: 2 }}>
                      <span>Base Salary</span><span>50,000</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#111827', borderTop: '1px solid #e5e7eb', paddingTop: 2, marginTop: 4, marginBottom: 8 }}>
                      <span>Net Pay</span><span style={{ color: payslipTemplate.primaryColor || '#7c3aed' }}>INR 48,500</span>
                    </div>

                    {/* Signatory preview */}
                    {payslipTemplate.signatoryName && (
                      <div style={{ textAlign: 'right', marginTop: 12, paddingTop: 8 }}>
                        <div style={{ borderBottom: '1px solid #d1d5db', width: 80, marginLeft: 'auto', marginBottom: 4 }} />
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#374151' }}>
                          {payslipTemplate.signatoryName}
                        </div>
                        {payslipTemplate.signatoryTitle && (
                          <div style={{ fontSize: 8, color: '#6b7280' }}>
                            {payslipTemplate.signatoryTitle}
                          </div>
                        )}
                        <div style={{ fontSize: 7, color: '#9ca3af' }}>Authorized Signatory</div>
                      </div>
                    )}
                  </div>

                  {/* Mini footer */}
                  <div style={{
                    padding: '6px 14px',
                    background: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: 7,
                    color: '#9ca3af',
                    textAlign: 'center',
                  }}>
                    {payslipTemplate.footerText || 'HR Management System'}
                  </div>
                </div>
                <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
                  This is a simplified preview. Actual PDF will be more detailed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
