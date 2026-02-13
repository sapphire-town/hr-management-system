'use client';

import * as React from 'react';
import {
  Ticket,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { ticketAPI } from '@/lib/api-client';

interface TicketComment {
  id: string;
  employeeId: string;
  employeeName: string;
  comment: string;
  createdAt: string;
}

interface TicketData {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  createdBy: string;
  assignedTo: string;
  comments: TicketComment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  creator?: { firstName: string; lastName: string };
  assignee?: { firstName: string; lastName: string };
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  OPEN: { color: '#f59e0b', bg: '#fef3c7', icon: <AlertCircle style={{ height: '14px', width: '14px' }} />, label: 'Open' },
  IN_PROGRESS: { color: '#3b82f6', bg: '#dbeafe', icon: <Clock style={{ height: '14px', width: '14px' }} />, label: 'In Progress' },
  RESOLVED: { color: '#22c55e', bg: '#dcfce7', icon: <CheckCircle style={{ height: '14px', width: '14px' }} />, label: 'Resolved' },
  CLOSED: { color: '#6b7280', bg: '#f3f4f6', icon: <XCircle style={{ height: '14px', width: '14px' }} />, label: 'Closed' },
};

const CATEGORIES = ['General', 'IT Support', 'HR', 'Facilities', 'Payroll', 'Leave', 'Other'];

export default function TicketsPage() {
  const { user } = useAuthStore();
  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';
  const isManager = user?.role === 'MANAGER';

  const [activeTab, setActiveTab] = React.useState<'my' | 'assigned' | 'team' | 'all'>(isHR ? 'all' : isManager ? 'team' : 'my');
  const [myTickets, setMyTickets] = React.useState<TicketData[]>([]);
  const [assignedTickets, setAssignedTickets] = React.useState<TicketData[]>([]);
  const [teamTickets, setTeamTickets] = React.useState<TicketData[]>([]);
  const [allTickets, setAllTickets] = React.useState<TicketData[]>([]);
  const [allTicketsMeta, setAllTicketsMeta] = React.useState<{ total: number; page: number; totalPages: number }>({ total: 0, page: 1, totalPages: 1 });
  const [globalStats, setGlobalStats] = React.useState<TicketStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [expandedTicket, setExpandedTicket] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [allTicketsPage, setAllTicketsPage] = React.useState(1);

  // Create form state
  const [subject, setSubject] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('General');
  const [creating, setCreating] = React.useState(false);

  // Comment state
  const [commentText, setCommentText] = React.useState('');
  const [commenting, setCommenting] = React.useState(false);

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      const promises: Promise<any>[] = [
        ticketAPI.getMyTickets(),
        ticketAPI.getAssignedTickets(),
      ];
      if (isHR) {
        promises.push(ticketAPI.getAll({ page, limit: 50 }));
        promises.push(ticketAPI.getStatistics());
      }
      if (isManager) {
        promises.push(ticketAPI.getTeamTickets());
      }
      const results = await Promise.all(promises);
      setMyTickets(results[0].data || []);
      setAssignedTickets(results[1].data || []);

      if (isHR) {
        const allRes = results[2].data;
        setAllTickets(allRes?.data || allRes || []);
        if (allRes?.meta) {
          setAllTicketsMeta(allRes.meta);
        }
        const statsRes = results[3].data;
        if (statsRes) {
          setGlobalStats({
            total: statsRes.total || 0,
            open: statsRes.open || 0,
            inProgress: statsRes.inProgress || 0,
            resolved: statsRes.resolved || 0,
            closed: statsRes.closed || 0,
          });
        }
      }
      if (isManager) {
        setTeamTickets(results[2].data || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handlePageChange = async (newPage: number) => {
    setAllTicketsPage(newPage);
    try {
      const res = await ticketAPI.getAll({ page: newPage, limit: 50 });
      const allRes = res.data;
      setAllTickets(allRes?.data || allRes || []);
      if (allRes?.meta) {
        setAllTicketsMeta(allRes.meta);
      }
    } catch (error) {
      console.error('Error fetching page:', error);
    }
  };

  const handleCreate = async () => {
    if (!subject.trim() || !description.trim()) return;
    try {
      setCreating(true);
      await ticketAPI.create({ subject, description, category });
      setSubject('');
      setDescription('');
      setCategory('General');
      setShowCreateForm(false);
      await fetchData(allTicketsPage);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await ticketAPI.updateStatus(ticketId, newStatus);
      await fetchData(allTicketsPage);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleResolve = async (ticketId: string) => {
    try {
      await ticketAPI.resolve(ticketId);
      await fetchData(allTicketsPage);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to resolve ticket');
    }
  };

  const handleAddComment = async (ticketId: string) => {
    if (!commentText.trim()) return;
    try {
      setCommenting(true);
      await ticketAPI.addComment(ticketId, commentText);
      setCommentText('');
      await fetchData(allTicketsPage);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  const getActiveTickets = () => {
    let tickets: TicketData[] = [];
    if (activeTab === 'my') tickets = myTickets;
    else if (activeTab === 'assigned') tickets = assignedTickets;
    else if (activeTab === 'team') tickets = teamTickets;
    else tickets = allTickets;

    if (statusFilter !== 'all') {
      tickets = tickets.filter((t) => t.status === statusFilter);
    }
    return tickets;
  };

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
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
  };

  if (loading) {
    return (
      <DashboardLayout title="Tickets" description="Raise and track support tickets">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <p style={{ color: '#6b7280' }}>Loading tickets...</p>
        </div>
      </DashboardLayout>
    );
  }

  const activeTickets = getActiveTickets();

  // Stats: show system-wide for HR/Director, team for manager, personal for others
  const statsSource = isHR && globalStats ? {
    openCount: globalStats.open,
    inProgressCount: globalStats.inProgress,
    resolvedCount: globalStats.resolved,
    totalLabel: 'Total Tickets',
    totalCount: globalStats.total,
  } : isManager ? {
    openCount: teamTickets.filter((t) => t.status === 'OPEN').length,
    inProgressCount: teamTickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolvedCount: teamTickets.filter((t) => t.status === 'RESOLVED').length,
    totalLabel: 'Team Tickets',
    totalCount: teamTickets.length,
  } : {
    openCount: myTickets.filter((t) => t.status === 'OPEN').length,
    inProgressCount: myTickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolvedCount: myTickets.filter((t) => t.status === 'RESOLVED').length,
    totalLabel: 'Assigned to Me',
    totalCount: assignedTickets.length,
  };

  return (
    <DashboardLayout
      title="Tickets"
      description={isHR ? 'View and manage all employee tickets' : isManager ? 'View and manage team tickets' : 'Raise and track support tickets'}
      actions={
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
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
          }}
        >
          <Plus style={{ height: '16px', width: '16px' }} />
          Raise Ticket
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {[
            { label: isHR ? 'Open' : 'My Open', value: statsSource.openCount, color: '#f59e0b', icon: <AlertCircle /> },
            { label: 'In Progress', value: statsSource.inProgressCount, color: '#3b82f6', icon: <Clock /> },
            { label: 'Resolved', value: statsSource.resolvedCount, color: '#22c55e', icon: <CheckCircle /> },
            { label: statsSource.totalLabel, value: statsSource.totalCount, color: '#7c3aed', icon: isManager ? <Users /> : <Ticket /> },
          ].map((stat) => (
            <div key={stat.label} style={{ ...cardStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                {React.cloneElement(stat.icon as React.ReactElement, { style: { height: '22px', width: '22px' } })}
              </div>
              <div>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>{stat.value}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Create Ticket Form */}
        {showCreateForm && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>Raise New Ticket</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>Describe your issue and it will be assigned to the appropriate person</p>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Subject *</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief description of the issue" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Description *</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide detailed information about your issue..." rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleCreate} disabled={creating || !subject.trim() || !description.trim()} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', border: 'none',
                  background: creating || !subject.trim() || !description.trim() ? '#d1d5db' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  color: '#fff', fontSize: '14px', fontWeight: 600, cursor: creating || !subject.trim() || !description.trim() ? 'not-allowed' : 'pointer',
                }}>
                  <Send style={{ height: '16px', width: '16px' }} />
                  {creating ? 'Creating...' : 'Submit Ticket'}
                </button>
                <button onClick={() => setShowCreateForm(false)} style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs + Filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ ...cardStyle, padding: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button style={tabStyle(activeTab === 'my')} onClick={() => setActiveTab('my')}>My Tickets ({myTickets.length})</button>
            <button style={tabStyle(activeTab === 'assigned')} onClick={() => setActiveTab('assigned')}>Assigned to Me ({assignedTickets.length})</button>
            {isManager && (
              <button style={tabStyle(activeTab === 'team')} onClick={() => setActiveTab('team')}>Team ({teamTickets.length})</button>
            )}
            {isHR && (
              <button style={tabStyle(activeTab === 'all')} onClick={() => setActiveTab('all')}>All Tickets ({allTicketsMeta.total})</button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter style={{ height: '16px', width: '16px', color: '#6b7280' }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', background: '#fff' }}>
              <option value="all">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Tickets List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeTickets.length === 0 ? (
            <div style={{ ...cardStyle, padding: '60px', textAlign: 'center' }}>
              <Ticket style={{ height: '48px', width: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
              <p style={{ fontSize: '16px', fontWeight: 500, color: '#6b7280', margin: 0 }}>No tickets found</p>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0' }}>
                {activeTab === 'my' ? 'Click "Raise Ticket" to create your first ticket' :
                 activeTab === 'team' ? 'No tickets from your team members' :
                 activeTab === 'all' ? 'No tickets in the system yet' :
                 'No tickets assigned to you'}
              </p>
            </div>
          ) : (
            activeTickets.map((ticket) => {
              const config = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
              const isExpanded = expandedTicket === ticket.id;
              const comments = Array.isArray(ticket.comments) ? ticket.comments : [];

              return (
                <div key={ticket.id} style={cardStyle}>
                  {/* Ticket Header */}
                  <div
                    style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}
                    onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#111827' }}>{ticket.subject}</h4>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '9999px',
                          fontSize: '11px', fontWeight: 600, backgroundColor: config.bg, color: config.color,
                        }}>
                          {config.icon} {config.label}
                        </span>
                        <span style={{ padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 500, backgroundColor: '#f3f4f6', color: '#374151' }}>
                          {ticket.category}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                        {ticket.description.length > 120 ? `${ticket.description.substring(0, 120)}...` : ticket.description}
                      </p>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#9ca3af', flexWrap: 'wrap' }}>
                        <span>By: {ticket.creator ? `${ticket.creator.firstName} ${ticket.creator.lastName}` : 'Unknown'}</span>
                        <span>Assigned: {ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : 'Unassigned'}</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {comments.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MessageSquare style={{ height: '12px', width: '12px' }} /> {comments.length}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp style={{ height: '20px', width: '20px', color: '#9ca3af' }} /> : <ChevronDown style={{ height: '20px', width: '20px', color: '#9ca3af' }} />}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #e5e7eb' }}>
                      {/* Full Description */}
                      <div style={{ padding: '20px', backgroundColor: '#f9fafb' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase' }}>Description</p>
                        <p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
                      </div>

                      {/* Status Actions */}
                      {(() => {
                        const currentEmployeeId = user?.employee?.id;
                        const isAssignee = currentEmployeeId === ticket.assignedTo;
                        const isCreator = currentEmployeeId === ticket.createdBy;
                        const canAct = isAssignee || isHR;
                        // No actions for closed tickets at all
                        if (ticket.status === 'CLOSED') return null;
                        // For resolved tickets, only the creator or HR can close
                        if (ticket.status === 'RESOLVED') {
                          if (!isCreator && !isHR) return null;
                          return (
                            <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginRight: '8px' }}>Update Status:</span>
                              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, 'CLOSED'); }}
                                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #6b7280', backgroundColor: '#f3f4f6', color: '#374151', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                Close Ticket
                              </button>
                            </div>
                          );
                        }
                        // For OPEN/IN_PROGRESS tickets
                        if (!canAct) return null;
                        return (
                          <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginRight: '8px' }}>Update Status:</span>
                            {ticket.status === 'OPEN' && (
                              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, 'IN_PROGRESS'); }}
                                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #3b82f6', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                Mark In Progress
                              </button>
                            )}
                            {isAssignee && (
                              <button onClick={(e) => { e.stopPropagation(); handleResolve(ticket.id); }}
                                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #22c55e', backgroundColor: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                Resolve
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Resolved/Closed info banner */}
                      {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertCircle style={{ height: '14px', width: '14px', color: '#6b7280' }} />
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            This ticket is {ticket.status.toLowerCase().replace('_', ' ')}. Resolved/closed tickets cannot be reopened — please create a new ticket if needed.
                          </span>
                        </div>
                      )}

                      {/* Comments */}
                      <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', margin: '0 0 12px', textTransform: 'uppercase' }}>
                          Comments ({comments.length})
                        </p>
                        {comments.length === 0 ? (
                          <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px' }}>No comments yet</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                            {comments.map((c: TicketComment) => (
                              <div key={c.id} style={{ padding: '12px 16px', backgroundColor: '#f9fafb', borderRadius: '10px', borderLeft: '3px solid #7c3aed' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{c.employeeName}</span>
                                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(c.createdAt).toLocaleString()}</span>
                                </div>
                                <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.5 }}>{c.comment}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Add Comment */}
                        {ticket.status !== 'CLOSED' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              value={expandedTicket === ticket.id ? commentText : ''}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Write a comment..."
                              style={{ ...inputStyle, flex: 1 }}
                              onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) handleAddComment(ticket.id); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAddComment(ticket.id); }}
                              disabled={commenting || !commentText.trim()}
                              style={{
                                padding: '12px 16px', borderRadius: '10px', border: 'none',
                                background: commenting || !commentText.trim() ? '#d1d5db' : '#7c3aed',
                                color: '#fff', cursor: commenting || !commentText.trim() ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <Send style={{ height: '16px', width: '16px' }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination for All Tickets tab */}
        {activeTab === 'all' && allTicketsMeta.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '16px 0' }}>
            <button
              onClick={() => handlePageChange(allTicketsPage - 1)}
              disabled={allTicketsPage <= 1}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#fff',
                color: allTicketsPage <= 1 ? '#d1d5db' : '#374151', cursor: allTicketsPage <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500,
              }}
            >
              <ChevronLeft style={{ height: '16px', width: '16px' }} /> Previous
            </button>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              Page {allTicketsPage} of {allTicketsMeta.totalPages} ({allTicketsMeta.total} total)
            </span>
            <button
              onClick={() => handlePageChange(allTicketsPage + 1)}
              disabled={allTicketsPage >= allTicketsMeta.totalPages}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#fff',
                color: allTicketsPage >= allTicketsMeta.totalPages ? '#d1d5db' : '#374151', cursor: allTicketsPage >= allTicketsMeta.totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500,
              }}
            >
              Next <ChevronRight style={{ height: '16px', width: '16px' }} />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
