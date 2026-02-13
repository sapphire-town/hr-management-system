'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { useAuthStore } from '@/store/auth-store';
import { rewardAPI } from '@/lib/api-client';
import { employeeAPI } from '@/lib/api-client';
import {
  Trophy,
  Plus,
  Search,
  Star,
  DollarSign,
  Award,
  Trash2,
  Edit2,
  Gift,
} from 'lucide-react';

// ==================== Types ====================

interface BadgeData {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

interface RewardData {
  id: string;
  employeeId: string;
  amount?: number;
  badgeId?: string;
  badgeName?: string;
  reason: string;
  awardedBy: string;
  awardDate: string;
  createdAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    role?: { name: string };
  };
  badge?: BadgeData;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  role?: { name: string };
}

interface RewardStats {
  totalRewards: number;
  totalMonetary: number;
  topEmployees: Array<{
    employee: EmployeeOption;
    rewardCount: number;
    totalAmount: number;
  }>;
  topBadges: Array<{
    badgeName: string;
    _count: number;
  }>;
}

interface EmployeeRewardsData {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    totalRewardsAmount: number;
  };
  rewards: RewardData[];
  badges: Array<{
    id?: string;
    name: string;
    icon?: string;
    color?: string;
    count: number;
  }>;
  totalMonetary: number;
  totalRewards: number;
}

// ==================== Default Badges (suggestions for creating) ====================

const DEFAULT_BADGE_SUGGESTIONS = [
  { name: 'Star Performer', icon: '⭐', color: '#f59e0b', description: 'Consistently exceeds expectations' },
  { name: 'Team Player', icon: '🤝', color: '#3b82f6', description: 'Outstanding collaboration' },
  { name: 'Innovator', icon: '💡', color: '#8b5cf6', description: 'Creative problem solving' },
  { name: 'Quick Learner', icon: '🚀', color: '#10b981', description: 'Rapid skill development' },
  { name: 'Mentor', icon: '🎓', color: '#6366f1', description: 'Guiding and supporting peers' },
  { name: 'Customer Hero', icon: '🦸', color: '#ec4899', description: 'Exceptional client service' },
  { name: 'Bug Buster', icon: '🐛', color: '#ef4444', description: 'Resolving critical issues' },
  { name: 'Leadership', icon: '👑', color: '#f97316', description: 'Leading by example' },
];

// ==================== Styles ====================

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e5e7eb',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const statCardStyle = (gradient: string): React.CSSProperties => ({
  background: gradient,
  borderRadius: '16px',
  padding: '20px 24px',
  color: '#ffffff',
  flex: 1,
  minWidth: '200px',
});

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left' as const,
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e5e7eb',
};

const tableCellStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: '14px',
  color: '#374151',
  borderBottom: '1px solid #f3f4f6',
};

const badgeChipStyle = (color?: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 14px',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 500,
  backgroundColor: color ? `${color}18` : '#f3f4f6',
  color: color || '#6b7280',
  border: `1px solid ${color ? `${color}30` : '#e5e7eb'}`,
});

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 500,
  border: 'none',
  borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
  backgroundColor: 'transparent',
  color: active ? '#7c3aed' : '#6b7280',
  cursor: 'pointer',
  transition: 'all 0.2s',
});

// ==================== Main Page Component ====================

