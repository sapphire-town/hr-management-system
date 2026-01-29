'use client';

import * as React from 'react';
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
import { feedbackAPI, employeeAPI } from '@/lib/api-client';

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
  const [selectedEmployee, setSelectedEmployee] = React.useState('');
  const [feedbackSubject, setFeedbackSubject] = React.useState('');
  const [feedbackContent, setFeedbackContent] = React.useState('');
  const [sending, setSending] = React.useState(false);

  // Employee submit feedback form state
  const [employeeFeedbackSubject, setEmployeeFeedbackSubject] = React.useState('');
  const [employeeFeedbackContent, setEmployeeFeedbackContent] = React.useState('');
  const [isConfidential, setIsConfidential] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    // Set initial tab based on role
    if (isHR) {
      setActiveTab('received');
    }
  }, [isHR]);

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

  const handleSendFeedback = async () => {
    if (!selectedEmployee || !feedbackSubject || !feedbackContent) {
      return;
    }

    try {
      setSending(true);
      await feedbackAPI.submitHRFeedback({
        toId: selectedEmployee,
        subject: feedbackSubject,
        content: feedbackContent,
      });

      // Reset form
      setSelectedEmployee('');
      setFeedbackSubject('');
      setFeedbackContent('');

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
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                Send Feedback to Employee
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                Provide constructive feedback to help employees grow
              </p>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                    Select Employee *
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Choose an employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} - {emp.role?.name || 'N/A'}
                      </option>
                    ))}
                  </select>
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
                  disabled={sending || !selectedEmployee || !feedbackSubject || !feedbackContent}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: sending || !selectedEmployee || !feedbackSubject || !feedbackContent
                      ? '#d1d5db'
                      : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: sending || !selectedEmployee || !feedbackSubject || !feedbackContent ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    width: 'fit-content',
                  }}
                >
                  <Send style={{ height: '16px', width: '16px' }} />
                  {sending ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </div>
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