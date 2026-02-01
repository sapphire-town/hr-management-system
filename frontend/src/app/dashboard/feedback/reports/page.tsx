'use client';

import * as React from 'react';
import {
  BarChart3,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
  Building,
  Briefcase,
  Star,
  Search,
  X,
  Trash2,
  User,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { feedbackAPI, employeeAPI } from '@/lib/api-client';

interface FeedbackItem {
  id: string;
  subject: string;
  content: string;
  isConfidential: boolean;
  createdAt: string;
  from?: {
    id: string;
    firstName: string;
    lastName: string;
    role?: { name: string };
  };
  to?: {
    id: string;
    firstName: string;
    lastName: string;
    role?: { name: string };
  };
}

interface Statistics {
  total: number;
  bySubject: Record<string, number>;
  confidentialCount: number;
  recent: Array<{
    id: string;
    subject: string;
    content: string;
    createdAt: string;
    from?: { firstName: string; lastName: string };
  }>;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  user: { email: string };
  role: { name: string };
}

const subjectConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  Manager: { icon: <Briefcase style={{ height: '16px', width: '16px' }} />, color: '#7c3aed', bgColor: '#f5f3ff' },
  Company: { icon: <Building style={{ height: '16px', width: '16px' }} />, color: '#3b82f6', bgColor: '#dbeafe' },
  'HR Head': { icon: <Users style={{ height: '16px', width: '16px' }} />, color: '#f59e0b', bgColor: '#fef3c7' },
  Director: { icon: <Star style={{ height: '16px', width: '16px' }} />, color: '#ec4899', bgColor: '#fce7f3' },
  'Work Environment': { icon: <Building style={{ height: '16px', width: '16px' }} />, color: '#06b6d4', bgColor: '#cffafe' },
  Other: { icon: <MessageSquare style={{ height: '16px', width: '16px' }} />, color: '#6b7280', bgColor: '#f3f4f6' },
};

