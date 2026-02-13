'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Send,
  Users,
  TrendingUp,
  Shield,
  User,
  Building,
  Briefcase,
  Star,
  Search,
  X,
  Plus,
  CheckCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { feedbackAPI, employeeAPI, dailyReportAPI } from '@/lib/api-client';

interface Feedback {
  id: string;
  subject: string;
  content: string;
  isConfidential: boolean;
  createdAt: string;
  from?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  to?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  user: { email: string };
  role: { name: string };
}

interface Statistics {
  total: number;
  bySubject: Record<string, number>;
  confidentialCount: number;
}

interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  roleName: string;
  overallAchievement: number;
  totalReports: number;
  parameters: {
    paramKey: string;
    paramLabel: string;
    paramType: string;
    totalTarget: number;
    totalActual: number;
    achievementPct: number;
  }[];
}

const FEEDBACK_SUBJECTS = [
  'Manager',
  'Company',
  'HR Head',
  'Director',
  'Work Environment',
  'Other',
];

const subjectConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  Manager: { icon: <Briefcase style={{ height: '16px', width: '16px' }} />, color: '#7c3aed', label: 'Manager' },
  Company: { icon: <Building style={{ height: '16px', width: '16px' }} />, color: '#3b82f6', label: 'Company' },
  'HR Head': { icon: <Users style={{ height: '16px', width: '16px' }} />, color: '#f59e0b', label: 'HR Head' },
  Director: { icon: <Star style={{ height: '16px', width: '16px' }} />, color: '#ec4899', label: 'Director' },
  'Work Environment': { icon: <Building style={{ height: '16px', width: '16px' }} />, color: '#06b6d4', label: 'Work Environment' },
  Other: { icon: <MessageSquare style={{ height: '16px', width: '16px' }} />, color: '#6b7280', label: 'Other' },
};

