'use client';

import * as React from 'react';
import {
  Plus,
  Users,
  Calendar,
  Building2,
  UserPlus,
  Loader2,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  GraduationCap,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  Unlock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { recruitmentAPI, employeeAPI } from '@/lib/api-client';

interface PlacementDrive {
  id: string;
  collegeName: string;
  driveDate: string;
  roles: Array<{ name: string; description: string; positions?: number }>;
  status: string;
  createdAt: string;
  interviewers: Array<{
    id: string;
    interviewer: { id: string; firstName: string; lastName: string };
  }>;
  _count: { students: number };
}

interface Interviewer {
  id: string;
  firstName: string;
  lastName: string;
  user: { email: string; role: string };
  role: { name: string };
}

export default function RecruitmentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [drives, setDrives] = React.useState<PlacementDrive[]>([]);
  const [interviewers, setInterviewers] = React.useState<Interviewer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [selectedDrive, setSelectedDrive] = React.useState<PlacementDrive | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = React.useState<string | null>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [stats, setStats] = React.useState<any>(null);

  const [formData, setFormData] = React.useState({
    collegeName: '',
    driveDate: '',
    roles: [{ name: '', description: '', positions: 1 }],
  });

  const [selectedInterviewers, setSelectedInterviewers] = React.useState<string[]>([]);

  const isHROrDirector = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [drivesRes, statsRes] = await Promise.all([
        recruitmentAPI.getDrives({ limit: '50' }),
        isHROrDirector ? recruitmentAPI.getOverallStatistics() : Promise.resolve({ data: null }),
      ]);
      setDrives(drivesRes.data.data || []);
      setStats(statsRes.data);

      if (isHROrDirector) {
        const interviewersRes = await recruitmentAPI.getAvailableInterviewers();
        setInterviewers(interviewersRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [isHROrDirector]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.collegeName || !formData.driveDate) return;

    try {
      setSubmitting(true);
      await recruitmentAPI.createDrive({
        collegeName: formData.collegeName,
        driveDate: formData.driveDate,
        roles: formData.roles.filter((r) => r.name),
      });
      setShowCreateModal(false);
      setFormData({ collegeName: '', driveDate: '', roles: [{ name: '', description: '', positions: 1 }] });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create placement drive');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignInterviewers = async () => {
    if (!selectedDrive) return;

    try {
      setSubmitting(true);
      await recruitmentAPI.assignInterviewers(selectedDrive.id, selectedInterviewers);
      setShowAssignModal(false);
      setSelectedInterviewers([]);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to assign interviewers');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDrive = async (driveId: string) => {
    if (!confirm('Are you sure you want to delete this placement drive?')) return;

    try {
      await recruitmentAPI.deleteDrive(driveId);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete placement drive');
    }
  };

  const handleToggleDriveStatus = async (driveId: string, currentStatus: string) => {
    const action = currentStatus === 'CLOSED' ? 'reopen' : 'close';
    if (!confirm(`Are you sure you want to ${action} this placement drive?`)) return;

    try {
      if (action === 'close') {
        await recruitmentAPI.closeDrive(driveId);
      } else {
        await recruitmentAPI.reopenDrive(driveId);
      }
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || `Failed to ${action} placement drive`);
    }
  };

  const openAssignModal = (drive: PlacementDrive) => {
    setSelectedDrive(drive);
    setSelectedInterviewers(drive.interviewers.map((i) => i.interviewer.id));
    setShowAssignModal(true);
    setActionMenuOpen(null);
  };

  const addRole = () => {
    setFormData({
      ...formData,
      roles: [...formData.roles, { name: '', description: '', positions: 1 }],
    });
  };

  const removeRole = (index: number) => {
    setFormData({
      ...formData,
      roles: formData.roles.filter((_, i) => i !== index),
    });
  };

  const updateRole = (index: number, field: string, value: any) => {
    const newRoles = [...formData.roles];
    newRoles[index] = { ...newRoles[index], [field]: value };
    setFormData({ ...formData, roles: newRoles });
  };

  const toggleInterviewer = (id: string) => {
    setSelectedInterviewers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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

  return (
    <DashboardLayout
      title="Recruitment"
      description="Manage placement drives and interviews"
      actions={
        isHROrDirector && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.25)',
            }}
          >
            <Plus className="w-4 h-4" />
            New Placement Drive
          </button>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Stats Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={cardStyle}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 style={{ width: '24px', height: '24px', color: '#7c3aed' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>{stats.totalDrives}</p>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Total Drives</p>
                  </div>
                </div>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock style={{ width: '24px', height: '24px', color: '#d97706' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>{stats.upcomingDrives}</p>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Upcoming</p>
                  </div>
                </div>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GraduationCap style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>{stats.totalStudents}</p>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Total Students</p>
                  </div>
                </div>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle style={{ width: '24px', height: '24px', color: '#059669' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>{stats.selectedStudents}</p>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Selected ({stats.selectionRate}%)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placement Drives Table */}
        <div style={cardStyle}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              Placement Drives
            </h3>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px' }}>
              <Loader2 style={{ height: '32px', width: '32px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : drives.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <Building2 style={{ height: '48px', width: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
              <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>No placement drives found</p>
              {isHROrDirector && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    marginTop: '16px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create First Drive
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      College
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Date
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Roles
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Interviewers
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Students
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {drives.map((drive, index) => {
                    const isUpcoming = new Date(drive.driveDate) >= new Date();

                    return (
                      <tr
                        key={drive.id}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f3ff'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fafbfc'}
                      >
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Building2 style={{ width: '20px', height: '20px', color: '#7c3aed' }} />
                            </div>
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', margin: 0 }}>
                                {drive.collegeName}
                              </p>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: isUpcoming ? '#dcfce7' : '#f3f4f6',
                                  color: isUpcoming ? '#166534' : '#6b7280',
                                }}
                              >
                                {isUpcoming ? 'Upcoming' : 'Completed'}
                              </span>
                              {drive.status === 'CLOSED' && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: '#fee2e2',
                                    color: '#dc2626',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Lock style={{ width: '10px', height: '10px' }} />
                                  Closed
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                            <span style={{ fontSize: '14px', color: '#475569' }}>
                              {new Date(drive.driveDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {(drive.roles as any[]).slice(0, 2).map((role, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: '12px',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: '#ede9fe',
                                  color: '#7c3aed',
                                }}
                              >
                                {role.name}
                              </span>
                            ))}
                            {(drive.roles as any[]).length > 2 && (
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                +{(drive.roles as any[]).length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Users style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                              {drive.interviewers.length}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <GraduationCap style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                              {drive._count.students}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              if (actionMenuOpen === drive.id) {
                                setActionMenuOpen(null);
                                setMenuPosition(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuPosition({ top: rect.bottom + 4, left: rect.right - 180 });
                                setActionMenuOpen(drive.id);
                              }
                            }}
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb',
                              backgroundColor: '#ffffff',
                              cursor: 'pointer',
                            }}
                          >
                            <MoreVertical style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Action Menu Popup */}
      {actionMenuOpen && menuPosition && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => { setActionMenuOpen(null); setMenuPosition(null); }}
          />
          <div
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb',
              minWidth: '180px',
              zIndex: 100,
              padding: '4px 0',
            }}
          >
            <button
              onClick={() => {
                const driveId = actionMenuOpen;
                setActionMenuOpen(null);
                setMenuPosition(null);
                router.push(`/dashboard/my-drives?driveId=${driveId}`);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
              }}
            >
              <Eye style={{ width: '16px', height: '16px' }} />
              View Details
            </button>
            {isHROrDirector && (
              <>
                <button
                  onClick={() => {
                    const drive = drives.find((d) => d.id === actionMenuOpen);
                    if (drive) openAssignModal(drive);
                    setMenuPosition(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                  }}
                >
                  <UserPlus style={{ width: '16px', height: '16px' }} />
                  Assign Interviewers
                </button>
                <button
                  onClick={() => {
                    const driveId = actionMenuOpen;
                    const drive = drives.find((d) => d.id === driveId);
                    setActionMenuOpen(null);
                    setMenuPosition(null);
                    if (drive) handleToggleDriveStatus(driveId, drive.status);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: drives.find((d) => d.id === actionMenuOpen)?.status === 'CLOSED' ? '#059669' : '#d97706',
                  }}
                >
                  {drives.find((d) => d.id === actionMenuOpen)?.status === 'CLOSED' ? (
                    <>
                      <Unlock style={{ width: '16px', height: '16px' }} />
                      Reopen Drive
                    </>
                  ) : (
                    <>
                      <Lock style={{ width: '16px', height: '16px' }} />
                      Close Drive
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const driveId = actionMenuOpen;
                    setActionMenuOpen(null);
                    setMenuPosition(null);
                    handleDeleteDrive(driveId);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#ef4444',
                  }}
                >
                  <Trash2 style={{ width: '16px', height: '16px' }} />
                  Delete Drive
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Create Drive Modal */}
      {showCreateModal && (
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
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              margin: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              Create Placement Drive
            </h3>

            <form onSubmit={handleCreateDrive}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                    College Name *
                  </label>
                  <input
                    type="text"
                    value={formData.collegeName}
                    onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                    placeholder="Enter college name"
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                    Drive Date *
                  </label>
                  <input
                    type="date"
                    value={formData.driveDate}
                    onChange={(e) => setFormData({ ...formData, driveDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                      Hiring Roles
                    </label>
                    <button
                      type="button"
                      onClick={addRole}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #7c3aed',
                        backgroundColor: '#ffffff',
                        color: '#7c3aed',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus style={{ width: '14px', height: '14px' }} />
                      Add Role
                    </button>
                  </div>

                  {formData.roles.map((role, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        backgroundColor: '#f9fafb',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <input
                          type="text"
                          value={role.name}
                          onChange={(e) => updateRole(index, 'name', e.target.value)}
                          placeholder="Role name"
                          style={{ ...inputStyle, flex: 2 }}
                        />
                        <input
                          type="number"
                          value={role.positions}
                          onChange={(e) => updateRole(index, 'positions', parseInt(e.target.value) || 1)}
                          placeholder="Positions"
                          min={1}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        {formData.roles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRole(index)}
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: '#fee2e2',
                              color: '#ef4444',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 style={{ width: '16px', height: '16px' }} />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={role.description}
                        onChange={(e) => updateRole(index, 'description', e.target.value)}
                        placeholder="Role description (optional)"
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
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
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: submitting ? '#d1d5db' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submitting ? 'Creating...' : 'Create Drive'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Interviewers Modal */}
      {showAssignModal && selectedDrive && (
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
          onClick={() => setShowAssignModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto',
              margin: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              Assign Interviewers
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280' }}>
              Select interviewers for <strong>{selectedDrive.collegeName}</strong>
            </p>

            <div style={{ maxHeight: '300px', overflow: 'auto', marginBottom: '20px' }}>
              {interviewers.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                  No interviewers available
                </p>
              ) : (
                interviewers.map((interviewer) => (
                  <label
                    key={interviewer.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      backgroundColor: selectedInterviewers.includes(interviewer.id) ? '#f5f3ff' : '#ffffff',
                      border: `1px solid ${selectedInterviewers.includes(interviewer.id) ? '#7c3aed' : '#e5e7eb'}`,
                      cursor: 'pointer',
                      marginBottom: '8px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedInterviewers.includes(interviewer.id)}
                      onChange={() => toggleInterviewer(interviewer.id)}
                      style={{ width: '18px', height: '18px', accentColor: '#7c3aed' }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                        {interviewer.firstName} {interviewer.lastName}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                        {interviewer.role.name} - {interviewer.user.role}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                {selectedInterviewers.length} selected
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowAssignModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
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
                  onClick={handleAssignInterviewers}
                  disabled={submitting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: submitting ? '#d1d5db' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
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
