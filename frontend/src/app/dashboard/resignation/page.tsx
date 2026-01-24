'use client';

import * as React from 'react';
import {
  LogOut,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  UserX,
  Package,
  Mail,
  Loader2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { resignationAPI } from '@/lib/api-client';

interface Resignation {
  id: string;
  noticePeriodDays: number;
  reason: string;
  lastWorkingDay: string;
  status: string;
  createdAt: string;
  assetHandover: boolean;
  accountDeactivatedAt: string | null;
  noDueClearanceSentAt: string | null;
  rejectionReason?: string;
  employee?: {
    firstName: string;
    lastName: string;
    user?: { email: string };
    manager?: { firstName: string; lastName: string };
  };
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  SUBMITTED: { color: '#3b82f6', bg: '#eff6ff', label: 'Submitted', icon: <Clock style={{ height: '16px', width: '16px' }} /> },
  MANAGER_APPROVED: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Manager Approved', icon: <CheckCircle style={{ height: '16px', width: '16px' }} /> },
  PENDING_HR: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending HR', icon: <Clock style={{ height: '16px', width: '16px' }} /> },
  APPROVED: { color: '#22c55e', bg: '#f0fdf4', label: 'Approved', icon: <CheckCircle style={{ height: '16px', width: '16px' }} /> },
  REJECTED: { color: '#ef4444', bg: '#fef2f2', label: 'Rejected', icon: <XCircle style={{ height: '16px', width: '16px' }} /> },
  EXIT_COMPLETE: { color: '#6b7280', bg: '#f3f4f6', label: 'Exit Complete', icon: <UserX style={{ height: '16px', width: '16px' }} /> },
};

export default function ResignationPage() {
  const [resignation, setResignation] = React.useState<Resignation | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showSubmitModal, setShowSubmitModal] = React.useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    noticePeriodDays: 30,
    reason: '',
    lastWorkingDay: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Fetch resignation on mount
  React.useEffect(() => {
    fetchMyResignation();
  }, []);

  const fetchMyResignation = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await resignationAPI.getMy();
      setResignation(response.data);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError('Failed to fetch resignation status');
      }
      setResignation(null);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
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
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.reason.trim()) newErrors.reason = 'Please provide a reason';
    if (!formData.lastWorkingDay) newErrors.lastWorkingDay = 'Please select last working day';

    if (formData.lastWorkingDay) {
      const lastDay = new Date(formData.lastWorkingDay);
      const minLastDay = new Date();
      minLastDay.setDate(minLastDay.getDate() + formData.noticePeriodDays);

      if (lastDay < minLastDay) {
        newErrors.lastWorkingDay = `Last working day must be at least ${formData.noticePeriodDays} days from today`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await resignationAPI.submit({
        noticePeriodDays: formData.noticePeriodDays,
        reason: formData.reason,
        lastWorkingDay: formData.lastWorkingDay,
      });
      setResignation(response.data);
      setShowSubmitModal(false);
      setFormData({ noticePeriodDays: 30, reason: '', lastWorkingDay: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit resignation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await resignationAPI.withdraw();
      setResignation(null);
      setShowWithdrawModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to withdraw resignation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinLastWorkingDay = () => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + formData.noticePeriodDays);
    return minDate.toISOString().split('T')[0];
  };

  const canWithdraw = resignation && ['SUBMITTED', 'PENDING_HR'].includes(resignation.status);

  if (loading) {
    return (
      <DashboardLayout title="Resignation" description="Submit or manage your resignation">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loader2 style={{ height: '48px', width: '48px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Resignation"
      description="Submit or manage your resignation"
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Error Message */}
        {error && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* No Resignation - Show Submit Option */}
        {!resignation && (
          <div style={cardStyle}>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#f5f3ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <LogOut style={{ height: '36px', width: '36px', color: '#7c3aed' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
                Submit Resignation
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                If you wish to resign from your position, please submit your resignation request here. Your manager and HR will review it.
              </p>
              <button
                onClick={() => setShowSubmitModal(true)}
                style={{
                  padding: '12px 32px',
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
                Submit Resignation
              </button>
            </div>
          </div>
        )}

        {/* Existing Resignation */}
        {resignation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Status Card */}
            <div style={cardStyle}>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#111827' }}>
                    Resignation Status
                  </h3>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      backgroundColor: statusConfig[resignation.status]?.bg || '#f3f4f6',
                      color: statusConfig[resignation.status]?.color || '#6b7280',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {statusConfig[resignation.status]?.icon}
                    {statusConfig[resignation.status]?.label || resignation.status}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                  }}
                >
                  <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Calendar style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>Last Working Day</span>
                    </div>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                      {new Date(resignation.lastWorkingDay).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Clock style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>Notice Period</span>
                    </div>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                      {resignation.noticePeriodDays} days
                    </p>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <FileText style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>Submitted On</span>
                    </div>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                      {new Date(resignation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Reason</span>
                  <p style={{ fontSize: '14px', color: '#111827', margin: '8px 0 0 0' }}>
                    {resignation.reason}
                  </p>
                </div>

                {canWithdraw && (
                  <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                    <button
                      onClick={() => setShowWithdrawModal(true)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: '1px solid #ef4444',
                        backgroundColor: '#ffffff',
                        color: '#ef4444',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Withdraw Resignation
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Exit Checklist (for approved resignations) */}
            {resignation.status === 'APPROVED' && (
              <div style={cardStyle}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                    Exit Checklist
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    Complete these items before your last working day
                  </p>
                </div>
                <div style={{ padding: '0' }}>
                  {[
                    {
                      icon: <Package style={{ height: '20px', width: '20px' }} />,
                      label: 'Asset Handover',
                      description: 'Return all company assets (laptop, ID card, etc.)',
                      completed: resignation.assetHandover,
                    },
                    {
                      icon: <UserX style={{ height: '20px', width: '20px' }} />,
                      label: 'Account Deactivation',
                      description: 'Your account will be deactivated after exit',
                      completed: !!resignation.accountDeactivatedAt,
                    },
                    {
                      icon: <Mail style={{ height: '20px', width: '20px' }} />,
                      label: 'No Dues Clearance',
                      description: 'Receive your no dues certificate',
                      completed: !!resignation.noDueClearanceSentAt,
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        borderBottom: idx < 2 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: item.completed ? '#f0fdf4' : '#f9fafb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: item.completed ? '#22c55e' : '#9ca3af',
                        }}
                      >
                        {item.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>
                          {item.label}
                        </p>
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                          {item.description}
                        </p>
                      </div>
                      {item.completed ? (
                        <CheckCircle style={{ height: '20px', width: '20px', color: '#22c55e' }} />
                      ) : (
                        <Clock style={{ height: '20px', width: '20px', color: '#9ca3af' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection Notice */}
            {resignation.status === 'REJECTED' && (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}
              >
                <XCircle style={{ height: '24px', width: '24px', color: '#ef4444', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', margin: 0 }}>
                    Resignation Rejected
                  </p>
                  <p style={{ fontSize: '13px', color: '#b91c1c', margin: '4px 0 0 0' }}>
                    {resignation.rejectionReason || 'Your resignation request has been rejected. Please contact your manager or HR for more details.'}
                  </p>
                  <button
                    onClick={() => {
                      setShowSubmitModal(true);
                    }}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Submit New Request
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Policy Notice */}
        <div
          style={{
            marginTop: '24px',
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertTriangle style={{ height: '20px', width: '20px', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#92400e', margin: 0, marginBottom: '8px' }}>
                Resignation Policy
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e', fontSize: '13px', lineHeight: '1.8' }}>
                <li>Standard notice period is 30 days for all employees</li>
                <li>Resignation can be withdrawn before HR approval</li>
                <li>All company assets must be returned before last working day</li>
                <li>Exit interview will be scheduled by HR</li>
                <li>Final settlement will be processed after all clearances</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowSubmitModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              margin: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0', color: '#111827' }}>
              Submit Resignation
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px 0' }}>
              Please fill in the details below to submit your resignation
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Notice Period (Days)</label>
                <select
                  value={formData.noticePeriodDays}
                  onChange={(e) => setFormData({ ...formData, noticePeriodDays: parseInt(e.target.value) })}
                  style={inputStyle}
                >
                  <option value={30}>30 days (Standard)</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  <Calendar style={{ height: '14px', width: '14px', display: 'inline', marginRight: '6px' }} />
                  Last Working Day *
                </label>
                <input
                  type="date"
                  value={formData.lastWorkingDay}
                  onChange={(e) => setFormData({ ...formData, lastWorkingDay: e.target.value })}
                  min={getMinLastWorkingDay()}
                  style={{
                    ...inputStyle,
                    borderColor: errors.lastWorkingDay ? '#ef4444' : '#e5e7eb',
                  }}
                />
                {errors.lastWorkingDay && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.lastWorkingDay}</p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Reason for Resignation *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Please provide your reason for resignation..."
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: '100px',
                    borderColor: errors.reason ? '#ef4444' : '#e5e7eb',
                  }}
                />
                {errors.reason && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.reason}</p>
                )}
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                }}
              >
                <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                  <strong>Important:</strong> Once submitted, your resignation will be reviewed by your manager and HR. You can withdraw your resignation until it is approved by HR.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isSubmitting ? '#d1d5db' : '#ef4444',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isSubmitting && <Loader2 style={{ height: '16px', width: '16px', animation: 'spin 1s linear infinite' }} />}
                  {isSubmitting ? 'Submitting...' : 'Submit Resignation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {showWithdrawModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowWithdrawModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              margin: '16px',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertTriangle style={{ height: '28px', width: '28px', color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: '#111827' }}>
              Withdraw Resignation?
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0' }}>
              Are you sure you want to withdraw your resignation? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowWithdrawModal(false)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isSubmitting && <Loader2 style={{ height: '16px', width: '16px', animation: 'spin 1s linear infinite' }} />}
                {isSubmitting ? 'Processing...' : 'Yes, Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DashboardLayout>
  );
}