export default function FeedbackPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = React.useState<'received' | 'send' | 'my' | 'submit' | 'submitted'>('my');
  const [feedbacks, setFeedbacks] = React.useState<Feedback[]>([]);
  const [myReceivedFeedbacks, setMyReceivedFeedbacks] = React.useState<Feedback[]>([]);
  const [mySubmittedFeedbacks, setMySubmittedFeedbacks] = React.useState<Feedback[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [statistics, setStatistics] = React.useState<Statistics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [subjectFilter, setSubjectFilter] = React.useState<string>('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedFeedback, setSelectedFeedback] = React.useState<Feedback | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  // HR Send feedback form state
  const [selectedEmployees, setSelectedEmployees] = React.useState<string[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = React.useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = React.useState(false);
  const [feedbackSubject, setFeedbackSubject] = React.useState('');
  const [feedbackContent, setFeedbackContent] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sendSuccess, setSendSuccess] = React.useState<string | null>(null);
  const employeePickerRef = React.useRef<HTMLDivElement>(null);

  // Employee submit feedback form state
  const [employeeFeedbackSubject, setEmployeeFeedbackSubject] = React.useState('');
  const [employeeFeedbackContent, setEmployeeFeedbackContent] = React.useState('');
  const [isConfidential, setIsConfidential] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Performance data for selected employee (Director feature)
  const [employeePerformance, setEmployeePerformance] = React.useState<EmployeePerformance | null>(null);
  const [loadingPerformance, setLoadingPerformance] = React.useState(false);

  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';
  const isDirector = user?.role === 'DIRECTOR';

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    // Set initial tab from URL param or based on role
    const validTabs = ['received', 'send', 'my', 'submit', 'submitted'];
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam as any);
    } else if (isDirector) {
      setActiveTab('send');
    } else if (isHR) {
      setActiveTab('received');
    }
  }, [isHR, isDirector, tabParam]);

  const loadData = async () => {
    try {
      setLoading(true);
      const promises: Promise<any>[] = [
        feedbackAPI.getMyReceived(),
        feedbackAPI.getMySubmitted(),
      ];

      if (isHR) {
        promises.push(feedbackAPI.getAll());
        promises.push(feedbackAPI.getStatistics());
        promises.push(employeeAPI.getAll());
      }

      const results = await Promise.all(promises);
      setMyReceivedFeedbacks(results[0].data);
      setMySubmittedFeedbacks(results[1].data);

      if (isHR) {
        setFeedbacks(results[2].data?.data || results[2].data);
        setStatistics(results[3].data);
        setEmployees(results[4].data?.data || []);
      }
    } catch (error) {
      console.error('Error loading feedback data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (employeePickerRef.current && !employeePickerRef.current.contains(e.target as Node)) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  const removeSelectedEmployee = (employeeId: string) => {
    setSelectedEmployees((prev) => prev.filter((id) => id !== employeeId));
  };

  // Load performance when exactly 1 employee is selected (Director feature)
  React.useEffect(() => {
    if (selectedEmployees.length === 1 && isDirector) {
      setLoadingPerformance(true);
      setEmployeePerformance(null);
      dailyReportAPI
        .getEmployeePerformance(selectedEmployees[0], { period: 'this_month' })
        .then((res) => setEmployeePerformance(res.data))
        .catch(() => setEmployeePerformance(null))
        .finally(() => setLoadingPerformance(false));
    } else {
      setEmployeePerformance(null);
    }
  }, [selectedEmployees, isDirector]);

  const filteredEmployeeList = employees.filter((emp) => {
    if (employeeSearchTerm === '') return true;
    const term = employeeSearchTerm.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(term) ||
      emp.lastName.toLowerCase().includes(term) ||
      emp.role?.name?.toLowerCase().includes(term)
    );
  });

  const selectAllFiltered = () => {
    const filteredIds = filteredEmployeeList.map((e) => e.id);
    const allSelected = filteredIds.every((id) => selectedEmployees.includes(id));
    if (allSelected) {
      setSelectedEmployees((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedEmployees((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSendFeedback = async () => {
    if (selectedEmployees.length === 0 || !feedbackSubject || !feedbackContent) {
      return;
    }

    try {
      setSending(true);

      if (selectedEmployees.length === 1) {
        await feedbackAPI.submitHRFeedback({
          toId: selectedEmployees[0],
          subject: feedbackSubject,
          content: feedbackContent,
        });
        setSendSuccess('Feedback sent successfully!');
      } else {
        const result = await feedbackAPI.submitBulkHRFeedback({
          toIds: selectedEmployees,
          subject: feedbackSubject,
          content: feedbackContent,
        });
        const data = result.data;
        setSendSuccess(
          `Feedback sent to ${data.sent} employee${data.sent !== 1 ? 's' : ''}${data.failed > 0 ? ` (${data.failed} failed)` : ''}!`,
        );
      }

      // Reset form
      setSelectedEmployees([]);
      setEmployeeSearchTerm('');
      setFeedbackSubject('');
      setFeedbackContent('');
      setEmployeePerformance(null);

      setTimeout(() => setSendSuccess(null), 3000);

      // Reload data
      loadData();
    } catch (error) {
      console.error('Error sending feedback:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSubmitEmployeeFeedback = async () => {
    if (!employeeFeedbackSubject || !employeeFeedbackContent) {
      return;
    }

    try {
      setSubmitting(true);
      await feedbackAPI.submit({
        subject: employeeFeedbackSubject,
        content: employeeFeedbackContent,
        isConfidential,
      });

      // Reset form
      setEmployeeFeedbackSubject('');
      setEmployeeFeedbackContent('');
      setIsConfidential(true);
      setSubmitSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);

      // Reload data
      loadData();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    const matchesSubject = subjectFilter === 'all' || f.subject === subjectFilter;
    const matchesSearch = searchTerm === '' ||
      f.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.from?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.from?.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: isActive ? '#7c3aed' : 'transparent',
    color: isActive ? '#ffffff' : '#6b7280',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 12px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
    paddingRight: '40px',
  };

  if (loading) {
    return (
      <DashboardLayout title="Feedback" description="Manage employee feedback">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#7c3aed',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p>Loading feedback data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Feedback Management"
      description={isHR ? 'View employee feedback and send feedback to employees' : 'View feedback you have received'}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input:focus, select:focus, textarea:focus {
          border-color: #7c3aed !important;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Statistics - HR only */}
        {isHR && statistics && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ ...cardStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#f5f3ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c3aed',
                }}
              >
                <MessageSquare style={{ height: '24px', width: '24px' }} />
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{statistics.total}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Total Feedback</p>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                }}
              >
                <Shield style={{ height: '24px', width: '24px' }} />
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{statistics.confidentialCount}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Confidential</p>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3b82f6',
                }}
              >
                <TrendingUp style={{ height: '24px', width: '24px' }} />
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {Object.keys(statistics.bySubject).length}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Categories</p>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#22c55e',
                }}
              >
                <Users style={{ height: '24px', width: '24px' }} />
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{employees.length}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Employees</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ ...cardStyle, padding: '8px', display: 'flex', gap: '8px' }}>
          {isHR && (
            <button style={tabStyle(activeTab === 'received')} onClick={() => setActiveTab('received')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare style={{ height: '16px', width: '16px' }} />
                Employee Feedback
              </div>
            </button>
          )}
          {isHR && (
            <button style={tabStyle(activeTab === 'send')} onClick={() => setActiveTab('send')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send style={{ height: '16px', width: '16px' }} />
                Send Feedback
              </div>
            </button>
          )}
          <button style={tabStyle(activeTab === 'my')} onClick={() => setActiveTab('my')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User style={{ height: '16px', width: '16px' }} />
              Received
            </div>
          </button>
          <button style={tabStyle(activeTab === 'submit')} onClick={() => setActiveTab('submit')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus style={{ height: '16px', width: '16px' }} />
              Submit Feedback
            </div>
          </button>
          <button style={tabStyle(activeTab === 'submitted')} onClick={() => setActiveTab('submitted')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle style={{ height: '16px', width: '16px' }} />
              My Submitted
            </div>
          </button>
        </div>

        {/* Employee Feedback (HR view) */}
        {activeTab === 'received' && isHR && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                  All Employee Feedback
                </h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', height: '16px', width: '16px', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search feedback..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: '40px', width: '200px' }}
                    />
                  </div>
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    style={{ ...selectStyle, width: '160px' }}
                  >
                    <option value="all">All Subjects</option>
                    {Object.keys(subjectConfig).map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {filteredFeedbacks.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                  <MessageSquare style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No feedback found</p>
                </div>
              ) : (
                filteredFeedbacks.map((feedback) => {
                  const config = subjectConfig[feedback.subject] || subjectConfig.Other;
                  return (
                    <div
                      key={feedback.id}
                      style={{
                        padding: '20px',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onClick={() => setSelectedFeedback(feedback)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                backgroundColor: `${config.color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: config.color,
                              }}
                            >
                              {config.icon}
                            </div>
                            <div>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                {feedback.from ? `${feedback.from.firstName} ${feedback.from.lastName}` : 'Anonymous'}
                              </span>
                              <span
                                style={{
                                  marginLeft: '12px',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: `${config.color}15`,
                                  color: config.color,
                                }}
                              >
                                {feedback.subject}
                              </span>
                            </div>
                          </div>
                          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                            {feedback.content.length > 150 ? `${feedback.content.substring(0, 150)}...` : feedback.content}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {new Date(feedback.createdAt).toLocaleDateString()}
                          </span>
                          {feedback.isConfidential && (
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 500,
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                              }}
                            >
                              <Shield style={{ height: '12px', width: '12px' }} />
                              Confidential
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Send Feedback Form */}
        {activeTab === 'send' && isHR && (
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ ...cardStyle, flex: '1 1 400px', minWidth: '0' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                  Send Feedback to Employee{selectedEmployees.length > 1 ? 's' : ''}
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                  {isDirector
                    ? 'Evaluate performance and provide constructive feedback'
                    : 'Provide constructive feedback to help employees grow'}
                </p>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {sendSuccess && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#dcfce7',
                      border: '1px solid #86efac',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <CheckCircle style={{ height: '16px', width: '16px', color: '#16a34a' }} />
                      <span style={{ fontSize: '14px', color: '#16a34a', fontWeight: 500 }}>
                        {sendSuccess}
                      </span>
                    </div>
                  )}

                  {/* Multi-select Employee Picker */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                      Select Employee{selectedEmployees.length > 1 ? 's' : ''} *
                    </label>

                    {/* Selected Employee Chips */}
                    {selectedEmployees.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginBottom: '8px',
                      }}>
                        {selectedEmployees.map((empId) => {
                          const emp = employees.find((e) => e.id === empId);
                          if (!emp) return null;
                          return (
                            <span
                              key={empId}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '12px',
                                fontWeight: 500,
                                backgroundColor: '#f5f3ff',
                                color: '#7c3aed',
                                border: '1px solid #ddd6fe',
                              }}
                            >
                              {emp.firstName} {emp.lastName}
                              <button
                                onClick={() => removeSelectedEmployee(empId)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  color: '#7c3aed',
                                  opacity: 0.7,
                                }}
                              >
                                <X style={{ height: '12px', width: '12px' }} />
                              </button>
                            </span>
                          );
                        })}
                        {selectedEmployees.length > 1 && (
                          <button
                            onClick={() => setSelectedEmployees([])}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 500,
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              cursor: 'pointer',
                            }}
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    )}

                    {/* Searchable Dropdown */}
                    <div ref={employeePickerRef} style={{ position: 'relative' }}>
                      <div style={{ position: 'relative' }}>
                        <Search style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          height: '16px',
                          width: '16px',
                          color: '#9ca3af',
                        }} />
                        <input
                          type="text"
                          placeholder={selectedEmployees.length > 0
                            ? `${selectedEmployees.length} selected — search to add more...`
                            : 'Search employees by name or role...'}
                          value={employeeSearchTerm}
                          onChange={(e) => {
                            setEmployeeSearchTerm(e.target.value);
                            setShowEmployeeDropdown(true);
                          }}
                          onFocus={() => setShowEmployeeDropdown(true)}
                          style={{ ...inputStyle, paddingLeft: '40px' }}
                        />
                      </div>

                      {showEmployeeDropdown && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '4px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '10px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          maxHeight: '240px',
                          overflowY: 'auto',
                          zIndex: 20,
                        }}>
                          {/* Select All */}
                          {filteredEmployeeList.length > 0 && (
                            <div
                              onClick={selectAllFiltered}
                              style={{
                                padding: '10px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                backgroundColor: '#f9fafb',
                                transition: 'background-color 0.15s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                            >
                              <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
                                border: `2px solid ${filteredEmployeeList.every((e) => selectedEmployees.includes(e.id)) ? '#7c3aed' : '#d1d5db'}`,
                                backgroundColor: filteredEmployeeList.every((e) => selectedEmployees.includes(e.id)) ? '#7c3aed' : '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                {filteredEmployeeList.every((e) => selectedEmployees.includes(e.id)) && (
                                  <CheckCircle style={{ height: '12px', width: '12px', color: '#fff' }} />
                                )}
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#7c3aed' }}>
                                {filteredEmployeeList.every((e) => selectedEmployees.includes(e.id))
                                  ? 'Deselect All'
                                  : `Select All (${filteredEmployeeList.length})`}
                              </span>
                            </div>
                          )}

                          {filteredEmployeeList.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                              No employees found
                            </div>
                          ) : (
                            filteredEmployeeList.map((emp) => {
                              const isSelected = selectedEmployees.includes(emp.id);
                              return (
                                <div
                                  key={emp.id}
                                  onClick={() => toggleEmployeeSelection(emp.id)}
                                  style={{
                                    padding: '10px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? '#faf5ff' : 'transparent',
                                    transition: 'background-color 0.15s',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = isSelected ? '#faf5ff' : 'transparent';
                                  }}
                                >
                                  <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '4px',
                                    border: `2px solid ${isSelected ? '#7c3aed' : '#d1d5db'}`,
                                    backgroundColor: isSelected ? '#7c3aed' : '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.15s',
                                  }}>
                                    {isSelected && (
                                      <CheckCircle style={{ height: '12px', width: '12px', color: '#fff' }} />
                                    )}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                                      {emp.firstName} {emp.lastName}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                      {emp.role?.name || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {selectedEmployees.length > 1 && (
                      <p style={{ fontSize: '12px', color: '#7c3aed', margin: '6px 0 0', fontWeight: 500 }}>
                        Same feedback will be sent to all {selectedEmployees.length} selected employees
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={feedbackSubject}
                      onChange={(e) => setFeedbackSubject(e.target.value)}
                      placeholder="e.g., Performance Review, Recognition, Improvement Areas"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                      Feedback Content *
                    </label>
                    <textarea
                      value={feedbackContent}
                      onChange={(e) => setFeedbackContent(e.target.value)}
                      placeholder="Write your feedback here..."
                      rows={6}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>

                  <button
                    onClick={handleSendFeedback}
                    disabled={sending || selectedEmployees.length === 0 || !feedbackSubject || !feedbackContent}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: sending || selectedEmployees.length === 0 || !feedbackSubject || !feedbackContent
                        ? '#d1d5db'
                        : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: sending || selectedEmployees.length === 0 || !feedbackSubject || !feedbackContent ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      width: 'fit-content',
                    }}
                  >
                    <Send style={{ height: '16px', width: '16px' }} />
                    {sending
                      ? 'Sending...'
                      : selectedEmployees.length > 1
                        ? `Send to ${selectedEmployees.length} Employees`
                        : 'Send Feedback'}
                  </button>
                </div>
              </div>
            </div>

            {/* Performance Summary Panel (Director feature — shown when exactly 1 employee selected) */}
            {isDirector && selectedEmployees.length === 1 && (
              <div style={{ ...cardStyle, flex: '1 1 340px', minWidth: '0', alignSelf: 'flex-start' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp style={{ height: '18px', width: '18px', color: '#7c3aed' }} />
                    Performance Summary
                  </h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>This month</p>
                </div>
                <div style={{ padding: '20px' }}>
                  {loadingPerformance ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>
                      <div style={{
                        width: '28px', height: '28px',
                        border: '3px solid #e5e7eb', borderTopColor: '#7c3aed',
                        borderRadius: '50%', animation: 'spin 1s linear infinite',
                        margin: '0 auto 12px',
                      }} />
                      <p style={{ fontSize: '13px', margin: 0 }}>Loading performance...</p>
                    </div>
                  ) : employeePerformance ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Overall Score */}
                      <div style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: employeePerformance.overallAchievement >= 80
                          ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                          : employeePerformance.overallAchievement >= 50
                            ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                            : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                        textAlign: 'center',
                      }}>
                        <div style={{
                          fontSize: '36px', fontWeight: 700,
                          color: employeePerformance.overallAchievement >= 80 ? '#166534'
                            : employeePerformance.overallAchievement >= 50 ? '#92400e' : '#991b1b',
                        }}>
                          {Math.round(employeePerformance.overallAchievement)}%
                        </div>
                        <div style={{
                          fontSize: '13px', fontWeight: 500,
                          color: employeePerformance.overallAchievement >= 80 ? '#166534'
                            : employeePerformance.overallAchievement >= 50 ? '#92400e' : '#991b1b',
                        }}>
                          Overall Achievement
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          {employeePerformance.totalReports} report{employeePerformance.totalReports !== 1 ? 's' : ''} submitted
                        </div>
                      </div>

                      {/* Parameter Breakdown */}
                      {employeePerformance.parameters.filter(p => p.paramType !== 'text').length > 0 && (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>
                            Parameter Performance
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {employeePerformance.parameters
                              .filter(p => p.paramType !== 'text')
                              .map((param) => {
                                const pct = Math.min(param.achievementPct, 100);
                                const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
                                return (
                                  <div key={param.paramKey}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                      <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{param.paramLabel}</span>
                                      <span style={{ fontSize: '12px', fontWeight: 600, color }}>
                                        {Math.round(param.achievementPct)}%
                                      </span>
                                    </div>
                                    <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{
                                        width: `${pct}%`, height: '100%',
                                        backgroundColor: color, borderRadius: '3px',
                                        transition: 'width 0.3s ease',
                                      }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                        Actual: {param.totalActual}
                                      </span>
                                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                        Target: {param.totalTarget}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Quick feedback suggestions */}
                      <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: '#f5f3ff',
                        border: '1px solid #ede9fe',
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed', marginBottom: '8px' }}>
                          Quick Suggestions
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {['Performance Review', 'Recognition', 'Improvement Areas', 'Goal Setting', 'Training Needed'].map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => {
                                if (!feedbackSubject) setFeedbackSubject(suggestion);
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #ddd6fe',
                                backgroundColor: feedbackSubject === suggestion ? '#7c3aed' : '#ffffff',
                                color: feedbackSubject === suggestion ? '#ffffff' : '#6b7280',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>
                      <TrendingUp style={{ height: '32px', width: '32px', margin: '0 auto 8px', opacity: 0.4 }} />
                      <p style={{ fontSize: '13px', margin: 0 }}>No performance data available</p>
                      <p style={{ fontSize: '12px', margin: '4px 0 0' }}>This employee may not have submitted reports yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Multi-employee info panel */}
            {selectedEmployees.length > 1 && (
              <div style={{ ...cardStyle, flex: '1 1 340px', minWidth: '0', alignSelf: 'flex-start' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users style={{ height: '18px', width: '18px', color: '#7c3aed' }} />
                    Sending to {selectedEmployees.length} Employees
                  </h3>
                </div>
                <div style={{ padding: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                  {selectedEmployees.map((empId) => {
                    const emp = employees.find((e) => e.id === empId);
                    if (!emp) return null;
                    return (
                      <div
                        key={empId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#f5f3ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#7c3aed',
                          }}>
                            <User style={{ height: '14px', width: '14px' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: 0 }}>
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
                              {emp.role?.name || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeSelectedEmployee(empId)}
                          style={{
                            padding: '4px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#fef2f2',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <X style={{ height: '12px', width: '12px', color: '#ef4444' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Received Feedback */}
        {activeTab === 'my' && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                Feedback Received
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                Feedback you have received from HR and management
              </p>
            </div>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {myReceivedFeedbacks.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                  <MessageSquare style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No feedback received yet</p>
                </div>
              ) : (
                myReceivedFeedbacks.map((feedback: Feedback) => (
                  <div
                    key={feedback.id}
                    style={{
                      padding: '20px',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: '#f5f3ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#7c3aed',
                            }}
                          >
                            <User style={{ height: '16px', width: '16px' }} />
                          </div>
                          <div>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                              {feedback.from ? `${feedback.from.firstName} ${feedback.from.lastName}` : 'HR'}
                            </span>
                            <span
                              style={{
                                marginLeft: '12px',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#f5f3ff',
                                color: '#7c3aed',
                              }}
                            >
                              {feedback.subject}
                            </span>
                          </div>
                        </div>
                        <p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {feedback.content}
                        </p>
                      </div>
                      <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {new Date(feedback.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Submit Feedback Form (for all employees) */}
        {activeTab === 'submit' && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                Submit Feedback
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                Share your feedback about your manager, the company, or work environment
              </p>
            </div>
            <div style={{ padding: '24px' }}>
              {submitSuccess && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#dcfce7',
                    border: '1px solid #86efac',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '20px',
                  }}
                >
                  <CheckCircle style={{ height: '16px', width: '16px', color: '#16a34a' }} />
                  <span style={{ fontSize: '14px', color: '#16a34a', fontWeight: 500 }}>
                    Feedback submitted successfully!
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                    Feedback About *
                  </label>
                  <select
                    value={employeeFeedbackSubject}
                    onChange={(e) => setEmployeeFeedbackSubject(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Select a category...</option>
                    {FEEDBACK_SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                    Your Feedback *
                  </label>
                  <textarea
                    value={employeeFeedbackContent}
                    onChange={(e) => setEmployeeFeedbackContent(e.target.value)}
                    placeholder="Write your feedback here... Be honest and constructive."
                    rows={6}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    id="confidential"
                    checked={isConfidential}
                    onChange={(e) => setIsConfidential(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#7c3aed' }}
                  />
                  <label htmlFor="confidential" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield style={{ height: '16px', width: '16px', color: '#f59e0b' }} />
                      Keep this feedback confidential
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>
                      Confidential feedback will be visible only to HR leadership
                    </p>
                  </label>
                </div>

                <button
                  onClick={handleSubmitEmployeeFeedback}
                  disabled={submitting || !employeeFeedbackSubject || !employeeFeedbackContent}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: submitting || !employeeFeedbackSubject || !employeeFeedbackContent
                      ? '#d1d5db'
                      : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: submitting || !employeeFeedbackSubject || !employeeFeedbackContent ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    width: 'fit-content',
                  }}
                >
                  <Send style={{ height: '16px', width: '16px' }} />
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Submitted Feedback */}
        {activeTab === 'submitted' && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                My Submitted Feedback
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                Feedback you have submitted
              </p>
            </div>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {mySubmittedFeedbacks.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                  <MessageSquare style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>You haven&apos;t submitted any feedback yet</p>
                </div>
              ) : (
                mySubmittedFeedbacks.map((feedback: Feedback) => {
                  const config = subjectConfig[feedback.subject] || subjectConfig.Other;
                  return (
                    <div
                      key={feedback.id}
                      style={{
                        padding: '20px',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                backgroundColor: `${config.color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: config.color,
                              }}
                            >
                              {config.icon}
                            </div>
                            <div>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: `${config.color}15`,
                                  color: config.color,
                                }}
                              >
                                {feedback.subject}
                              </span>
                              {feedback.isConfidential && (
                                <span
                                  style={{
                                    marginLeft: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    backgroundColor: '#fef3c7',
                                    color: '#92400e',
                                  }}
                                >
                                  <Shield style={{ height: '10px', width: '10px' }} />
                                  Confidential
                                </span>
                              )}
                            </div>
                          </div>
                          <p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {feedback.content.length > 200 ? `${feedback.content.substring(0, 200)}...` : feedback.content}
                          </p>
                        </div>
                        <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                          {new Date(feedback.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
          }}
          onClick={() => setSelectedFeedback(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: '#f5f3ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7c3aed',
                  }}
                >
                  <MessageSquare style={{ height: '20px', width: '20px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                    Feedback Details
                  </h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    {new Date(selectedFeedback.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#f3f4f6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X style={{ height: '20px', width: '20px', color: '#6b7280' }} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(80vh - 80px)' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  From
                </label>
                <p style={{ fontSize: '14px', color: '#111827', margin: '4px 0 0' }}>
                  {selectedFeedback.from ? `${selectedFeedback.from.firstName} ${selectedFeedback.from.lastName}` : 'Anonymous'}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Subject
                </label>
                <p style={{ fontSize: '14px', color: '#111827', margin: '4px 0 0' }}>
                  {selectedFeedback.subject}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Feedback
                </label>
                <p style={{ fontSize: '14px', color: '#374151', margin: '8px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {selectedFeedback.content}
                </p>
              </div>

              {selectedFeedback.isConfidential && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fcd34d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Shield style={{ height: '16px', width: '16px', color: '#92400e' }} />
                  <span style={{ fontSize: '13px', color: '#92400e', fontWeight: 500 }}>
                    This feedback is marked as confidential
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}