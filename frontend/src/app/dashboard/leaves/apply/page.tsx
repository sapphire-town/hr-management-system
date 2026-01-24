'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';

const leaveTypes = [
  { value: 'CASUAL', label: 'Casual Leave', available: 8, total: 12 },
  { value: 'SICK', label: 'Sick Leave', available: 10, total: 12 },
  { value: 'EARNED', label: 'Earned Leave', available: 15, total: 15 },
  { value: 'MATERNITY', label: 'Maternity Leave', available: 180, total: 180 },
  { value: 'PATERNITY', label: 'Paternity Leave', available: 15, total: 15 },
  { value: 'COMPENSATORY', label: 'Compensatory Off', available: 2, total: 2 },
];

export default function ApplyLeavePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayType: 'FIRST_HALF',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (formData.isHalfDay) return 0.5;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const selectedLeaveType = leaveTypes.find((lt) => lt.value === formData.leaveType);
  const requestedDays = calculateDays();
  const hasInsufficientBalance = selectedLeaveType && requestedDays > selectedLeaveType.available;

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
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push('/dashboard/leaves');
    } catch (error) {
      console.error('Error submitting leave:', error);
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
            {leaveTypes.slice(0, 4).map((leave) => (
              <div
                key={leave.value}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: '#f9fafb',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{leave.label}</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#7c3aed', margin: 0 }}>
                  {leave.available}
                  <span style={{ fontSize: '14px', fontWeight: 400, color: '#9ca3af' }}>/{leave.total}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

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
                  {leaveTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.available} days available)
                    </option>
                  ))}
                </select>
                {errors.leaveType && <p style={errorTextStyle}>{errors.leaveType}</p>}
              </div>

              {/* Half Day Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="halfDay"
                  checked={formData.isHalfDay}
                  onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked })}
                  style={{
                    width: '20px',
                    height: '20px',
                    accentColor: '#7c3aed',
                    cursor: 'pointer',
                  }}
                />
                <label htmlFor="halfDay" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                  Half Day Leave
                </label>
                {formData.isHalfDay && (
                  <select
                    value={formData.halfDayType}
                    onChange={(e) => setFormData({ ...formData, halfDayType: e.target.value })}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      color: '#111827',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="FIRST_HALF">First Half</option>
                    <option value="SECOND_HALF">Second Half</option>
                  </select>
                )}
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
              {requestedDays > 0 && (
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
                      {requestedDays} {requestedDays === 1 ? 'day' : 'days'} requested
                    </p>
                    {selectedLeaveType && (
                      <p style={{ fontSize: '12px', color: hasInsufficientBalance ? '#b91c1c' : '#7c3aed', margin: 0, marginTop: '2px' }}>
                        {hasInsufficientBalance
                          ? `Only ${selectedLeaveType.available} days available`
                          : `${selectedLeaveType.available - requestedDays} days will remain after approval`}
                      </p>
                    )}
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
            <li>Leave requests require manager approval, followed by HR approval for leaves longer than 3 days</li>
            <li>Sick leave beyond 2 consecutive days requires a medical certificate</li>
            <li>Earned leaves must be applied at least 7 days in advance</li>
            <li>Compensatory offs must be utilized within 30 days of accrual</li>
            <li>Holidays and weekends are excluded from leave day calculations</li>
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
