'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { leaveAPI, settingsAPI, attendanceAPI } from '@/lib/api-client';

interface LeaveBalance {
  sick: number;
  casual: number;
  earned: number;
  total: number;
  allocation?: {
    sick: number;
    casual: number;
    earned: number;
    total: number;
  };
}

const defaultLeaveTypes = [
  { value: 'CASUAL', label: 'Casual Leave', maxDays: 12 },
  { value: 'SICK', label: 'Sick Leave', maxDays: 12 },
  { value: 'EARNED', label: 'Earned Leave', maxDays: 15 },
  { value: 'UNPAID', label: 'Unpaid Leave', maxDays: null },
];

export default function ApplyLeavePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [balance, setBalance] = React.useState<LeaveBalance | null>(null);
  const [workingDays, setWorkingDays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [holidays, setHolidays] = React.useState<string[]>([]);
  const [formData, setFormData] = React.useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Fetch leave balance, working days config, and holidays on mount
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceRes, settingsRes, holidaysRes] = await Promise.allSettled([
          leaveAPI.getMyBalance(),
          settingsAPI.getWorkingDays(),
          attendanceAPI.getHolidays(new Date().getFullYear()),
        ]);
        if (balanceRes.status === 'fulfilled') {
          setBalance(balanceRes.value.data);
        }
        if (settingsRes.status === 'fulfilled' && settingsRes.value.data?.workingDays) {
          setWorkingDays(settingsRes.value.data.workingDays);
        }
        if (holidaysRes.status === 'fulfilled' && holidaysRes.value.data) {
          setHolidays(holidaysRes.value.data.map((h: { date: string }) =>
            new Date(h.date).toISOString().split('T')[0]
          ));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) return 0;
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      // Only count if it's a configured working day AND not a holiday
      if (workingDays.includes(dayOfWeek) && !holidays.includes(dateStr)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const getAvailableBalance = (leaveType: string): number | null => {
    if (leaveType === 'UNPAID') return null; // Unlimited
    if (!balance) return 0;
    switch (leaveType) {
      case 'CASUAL': return balance.casual;
      case 'SICK': return balance.sick;
      case 'EARNED': return balance.earned;
      default: return 0;
    }
  };

  const selectedLeaveType = defaultLeaveTypes.find((lt) => lt.value === formData.leaveType);
  const requestedDays = calculateDays();
  const availableBalance = getAvailableBalance(formData.leaveType);
  const hasInsufficientBalance = formData.leaveType !== '' && formData.leaveType !== 'UNPAID' && availableBalance !== null && requestedDays > availableBalance;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.leaveType) newErrors.leaveType = 'Please select a leave type';
    if (!formData.startDate) newErrors.startDate = 'Please select a start date';
    if (!formData.endDate) newErrors.endDate = 'Please select an end date';
    if (!formData.reason.trim()) newErrors.reason = 'Please provide a reason';
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) newErrors.endDate = 'End date cannot be before start date';
    }
    if (hasInsufficientBalance) {
      newErrors.leaveType = 'Insufficient leave balance';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await leaveAPI.apply({
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });
      router.push('/dashboard/leaves');
    } catch (error: any) {
      console.error('Error submitting leave:', error);
      const message = error.response?.data?.message || 'Failed to submit leave request';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: '#ffffff',
    outline: 'none',
    transition: 'all 0.2s',
  };

  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: '#ef4444',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  };

  const errorTextStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '4px',
  };

  if (loading) {
    return (
      <DashboardLayout title="Apply Leave" description="Submit a new leave request">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px' }}>
          <Loader2 style={{ height: '32px', width: '32px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
        </div>
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Apply Leave"
      description="Submit a new leave request"
      actions={
        <button
          onClick={() => router.back()}
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
          <ArrowLeft style={{ height: '16px', width: '16px' }} />
          Back
        </button>
      }
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Leave Balance Summary */}
        {balance && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '24px',
              marginBottom: '24px',
            }}
          >
            <h3 style={{ fontWeight: 600, fontSize: '16px', margin: 0, marginBottom: '16px', color: '#111827' }}>
              Leave Balance
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
              }}
            >
              {[
                { label: 'Casual Leave', value: balance.casual, total: balance.allocation?.casual ?? 12 },
                { label: 'Sick Leave', value: balance.sick, total: balance.allocation?.sick ?? 12 },
                { label: 'Earned Leave', value: balance.earned, total: balance.allocation?.earned ?? 15 },
                { label: 'Total Available', value: balance.total, total: balance.allocation?.total ?? 39 },
              ].map((leave) => (
                <div
                  key={leave.label}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: '#f9fafb',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', margin: '0 0 4px 0' }}>{leave.label}</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#7c3aed', margin: 0 }}>
                    {leave.value}
                    <span style={{ fontSize: '14px', fontWeight: 400, color: '#9ca3af' }}>/{leave.total}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Apply Leave Form */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '24px',
          }}
        >
          <h3 style={{ fontWeight: 600, fontSize: '16px', margin: 0, marginBottom: '24px', color: '#111827' }}>
            Leave Request Form
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Leave Type */}
              <div>
                <label style={labelStyle}>Leave Type *</label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  style={errors.leaveType ? inputErrorStyle : inputStyle}
                >
                  <option value="">Select leave type</option>
                  {defaultLeaveTypes.map((type) => {
                    const available = getAvailableBalance(type.value);
                    return (
                      <option key={type.value} value={type.value}>
                        {type.label} {available === null ? '(No balance limit)' : `(${available} days available)`}
                      </option>
                    );
                  })}
                </select>
                {errors.leaveType && <p style={errorTextStyle}>{errors.leaveType}</p>}
              </div>

              {/* Date Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>
                    <Calendar style={{ height: '14px', width: '14px', display: 'inline', marginRight: '6px' }} />
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    style={errors.startDate ? inputErrorStyle : inputStyle}
                  />
                  {errors.startDate && <p style={errorTextStyle}>{errors.startDate}</p>}
                </div>
                <div>
                  <label style={labelStyle}>
                    <Calendar style={{ height: '14px', width: '14px', display: 'inline', marginRight: '6px' }} />
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    style={errors.endDate ? inputErrorStyle : inputStyle}
                  />
                  {errors.endDate && <p style={errorTextStyle}>{errors.endDate}</p>}
                </div>
              </div>

              {/* Days Summary */}
              {requestedDays > 0 && formData.leaveType && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: hasInsufficientBalance ? '#fef2f2' : '#f5f3ff',
                    border: `1px solid ${hasInsufficientBalance ? '#fecaca' : '#e9d5ff'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  {hasInsufficientBalance ? (
                    <AlertCircle style={{ height: '20px', width: '20px', color: '#ef4444' }} />
                  ) : (
                    <Calendar style={{ height: '20px', width: '20px', color: '#7c3aed' }} />
                  )}
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: hasInsufficientBalance ? '#991b1b' : '#5b21b6', margin: 0 }}>
                      {requestedDays} working {requestedDays === 1 ? 'day' : 'days'} requested
                    </p>
                    <p style={{ fontSize: '12px', color: hasInsufficientBalance ? '#b91c1c' : '#7c3aed', margin: 0, marginTop: '2px' }}>
                      {hasInsufficientBalance
                        ? `Only ${availableBalance} days available`
                        : availableBalance !== null
                          ? `${availableBalance - requestedDays} days will remain after approval`
                          : 'Unpaid leave — no balance deduction'}
                    </p>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label style={labelStyle}>
                  <FileText style={{ height: '14px', width: '14px', display: 'inline', marginRight: '6px' }} />
                  Reason *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Please provide a reason for your leave request..."
                  rows={4}
                  style={{
                    ...(errors.reason ? inputErrorStyle : inputStyle),
                    resize: 'vertical',
                    minHeight: '100px',
                  }}
                />
                {errors.reason && <p style={errorTextStyle}>{errors.reason}</p>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => router.back()}
                  style={{
                    padding: '12px 24px',
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || hasInsufficientBalance}
                  style={{
                    padding: '12px 32px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isSubmitting || hasInsufficientBalance
                      ? '#d1d5db'
                      : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isSubmitting || hasInsufficientBalance ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #ffffff',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Info Section */}
        <div
          style={{
            marginTop: '24px',
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: '#f5f3ff',
            border: '1px solid #e9d5ff',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#5b21b6', margin: 0, marginBottom: '12px' }}>
            Leave Policy Highlights
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280', fontSize: '13px', lineHeight: '1.8' }}>
            <li>Leave requests require manager approval, followed by HR approval</li>
            <li>Sick leave beyond 2 consecutive days may require a medical certificate</li>
            <li>Earned leaves should be applied in advance when possible</li>
            <li>Holidays and weekends are excluded from leave day calculations</li>
            <li>Leave balance is deducted only after final approval</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </DashboardLayout>
  );
}