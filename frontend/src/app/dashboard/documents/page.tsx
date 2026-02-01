'use client';

import * as React from 'react';
import {
  FileText,
  Upload,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  FolderOpen,
  Check,
  X,
  Loader2,
  Users,
  AlertCircle,
  Send,
  Search,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { documentAPI, employeeAPI } from '@/lib/api-client';

interface ReleasedDocument {
  id: string;
  documentType: string;
  fileName: string;
  description?: string;
  releasedAt: string;
  downloadCount: number;
}

interface AllReleasedDocument {
  id: string;
  documentType: string;
  fileName: string;
  description?: string;
  releasedAt: string;
  releasedBy: string;
  downloadCount: number;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    user: { email: string };
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  user: { email: string };
  role: { name: string };
}

interface VerificationDocument {
  id: string;
  documentType: string;
  fileName: string;
  status: string;
  createdAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    user: { email: string };
  };
}

const documentTypeLabels: Record<string, string> = {
  offer_letter: 'Offer Letter',
  appointment_letter: 'Appointment Letter',
  id_proof: 'ID Proof',
  address_proof: 'Address Proof',
  education_certificate: 'Education Certificate',
  experience_letter: 'Experience Letter',
  salary_slip: 'Salary Slip',
  pan_card: 'PAN Card',
  aadhar_card: 'Aadhar Card',
  bank_statement: 'Bank Statement',
  nda: 'NDA',
  policy_acknowledgement: 'Policy Acknowledgement',
  other: 'Other',
};

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  UPLOADED: { color: '#3b82f6', bg: '#eff6ff', icon: <Clock style={{ height: '14px', width: '14px' }} /> },
  UNDER_REVIEW: { color: '#f59e0b', bg: '#fffbeb', icon: <Eye style={{ height: '14px', width: '14px' }} /> },
  VERIFIED: { color: '#22c55e', bg: '#f0fdf4', icon: <CheckCircle style={{ height: '14px', width: '14px' }} /> },
  REJECTED: { color: '#ef4444', bg: '#fef2f2', icon: <XCircle style={{ height: '14px', width: '14px' }} /> },
};