export default function FeedbackReportsPage() {
  const { user } = useAuthStore();
  const [statistics, setStatistics] = React.useState<Statistics | null>(null);
  const [feedbacks, setFeedbacks] = React.useState<FeedbackItem[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [subjectFilter, setSubjectFilter] = React.useState<string>('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedFeedback, setSelectedFeedback] = React.useState<FeedbackItem | null>(null);
  const [selectedEmployee, setSelectedEmployee] = React.useState<string>('all');
  const [expandedSubject, setExpandedSubject] = React.useState<string | null>(null);
  const [employeeFeedbacks, setEmployeeFeedbacks] = React.useState<FeedbackItem[]>([]);
  const [loadingEmployee, setLoadingEmployee] = React.useState(false);
  const [activeView, setActiveView] = React.useState<'overview' | 'all' | 'employee'>('overview');
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  React.useEffect(() => {
    if (isHR) {
      loadData();
    }
  }, [isHR]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, allRes, empRes] = await Promise.all([
        feedbackAPI.getStatistics(),
        feedbackAPI.getAll(),
        employeeAPI.getAll(),
      ]);
      setStatistics(statsRes.data);
      setFeedbacks(allRes.data?.data || allRes.data || []);
      setEmployees(empRes.data?.data || []);
    } catch (error) {
      console.error('Error loading feedback reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeFeedback = async (employeeId: string) => {
    try {
      setLoadingEmployee(true);
      const res = await feedbackAPI.getEmployeeFeedback(employeeId);
      setEmployeeFeedbacks(res.data || []);
    } catch (error) {
      console.error('Error loading employee feedback:', error);
      setEmployeeFeedbacks([]);
    } finally {
      setLoadingEmployee(false);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    if (employeeId !== 'all') {
      loadEmployeeFeedback(employeeId);
      setActiveView('employee');
    } else {
      setEmployeeFeedbacks([]);
      setActiveView('overview');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    try {
      setDeleting(id);
      await feedbackAPI.delete(id);
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
      setEmployeeFeedbacks((prev) => prev.filter((f) => f.id !== id));
      if (selectedFeedback?.id === id) setSelectedFeedback(null);
      loadData();
    } catch (error) {
      console.error('Error deleting feedback:', error);
    } finally {
      setDeleting(null);
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    const matchesSubject = subjectFilter === 'all' || f.subject === subjectFilter;
    const matchesSearch =
      searchTerm === '' ||
      f.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.from?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.from?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Calculate category breakdown percentages
  const totalFeedbackCount = statistics?.total || 0;
  const sortedSubjects = Object.entries(statistics?.bySubject || {}).sort(
    ([, a], [, b]) => b - a
  );

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
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 12px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
    paddingRight: '40px',
  };

  if (!isHR) {
    return (
      <DashboardLayout title="Feedback Reports" description="Access restricted">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <Shield style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
            <p style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Access Restricted</p>
            <p style={{ margin: 0 }}>This page is available to HR Head and Director only.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Feedback Reports" description="Analyze employee feedback">
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
            <p>Loading feedback reports...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Feedback Reports"
      description="Analyze and manage employee feedback across the organization"
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
        {/* Statistics Cards */}
        {statistics && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ ...cardStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed',
              }}>
                <MessageSquare style={{ height: '24px', width: '24px' }} />
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{statistics.total}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Total Feedback</p>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b',
              }}>
                <Shield style={{ height: '24px', width: '24px' }} />
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{statistics.confidentialCount}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Confidential</p>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6',
              }}>
                <BarChart3 style={{ height: '24px', width: '24px' }} />
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {Object.keys(statistics.bySubject).length}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Categories</p>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e',
              }}>
                <TrendingUp style={{ height: '24px', width: '24px' }} />
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {totalFeedbackCount > 0
                    ? Math.round((statistics.confidentialCount / totalFeedbackCount) * 100)
                    : 0}%
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Confidential Rate</p>
              </div>
            </div>
          </div>
        )}

        {/* View Tabs */}
        <div style={{ ...cardStyle, padding: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={tabStyle(activeView === 'overview')} onClick={() => { setActiveView('overview'); setSelectedEmployee('all'); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 style={{ height: '16px', width: '16px' }} />
              Overview
            </div>
          </button>
          <button style={tabStyle(activeView === 'all')} onClick={() => setActiveView('all')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare style={{ height: '16px', width: '16px' }} />
              All Feedback
            </div>
          </button>
          <button style={tabStyle(activeView === 'employee')} onClick={() => setActiveView('employee')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User style={{ height: '16px', width: '16px' }} />
              By Employee
            </div>
          </button>
        </div>

        {/* Overview Tab */}
        {activeView === 'overview' && statistics && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Category Breakdown */}
            <div style={cardStyle}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                  Feedback by Category
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                  Distribution of feedback across categories
                </p>
              </div>
              <div style={{ padding: '20px' }}>
                {sortedSubjects.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    <BarChart3 style={{ height: '40px', width: '40px', margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ margin: 0 }}>No feedback data yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {sortedSubjects.map(([subject, count]) => {
                      const config = subjectConfig[subject] || subjectConfig.Other;
                      const percentage = totalFeedbackCount > 0 ? Math.round((count / totalFeedbackCount) * 100) : 0;
                      return (
                        <div
                          key={subject}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpandedSubject(expandedSubject === subject ? null : subject)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                backgroundColor: config.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: config.color,
                              }}>
                                {config.icon}
                              </div>
                              <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>{subject}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{count}</span>
                              <span style={{ fontSize: '12px', color: '#9ca3af' }}>({percentage}%)</span>
                              {expandedSubject === subject ? (
                                <ChevronUp style={{ height: '14px', width: '14px', color: '#9ca3af' }} />
                              ) : (
                                <ChevronDown style={{ height: '14px', width: '14px', color: '#9ca3af' }} />
                              )}
                            </div>
                          </div>
                          <div style={{
                            height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', width: `${percentage}%`,
                              backgroundColor: config.color, borderRadius: '4px',
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Feedback */}
            <div style={cardStyle}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                  Recent Feedback
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                  Latest feedback received from employees
                </p>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {(statistics.recent || []).length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    <MessageSquare style={{ height: '40px', width: '40px', margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ margin: 0 }}>No recent feedback</p>
                  </div>
                ) : (
                  (statistics.recent || []).map((item) => {
                    const config = subjectConfig[item.subject] || subjectConfig.Other;
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '16px 20px',
                          borderBottom: '1px solid #f3f4f6',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        onClick={() => {
                          const full = feedbacks.find((f) => f.id === item.id);
                          if (full) setSelectedFeedback(full);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                            backgroundColor: config.bgColor, color: config.color,
                          }}>
                            {item.subject}
                          </span>
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 4px', lineHeight: 1.4 }}>
                          {item.content.length > 100 ? `${item.content.substring(0, 100)}...` : item.content}
                        </p>
                        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                          From: {item.from ? `${item.from.firstName} ${item.from.lastName}` : 'Anonymous'}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* All Feedback Tab */}
        {activeView === 'all' && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                  All Feedback ({filteredFeedbacks.length})
                </h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', height: '16px', width: '16px', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search feedback..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: '40px', width: '220px' }}
                    />
                  </div>
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    style={{ ...selectStyle, width: '180px' }}
                  >
                    <option value="all">All Categories</option>
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
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>From</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Content</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeedbacks.map((feedback) => {
                      const config = subjectConfig[feedback.subject] || subjectConfig.Other;
                      return (
                        <tr
                          key={feedback.id}
                          style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
                              }}>
                                <User style={{ height: '14px', width: '14px' }} />
                              </div>
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: 0 }}>
                                  {feedback.from ? `${feedback.from.firstName} ${feedback.from.lastName}` : 'Anonymous'}
                                </p>
                                {feedback.from?.role && (
                                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{feedback.from.role.name}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                                backgroundColor: config.bgColor, color: config.color,
                              }}>
                                {feedback.subject}
                              </span>
                              {feedback.isConfidential && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                                  padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 500,
                                  backgroundColor: '#fef3c7', color: '#92400e',
                                }}>
                                  <Shield style={{ height: '10px', width: '10px' }} />
                                  Confidential
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', maxWidth: '300px' }}>
                            <p style={{ fontSize: '13px', color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {feedback.content}
                            </p>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>
                              {new Date(feedback.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <button
                                onClick={() => setSelectedFeedback(feedback)}
                                style={{
                                  padding: '6px', borderRadius: '6px', border: 'none',
                                  backgroundColor: '#f3f4f6', cursor: 'pointer', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center',
                                }}
                                title="View details"
                              >
                                <Eye style={{ height: '14px', width: '14px', color: '#6b7280' }} />
                              </button>
                              <button
                                onClick={() => handleDelete(feedback.id)}
                                disabled={deleting === feedback.id}
                                style={{
                                  padding: '6px', borderRadius: '6px', border: 'none',
                                  backgroundColor: '#fef2f2', cursor: deleting === feedback.id ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  opacity: deleting === feedback.id ? 0.5 : 1,
                                }}
                                title="Delete"
                              >
                                <Trash2 style={{ height: '14px', width: '14px', color: '#ef4444' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* By Employee Tab */}
        {activeView === 'employee' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Employee Selector */}
            <div style={cardStyle}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Select Employee:</span>
                  </div>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    style={{ ...selectStyle, width: '300px' }}
                  >
                    <option value="all">Choose an employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} - {emp.role?.name || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Employee Feedback List */}
            {selectedEmployee !== 'all' && (
              <div style={cardStyle}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                    Feedback from {employees.find((e) => e.id === selectedEmployee)?.firstName}{' '}
                    {employees.find((e) => e.id === selectedEmployee)?.lastName}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                    {employeeFeedbacks.length} feedback submission{employeeFeedbacks.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {loadingEmployee ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    <div style={{
                      width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#7c3aed',
                      borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px',
                    }} />
                    <p style={{ margin: 0 }}>Loading...</p>
                  </div>
                ) : employeeFeedbacks.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                    <MessageSquare style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>No feedback from this employee</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {employeeFeedbacks.map((feedback) => {
                      const config = subjectConfig[feedback.subject] || subjectConfig.Other;
                      return (
                        <div
                          key={feedback.id}
                          style={{
                            padding: '20px',
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <div style={{
                                  width: '32px', height: '32px', borderRadius: '8px',
                                  backgroundColor: config.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: config.color,
                                }}>
                                  {config.icon}
                                </div>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                                  backgroundColor: config.bgColor, color: config.color,
                                }}>
                                  {feedback.subject}
                                </span>
                                {feedback.isConfidential && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                    padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 500,
                                    backgroundColor: '#fef3c7', color: '#92400e',
                                  }}>
                                    <Shield style={{ height: '10px', width: '10px' }} />
                                    Confidential
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {feedback.content}
                              </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                {new Date(feedback.createdAt).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handleDelete(feedback.id)}
                                disabled={deleting === feedback.id}
                                style={{
                                  padding: '6px', borderRadius: '6px', border: 'none',
                                  backgroundColor: '#fef2f2', cursor: deleting === feedback.id ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  opacity: deleting === feedback.id ? 0.5 : 1,
                                }}
                                title="Delete"
                              >
                                <Trash2 style={{ height: '14px', width: '14px', color: '#ef4444' }} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {selectedEmployee === 'all' && (
              <div style={{ ...cardStyle, padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                <Users style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                <p style={{ fontSize: '16px', fontWeight: 500, margin: '0 0 8px' }}>Select an employee</p>
                <p style={{ margin: 0 }}>Choose an employee from the dropdown to view their submitted feedback</p>
              </div>
            )}
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
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed',
                }}>
                  <MessageSquare style={{ height: '20px', width: '20px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>Feedback Details</h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    {new Date(selectedFeedback.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                style={{
                  padding: '8px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#f3f4f6', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X style={{ height: '20px', width: '20px', color: '#6b7280' }} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(80vh - 80px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>From</label>
                  <p style={{ fontSize: '14px', color: '#111827', margin: '4px 0 0', fontWeight: 500 }}>
                    {selectedFeedback.from ? `${selectedFeedback.from.firstName} ${selectedFeedback.from.lastName}` : 'Anonymous'}
                  </p>
                  {selectedFeedback.from?.role && (
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>{selectedFeedback.from.role.name}</p>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>To</label>
                  <p style={{ fontSize: '14px', color: '#111827', margin: '4px 0 0', fontWeight: 500 }}>
                    {selectedFeedback.to ? `${selectedFeedback.to.firstName} ${selectedFeedback.to.lastName}` : 'N/A'}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Category</label>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {(() => {
                    const config = subjectConfig[selectedFeedback.subject] || subjectConfig.Other;
                    return (
                      <span style={{
                        padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
                        backgroundColor: config.bgColor, color: config.color,
                      }}>
                        {selectedFeedback.subject}
                      </span>
                    );
                  })()}
                  {selectedFeedback.isConfidential && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500,
                      backgroundColor: '#fef3c7', color: '#92400e',
                    }}>
                      <Shield style={{ height: '12px', width: '12px' }} />
                      Confidential
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Content</label>
                <p style={{ fontSize: '14px', color: '#374151', margin: '8px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {selectedFeedback.content}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => {
                    handleDelete(selectedFeedback.id);
                  }}
                  disabled={deleting === selectedFeedback.id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', borderRadius: '10px', border: 'none',
                    backgroundColor: '#fef2f2', color: '#ef4444',
                    fontSize: '14px', fontWeight: 600,
                    cursor: deleting === selectedFeedback.id ? 'not-allowed' : 'pointer',
                    opacity: deleting === selectedFeedback.id ? 0.5 : 1,
                  }}
                >
                  <Trash2 style={{ height: '16px', width: '16px' }} />
                  {deleting === selectedFeedback.id ? 'Deleting...' : 'Delete Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
