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
  Check,
  X,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { assetAPI } from '@/lib/api-client';

interface AssetRequest {
  id: string;
  employeeId: string;
  assetType: string;
  reason: string;
  urgency: string;
  status: string;
  managerApproved: boolean;
  hrApproved: boolean;
  assetSerialNo: string | null;
  acknowledgedAt: string | null;
  rejectionReason: string | null;
  returnReason: string | null;
  returnCondition: string | null;
  managerReturnApproved: boolean;
  returnedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    user?: { email: string };
  };
}

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
  SUBMITTED: { color: '#3b82f6', bg: '#eff6ff', label: 'Pending Manager' },
  PENDING_HR: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending HR Approval' },
  APPROVED: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Approved - Awaiting Allocation' },
  ALLOCATED: { color: '#06b6d4', bg: '#ecfeff', label: 'Allocated - Pending Receipt' },
  ACKNOWLEDGED: { color: '#10b981', bg: '#ecfdf5', label: 'Received' },
  REJECTED: { color: '#ef4444', bg: '#fef2f2', label: 'Rejected' },
  RETURN_REQUESTED: { color: '#f97316', bg: '#fff7ed', label: 'Return Requested' },
  MANAGER_RETURN_APPROVED: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Manager Verified - Pending HR' },
  RETURNED: { color: '#6b7280', bg: '#f3f4f6', label: 'Returned' },
};

const urgencyConfig: Record<string, { color: string; bg: string }> = {
  HIGH: { color: '#ef4444', bg: '#fef2f2' },
  NORMAL: { color: '#f59e0b', bg: '#fffbeb' },
  LOW: { color: '#22c55e', bg: '#f0fdf4' },
  high: { color: '#ef4444', bg: '#fef2f2' },
  normal: { color: '#f59e0b', bg: '#fffbeb' },
  low: { color: '#22c55e', bg: '#f0fdf4' },
};

