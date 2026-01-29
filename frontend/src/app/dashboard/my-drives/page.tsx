'use client';

import * as React from 'react';
import {
  Building2,
  Calendar,
  Users,
  GraduationCap,
  Loader2,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  ArrowLeft,
  Save,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { recruitmentAPI } from '@/lib/api-client';

interface Evaluation {
  id: string;
  roundNumber: number;
  status: 'PASS' | 'FAIL' | 'ON_HOLD';
  comments?: string;
  evaluator: { firstName: string; lastName: string };
  evaluatedAt: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  studentData: Record<string, any>;
  evaluations: Evaluation[];
}

interface PlacementDrive {
  id: string;
  collegeName: string;
  driveDate: string;
  roles: Array<{ name: string; description: string; positions?: number }>;
  interviewers: Array<{
    id: string;
    interviewer: { id: string; firstName: string; lastName: string };
  }>;
  students?: Student[];
  _count: { students: number };
}

const statusConfig = {
  PASS: { color: '#059669', bg: '#d1fae5', label: 'Pass', icon: CheckCircle },
  FAIL: { color: '#dc2626', bg: '#fee2e2', label: 'Fail', icon: XCircle },
  ON_HOLD: { color: '#d97706', bg: '#fef3c7', label: 'On Hold', icon: Clock },
};

export default function MyDrivesPage() {
  const { user } = useAuthStore();
  const [drives, setDrives] = React.useState<PlacementDrive[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDrive, setSelectedDrive] = React.useState<PlacementDrive | null>(null);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [evaluating, setEvaluating] = React.useState(false);
  const [evaluationData, setEvaluationData] = React.useState({
    round: 1,
    status: '' as 'PASS' | 'FAIL' | 'ON_HOLD' | '',
    comments: '',
  });

  const fetchMyDrives = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await recruitmentAPI.getMyDrives();
      setDrives(response.data || []);
    } catch (error) {
      console.error('Error fetching drives:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMyDrives();
  }, [fetchMyDrives]);

  const fetchStudents = async (driveId: string) => {
    try {
      setLoadingStudents(true);
      const response = await recruitmentAPI.getStudents(driveId);
      setStudents(response.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSelectDrive = async (drive: PlacementDrive) => {
    setSelectedDrive(drive);
    setSelectedStudent(null);
    await fetchStudents(drive.id);
  };

  const handleBackToDrives = () => {
    setSelectedDrive(null);
    setStudents([]);
    setSelectedStudent(null);
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    // Determine which round to show
    const round1 = student.evaluations.find(e => e.roundNumber === 1);
    const round2 = student.evaluations.find(e => e.roundNumber === 2);

    if (!round1) {
      setEvaluationData({ round: 1, status: '', comments: '' });
    } else if (round1.status === 'PASS' && !round2) {
      setEvaluationData({ round: 2, status: '', comments: '' });
    } else if (round1.status === 'PASS' && round2) {
      setEvaluationData({ round: 2, status: round2.status, comments: round2.comments || '' });
    } else {
      setEvaluationData({ round: 1, status: round1.status, comments: round1.comments || '' });
    }
  };

  const handleEvaluate = async () => {
    if (!selectedStudent || !evaluationData.status) return;

    try {
      setEvaluating(true);
      await recruitmentAPI.evaluateStudent(selectedStudent.id, evaluationData.round, {
        status: evaluationData.status,
        comments: evaluationData.comments || undefined,
      });

      // Refresh students
      if (selectedDrive) {
        await fetchStudents(selectedDrive.id);
        // Update selected student
        const updatedStudent = students.find(s => s.id === selectedStudent.id);
        if (updatedStudent) {
          setSelectedStudent(updatedStudent);
        }
      }

      alert('Evaluation saved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save evaluation');
    } finally {
      setEvaluating(false);
    }
  };

  const getStudentRound1Status = (student: Student) => {
    return student.evaluations.find(e => e.roundNumber === 1);
  };

  const getStudentRound2Status = (student: Student) => {
    return student.evaluations.find(e => e.roundNumber === 2);
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  // Stats calculations
  const totalStudents = students.length;
  const round1Evaluated = students.filter(s => s.evaluations.some(e => e.roundNumber === 1)).length;
  const round1Passed = students.filter(s => s.evaluations.some(e => e.roundNumber === 1 && e.status === 'PASS')).length;
  const round2Evaluated = students.filter(s => s.evaluations.some(e => e.roundNumber === 2)).length;
  const round2Passed = students.filter(s => s.evaluations.some(e => e.roundNumber === 2 && e.status === 'PASS')).length;

  return (
    <DashboardLayout
      title={selectedDrive ? selectedDrive.collegeName : 'My Assigned Drives'}
      description={selectedDrive ? 'View students and submit evaluations' : 'View placement drives assigned to you'}
      actions={
        selectedDrive && (
          <button
            onClick={handleBackToDrives}
            style={{
              display: 'flex',
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
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Drives
          </button>
        )
      }
    >
      {!selectedDrive ? (
        // Drives List View
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px' }}>
              <Loader2 style={{ height: '32px', width: '32px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : drives.length === 0 ? (
            <div style={cardStyle}>
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <Building2 style={{ height: '48px', width: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
                  No placement drives assigned to you yet
                </p>
                <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                  HR will assign you to placement drives for interviewing
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {drives.map((drive) => {
                const isUpcoming = new Date(drive.driveDate) >= new Date();

                return (
                  <div
                    key={drive.id}
                    style={{
                      ...cardStyle,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleSelectDrive(drive)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(124, 58, 237, 0.15)';
                      e.currentTarget.style.borderColor = '#7c3aed';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <div style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                          <div
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '14px',
                              background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Building2 style={{ width: '28px', height: '28px', color: '#7c3aed' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                                {drive.collegeName}
                              </h3>
                              <span
                                style={{
                                  fontSize: '12px',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: isUpcoming ? '#dcfce7' : '#f3f4f6',
                                  color: isUpcoming ? '#166534' : '#6b7280',
                                  fontWeight: 500,
                                }}
                              >
                                {isUpcoming ? 'Upcoming' : 'Completed'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '14px' }}>
                                <Calendar style={{ width: '16px', height: '16px' }} />
                                {new Date(drive.driveDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '14px' }}>
                                <GraduationCap style={{ width: '16px', height: '16px' }} />
                                {drive._count.students} Students
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '14px' }}>
                                <Users style={{ width: '16px', height: '16px' }} />
                                {drive.interviewers.length} Interviewers
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {(drive.roles as any[]).map((role, i) => (
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
                            </div>
                          </div>
                        </div>
                        <ChevronRight style={{ width: '24px', height: '24px', color: '#9ca3af' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Drive Details & Students View
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div style={cardStyle}>
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Total Students</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#7c3aed', margin: '4px 0 0 0' }}>{totalStudents}</p>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Round 1 Evaluated</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb', margin: '4px 0 0 0' }}>
                  {round1Evaluated}/{totalStudents}
                </p>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Round 1 Passed</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#059669', margin: '4px 0 0 0' }}>{round1Passed}</p>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Round 2 Passed</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#059669', margin: '4px 0 0 0' }}>{round2Passed}</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selectedStudent ? '1fr 400px' : '1fr', gap: '24px' }}>
            {/* Students List */}
            <div style={cardStyle}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  Students ({students.length})
                </h3>
              </div>

              {loadingStudents ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                  <Loader2 style={{ height: '32px', width: '32px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : students.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <GraduationCap style={{ height: '48px', width: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>No students added to this drive yet</p>
                </div>
              ) : (
                <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                          Student
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                          Round 1
                        </th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                          Round 2
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const round1 = getStudentRound1Status(student);
                        const round2 = getStudentRound2Status(student);
                        const isSelected = selectedStudent?.id === student.id;

                        return (
                          <tr
                            key={student.id}
                            onClick={() => handleSelectStudent(student)}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: isSelected ? '#f5f3ff' : 'transparent',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#fafafa';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    backgroundColor: '#ede9fe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#7c3aed',
                                  }}
                                >
                                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                                    {student.name}
                                  </p>
                                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                                    {student.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              {round1 ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    backgroundColor: statusConfig[round1.status].bg,
                                    color: statusConfig[round1.status].color,
                                  }}
                                >
                                  {React.createElement(statusConfig[round1.status].icon, { style: { width: '12px', height: '12px' } })}
                                  {statusConfig[round1.status].label}
                                </span>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Pending</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              {round1?.status !== 'PASS' ? (
                                <span style={{ fontSize: '12px', color: '#d1d5db' }}>-</span>
                              ) : round2 ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    backgroundColor: statusConfig[round2.status].bg,
                                    color: statusConfig[round2.status].color,
                                  }}
                                >
                                  {React.createElement(statusConfig[round2.status].icon, { style: { width: '12px', height: '12px' } })}
                                  {statusConfig[round2.status].label}
                                </span>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Student Details & Evaluation Panel */}
            {selectedStudent && (
              <div style={cardStyle}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                    Student Details
                  </h3>
                </div>
                <div style={{ padding: '20px' }}>
                  {/* Student Info */}
                  <div style={{ marginBottom: '24px' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#ffffff',
                        margin: '0 auto 16px',
                      }}
                    >
                      {selectedStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#111827', textAlign: 'center' }}>
                      {selectedStudent.name}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
                        <Mail style={{ width: '16px', height: '16px' }} />
                        {selectedStudent.email}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
                        <Phone style={{ width: '16px', height: '16px' }} />
                        {selectedStudent.phone}
                      </div>
                    </div>
                  </div>

                  {/* Additional Student Data */}
                  {Object.keys(selectedStudent.studentData).length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                        Additional Information
                      </h5>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {Object.entries(selectedStudent.studentData).map(([key, value]) => (
                          <div
                            key={key}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '8px',
                              fontSize: '13px',
                            }}
                          >
                            <span style={{ color: '#6b7280' }}>{key}: </span>
                            <span style={{ color: '#111827', fontWeight: 500 }}>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evaluation History */}
                  {selectedStudent.evaluations.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                        Evaluation History
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedStudent.evaluations.map((evaluation) => (
                          <div
                            key={evaluation.id}
                            style={{
                              padding: '12px',
                              backgroundColor: statusConfig[evaluation.status].bg,
                              borderRadius: '10px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: statusConfig[evaluation.status].color }}>
                                Round {evaluation.roundNumber}: {statusConfig[evaluation.status].label}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                              by {evaluation.evaluator.firstName} {evaluation.evaluator.lastName}
                            </p>
                            {evaluation.comments && (
                              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                                "{evaluation.comments}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evaluation Form */}
                  <div>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                      Submit Evaluation - Round {evaluationData.round}
                    </h5>

                    {evaluationData.round === 2 && !getStudentRound1Status(selectedStudent)?.status && (
                      <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle style={{ width: '16px', height: '16px', color: '#d97706' }} />
                        <span style={{ fontSize: '13px', color: '#92400e' }}>
                          Round 1 evaluation required first
                        </span>
                      </div>
                    )}

                    {evaluationData.round === 2 && getStudentRound1Status(selectedStudent)?.status !== 'PASS' && getStudentRound1Status(selectedStudent) && (
                      <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <XCircle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                        <span style={{ fontSize: '13px', color: '#991b1b' }}>
                          Student did not pass Round 1
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Round Toggle */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setEvaluationData({ ...evaluationData, round: 1 })}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: evaluationData.round === 1 ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                            backgroundColor: evaluationData.round === 1 ? '#f5f3ff' : '#ffffff',
                            color: evaluationData.round === 1 ? '#7c3aed' : '#6b7280',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Round 1
                        </button>
                        <button
                          onClick={() => setEvaluationData({ ...evaluationData, round: 2 })}
                          disabled={getStudentRound1Status(selectedStudent)?.status !== 'PASS'}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: evaluationData.round === 2 ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                            backgroundColor: evaluationData.round === 2 ? '#f5f3ff' : '#ffffff',
                            color: evaluationData.round === 2 ? '#7c3aed' : '#6b7280',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: getStudentRound1Status(selectedStudent)?.status !== 'PASS' ? 'not-allowed' : 'pointer',
                            opacity: getStudentRound1Status(selectedStudent)?.status !== 'PASS' ? 0.5 : 1,
                          }}
                        >
                          Round 2
                        </button>
                      </div>

                      {/* Status Selection */}
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                          Result *
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {(['PASS', 'FAIL', 'ON_HOLD'] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => setEvaluationData({ ...evaluationData, status })}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: evaluationData.status === status ? '2px solid' : '1px solid #e5e7eb',
                                borderColor: evaluationData.status === status ? statusConfig[status].color : '#e5e7eb',
                                backgroundColor: evaluationData.status === status ? statusConfig[status].bg : '#ffffff',
                                color: evaluationData.status === status ? statusConfig[status].color : '#6b7280',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                              }}
                            >
                              {React.createElement(statusConfig[status].icon, { style: { width: '14px', height: '14px' } })}
                              {statusConfig[status].label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comments */}
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                          Comments (optional)
                        </label>
                        <textarea
                          value={evaluationData.comments}
                          onChange={(e) => setEvaluationData({ ...evaluationData, comments: e.target.value })}
                          placeholder="Add any notes about the evaluation..."
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            fontSize: '14px',
                            resize: 'vertical',
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={handleEvaluate}
                        disabled={evaluating || !evaluationData.status}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '10px',
                          border: 'none',
                          background: evaluating || !evaluationData.status
                            ? '#d1d5db'
                            : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: evaluating || !evaluationData.status ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        {evaluating ? (
                          <>
                            <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save style={{ width: '16px', height: '16px' }} />
                            Save Evaluation
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
