'use client';

import * as React from 'react';
import {
  Laptop,
  Monitor,
  Smartphone,
  Headphones,
  CreditCard,
  Package,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';

// Mock data
const mockAssetRequests = [
  {
    id: '1',
    assetType: 'laptop',
    reason: 'Current laptop is slow and affecting productivity',
    urgency: 'high',
    status: 'ALLOCATED',
    assetSerialNo: 'LAP-2024-0042',
    createdAt: '2024-01-10',
    acknowledgedAt: null,
  },
  {
    id: '2',
    assetType: 'headset',
    reason: 'Need for better audio quality during meetings',
    urgency: 'normal',
    status: 'PENDING_HR',
    assetSerialNo: null,
    createdAt: '2024-01-18',
    acknowledgedAt: null,
  },
  {
    id: '3',
    assetType: 'monitor',
    reason: 'Additional monitor for improved productivity',
    urgency: 'low',
    status: 'SUBMITTED',
    assetSerialNo: null,
    createdAt: '2024-01-20',
    acknowledgedAt: null,
  },
];

const assetTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  laptop: { icon: <Laptop style={{ height: '20px', width: '20px' }} />, label: 'Laptop', color: '#7c3aed' },
  desktop: { icon: <Monitor style={{ height: '20px', width: '20px' }} />, label: 'Desktop', color: '#3b82f6' },
  monitor: { icon: <Monitor style={{ height: '20px', width: '20px' }} />, label: 'Monitor', color: '#06b6d4' },
  keyboard: { icon: <Package style={{ height: '20px', width: '20px' }} />, label: 'Keyboard', color: '#8b5cf6' },
  mouse: { icon: <Package style={{ height: '20px', width: '20px' }} />, label: 'Mouse', color: '#ec4899' },
  headset: { icon: <Headphones style={{ height: '20px', width: '20px' }} />, label: 'Headset', color: '#f59e0b' },
  mobile: { icon: <Smartphone style={{ height: '20px', width: '20px' }} />, label: 'Mobile Phone', color: '#10b981' },
  sim_card: { icon: <CreditCard style={{ height: '20px', width: '20px' }} />, label: 'SIM Card', color: '#6366f1' },
  id_card: { icon: <CreditCard style={{ height: '20px', width: '20px' }} />, label: 'ID Card', color: '#14b8a6' },
  access_card: { icon: <CreditCard style={{ height: '20px', width: '20px' }} />, label: 'Access Card', color: '#f97316' },
  chair: { icon: <Package style={{ height: '20px', width: '20px' }} />, label: 'Chair', color: '#84cc16' },
  other: { icon: <Package style={{ height: '20px', width: '20px' }} />, label: 'Other', color: '#6b7280' },
};

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  SUBMITTED: { color: '#3b82f6', bg: '#eff6ff', label: 'Submitted' },
  MANAGER_APPROVED: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Manager Approved' },
  PENDING_HR: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending HR' },
  APPROVED: { color: '#22c55e', bg: '#f0fdf4', label: 'Approved' },
  ALLOCATED: { color: '#06b6d4', bg: '#ecfeff', label: 'Allocated' },
  ACKNOWLEDGED: { color: '#10b981', bg: '#ecfdf5', label: 'Acknowledged' },
  REJECTED: { color: '#ef4444', bg: '#fef2f2', label: 'Rejected' },
};

const urgencyConfig: Record<string, { color: string; bg: string }> = {
  high: { color: '#ef4444', bg: '#fef2f2' },
  normal: { color: '#f59e0b', bg: '#fffbeb' },
  low: { color: '#22c55e', bg: '#f0fdf4' },
};

