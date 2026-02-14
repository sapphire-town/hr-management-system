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
  History,
  X,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  Trash2,
  Lock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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

interface EvaluationHistoryEntry {
  id: string;
  evaluationId: string;
  previousStatus: 'PASS' | 'FAIL' | 'ON_HOLD' | null;
  newStatus: 'PASS' | 'FAIL' | 'ON_HOLD';
  previousComments: string | null;
  newComments: string | null;
  editedBy: string;
  editedAt: string;
  editor: {
    id: string;
    firstName: string;
    lastName: string;
    user: { role: string };
  };
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
  status: string;
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
  const searchParams = useSearchParams();
  const isHROrDirector = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';
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
  const [viewingHistory, setViewingHistory] = React.useState<string | null>(null);
  const [evaluationHistory, setEvaluationHistory] = React.useState<EvaluationHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  // Add Student modal
  const [showAddStudentModal, setShowAddStudentModal] = React.useState(false);
  const [addingStudent, setAddingStudent] = React.useState(false);
  const [newStudent, setNewStudent] = React.useState({ name: '', email: '', phone: '', college: '', branch: '' });

  // Bulk Import modal
  const [showBulkImportModal, setShowBulkImportModal] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [importResults, setImportResults] = React.useState<{
    total: number;
    successful: number;
    failed: number;
    inserted: number;
    results: Array<{ row: number; name: string; status: 'success' | 'failed'; message?: string }>;
  } | null>(null);

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

  // Auto-select drive from query param (e.g., when navigating from recruitment page)
  React.useEffect(() => {
    const driveId = searchParams.get('driveId');
    if (driveId && drives.length > 0 && !selectedDrive) {
      const drive = drives.find((d) => d.id === driveId);
      if (drive) {
        handleSelectDrive(drive);
      }
    }
  }, [drives, searchParams]);

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
    const round3 = student.evaluations.find(e => e.roundNumber === 3);