export default function DocumentsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState<'released' | 'verification' | 'pending' | 'all-released'>('released');
  const [loading, setLoading] = React.useState(true);
  const [releasedDocuments, setReleasedDocuments] = React.useState<ReleasedDocument[]>([]);
  const [verificationDocuments, setVerificationDocuments] = React.useState<VerificationDocument[]>([]);
  const [pendingVerifications, setPendingVerifications] = React.useState<VerificationDocument[]>([]);
  const [stats, setStats] = React.useState({ totalDocuments: 0, pendingVerifications: 0, verifiedDocuments: 0 });

  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [showVerifyModal, setShowVerifyModal] = React.useState(false);
  const [showReleaseModal, setShowReleaseModal] = React.useState(false);
  const [selectedDoc, setSelectedDoc] = React.useState<VerificationDocument | null>(null);
  const [uploadData, setUploadData] = React.useState({
    documentType: '',
    file: null as File | null,
  });
  const [releaseData, setReleaseData] = React.useState({
    employeeId: '',
    documentType: '',
    description: '',
    file: null as File | null,
  });
  const [verifyData, setVerifyData] = React.useState({
    status: 'VERIFIED' as 'VERIFIED' | 'REJECTED',
    rejectionReason: '',
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [allReleasedDocuments, setAllReleasedDocuments] = React.useState<AllReleasedDocument[]>([]);
  const [employeeSearch, setEmployeeSearch] = React.useState('');

  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);

      // Fetch released documents
      const releasedRes = await documentAPI.getMyDocuments();
      setReleasedDocuments(releasedRes.data || []);

      // Fetch verification documents
      const verificationRes = await documentAPI.getMyVerificationDocuments();
      setVerificationDocuments(verificationRes.data || []);

      if (isHR) {
        // Fetch pending verifications, stats, employees, and all released documents for HR
        const [pendingRes, statsRes, empRes, allReleasedRes] = await Promise.all([
          documentAPI.getPendingVerifications(),
          documentAPI.getStats(),
          employeeAPI.getAll(),
          documentAPI.getAllDocuments(),
        ]);
        setPendingVerifications(pendingRes.data || []);
        setStats(statsRes.data || { totalDocuments: 0, pendingVerifications: 0, verifiedDocuments: 0 });
        setEmployees(empRes.data?.data || empRes.data || []);
        setAllReleasedDocuments(allReleasedRes.data?.data || allReleasedRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [isHR]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownload = async (doc: ReleasedDocument) => {
    try {
      const response = await documentAPI.download(doc.id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleUpload = async () => {
    if (!uploadData.documentType || !uploadData.file) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('documentType', uploadData.documentType);

      await documentAPI.upload(formData);
      setShowUploadModal(false);
      setUploadData({ documentType: '', file: null });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async () => {
    if (!releaseData.employeeId || !releaseData.documentType || !releaseData.file) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', releaseData.file);
      formData.append('employeeId', releaseData.employeeId);
      formData.append('documentType', releaseData.documentType);
      if (releaseData.description) {
        formData.append('description', releaseData.description);
      }

      await documentAPI.release(formData);
      setShowReleaseModal(false);
      setReleaseData({ employeeId: '', documentType: '', description: '', file: null });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to release document');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!employeeSearch) return true;
    const term = employeeSearch.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(term) ||
      emp.lastName.toLowerCase().includes(term) ||
      emp.user?.email?.toLowerCase().includes(term)
    );
  });

  const handleVerify = async () => {
    if (!selectedDoc) return;

    try {
      setSubmitting(true);
      if (verifyData.status === 'VERIFIED') {
        await documentAPI.verify(selectedDoc.id);
      } else {
        await documentAPI.reject(selectedDoc.id, verifyData.rejectionReason);
      }
      setShowVerifyModal(false);
      setSelectedDoc(null);
      setVerifyData({ status: 'VERIFIED', rejectionReason: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to verify document');
    } finally {
      setSubmitting(false);
    }
  };

  const openVerifyModal = (doc: VerificationDocument) => {
    setSelectedDoc(doc);
    setVerifyData({ status: 'VERIFIED', rejectionReason: '' });
    setShowVerifyModal(true);
  };

  const handleViewDocument = async (docId: string, fileName: string) => {
    try {
      const response = await documentAPI.viewVerificationDocument(docId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);

      // Open in new tab for viewing
      window.open(url, '_blank');

      // Cleanup after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to view document');
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    backgroundColor: isActive ? '#7c3aed' : 'transparent',
    color: isActive ? '#ffffff' : '#6b7280',
    cursor: 'pointer',
    borderRadius: '10px',
    transition: 'all 0.2s',
  });

  if (loading) {
    return (
      <DashboardLayout title="Documents" description="Manage your documents and verifications">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <Loader2 style={{ width: 32, height: 32, color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Documents"
      description="Manage your documents and verifications"
      actions={
        <div style={{ display: 'flex', gap: '12px' }}>
          {isHR && (
            <button
              onClick={() => setShowReleaseModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Send style={{ height: '16px', width: '16px' }} />
              Release Document
            </button>
          )}
          <button
            onClick={() => setShowUploadModal(true)}
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
            <Upload style={{ height: '16px', width: '16px' }} />
            Upload Document
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {[
            { label: 'My Documents', value: releasedDocuments.length, color: '#7c3aed' },
            { label: 'Uploaded for Verification', value: verificationDocuments.length, color: '#3b82f6' },
            { label: 'Verified', value: verificationDocuments.filter(d => d.status === 'VERIFIED').length, color: '#22c55e' },
            ...(isHR ? [{ label: 'Pending Review', value: pendingVerifications.length, color: '#f59e0b' }] : []),
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
                }}
              >
                <FolderOpen style={{ height: '24px', width: '24px', color: stat.color }} />
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

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
          <button style={tabStyle(activeTab === 'released')} onClick={() => setActiveTab('released')}>
            My Documents
          </button>
          <button style={tabStyle(activeTab === 'verification')} onClick={() => setActiveTab('verification')}>
            My Uploads
          </button>
          {isHR && (
            <button style={tabStyle(activeTab === 'all-released')} onClick={() => setActiveTab('all-released')}>
              Released Documents
            </button>
          )}
          {isHR && (
            <button style={tabStyle(activeTab === 'pending')} onClick={() => setActiveTab('pending')}>
              Pending Review ({pendingVerifications.length})
            </button>
          )}
        </div>

        {/* Released Documents */}
        {activeTab === 'released' && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                Documents Released by HR
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                Official documents released to you
              </p>
            </div>
            <div style={{ padding: '0' }}>
              {releasedDocuments.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: idx < releasedDocuments.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: '#f5f3ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText style={{ height: '22px', width: '22px', color: '#7c3aed' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                        {documentTypeLabels[doc.documentType] || doc.documentType}
                      </p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                        {doc.fileName} • Released {new Date(doc.releasedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(doc)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Download style={{ height: '14px', width: '14px' }} />
                    Download
                  </button>
                </div>
              ))}
              {releasedDocuments.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  No documents released yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Documents */}
        {activeTab === 'verification' && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                Documents for Verification
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                Documents you have uploaded for HR verification
              </p>
            </div>
            <div style={{ padding: '0' }}>
              {verificationDocuments.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: idx < verificationDocuments.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: statusConfig[doc.status]?.bg || '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: statusConfig[doc.status]?.color || '#6b7280',
                      }}
                    >
                      <FileText style={{ height: '22px', width: '22px' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                        {documentTypeLabels[doc.documentType] || doc.documentType}
                      </p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                        {doc.fileName} • Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                      {doc.status === 'REJECTED' && doc.rejectionReason && (
                        <p style={{ fontSize: '12px', color: '#ef4444', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertCircle style={{ height: 12, width: 12 }} />
                          {doc.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      backgroundColor: statusConfig[doc.status]?.bg || '#f3f4f6',
                      color: statusConfig[doc.status]?.color || '#6b7280',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {statusConfig[doc.status]?.icon}
                    {doc.status.replace('_', ' ')}
                  </div>
                </div>
              ))}
              {verificationDocuments.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  No documents uploaded yet. Click "Upload Document" to submit documents for verification.
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Released Documents (HR only) */}
        {activeTab === 'all-released' && isHR && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                    All Released Documents
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    Documents released by HR to employees
                  </p>
                </div>
                <button
                  onClick={() => setShowReleaseModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#22c55e',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Send style={{ height: '14px', width: '14px' }} />
                  Release New
                </button>
              </div>
            </div>
            <div style={{ padding: '0' }}>
              {allReleasedDocuments.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                  <FolderOpen style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                  <p style={{ fontSize: '16px', fontWeight: 500, margin: '0 0 8px' }}>No documents released yet</p>
                  <p style={{ margin: 0 }}>Click &quot;Release Document&quot; to send a document to an employee</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employee</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Document Type</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>File Name</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Released</th>
                      <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Downloads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allReleasedDocuments.map((doc) => (
                      <tr
                        key={doc.id}
                        style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '8px',
                              backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Users style={{ height: '14px', width: '14px', color: '#7c3aed' }} />
                            </div>
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: 0 }}>
                                {doc.employee ? `${doc.employee.firstName} ${doc.employee.lastName}` : 'N/A'}
                              </p>
                              {doc.employee?.user?.email && (
                                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{doc.employee.user.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
                            backgroundColor: '#f5f3ff', color: '#7c3aed',
                          }}>
                            {documentTypeLabels[doc.documentType] || doc.documentType}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>{doc.fileName}</p>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{doc.description || '-'}</p>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            {new Date(doc.releasedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
                            backgroundColor: doc.downloadCount > 0 ? '#dcfce7' : '#f3f4f6',
                            color: doc.downloadCount > 0 ? '#22c55e' : '#6b7280',
                          }}>
                            <Download style={{ height: '12px', width: '12px' }} />
                            {doc.downloadCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Pending Verifications (HR only) */}
        {activeTab === 'pending' && isHR && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                Pending Document Verifications
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                Review and verify employee submitted documents
              </p>
            </div>
            <div style={{ padding: '0' }}>
              {pendingVerifications.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: idx < pendingVerifications.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: '#fffbeb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText style={{ height: '22px', width: '22px', color: '#f59e0b' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                        {documentTypeLabels[doc.documentType] || doc.documentType}
                      </p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                        {doc.fileName}
                      </p>
                      {doc.employee && (
                        <p style={{ fontSize: '12px', color: '#7c3aed', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users style={{ height: 12, width: 12 }} />
                          {doc.employee.firstName} {doc.employee.lastName} ({doc.employee.user.email})
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleViewDocument(doc.id, doc.fileName)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#ffffff',
                        color: '#374151',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      <Eye style={{ height: '14px', width: '14px' }} />
                      View
                    </button>
                    <button
                      onClick={() => openVerifyModal(doc)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#22c55e',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      <Check style={{ height: '14px', width: '14px' }} />
                      Review
                    </button>
                  </div>
                </div>
              ))}
              {pendingVerifications.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  No pending document verifications
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
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
          onClick={() => setShowUploadModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              margin: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0', color: '#111827' }}>
              Upload Document for Verification
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Document Type *
                </label>
                <select
                  value={uploadData.documentType}
                  onChange={(e) => setUploadData({ ...uploadData, documentType: e.target.value })}
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
                  <option value="">Select document type</option>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  File *
                </label>
                <div
                  style={{
                    border: '2px dashed #e5e7eb',
                    borderRadius: '10px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb',
                  }}
                >
                  <input
                    type="file"
                    onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                    style={{ display: 'none' }}
                    id="file-upload"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                    <Upload style={{ height: '32px', width: '32px', color: '#9ca3af', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                      {uploadData.file ? uploadData.file.name : 'Click to upload or drag and drop'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                      PDF, PNG, JPG up to 10MB
                    </p>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setShowUploadModal(false)}
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
                  onClick={handleUpload}
                  disabled={!uploadData.documentType || !uploadData.file || submitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: uploadData.documentType && uploadData.file && !submitting
                      ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                      : '#d1d5db',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: uploadData.documentType && uploadData.file && !submitting ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal (HR only) */}
      {showVerifyModal && selectedDoc && (
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
          onClick={() => setShowVerifyModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              margin: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0', color: '#111827' }}>
              Review Document
            </h3>

            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                {documentTypeLabels[selectedDoc.documentType] || selectedDoc.documentType}
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                {selectedDoc.fileName}
              </p>
              {selectedDoc.employee && (
                <p style={{ fontSize: '13px', color: '#7c3aed', margin: '8px 0 0 0' }}>
                  Submitted by: {selectedDoc.employee.firstName} {selectedDoc.employee.lastName}
                </p>
              )}
              <button
                onClick={() => handleViewDocument(selectedDoc.id, selectedDoc.fileName)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #7c3aed',
                  backgroundColor: '#f5f3ff',
                  color: '#7c3aed',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginTop: '12px',
                }}
              >
                <Eye style={{ height: '14px', width: '14px' }} />
                View Document
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Decision *
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setVerifyData({ ...verifyData, status: 'VERIFIED' })}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: verifyData.status === 'VERIFIED' ? '2px solid #22c55e' : '1px solid #e5e7eb',
                      backgroundColor: verifyData.status === 'VERIFIED' ? '#f0fdf4' : '#fff',
                      color: verifyData.status === 'VERIFIED' ? '#22c55e' : '#6b7280',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle style={{ height: '18px', width: '18px' }} />
                    Verify
                  </button>
                  <button
                    onClick={() => setVerifyData({ ...verifyData, status: 'REJECTED' })}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: verifyData.status === 'REJECTED' ? '2px solid #ef4444' : '1px solid #e5e7eb',
                      backgroundColor: verifyData.status === 'REJECTED' ? '#fef2f2' : '#fff',
                      color: verifyData.status === 'REJECTED' ? '#ef4444' : '#6b7280',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <XCircle style={{ height: '18px', width: '18px' }} />
                    Reject
                  </button>
                </div>
              </div>

              {verifyData.status === 'REJECTED' && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                    Rejection Reason *
                  </label>
                  <textarea
                    value={verifyData.rejectionReason}
                    onChange={(e) => setVerifyData({ ...verifyData, rejectionReason: e.target.value })}
                    placeholder="Please provide a reason for rejection..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setShowVerifyModal(false)}
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
                  onClick={handleVerify}
                  disabled={submitting || (verifyData.status === 'REJECTED' && !verifyData.rejectionReason)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: verifyData.status === 'VERIFIED' ? '#22c55e' : '#ef4444',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: submitting || (verifyData.status === 'REJECTED' && !verifyData.rejectionReason) ? 'not-allowed' : 'pointer',
                    opacity: submitting || (verifyData.status === 'REJECTED' && !verifyData.rejectionReason) ? 0.5 : 1,
                  }}
                >
                  {submitting ? 'Processing...' : verifyData.status === 'VERIFIED' ? 'Verify Document' : 'Reject Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Release Document Modal (HR only) */}
      {showReleaseModal && isHR && (
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
          onClick={() => setShowReleaseModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '520px',
              margin: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Send style={{ height: '20px', width: '20px', color: '#22c55e' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#111827' }}>
                  Release Document to Employee
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
                  Upload and release an official document (e.g., offer letter, appointment letter)
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Employee *
                </label>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', height: '16px', width: '16px', color: '#9ca3af', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Search employee by name or email..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 16px 10px 40px',
                      borderRadius: '10px 10px 0 0',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      color: '#111827',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderTop: 'none',
                  borderRadius: '0 0 10px 10px',
                  backgroundColor: '#ffffff',
                }}>
                  {filteredEmployees.length === 0 ? (
                    <div style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>
                      No employees found
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setReleaseData({ ...releaseData, employeeId: emp.id });
                          setEmployeeSearch(`${emp.firstName} ${emp.lastName}`);
                        }}
                        style={{
                          padding: '10px 16px',
                          cursor: 'pointer',
                          backgroundColor: releaseData.employeeId === emp.id ? '#f5f3ff' : 'transparent',
                          borderBottom: '1px solid #f3f4f6',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          if (releaseData.employeeId !== emp.id)
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          if (releaseData.employeeId !== emp.id)
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: 0 }}>
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
                              {emp.user?.email} • {emp.role?.name || 'N/A'}
                            </p>
                          </div>
                          {releaseData.employeeId === emp.id && (
                            <CheckCircle style={{ height: '16px', width: '16px', color: '#7c3aed' }} />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Document Type *
                </label>
                <select
                  value={releaseData.documentType}
                  onChange={(e) => setReleaseData({ ...releaseData, documentType: e.target.value })}
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
                  <option value="">Select document type</option>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={releaseData.description}
                  onChange={(e) => setReleaseData({ ...releaseData, description: e.target.value })}
                  placeholder="e.g., Official offer letter for the role of Software Engineer"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    color: '#111827',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  File *
                </label>
                <div
                  style={{
                    border: '2px dashed #e5e7eb',
                    borderRadius: '10px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb',
                  }}
                >
                  <input
                    type="file"
                    onChange={(e) => setReleaseData({ ...releaseData, file: e.target.files?.[0] || null })}
                    style={{ display: 'none' }}
                    id="release-file-upload"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  />
                  <label htmlFor="release-file-upload" style={{ cursor: 'pointer' }}>
                    <Upload style={{ height: '32px', width: '32px', color: '#9ca3af', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                      {releaseData.file ? releaseData.file.name : 'Click to upload document'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                      PDF, DOC, DOCX, PNG, JPG up to 10MB
                    </p>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    setShowReleaseModal(false);
                    setReleaseData({ employeeId: '', documentType: '', description: '', file: null });
                    setEmployeeSearch('');
                  }}
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
                  onClick={handleRelease}
                  disabled={!releaseData.employeeId || !releaseData.documentType || !releaseData.file || submitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: releaseData.employeeId && releaseData.documentType && releaseData.file && !submitting
                      ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                      : '#d1d5db',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: releaseData.employeeId && releaseData.documentType && releaseData.file && !submitting ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Send style={{ height: '16px', width: '16px' }} />
                  {submitting ? 'Releasing...' : 'Release Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
