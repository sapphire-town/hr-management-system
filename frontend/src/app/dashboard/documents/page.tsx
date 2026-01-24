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
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';

// Mock data
const mockReleasedDocuments = [
  {
    id: '1',
    documentType: 'offer_letter',
    fileName: 'Offer_Letter_2024.pdf',
    description: 'Official offer letter',
    releasedAt: '2024-01-15',
    downloadCount: 3,
  },
  {
    id: '2',
    documentType: 'appointment_letter',
    fileName: 'Appointment_Letter.pdf',
    description: 'Appointment confirmation',
    releasedAt: '2024-01-20',
    downloadCount: 2,
  },
  {
    id: '3',
    documentType: 'nda',
    fileName: 'NDA_Agreement.pdf',
    description: 'Non-disclosure agreement',
    releasedAt: '2024-01-22',
    downloadCount: 1,
  },
];

const mockVerificationDocuments = [
  {
    id: '1',
    documentType: 'id_proof',
    fileName: 'Aadhar_Card.pdf',
    status: 'VERIFIED',
    uploadedAt: '2024-01-10',
    verifiedAt: '2024-01-12',
  },
  {
    id: '2',
    documentType: 'address_proof',
    fileName: 'Electricity_Bill.pdf',
    status: 'UNDER_REVIEW',
    uploadedAt: '2024-01-18',
    verifiedAt: null,
  },
  {
    id: '3',
    documentType: 'education_certificate',
    fileName: 'Degree_Certificate.pdf',
    status: 'UPLOADED',
    uploadedAt: '2024-01-20',
    verifiedAt: null,
  },
];

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
  const [activeTab, setActiveTab] = React.useState<'released' | 'verification'>('released');
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [uploadData, setUploadData] = React.useState({
    documentType: '',
    file: null as File | null,
  });

  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  const handleDownload = (doc: typeof mockReleasedDocuments[0]) => {
    console.log('Downloading:', doc.fileName);
  };

  const handleUpload = () => {
    if (!uploadData.documentType || !uploadData.file) return;
    console.log('Uploading:', uploadData);
    setShowUploadModal(false);
    setUploadData({ documentType: '', file: null });
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

  return (
    <DashboardLayout
      title="Documents"
      description="Manage your documents and verifications"
      actions={
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
            { label: 'Released Documents', value: mockReleasedDocuments.length, color: '#7c3aed' },
            { label: 'Pending Verification', value: mockVerificationDocuments.filter(d => d.status !== 'VERIFIED').length, color: '#f59e0b' },
            { label: 'Verified Documents', value: mockVerificationDocuments.filter(d => d.status === 'VERIFIED').length, color: '#22c55e' },
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
            Released Documents
          </button>
          <button style={tabStyle(activeTab === 'verification')} onClick={() => setActiveTab('verification')}>
            Verification Documents
          </button>
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
              {mockReleasedDocuments.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: idx < mockReleasedDocuments.length - 1 ? '1px solid #f3f4f6' : 'none',
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
              {mockReleasedDocuments.length === 0 && (
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
              {mockVerificationDocuments.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: idx < mockVerificationDocuments.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: statusConfig[doc.status].bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: statusConfig[doc.status].color,
                      }}
                    >
                      <FileText style={{ height: '22px', width: '22px' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                        {documentTypeLabels[doc.documentType] || doc.documentType}
                      </p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                        {doc.fileName} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      backgroundColor: statusConfig[doc.status].bg,
                      color: statusConfig[doc.status].color,
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {statusConfig[doc.status].icon}
                    {doc.status.replace('_', ' ')}
                  </div>
                </div>
              ))}
              {mockVerificationDocuments.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  No documents uploaded yet
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
                  disabled={!uploadData.documentType || !uploadData.file}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: uploadData.documentType && uploadData.file
                      ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                      : '#d1d5db',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: uploadData.documentType && uploadData.file ? 'pointer' : 'not-allowed',
                  }}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