export default function AssetsPage() {
  const { user } = useAuthStore();
  const [showRequestModal, setShowRequestModal] = React.useState(false);
  const [showApprovalModal, setShowApprovalModal] = React.useState(false);
  const [showAllocateModal, setShowAllocateModal] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState<AssetRequest | null>(null);
  const [requestData, setRequestData] = React.useState({
    assetType: '',
    reason: '',
    urgency: 'NORMAL',
  });
  const [serialNo, setSerialNo] = React.useState('');
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [myRequests, setMyRequests] = React.useState<AssetRequest[]>([]);
  const [teamRequests, setTeamRequests] = React.useState<AssetRequest[]>([]);
  const [pendingRequests, setPendingRequests] = React.useState<AssetRequest[]>([]);
  const [activeTab, setActiveTab] = React.useState<'my' | 'team' | 'pending' | 'returns'>('my');
  const [showReturnModal, setShowReturnModal] = React.useState(false);
  const [returnData, setReturnData] = React.useState({ returnReason: '', returnCondition: 'good' });
  const [returnRequests, setReturnRequests] = React.useState<AssetRequest[]>([]);
  const [managerPendingReturns, setManagerPendingReturns] = React.useState<AssetRequest[]>([]);

  const isManager = user?.role === 'MANAGER';
  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      // Always fetch my requests
      const myRes = await assetAPI.getMyRequests();
      setMyRequests(myRes.data || []);

      // Manager fetches team requests and pending return quality checks
      if (isManager) {
        const [teamRes, managerReturnsRes] = await Promise.all([
          assetAPI.getTeamRequests(),
          assetAPI.getManagerPendingReturns(),
        ]);
        setTeamRequests(teamRes.data || []);
        setManagerPendingReturns(managerReturnsRes.data || []);
      }

      // HR fetches all pending requests and return requests
      if (isHR) {
        const [pendingRes, returnRes] = await Promise.all([
          assetAPI.getPending(),
          assetAPI.getReturnRequests(),
        ]);
        setPendingRequests(pendingRes.data || []);
        setReturnRequests(returnRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching asset requests:', error);
    } finally {
      setLoading(false);
    }
  }, [isManager, isHR]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitRequest = async () => {
    if (!requestData.assetType || !requestData.reason) return;
    setSubmitting(true);
    try {
      await assetAPI.request(requestData);
      setShowRequestModal(false);
      setRequestData({ assetType: '', reason: '', urgency: 'NORMAL' });
      fetchData();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      alert(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (requestId: string) => {
    try {
      await assetAPI.acknowledge(requestId);
      fetchData();
    } catch (error: any) {
      console.error('Error acknowledging asset:', error);
      alert(error.response?.data?.message || 'Failed to acknowledge asset');
    }
  };

  const handleManagerApprove = async (request: AssetRequest) => {
    try {
      await assetAPI.managerApprove(request.id);
      fetchData();
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleManagerReject = async () => {
    if (!selectedRequest || !rejectionReason) return;
    try {
      await assetAPI.managerReject(selectedRequest.id, rejectionReason);
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchData();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleHRApprove = async (request: AssetRequest) => {
    try {
      await assetAPI.hrApprove(request.id);
      fetchData();
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleHRReject = async () => {
    if (!selectedRequest || !rejectionReason) return;
    try {
      await assetAPI.hrReject(selectedRequest.id, rejectionReason);
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchData();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleAllocate = async () => {
    if (!selectedRequest || !serialNo) return;
    try {
      await assetAPI.allocate(selectedRequest.id, serialNo);
      setShowAllocateModal(false);
      setSelectedRequest(null);
      setSerialNo('');
      fetchData();
    } catch (error: any) {
      console.error('Error allocating asset:', error);
      alert(error.response?.data?.message || 'Failed to allocate asset');
    }
  };

  const handleRequestReturn = async () => {
    if (!selectedRequest || !returnData.returnReason) return;
    setSubmitting(true);
    try {
      await assetAPI.requestReturn(selectedRequest.id, returnData);
      setShowReturnModal(false);
      setSelectedRequest(null);
      setReturnData({ returnReason: '', returnCondition: 'good' });
      fetchData();
    } catch (error: any) {
      console.error('Error requesting return:', error);
      alert(error.response?.data?.message || 'Failed to request return');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManagerApproveReturn = async (request: AssetRequest) => {
    try {
      await assetAPI.managerApproveReturn(request.id);
      fetchData();
    } catch (error: any) {
      console.error('Error approving return quality:', error);
      alert(error.response?.data?.message || 'Failed to approve return quality');
    }
  };

  const handleApproveReturn = async (request: AssetRequest) => {
    try {
      await assetAPI.approveReturn(request.id);
      fetchData();
    } catch (error: any) {
      console.error('Error approving return:', error);
      alert(error.response?.data?.message || 'Failed to approve return');
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const myAssets = myRequests.filter(r => ['ACKNOWLEDGED', 'ALLOCATED', 'RETURN_REQUESTED', 'MANAGER_RETURN_APPROVED'].includes(r.status));
  const myPendingRequests = myRequests.filter(r => !['ACKNOWLEDGED', 'REJECTED', 'RETURNED'].includes(r.status));
  const myReturnedAssets = myRequests.filter(r => r.status === 'RETURNED');

  // For manager: show requests awaiting their approval (SUBMITTED status)
  const managerPendingApproval = teamRequests.filter(r => r.status === 'SUBMITTED');

  // For HR: show requests awaiting HR action
  // PENDING_HR = after manager approval, SUBMITTED = direct requests (no manager or bypass)
  const hrPendingApproval = pendingRequests.filter(r =>
    r.status === 'PENDING_HR' || r.status === 'SUBMITTED'
  );
  const hrPendingAllocation = pendingRequests.filter(r => r.status === 'APPROVED');

  const renderRequestsTable = (requests: AssetRequest[], showEmployee: boolean = false, showActions: boolean = false, actionType?: 'manager' | 'hr' | 'allocate') => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            {showEmployee && (
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                Employee
              </th>
            )}
            {['Asset', 'Reason', 'Urgency', 'Status', 'Date', showActions ? 'Actions' : 'Serial No.'].map((header) => (
              <th key={header} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((request, idx) => {
            const typeConfig = assetTypeConfig[request.assetType] || assetTypeConfig.other;
            const status = statusConfig[request.status] || statusConfig.SUBMITTED;
            const urgency = urgencyConfig[request.urgency] || urgencyConfig.normal;
            return (
              <tr key={request.id} style={{ borderBottom: idx < requests.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                {showEmployee && (
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                      {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : 'N/A'}
                    </span>
                  </td>
                )}
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: `${typeConfig.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: typeConfig.color }}>
                      {typeConfig.icon}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{typeConfig.label}</span>
                  </div>
                </td>
                <td style={{ padding: '16px', maxWidth: '200px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    {request.reason.length > 50 ? `${request.reason.substring(0, 50)}...` : request.reason}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, backgroundColor: urgency.bg, color: urgency.color, textTransform: 'capitalize' }}>
                    {request.urgency.toLowerCase()}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, backgroundColor: status.bg, color: status.color }}>
                    {status.label}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  {showActions ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {actionType === 'manager' && (
                        <>
                          <button
                            onClick={() => handleManagerApprove(request)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Check style={{ height: '14px', width: '14px' }} /> Approve
                          </button>
                          <button
                            onClick={() => { setSelectedRequest(request); setShowApprovalModal(true); }}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <X style={{ height: '14px', width: '14px' }} /> Reject
                          </button>
                        </>
                      )}
                      {actionType === 'hr' && (
                        <>
                          <button
                            onClick={() => handleHRApprove(request)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Check style={{ height: '14px', width: '14px' }} /> Approve
                          </button>
                          <button
                            onClick={() => { setSelectedRequest(request); setShowApprovalModal(true); }}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <X style={{ height: '14px', width: '14px' }} /> Reject
                          </button>
                        </>
                      )}
                      {actionType === 'allocate' && (
                        <button
                          onClick={() => { setSelectedRequest(request); setShowAllocateModal(true); }}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Package style={{ height: '14px', width: '14px' }} /> Allocate
                        </button>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#111827', fontFamily: 'monospace' }}>
                      {request.assetSerialNo || '-'}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {requests.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          No requests found
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout title="Assets" description="Request and manage company assets">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'My Assets', value: myAssets.length, icon: <Package />, color: '#7c3aed' },
            { label: 'Pending Requests', value: myPendingRequests.length, icon: <Clock />, color: '#f59e0b' },
            ...(isManager ? [
              { label: 'Team Pending Approval', value: managerPendingApproval.length, icon: <AlertCircle />, color: '#ef4444' },
              { label: 'Returns - Quality Check', value: managerPendingReturns.length, icon: <RotateCcw />, color: '#f97316' },
            ] : []),
            ...(isHR ? [
              { label: 'HR Pending Approval', value: hrPendingApproval.length, icon: <AlertCircle />, color: '#ef4444' },
              { label: 'Pending Allocation', value: hrPendingAllocation.length, icon: <Package />, color: '#3b82f6' },
              { label: 'Return Requests', value: returnRequests.length, icon: <RotateCcw />, color: '#f97316' },
            ] : []),
          ].map((stat) => (
            <div key={stat.label} style={{ ...cardStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                {React.cloneElement(stat.icon as React.ReactElement, { style: { height: '24px', width: '24px' } })}
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{stat.value}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs for different views */}
        {(isManager || isHR) && (
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '0' }}>
            {[
              { id: 'my', label: 'My Requests' },
              ...(isManager ? [{ id: 'team', label: 'Team Requests' }] : []),
              ...(isHR ? [{ id: 'pending', label: 'Pending Approval' }, { id: 'returns', label: 'Returns/Handover' }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'my' | 'team' | 'pending' | 'returns')}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: activeTab === tab.id ? '#7c3aed' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? '2px solid #7c3aed' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* My Assets */}
        {activeTab === 'my' && myAssets.length > 0 && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>My Assets</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', padding: '16px' }}>
              {myAssets.map((asset) => {
                const typeConfig = assetTypeConfig[asset.assetType] || assetTypeConfig.other;
                return (
                  <div key={asset.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: `${typeConfig.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: typeConfig.color }}>
                        {typeConfig.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>{typeConfig.label}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{asset.assetSerialNo}</p>
                      </div>
                    </div>
                    {asset.status === 'ALLOCATED' && (
                      <button
                        onClick={() => handleAcknowledge(asset.id)}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Acknowledge Receipt
                      </button>
                    )}
                    {asset.status === 'ACKNOWLEDGED' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '13px' }}>
                          <CheckCircle style={{ height: '16px', width: '16px' }} />
                          <span>Acknowledged</span>
                        </div>
                        <button
                          onClick={() => { setSelectedRequest(asset); setShowReturnModal(true); }}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #f97316', backgroundColor: '#fff7ed', color: '#f97316', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <RotateCcw style={{ height: '14px', width: '14px' }} />
                          Return / Handover
                        </button>
                      </div>
                    )}
                    {asset.status === 'RETURN_REQUESTED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f97316', fontSize: '13px' }}>
                        <Clock style={{ height: '16px', width: '16px' }} />
                        <span>Pending Manager Quality Check</span>
                      </div>
                    )}
                    {asset.status === 'MANAGER_RETURN_APPROVED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8b5cf6', fontSize: '13px' }}>
                        <Clock style={{ height: '16px', width: '16px' }} />
                        <span>Manager Verified - Pending HR Confirmation</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My Requests Table */}
        {activeTab === 'my' && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>My Asset Requests</h3>
            </div>
            {renderRequestsTable(myRequests)}
          </div>
        )}

        {/* Team Requests (Manager) */}
        {activeTab === 'team' && isManager && (
          <>
            {managerPendingApproval.length > 0 && (
              <div style={cardStyle}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>Pending Your Approval</h3>
                </div>
                {renderRequestsTable(managerPendingApproval, true, true, 'manager')}
              </div>
            )}

            {/* Manager Return Quality Check Section */}
            {managerPendingReturns.length > 0 && (
              <div style={cardStyle}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>Return Quality Check</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>Verify the quality of returned assets before HR confirmation</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {managerPendingReturns.map((request, idx) => {
                    const typeConfig = assetTypeConfig[request.assetType] || assetTypeConfig.other;
                    return (
                      <div key={request.id} style={{ padding: '20px', borderBottom: idx < managerPendingReturns.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: `${typeConfig.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: typeConfig.color, flexShrink: 0 }}>
                              {typeConfig.icon}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                                {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : 'N/A'}
                              </p>
                              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#374151' }}>
                                {typeConfig.label} &middot; <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{request.assetSerialNo}</span>
                              </p>
                              <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <div>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Condition: </span>
                                  <span style={{
                                    padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
                                    backgroundColor: request.returnCondition === 'good' ? '#ecfdf5' : request.returnCondition === 'fair' ? '#fffbeb' : '#fef2f2',
                                    color: request.returnCondition === 'good' ? '#10b981' : request.returnCondition === 'fair' ? '#f59e0b' : '#ef4444',
                                    textTransform: 'capitalize',
                                  }}>
                                    {request.returnCondition}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Requested: </span>
                                  <span style={{ fontSize: '12px', color: '#374151' }}>{new Date(request.updatedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                                <strong>Reason:</strong> {request.returnReason}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleManagerApproveReturn(request)}
                            style={{
                              padding: '10px 20px', borderRadius: '10px', border: 'none',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                            }}
                          >
                            <Check style={{ height: '16px', width: '16px' }} />
                            Verify Quality
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={cardStyle}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>All Team Requests</h3>
              </div>
              {renderRequestsTable(teamRequests, true)}
            </div>
          </>
        )}

        {/* HR Pending Approval */}
        {activeTab === 'pending' && isHR && (
          <>
            {hrPendingApproval.length > 0 && (
              <div style={cardStyle}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>Pending HR Approval</h3>
                </div>
                {renderRequestsTable(hrPendingApproval, true, true, 'hr')}
              </div>
            )}
            {hrPendingAllocation.length > 0 && (
              <div style={cardStyle}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>Pending Allocation</h3>
                </div>
                {renderRequestsTable(hrPendingAllocation, true, true, 'allocate')}
              </div>
            )}
            <div style={cardStyle}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>All Requests</h3>
              </div>
              {renderRequestsTable(pendingRequests, true)}
            </div>
          </>
        )}

        {/* Returns/Handover Tab (HR) */}
        {activeTab === 'returns' && isHR && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>Asset Return / Handover Requests</h3>
            </div>
            {returnRequests.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                No pending return requests
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {returnRequests.map((request, idx) => {
                  const typeConfig = assetTypeConfig[request.assetType] || assetTypeConfig.other;
                  return (
                    <div key={request.id} style={{ padding: '20px', borderBottom: idx < returnRequests.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: `${typeConfig.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: typeConfig.color, flexShrink: 0 }}>
                            {typeConfig.icon}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                              {request.employee ? `${request.employee.firstName} ${request.employee.lastName}` : 'N/A'}
                            </p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#374151' }}>
                              {typeConfig.label} &middot; <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{request.assetSerialNo}</span>
                            </p>
                            <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                              <div>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Condition: </span>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
                                  backgroundColor: request.returnCondition === 'good' ? '#ecfdf5' : request.returnCondition === 'fair' ? '#fffbeb' : '#fef2f2',
                                  color: request.returnCondition === 'good' ? '#10b981' : request.returnCondition === 'fair' ? '#f59e0b' : '#ef4444',
                                  textTransform: 'capitalize',
                                }}>
                                  {request.returnCondition}
                                </span>
                              </div>
                              <div>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Requested: </span>
                                <span style={{ fontSize: '12px', color: '#374151' }}>{new Date(request.updatedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                              <strong>Reason:</strong> {request.returnReason}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleApproveReturn(request)}
                          style={{
                            padding: '10px 20px', borderRadius: '10px', border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                          }}
                        >
                          <Check style={{ height: '16px', width: '16px' }} />
                          Confirm Return
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setShowRequestModal(false)}
        >
          <div
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', margin: '16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0', color: '#111827' }}>Request New Asset</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Asset Type *</label>
                <select
                  value={requestData.assetType}
                  onChange={(e) => setRequestData({ ...requestData, assetType: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827', backgroundColor: '#ffffff' }}
                >
                  <option value="">Select asset type</option>
                  {Object.entries(assetTypeConfig).map(([value, config]) => (
                    <option key={value} value={value}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Urgency</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['LOW', 'NORMAL', 'HIGH'].map((level) => (
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
                      {level.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Reason *</label>
                <textarea
                  value={requestData.reason}
                  onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                  placeholder="Explain why you need this asset..."
                  rows={4}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827', backgroundColor: '#ffffff', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setShowRequestModal(false)}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#374151', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRequest}
                  disabled={!requestData.assetType || !requestData.reason || submitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: requestData.assetType && requestData.reason && !submitting ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : '#d1d5db',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: requestData.assetType && requestData.reason && !submitting ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showApprovalModal && selectedRequest && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => { setShowApprovalModal(false); setSelectedRequest(null); setRejectionReason(''); }}
        >
          <div
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', margin: '16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0', color: '#111827' }}>Reject Request</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Reason for Rejection *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827', backgroundColor: '#ffffff', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => { setShowApprovalModal(false); setSelectedRequest(null); setRejectionReason(''); }}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#374151', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={isManager ? handleManagerReject : handleHRReject}
                  disabled={!rejectionReason}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: rejectionReason ? '#dc2626' : '#d1d5db',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: rejectionReason ? 'pointer' : 'not-allowed',
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedRequest && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => { setShowReturnModal(false); setSelectedRequest(null); setReturnData({ returnReason: '', returnCondition: 'good' }); }}
        >
          <div
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', margin: '16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0', color: '#111827' }}>Return / Handover Asset</h3>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                <strong>Asset:</strong> {assetTypeConfig[selectedRequest.assetType]?.label || selectedRequest.assetType}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                <strong>Serial No:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedRequest.assetSerialNo}</span>
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Asset Condition *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['good', 'fair', 'damaged'].map((condition) => (
                    <button
                      key={condition}
                      onClick={() => setReturnData({ ...returnData, returnCondition: condition })}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: returnData.returnCondition === condition ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                        backgroundColor: returnData.returnCondition === condition ? '#f5f3ff' : '#ffffff',
                        color: returnData.returnCondition === condition ? '#7c3aed' : '#6b7280',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {condition}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Reason for Return *</label>
                <textarea
                  value={returnData.returnReason}
                  onChange={(e) => setReturnData({ ...returnData, returnReason: e.target.value })}
                  placeholder="e.g., Resignation, No longer needed, Replacement received, etc."
                  rows={3}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827', backgroundColor: '#ffffff', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => { setShowReturnModal(false); setSelectedRequest(null); setReturnData({ returnReason: '', returnCondition: 'good' }); }}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#374151', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestReturn}
                  disabled={!returnData.returnReason || submitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: returnData.returnReason && !submitting ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#d1d5db',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: returnData.returnReason && !submitting ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RotateCcw style={{ height: '16px', width: '16px' }} />
                  {submitting ? 'Submitting...' : 'Submit Return Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Modal */}
      {showAllocateModal && selectedRequest && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => { setShowAllocateModal(false); setSelectedRequest(null); setSerialNo(''); }}
        >
          <div
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', margin: '16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0', color: '#111827' }}>Allocate Asset</h3>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                <strong>Employee:</strong> {selectedRequest.employee ? `${selectedRequest.employee.firstName} ${selectedRequest.employee.lastName}` : 'N/A'}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                <strong>Asset:</strong> {assetTypeConfig[selectedRequest.assetType]?.label || selectedRequest.assetType}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Asset Serial Number *</label>
                <input
                  type="text"
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                  placeholder="e.g., LAP-2024-0042"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#111827', backgroundColor: '#ffffff' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => { setShowAllocateModal(false); setSelectedRequest(null); setSerialNo(''); }}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#374151', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAllocate}
                  disabled={!serialNo}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: serialNo ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : '#d1d5db',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: serialNo ? 'pointer' : 'not-allowed',
                  }}
                >
                  Allocate Asset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