export default function AssetsPage() {
  const { user } = useAuthStore();
  const [showRequestModal, setShowRequestModal] = React.useState(false);
  const [requestData, setRequestData] = React.useState({
    assetType: '',
    reason: '',
    urgency: 'normal',
  });

  const isManager = user?.role === 'MANAGER';
  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  const handleSubmitRequest = () => {
    if (!requestData.assetType || !requestData.reason) return;
    console.log('Submitting request:', requestData);
    setShowRequestModal(false);
    setRequestData({ assetType: '', reason: '', urgency: 'normal' });
  };

  const handleAcknowledge = (requestId: string) => {
    console.log('Acknowledging asset:', requestId);
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const myAssets = mockAssetRequests.filter(r => r.status === 'ACKNOWLEDGED' || r.status === 'ALLOCATED');
  const pendingRequests = mockAssetRequests.filter(r => !['ACKNOWLEDGED', 'REJECTED'].includes(r.status));

  return (
    <DashboardLayout
      title="Assets"
      description="Request and manage company assets"
      actions={
        <button
          onClick={() => setShowRequestModal(true)}
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
          Request Asset
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
            { label: 'My Assets', value: myAssets.length, icon: <Package />, color: '#7c3aed' },
            { label: 'Pending Requests', value: pendingRequests.length, icon: <Clock />, color: '#f59e0b' },
            { label: 'Approved', value: mockAssetRequests.filter(r => r.status === 'APPROVED').length, icon: <CheckCircle />, color: '#22c55e' },
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

        {/* My Assets */}
        {myAssets.length > 0 && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                My Assets
              </h3>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                padding: '16px',
              }}
            >
              {myAssets.map((asset) => {
                const typeConfig = assetTypeConfig[asset.assetType] || assetTypeConfig.other;
                return (
                  <div
                    key={asset.id}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: `${typeConfig.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: typeConfig.color,
                        }}
                      >
                        {typeConfig.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                          {typeConfig.label}
                        </p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                          {asset.assetSerialNo}
                        </p>
                      </div>
                    </div>
                    {asset.status === 'ALLOCATED' && (
                      <button
                        onClick={() => handleAcknowledge(asset.id)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#7c3aed',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Acknowledge Receipt
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Requests */}
        <div style={cardStyle}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
              Asset Requests
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {['Asset', 'Reason', 'Urgency', 'Status', 'Date', 'Serial No.'].map((header) => (
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
                {mockAssetRequests.map((request, idx) => {
                  const typeConfig = assetTypeConfig[request.assetType] || assetTypeConfig.other;
                  const status = statusConfig[request.status];
                  const urgency = urgencyConfig[request.urgency];
                  return (
                    <tr
                      key={request.id}
                      style={{
                        borderBottom: idx < mockAssetRequests.length - 1 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: `${typeConfig.color}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: typeConfig.color,
                            }}
                          >
                            {typeConfig.icon}
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                            {typeConfig.label}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', maxWidth: '200px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                          {request.reason.length > 50 ? `${request.reason.substring(0, 50)}...` : request.reason}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: urgency.bg,
                            color: urgency.color,
                            textTransform: 'capitalize',
                          }}
                        >
                          {request.urgency}
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
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: '13px', color: '#111827', fontFamily: 'monospace' }}>
                          {request.assetSerialNo || '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {mockAssetRequests.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                No asset requests found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
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
          onClick={() => setShowRequestModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              margin: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0', color: '#111827' }}>
              Request New Asset
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Asset Type *
                </label>
                <select
                  value={requestData.assetType}
                  onChange={(e) => setRequestData({ ...requestData, assetType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    color: '#111827',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">Select asset type</option>
                  {Object.entries(assetTypeConfig).map(([value, config]) => (
                    <option key={value} value={value}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Urgency
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['low', 'normal', 'high'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setRequestData({ ...requestData, urgency: level })}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: requestData.urgency === level ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                        backgroundColor: requestData.urgency === level ? '#f5f3ff' : '#ffffff',
                        color: requestData.urgency === level ? '#7c3aed' : '#6b7280',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Reason *
                </label>
                <textarea
                  value={requestData.reason}
                  onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                  placeholder="Explain why you need this asset..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    color: '#111827',
                    backgroundColor: '#ffffff',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setShowRequestModal(false)}
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
                  onClick={handleSubmitRequest}
                  disabled={!requestData.assetType || !requestData.reason}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: requestData.assetType && requestData.reason
                      ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                      : '#d1d5db',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: requestData.assetType && requestData.reason ? 'pointer' : 'not-allowed',
                  }}
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
