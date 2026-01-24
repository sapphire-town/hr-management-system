'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  FileText,
  Download,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';

// Mock data
const mockClaims = [
  {
    id: '1',
    category: 'travel',
    amount: 2500,
    expenseDate: '2024-01-10',
    description: 'Client visit to Mumbai - Train fare',
    status: 'PAYMENT_PROCESSED',
    createdAt: '2024-01-12',
    acknowledgedAt: null,
  },
  {
    id: '2',
    category: 'food',
    amount: 850,
    expenseDate: '2024-01-15',
    description: 'Team lunch during project deadline',
    status: 'APPROVED',
    createdAt: '2024-01-16',
    acknowledgedAt: null,
  },
  {
    id: '3',
    category: 'communication',
    amount: 499,
    expenseDate: '2024-01-18',
    description: 'Mobile recharge for work calls',
    status: 'PENDING_HR',
    createdAt: '2024-01-19',
    acknowledgedAt: null,
  },
  {
    id: '4',
    category: 'equipment',
    amount: 1200,
    expenseDate: '2024-01-05',
    description: 'USB Hub and cables',
    status: 'REJECTED',
    createdAt: '2024-01-06',
    rejectionReason: 'Equipment should be requested via asset management',
    acknowledgedAt: null,
  },
  {
    id: '5',
    category: 'transport',
    amount: 350,
    expenseDate: '2024-01-20',
    description: 'Cab fare for late night work',
    status: 'SUBMITTED',
    createdAt: '2024-01-21',
    acknowledgedAt: null,
  },
];

const mockStats = {
  totalClaims: 5,
  pendingClaims: 2,
  approvedAmount: 3850,
  rejectedCount: 1,
};

const categoryConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  travel: { icon: <TrendingUp style={{ height: '18px', width: '18px' }} />, label: 'Travel', color: '#7c3aed' },
  food: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Food & Meals', color: '#f59e0b' },
  communication: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Communication', color: '#3b82f6' },
  accommodation: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Accommodation', color: '#06b6d4' },
  transport: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Local Transport', color: '#10b981' },
  medical: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Medical', color: '#ef4444' },
  training: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Training', color: '#8b5cf6' },
  equipment: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Equipment', color: '#ec4899' },
  other: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Other', color: '#6b7280' },
};

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  SUBMITTED: { color: '#3b82f6', bg: '#eff6ff', label: 'Submitted' },
  MANAGER_APPROVED: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Manager Approved' },
  PENDING_HR: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending HR' },
  APPROVED: { color: '#22c55e', bg: '#f0fdf4', label: 'Approved' },
  PAYMENT_PROCESSED: { color: '#06b6d4', bg: '#ecfeff', label: 'Payment Processed' },
  ACKNOWLEDGED: { color: '#10b981', bg: '#ecfdf5', label: 'Acknowledged' },
  REJECTED: { color: '#ef4444', bg: '#fef2f2', label: 'Rejected' },
};

export default function ReimbursementsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [filter, setFilter] = React.useState<string>('all');

  const isManager = user?.role === 'MANAGER';
  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  const handleAcknowledge = (claimId: string) => {
    console.log('Acknowledging claim:', claimId);
  };

  const filteredClaims = filter === 'all'
    ? mockClaims
    : mockClaims.filter(c => c.status === filter);

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const filterButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: isActive ? '2px solid #7c3aed' : '1px solid #e5e7eb',
    backgroundColor: isActive ? '#f5f3ff' : '#ffffff',
    color: isActive ? '#7c3aed' : '#6b7280',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  return (
    <DashboardLayout
      title="Reimbursements"
      description="Submit and track expense reimbursements"
      actions={
        <button
          onClick={() => router.push('/dashboard/reimbursements/submit')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
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
          <Plus style={{ height: '16px', width: '16px' }} />
          Submit Claim
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {[
            { label: 'Total Claims', value: mockStats.totalClaims, icon: <FileText />, color: '#7c3aed' },
            { label: 'Pending', value: mockStats.pendingClaims, icon: <Clock />, color: '#f59e0b' },
            { label: 'Approved Amount', value: `₹${mockStats.approvedAmount.toLocaleString()}`, icon: <DollarSign />, color: '#22c55e' },
            { label: 'Rejected', value: mockStats.rejectedCount, icon: <XCircle />, color: '#ef4444' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                ...cardStyle,
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: `${stat.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color,
                }}
              >
                {React.cloneElement(stat.icon as React.ReactElement, { style: { height: '24px', width: '24px' } })}
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'All' },
            { value: 'SUBMITTED', label: 'Submitted' },
            { value: 'PENDING_HR', label: 'Pending HR' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'PAYMENT_PROCESSED', label: 'Processed' },
            { value: 'REJECTED', label: 'Rejected' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={filterButtonStyle(filter === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Claims Table */}
        <div style={cardStyle}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
              Reimbursement Claims
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {['Category', 'Amount', 'Expense Date', 'Description', 'Status', 'Action'].map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim, idx) => {
                  const category = categoryConfig[claim.category] || categoryConfig.other;
                  const status = statusConfig[claim.status];
                  return (
                    <tr
                      key={claim.id}
                      style={{
                        borderBottom: idx < filteredClaims.length - 1 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: `${category.color}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: category.color,
                            }}
                          >
                            {category.icon}
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                            {category.label}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                          ₹{claim.amount.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                          {new Date(claim.expenseDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ padding: '16px', maxWidth: '250px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                          {claim.description.length > 40 ? `${claim.description.substring(0, 40)}...` : claim.description}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: status.bg,
                            color: status.color,
                          }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {claim.status === 'PAYMENT_PROCESSED' && (
                          <button
                            onClick={() => handleAcknowledge(claim.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#7c3aed',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            Acknowledge
                          </button>
                        )}
                        {claim.status === 'REJECTED' && (
                          <span style={{ fontSize: '12px', color: '#ef4444' }}>
                            {(claim as any).rejectionReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredClaims.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                No claims found
              </div>
            )}
          </div>
        </div>

        {/* Policy Info */}
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: '#f5f3ff',
            border: '1px solid #e9d5ff',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#5b21b6', margin: 0, marginBottom: '12px' }}>
            Reimbursement Policy
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280', fontSize: '13px', lineHeight: '1.8' }}>
            <li>Submit claims within 30 days of expense date</li>
            <li>Original receipts are required for claims above ₹500</li>
            <li>Manager approval required for all claims</li>
            <li>HR approval required for claims above ₹5,000</li>
            <li>Payment is processed within 7 working days after final approval</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