export default function RewardsPage() {
  const { user } = useAuthStore();
  const isHR = user?.role === 'HR_HEAD';
  const isDirector = user?.role === 'DIRECTOR';
  const canManage = isHR;
  const canViewAll = isHR || isDirector;

  const [activeTab, setActiveTab] = useState<'rewards' | 'badges' | 'my-rewards'>(
    canManage ? 'rewards' : 'my-rewards'
  );

  return (
    <DashboardLayout>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
              {canManage ? 'Rewards & Badges' : 'My Rewards'}
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              {canManage
                ? 'Award rewards and manage badge library'
                : 'View your rewards and badge gallery'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        {canManage && (
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
            <button style={tabStyle(activeTab === 'rewards')} onClick={() => setActiveTab('rewards')}>
              Award Rewards
            </button>
            <button style={tabStyle(activeTab === 'badges')} onClick={() => setActiveTab('badges')}>
              Badge Library
            </button>
            <button style={tabStyle(activeTab === 'my-rewards')} onClick={() => setActiveTab('my-rewards')}>
              My Rewards
            </button>
          </div>
        )}

        {activeTab === 'rewards' && canManage && <HRRewardsView />}
        {activeTab === 'badges' && canManage && <BadgeLibraryView />}
        {activeTab === 'my-rewards' && <MyRewardsView employeeId={user?.employee?.id} />}
        {!canManage && activeTab !== 'my-rewards' && <MyRewardsView employeeId={user?.employee?.id} />}
      </div>
    </DashboardLayout>
  );
}

// ==================== HR Rewards View ====================

function HRRewardsView() {
  const [rewards, setRewards] = useState<RewardData[]>([]);
  const [stats, setStats] = useState<RewardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadRewards = useCallback(async () => {
    try {
      setLoading(true);
      const [rewardsRes, statsRes] = await Promise.all([
        rewardAPI.getAll({ page: page.toString(), limit: '20' }),
        rewardAPI.getStats(),
      ]);
      setRewards(rewardsRes.data.data || []);
      setTotalPages(rewardsRes.data.meta?.totalPages || 1);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load rewards:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) return;
    try {
      await rewardAPI.deleteReward(id);
      loadRewards();
    } catch (error) {
      console.error('Failed to delete reward:', error);
    }
  };

  const filteredRewards = rewards.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
    return name.includes(q) || (r.badgeName || '').toLowerCase().includes(q) || r.reason.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={statCardStyle('linear-gradient(135deg, #7c3aed, #a78bfa)')}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Rewards</div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>{stats.totalRewards}</div>
          </div>
          <div style={statCardStyle('linear-gradient(135deg, #059669, #34d399)')}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Monetary</div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>
              ₹{stats.totalMonetary.toLocaleString()}
            </div>
          </div>
          <div style={statCardStyle('linear-gradient(135deg, #2563eb, #60a5fa)')}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Top Employee</div>
            <div style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>
              {stats.topEmployees?.[0]?.employee
                ? `${stats.topEmployees[0].employee.firstName} ${stats.topEmployees[0].employee.lastName}`
                : 'N/A'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              {stats.topEmployees?.[0]?.rewardCount || 0} rewards
            </div>
          </div>
          <div style={statCardStyle('linear-gradient(135deg, #d97706, #fbbf24)')}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Top Badge</div>
            <div style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>
              {stats.topBadges?.[0]?.badgeName || 'N/A'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              {stats.topBadges?.[0]?._count || 0} awarded
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search by name, badge, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: '#f9fafb',
              }}
            />
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus style={{ width: '16px', height: '16px', marginRight: '6px' }} />
            Award Reward
          </Button>
        </div>
      </div>

      {/* Rewards Table */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
          Recent Rewards
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading...</div>
        ) : filteredRewards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <Gift style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.3 }} />
            <p>No rewards found</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Employee</th>
                    <th style={tableHeaderStyle}>Badge</th>
                    <th style={tableHeaderStyle}>Amount</th>
                    <th style={tableHeaderStyle}>Reason</th>
                    <th style={tableHeaderStyle}>Date</th>
                    <th style={tableHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRewards.map((reward) => (
                    <tr key={reward.id}>
                      <td style={tableCellStyle}>
                        <div style={{ fontWeight: 500 }}>
                          {reward.employee?.firstName} {reward.employee?.lastName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {reward.employee?.role?.name || ''}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        {reward.badgeName ? (
                          <span style={badgeChipStyle(reward.badge?.color)}>
                            {reward.badge?.icon || '🏅'} {reward.badgeName}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td style={tableCellStyle}>
                        {reward.amount ? (
                          <span style={{ fontWeight: 600, color: '#059669' }}>
                            ₹{reward.amount.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td style={{ ...tableCellStyle, maxWidth: '300px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {reward.reason}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        {new Date(reward.awardDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={tableCellStyle}>
                        <button
                          onClick={() => handleDelete(reward.id)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            color: '#ef4444',
                          }}
                          title="Delete reward"
                        >
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span style={{ padding: '8px 12px', fontSize: '14px', color: '#6b7280' }}>
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Reward Modal */}
      {showCreateModal && (
        <CreateRewardModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadRewards();
          }}
        />
      )}
    </div>
  );
}

// ==================== Create Reward Modal ====================

function CreateRewardModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('');
  const [customBadgeName, setCustomBadgeName] = useState('');
  const [reason, setReason] = useState('');
  const [awardDate, setAwardDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [empRes, badgeRes] = await Promise.all([
          employeeAPI.getAll(),
          rewardAPI.getAllBadges(),
        ]);
        const empList = empRes.data.data || empRes.data || [];
        setEmployees(empList);
        setBadges(badgeRes.data || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    if (!employeeSearch) return true;
    const q = employeeSearch.toLowerCase();
    return (
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
      (emp.role?.name || '').toLowerCase().includes(q)
    );
  });

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const data: any = {
        employeeId: selectedEmployee,
        reason: reason.trim(),
        awardDate,
      };
      if (amount && parseFloat(amount) > 0) {
        data.amount = parseFloat(amount);
      }
      if (selectedBadge) {
        data.badgeId = selectedBadge;
      } else if (customBadgeName.trim()) {
        data.badgeName = customBadgeName.trim();
      }

      await rewardAPI.create(data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create reward');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Award Reward">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Employee Selection */}
        <div>
          <Label>Employee *</Label>
          <input
            type="text"
            placeholder="Search employee..."
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#f9fafb',
              marginTop: '4px',
              boxSizing: 'border-box',
            }}
          />
          {employeeSearch && !selectedEmployee && (
            <div style={{
              maxHeight: '150px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              marginTop: '4px',
              backgroundColor: '#fff',
            }}>
              {filteredEmployees.slice(0, 8).map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmployee(emp.id);
                    setEmployeeSearch(`${emp.firstName} ${emp.lastName}`);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f3ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ fontWeight: 500 }}>{emp.firstName} {emp.lastName}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{emp.role?.name || ''}</div>
                </button>
              ))}
            </div>
          )}
          {selectedEmployee && (
            <button
              type="button"
              onClick={() => { setSelectedEmployee(''); setEmployeeSearch(''); }}
              style={{
                marginTop: '4px',
                fontSize: '12px',
                color: '#7c3aed',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Change employee
            </button>
          )}
        </div>

        {/* Badge Selection */}
        <div>
          <Label>Badge (optional)</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
            {badges.map((badge) => (
              <button
                key={badge.id}
                type="button"
                onClick={() => {
                  setSelectedBadge(selectedBadge === badge.id ? '' : badge.id);
                  setCustomBadgeName('');
                }}
                style={{
                  ...badgeChipStyle(selectedBadge === badge.id ? badge.color || '#7c3aed' : undefined),
                  cursor: 'pointer',
                  fontWeight: selectedBadge === badge.id ? 600 : 400,
                  border: selectedBadge === badge.id
                    ? `2px solid ${badge.color || '#7c3aed'}`
                    : '1px solid #e5e7eb',
                }}
              >
                {badge.icon || '🏅'} {badge.name}
              </button>
            ))}
          </div>
          {!selectedBadge && (
            <div style={{ marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Or type a custom badge name..."
                value={customBadgeName}
                onChange={(e) => setCustomBadgeName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <Label>Monetary Amount (optional)</Label>
          <div style={{ position: 'relative', marginTop: '4px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '14px' }}>₹</span>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              style={{
                width: '100%',
                padding: '10px 12px 10px 28px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: '#f9fafb',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <Label>Reason / Description *</Label>
          <textarea
            placeholder="Why is this reward being given?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              marginTop: '4px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Award Date */}
        <div>
          <Label>Award Date</Label>
          <Input
            type="date"
            value={awardDate}
            onChange={(e) => setAwardDate(e.target.value)}
            style={{ marginTop: '4px' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Awarding...' : 'Award Reward'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== Badge Library View ====================

function BadgeLibraryView() {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeData | null>(null);

  const loadBadges = useCallback(async () => {
    try {
      setLoading(true);
      const res = await rewardAPI.getAllBadges(true);
      setBadges(res.data || []);
    } catch (error) {
      console.error('Failed to load badges:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? If this badge is in use, it will be deactivated instead.')) return;
    try {
      await rewardAPI.deleteBadge(id);
      loadBadges();
    } catch (error) {
      console.error('Failed to delete badge:', error);
    }
  };

  return (
    <div>
      {/* Create from Suggestions */}
      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
            Quick Add Badges
          </h3>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus style={{ width: '16px', height: '16px', marginRight: '6px' }} />
            Custom Badge
          </Button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {DEFAULT_BADGE_SUGGESTIONS.map((suggestion) => {
            const exists = badges.some((b) => b.name === suggestion.name);
            return (
              <button
                key={suggestion.name}
                type="button"
                disabled={exists}
                onClick={async () => {
                  try {
                    await rewardAPI.createBadge({
                      name: suggestion.name,
                      icon: suggestion.icon,
                      color: suggestion.color,
                      description: suggestion.description,
                    });
                    loadBadges();
                  } catch (err) {
                    console.error('Failed to create badge:', err);
                  }
                }}
                style={{
                  ...badgeChipStyle(exists ? '#9ca3af' : suggestion.color),
                  cursor: exists ? 'default' : 'pointer',
                  opacity: exists ? 0.5 : 1,
                  fontSize: '14px',
                  padding: '8px 16px',
                }}
              >
                {suggestion.icon} {suggestion.name}
                {exists && ' ✓'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Badge Library */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
          Badge Library ({badges.length})
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading...</div>
        ) : badges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <Award style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.3 }} />
            <p>No badges yet. Create your first badge above!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {badges.map((badge) => (
              <div
                key={badge.id}
                style={{
                  borderRadius: '12px',
                  border: `1px solid ${badge.isActive ? '#e5e7eb' : '#fca5a5'}`,
                  padding: '16px',
                  backgroundColor: badge.isActive ? '#ffffff' : '#fef2f2',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '28px',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    backgroundColor: badge.color ? `${badge.color}18` : '#f3f4f6',
                  }}>
                    {badge.icon || '🏅'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>{badge.name}</div>
                    {!badge.isActive && (
                      <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 500 }}>INACTIVE</span>
                    )}
                  </div>
                </div>
                {badge.description && (
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px 0' }}>{badge.description}</p>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setEditingBadge(badge)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#6b7280',
                    }}
                  >
                    <Edit2 style={{ width: '12px', height: '12px' }} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(badge.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #fca5a5',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#ef4444',
                    }}
                  >
                    <Trash2 style={{ width: '12px', height: '12px' }} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Badge Modal */}
      {(showCreateModal || editingBadge) && (
        <BadgeFormModal
          badge={editingBadge}
          onClose={() => {
            setShowCreateModal(false);
            setEditingBadge(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingBadge(null);
            loadBadges();
          }}
        />
      )}
    </div>
  );
}

// ==================== Badge Form Modal ====================

function BadgeFormModal({
  badge,
  onClose,
  onSuccess,
}: {
  badge?: BadgeData | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(badge?.name || '');
  const [description, setDescription] = useState(badge?.description || '');
  const [icon, setIcon] = useState(badge?.icon || '');
  const [color, setColor] = useState(badge?.color || '#7c3aed');
  const [isActive, setIsActive] = useState(badge?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const ICON_OPTIONS = ['🏅', '⭐', '🏆', '💎', '🎯', '🚀', '💡', '🤝', '🎓', '👑', '🦸', '🐛', '🌟', '🔥', '💪', '🎖️'];

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Badge name is required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (badge) {
        await rewardAPI.updateBadge(badge.id, { name: name.trim(), description, icon, color, isActive });
      } else {
        await rewardAPI.createBadge({ name: name.trim(), description, icon, color });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save badge');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={badge ? 'Edit Badge' : 'Create Badge'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <div>
          <Label>Badge Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Star Performer" style={{ marginTop: '4px' }} />
        </div>

        <div>
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this badge represents" style={{ marginTop: '4px' }} />
        </div>

        <div>
          <Label>Icon</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {ICON_OPTIONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: icon === ic ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                  backgroundColor: icon === ic ? '#f5f3ff' : '#fff',
                  cursor: 'pointer',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Color</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} style={{ flex: 1 }} />
          </div>
        </div>

        {/* Preview */}
        <div>
          <Label>Preview</Label>
          <div style={{ marginTop: '6px' }}>
            <span style={badgeChipStyle(color)}>
              {icon || '🏅'} {name || 'Badge Name'}
            </span>
          </div>
        </div>

        {badge && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>Active</span>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : badge ? 'Update Badge' : 'Create Badge'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ==================== My Rewards View ====================

function MyRewardsView({ employeeId }: { employeeId?: string }) {
  const [data, setData] = useState<EmployeeRewardsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const res = await rewardAPI.getMyRewards();
        setData(res.data);
      } catch (error) {
        console.error('Failed to load rewards:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [employeeId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Loading your rewards...</div>
    );
  }

  if (!data || !employeeId) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
        <Trophy style={{ width: '64px', height: '64px', margin: '0 auto 16px', opacity: 0.3 }} />
        <p>No rewards data available</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={statCardStyle('linear-gradient(135deg, #7c3aed, #a78bfa)')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy style={{ width: '24px', height: '24px' }} />
            <span style={{ fontSize: '14px', opacity: 0.9 }}>Total Rewards</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>{data.totalRewards}</div>
        </div>
        <div style={statCardStyle('linear-gradient(135deg, #059669, #34d399)')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign style={{ width: '24px', height: '24px' }} />
            <span style={{ fontSize: '14px', opacity: 0.9 }}>Total Monetary</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>
            ₹{(data.totalMonetary || 0).toLocaleString()}
          </div>
        </div>
        <div style={statCardStyle('linear-gradient(135deg, #d97706, #fbbf24)')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star style={{ width: '24px', height: '24px' }} />
            <span style={{ fontSize: '14px', opacity: 0.9 }}>Badges Earned</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>{data.badges.length}</div>
        </div>
      </div>

      {/* Badge Gallery */}
      {data.badges.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
            Badge Gallery
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {data.badges.map((badge, idx) => (
              <div
                key={badge.id || idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: badge.color ? `${badge.color}08` : '#fafafa',
                  minWidth: '100px',
                }}
              >
                <span style={{
                  fontSize: '36px',
                  width: '56px',
                  height: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: badge.color ? `${badge.color}18` : '#f3f4f6',
                }}>
                  {badge.icon || '🏅'}
                </span>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827', textAlign: 'center' }}>
                  {badge.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: badge.color || '#7c3aed',
                  fontWeight: 500,
                  backgroundColor: badge.color ? `${badge.color}18` : '#f5f3ff',
                  padding: '2px 10px',
                  borderRadius: '10px',
                }}>
                  x{badge.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rewards History */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
          Rewards History
        </h3>
        {data.rewards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <Gift style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.3 }} />
            <p>No rewards yet. Keep up the great work!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.rewards.map((reward) => (
              <div
                key={reward.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #f3f4f6',
                  backgroundColor: '#fafafa',
                }}
              >
                <span style={{
                  fontSize: '28px',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  backgroundColor: reward.badge?.color ? `${reward.badge.color}18` : '#f5f3ff',
                  flexShrink: 0,
                }}>
                  {reward.badge?.icon || (reward.amount ? '💰' : '🏅')}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {reward.badgeName && (
                      <span style={badgeChipStyle(reward.badge?.color)}>
                        {reward.badgeName}
                      </span>
                    )}
                    {reward.amount && (
                      <span style={{
                        fontWeight: 600,
                        color: '#059669',
                        fontSize: '15px',
                      }}>
                        ₹{reward.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '14px', color: '#374151', margin: '4px 0 0 0' }}>
                    {reward.reason}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {new Date(reward.awardDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