    if (!round1) {
      setEvaluationData({ round: 1, status: '', comments: '' });
    } else if (round1.status === 'PASS' && !round2) {
      setEvaluationData({ round: 2, status: '', comments: '' });
    } else if (round1.status === 'PASS' && round2?.status === 'PASS' && !round3 && isHROrDirector) {
      setEvaluationData({ round: 3, status: '', comments: '' });
    } else if (round1.status === 'PASS' && round2?.status === 'PASS' && round3 && isHROrDirector) {
      setEvaluationData({ round: 3, status: round3.status, comments: round3.comments || '' });
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

  const fetchEvaluationHistory = async (evaluationId: string) => {
    try {
      setLoadingHistory(true);
      setViewingHistory(evaluationId);
      const response = await recruitmentAPI.getEvaluationHistory(evaluationId);
      setEvaluationHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch evaluation history:', error);
      alert('Failed to load evaluation history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const closeHistoryModal = () => {
    setViewingHistory(null);
    setEvaluationHistory([]);
  };

  const handleAddStudent = async () => {
    if (!selectedDrive || !newStudent.name || !newStudent.email) return;
    try {
      setAddingStudent(true);
      const studentData: Record<string, any> = {};
      if (newStudent.college) studentData.college = newStudent.college;
      if (newStudent.branch) studentData.branch = newStudent.branch;

      await recruitmentAPI.addStudent(selectedDrive.id, {
        name: newStudent.name,
        email: newStudent.email,
        phone: newStudent.phone,
        studentData: Object.keys(studentData).length > 0 ? studentData : undefined,
      });
      setShowAddStudentModal(false);
      setNewStudent({ name: '', email: '', phone: '', college: '', branch: '' });
      await fetchStudents(selectedDrive.id);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add student');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete student "${studentName}"? This will also delete all evaluations.`)) return;
    try {
      await recruitmentAPI.deleteStudent(studentId);
      if (selectedDrive) {
        await fetchStudents(selectedDrive.id);
      }
      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete student');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await recruitmentAPI.downloadStudentTemplate();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'student_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to download template');
    }
  };

  const handleImportStudents = async () => {
    if (!selectedDrive || !importFile) return;
    try {
      setImporting(true);
      setImportResults(null);
      const response = await recruitmentAPI.importStudents(selectedDrive.id, importFile);
      setImportResults(response.data);
      await fetchStudents(selectedDrive.id);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to import students');
    } finally {
      setImporting(false);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx')) {
        alert('Please upload an Excel file (.xlsx)');
        return;
      }
      setImportFile(file);
      setImportResults(null);
    }
  };

  const closeBulkImportModal = () => {
    setShowBulkImportModal(false);
    setImportFile(null);
    setImportResults(null);
  };

  const getStudentRound1Status = (student: Student) => {
    return student.evaluations.find(e => e.roundNumber === 1);
  };

  const getStudentRound2Status = (student: Student) => {
    return student.evaluations.find(e => e.roundNumber === 2);
  };

  const getStudentRound3Status = (student: Student) => {
    return student.evaluations.find(e => e.roundNumber === 3);
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  // Drive closed state — interviewers cannot modify closed drives
  const isDriveClosed = selectedDrive?.status === 'CLOSED';
  const canModify = !isDriveClosed || isHROrDirector;

  // Stats calculations
  const totalStudents = students.length;
  const round1Evaluated = students.filter(s => s.evaluations.some(e => e.roundNumber === 1)).length;
  const round1Passed = students.filter(s => s.evaluations.some(e => e.roundNumber === 1 && e.status === 'PASS')).length;
  const round2Evaluated = students.filter(s => s.evaluations.some(e => e.roundNumber === 2)).length;
  const round2Passed = students.filter(s => s.evaluations.some(e => e.roundNumber === 2 && e.status === 'PASS')).length;
  const round3Evaluated = students.filter(s => s.evaluations.some(e => e.roundNumber === 3)).length;
  const round3Passed = students.filter(s => s.evaluations.some(e => e.roundNumber === 3 && e.status === 'PASS')).length;

  return (
    <DashboardLayout
      title={selectedDrive ? selectedDrive.collegeName : isHROrDirector ? 'All Placement Drives' : 'My Assigned Drives'}
      description={selectedDrive ? 'Manage students and evaluations' : isHROrDirector ? 'View and manage all placement drives' : 'View placement drives assigned to you'}
      actions={
        selectedDrive && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isDriveClosed && (
              <span style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500,
              }}>
                <Lock style={{ width: 12, height: 12 }} />
                Drive Closed
              </span>
            )}
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
              <ArrowLeft style={{ width: 16, height: 16 }} />
              Back to Drives
            </button>
            {isHROrDirector && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowBulkImportModal(true)}
                >
                  <Upload style={{ width: 16, height: 16, marginRight: 8 }} />
                  Bulk Import
                </Button>
                <Button
                  onClick={() => { setNewStudent({ name: '', email: '', phone: '', college: '', branch: '' }); setShowAddStudentModal(true); }}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%)',
                    color: '#fff',
                    boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.35)',
                  }}
                >
                  <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
                  Add Student
                </Button>
              </>
            )}
          </div>
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
                  {isHROrDirector ? 'No placement drives created yet' : 'No placement drives assigned to you yet'}
                </p>
                <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
                  {isHROrDirector ? 'Create a drive from the Recruitment page' : 'HR will assign you to placement drives for interviewing'}
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
                              {drive.status === 'CLOSED' && (
                                <span
                                  style={{
                                    fontSize: '12px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: '#fee2e2',
                                    color: '#dc2626',
                                    fontWeight: 500,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Lock style={{ width: '12px', height: '12px' }} />
                                  Closed
                                </span>
                              )}
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
            {isHROrDirector && (
              <div style={cardStyle}>
                <div style={{ padding: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Round 3 (Final)</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#059669', margin: '4px 0 0 0' }}>{round3Passed}/{round3Evaluated}</p>
                </div>
              </div>
            )}
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
                        {isHROrDirector && (
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                            Round 3
                          </th>
                        )}
                        {isHROrDirector && (
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const round1 = getStudentRound1Status(student);
                        const round2 = getStudentRound2Status(student);
                        const round3 = getStudentRound3Status(student);
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
                            {isHROrDirector && (
                              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                {round2?.status !== 'PASS' ? (
                                  <span style={{ fontSize: '12px', color: '#d1d5db' }}>-</span>
                                ) : round3 ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      backgroundColor: statusConfig[round3.status].bg,
                                      color: statusConfig[round3.status].color,
                                    }}
                                  >
                                    {React.createElement(statusConfig[round3.status].icon, { style: { width: '12px', height: '12px' } })}
                                    {statusConfig[round3.status].label}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>Pending</span>
                                )}
                              </td>
                            )}
                            {isHROrDirector && (
                              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStudent(student.id, student.name);
                                  }}
                                  style={{
                                    padding: '6px',
                                    borderRadius: '6px',
                                    border: '1px solid #fee2e2',
                                    backgroundColor: '#fff5f5',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Delete student"
                                >
                                  <Trash2 style={{ width: '14px', height: '14px', color: '#ef4444' }} />
                                </button>
                              </td>
                            )}
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
                              <button
                                onClick={() => fetchEvaluationHistory(evaluation.id)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  color: '#7c3aed',
                                  background: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <History style={{ width: '12px', height: '12px' }} />
                                View Edits
                              </button>
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
                    {!canModify ? (
                      <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Lock style={{ width: '18px', height: '18px', color: '#dc2626', flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>Drive Closed</p>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#b91c1c' }}>
                            This drive has been closed. You can view records but cannot modify evaluations.
                          </p>
                        </div>
                      </div>
                    ) : (
                    <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                        {isHROrDirector && selectedStudent.evaluations.find(e => e.roundNumber === evaluationData.round)
                          ? `Override Evaluation - Round ${evaluationData.round}`
                          : `Submit Evaluation - Round ${evaluationData.round}`}
                      </h5>
                      {isHROrDirector && selectedStudent.evaluations.find(e => e.roundNumber === evaluationData.round) && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 500 }}>
                          Override
                        </span>
                      )}
                    </div>

                    {evaluationData.round === 2 && !getStudentRound1Status(selectedStudent)?.status && !isHROrDirector && (
                      <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle style={{ width: '16px', height: '16px', color: '#d97706' }} />
                        <span style={{ fontSize: '13px', color: '#92400e' }}>
                          Round 1 evaluation required first
                        </span>
                      </div>
                    )}

                    {evaluationData.round === 2 && getStudentRound1Status(selectedStudent)?.status !== 'PASS' && getStudentRound1Status(selectedStudent) && !isHROrDirector && (
                      <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <XCircle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                        <span style={{ fontSize: '13px', color: '#991b1b' }}>
                          Student did not pass Round 1
                        </span>
                      </div>
                    )}


                    {isHROrDirector && evaluationData.round >= 2 && (
                      (evaluationData.round === 2 && getStudentRound1Status(selectedStudent)?.status !== 'PASS') ||
                      (evaluationData.round === 3 && getStudentRound2Status(selectedStudent)?.status !== 'PASS')
                    ) && (
                      <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                        <span style={{ fontSize: '13px', color: '#1e40af' }}>
                          Overriding round progression — previous round not passed
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
                          disabled={!isHROrDirector && getStudentRound1Status(selectedStudent)?.status !== 'PASS'}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: evaluationData.round === 2 ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                            backgroundColor: evaluationData.round === 2 ? '#f5f3ff' : '#ffffff',
                            color: evaluationData.round === 2 ? '#7c3aed' : '#6b7280',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: !isHROrDirector && getStudentRound1Status(selectedStudent)?.status !== 'PASS' ? 'not-allowed' : 'pointer',
                            opacity: !isHROrDirector && getStudentRound1Status(selectedStudent)?.status !== 'PASS' ? 0.5 : 1,
                          }}
                        >
                          Round 2
                        </button>
                        {isHROrDirector && (
                          <button
                            onClick={() => setEvaluationData({ ...evaluationData, round: 3 })}
                            disabled={getStudentRound2Status(selectedStudent)?.status !== 'PASS'}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '8px',
                              border: evaluationData.round === 3 ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                              backgroundColor: evaluationData.round === 3 ? '#f5f3ff' : '#ffffff',
                              color: evaluationData.round === 3 ? '#7c3aed' : '#6b7280',
                              fontSize: '13px',
                              fontWeight: 500,
                              cursor: getStudentRound2Status(selectedStudent)?.status !== 'PASS' ? 'not-allowed' : 'pointer',
                              opacity: getStudentRound2Status(selectedStudent)?.status !== 'PASS' ? 0.5 : 1,
                            }}
                          >
                            Round 3
                          </button>
                        )}
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
                            {isHROrDirector && selectedStudent.evaluations.find(e => e.roundNumber === evaluationData.round)
                              ? 'Override Evaluation'
                              : 'Save Evaluation'}
                          </>
                        )}
                      </button>
                    </div>
                    </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {viewingHistory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={closeHistoryModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                  Evaluation Edit History
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                  Complete audit trail of all changes
                </p>
              </div>
              <button
                onClick={closeHistoryModal}
                style={{
                  padding: '8px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X style={{ width: '20px', height: '20px', color: '#6b7280' }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                  Loading history...
                </div>
              ) : evaluationHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <History style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#d1d5db' }} />
                  <p style={{ fontSize: '16px', fontWeight: 500, color: '#111827', margin: '0 0 8px' }}>
                    No edit history
                  </p>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    This evaluation has not been edited yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {evaluationHistory.map((entry, index) => (
                    <div
                      key={entry.id}
                      style={{
                        padding: '16px',
                        borderLeft: '3px solid #7c3aed',
                        backgroundColor: '#faf5ff',
                        borderRadius: '8px',
                      }}
                    >
                      {/* Editor info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#7c3aed',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {entry.editor.firstName[0]}{entry.editor.lastName[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                            {entry.editor.firstName} {entry.editor.lastName}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                            {formatDistanceToNow(new Date(entry.editedAt), { addSuffix: true })}
                          </p>
                        </div>
                        <span
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#7c3aed',
                            backgroundColor: '#ede9fe',
                            borderRadius: '6px',
                          }}
                        >
                          Edit #{evaluationHistory.length - index}
                        </span>
                      </div>

                      {/* Changes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Status change */}
                        {entry.previousStatus && entry.previousStatus !== entry.newStatus && (
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ color: '#6b7280' }}>Status: </span>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: statusConfig[entry.previousStatus].bg,
                                color: statusConfig[entry.previousStatus].color,
                                fontWeight: 500,
                                textDecoration: 'line-through',
                              }}
                            >
                              {statusConfig[entry.previousStatus].label}
                            </span>
                            <span style={{ margin: '0 8px', color: '#6b7280' }}>→</span>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: statusConfig[entry.newStatus].bg,
                                color: statusConfig[entry.newStatus].color,
                                fontWeight: 600,
                              }}
                            >
                              {statusConfig[entry.newStatus].label}
                            </span>
                          </div>
                        )}

                        {/* Comments change */}
                        {(entry.previousComments !== entry.newComments) && (
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ color: '#6b7280', display: 'block', marginBottom: '4px' }}>Comments updated:</span>
                            {entry.previousComments && (
                              <div
                                style={{
                                  padding: '8px',
                                  backgroundColor: '#fee2e2',
                                  borderRadius: '4px',
                                  marginBottom: '4px',
                                }}
                              >
                                <span style={{ color: '#991b1b', textDecoration: 'line-through', fontSize: '12px', fontStyle: 'italic' }}>
                                  "{entry.previousComments}"
                                </span>
                              </div>
                            )}
                            {entry.newComments && (
                              <div
                                style={{
                                  padding: '8px',
                                  backgroundColor: '#d1fae5',
                                  borderRadius: '4px',
                                }}
                              >
                                <span style={{ color: '#065f46', fontSize: '12px', fontStyle: 'italic' }}>
                                  "{entry.newComments}"
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      <Dialog open={showAddStudentModal} onOpenChange={setShowAddStudentModal}>
        <DialogContent style={{ maxWidth: 500 }}>
          <DialogHeader>
            <DialogTitle>Add Student to Drive</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
            <div>
              <Label>Student Name *</Label>
              <Input
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                placeholder="student@college.edu"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={newStudent.phone}
                onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                placeholder="9876543210"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Label>College</Label>
                <Input
                  value={newStudent.college}
                  onChange={(e) => setNewStudent({ ...newStudent, college: e.target.value })}
                  placeholder="University name"
                />
              </div>
              <div>
                <Label>Branch</Label>
                <Input
                  value={newStudent.branch}
                  onChange={(e) => setNewStudent({ ...newStudent, branch: e.target.value })}
                  placeholder="e.g. Computer Science"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStudentModal(false)}>Cancel</Button>
            <Button
              onClick={handleAddStudent}
              disabled={addingStudent || !newStudent.name || !newStudent.email}
            >
              {addingStudent ? 'Adding...' : 'Add Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={showBulkImportModal} onOpenChange={(open) => { if (!open) closeBulkImportModal(); else setShowBulkImportModal(true); }}>
        <DialogContent style={{ maxWidth: 600 }}>
          <DialogHeader>
            <DialogTitle>Bulk Import Students</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>
              Upload an Excel file (.xlsx) with student data. Download the template to see the expected format.
            </p>

            <button
              onClick={handleDownloadTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #7c3aed',
                background: '#faf5ff',
                color: '#7c3aed',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                marginBottom: 20,
              }}
            >
              <Download style={{ width: 16, height: 16 }} />
              Download Template
            </button>

            <div style={{ marginBottom: 16 }}>
              <Label style={{ marginBottom: 8, display: 'block' }}>Upload Excel File</Label>
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
                cursor: 'pointer',
                background: '#f8fafc',
                position: 'relative',
              }}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportFileChange}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
                <FileSpreadsheet style={{ width: 32, height: 32, color: '#7c3aed', margin: '0 auto 8px' }} />
                {importFile ? (
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1e293b', margin: 0 }}>{importFile.name}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                      {(importFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', margin: 0 }}>Click to upload or drag & drop</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Excel files only (.xlsx)</p>
                  </div>
                )}
              </div>
            </div>

            {importResults && (
              <div style={{
                padding: 16,
                borderRadius: 12,
                background: importResults.failed > 0 ? '#fffbeb' : '#f0fdf4',
                border: `1px solid ${importResults.failed > 0 ? '#fde68a' : '#bbf7d0'}`,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>{importResults.successful}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Imported</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>{importResults.failed}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Failed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#6b7280' }}>{importResults.total}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Total Rows</div>
                  </div>
                </div>
                {importResults.results.filter(r => r.status === 'failed').length > 0 && (
                  <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>Errors:</div>
                    {importResults.results
                      .filter(r => r.status === 'failed')
                      .map((r, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#991b1b', padding: '2px 0' }}>
                          Row {r.row}: {r.name} - {r.message}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeBulkImportModal}>
              {importResults ? 'Close' : 'Cancel'}
            </Button>
            {!importResults && (
              <Button
                onClick={handleImportStudents}
                disabled={importing || !importFile}
              >
                {importing ? 'Importing...' : 'Import Students'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DashboardLayout>
  );
}
