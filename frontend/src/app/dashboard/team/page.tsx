'use client';

import * as React from 'react';
import {
  Users,
  Mail,
  Crown,
  User,
  ChevronDown,
  ChevronRight,
  Circle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { employeeAPI } from '@/lib/api-client';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  user: {
    email: string;
    isActive: boolean;
  };
  role: {
    name: string;
  } | null;
}

// Group team members by role name
function groupByRole(members: TeamMember[]): Record<string, TeamMember[]> {
  const groups: Record<string, TeamMember[]> = {};
  for (const m of members) {
    const roleName = m.role?.name || 'Unassigned';
    if (!groups[roleName]) groups[roleName] = [];
    groups[roleName].push(m);
  }
  return groups;
}

// Avatar initials
function getInitials(first: string, last: string) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
}

// Consistent color from name
function getAvatarColor(name: string) {
  const colors = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function MyTeamPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [team, setTeam] = React.useState<TeamMember[]>([]);
  const [collapsedRoles, setCollapsedRoles] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await employeeAPI.getMyTeam();
        setTeam(res.data || []);
      } catch (err) {
        console.error('Failed to fetch team:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, []);

  const toggleRole = (role: string) => {
    setCollapsedRoles(prev => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const roleGroups = groupByRole(team);
  const roleNames = Object.keys(roleGroups).sort();
  const managerName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.email || 'Manager';
  const managerRoleName = user?.employee?.role?.name || 'Manager';

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  };

  if (loading) {
    return (
      <DashboardLayout title="My Team" description="View your team hierarchy">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>Loading team...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Team" description="Visual hierarchy of your team members and roles">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* === Org Chart Hierarchy === */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Manager Card (root) */}
          <div
            style={{
              ...cardStyle,
              padding: '24px 32px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              border: '2px solid #7c3aed',
              background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
              minWidth: '280px',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              <Crown style={{ width: '24px', height: '24px' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{managerName}</div>
              <div style={{ fontSize: '13px', color: '#7c3aed', fontWeight: 600 }}>{managerRoleName}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{user?.email}</div>
            </div>
            <div
              style={{
                marginLeft: 'auto',
                padding: '4px 12px',
                borderRadius: '8px',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {team.length} members
            </div>
          </div>

          {/* Vertical connector from manager */}
          {team.length > 0 && (
            <div style={{ width: '2px', height: '32px', backgroundColor: '#c4b5fd' }} />
          )}

          {/* Horizontal spread bar */}
          {roleNames.length > 1 && (
            <div style={{
              width: `${Math.min(roleNames.length * 280, 900)}px`,
              maxWidth: '100%',
              height: '2px',
              backgroundColor: '#c4b5fd',
            }} />
          )}

          {/* Role Groups */}
          {team.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0px',
              width: '100%',
              marginTop: roleNames.length > 1 ? '0px' : '0px',
            }}>
              {roleNames.map((roleName) => {
                const members = roleGroups[roleName];
                const isCollapsed = collapsedRoles.has(roleName);

                return (
                  <div
                    key={roleName}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '260px',
                      flex: '1 1 260px',
                      maxWidth: '360px',
                    }}
                  >
                    {/* Vertical connector to role group */}
                    <div style={{ width: '2px', height: '24px', backgroundColor: '#c4b5fd' }} />

                    {/* Role group header */}
                    <button
                      onClick={() => toggleRole(roleName)}
                      style={{
                        ...cardStyle,
                        padding: '12px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        border: '1px solid #ddd6fe',
                        backgroundColor: '#faf5ff',
                        width: '100%',
                        maxWidth: '280px',
                        textAlign: 'left',
                      }}
                    >
                      {isCollapsed
                        ? <ChevronRight style={{ width: '16px', height: '16px', color: '#7c3aed', flexShrink: 0 }} />
                        : <ChevronDown style={{ width: '16px', height: '16px', color: '#7c3aed', flexShrink: 0 }} />
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {roleName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {members.length} {members.length === 1 ? 'member' : 'members'}
                        </div>
                      </div>
                    </button>

                    {/* Members under this role */}
                    {!isCollapsed && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        {members.map((member, mIdx) => (
                          <div key={member.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                            {/* Connector line */}
                            <div style={{ width: '2px', height: '16px', backgroundColor: '#e5e7eb' }} />

                            {/* Member card */}
                            <div
                              style={{
                                ...cardStyle,
                                padding: '14px 18px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%',
                                maxWidth: '280px',
                                transition: 'box-shadow 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.15)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
                            >
                              {/* Avatar */}
                              <div
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '12px',
                                  backgroundColor: getAvatarColor(`${member.firstName} ${member.lastName}`),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {getInitials(member.firstName, member.lastName)}
                              </div>

                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {member.firstName} {member.lastName}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <Mail style={{ width: '11px', height: '11px', flexShrink: 0 }} />
                                  {member.user.email}
                                </div>
                              </div>

                              {/* Status dot */}
                              <Circle
                                style={{
                                  width: '10px',
                                  height: '10px',
                                  flexShrink: 0,
                                  fill: member.user.isActive ? '#22c55e' : '#d1d5db',
                                  color: member.user.isActive ? '#22c55e' : '#d1d5db',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {team.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <Users style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.4 }} />
              <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>No team members assigned</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Team members will appear here once they are assigned to you.</p>
            </div>
          )}
        </div>

        {/* === Team List Table === */}
        {team.length > 0 && (
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users style={{ width: '18px', height: '18px', color: '#7c3aed' }} />
                Team Directory
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    {['Employee', 'Role', 'Email', 'Status'].map(h => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '12px 16px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {team.map((member, idx) => (
                    <tr
                      key={member.id}
                      style={{
                        borderBottom: idx < team.length - 1 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '10px',
                              backgroundColor: getAvatarColor(`${member.firstName} ${member.lastName}`),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                          >
                            {getInitials(member.firstName, member.lastName)}
                          </div>
                          <span style={{ fontWeight: 500, color: '#111827' }}>
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: '#f5f3ff',
                          color: '#7c3aed',
                        }}>
                          {member.role?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280' }}>
                        {member.user.email}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: member.user.isActive ? '#dcfce7' : '#f3f4f6',
                          color: member.user.isActive ? '#166534' : '#6b7280',
                        }}>
                          <Circle style={{
                            width: '7px',
                            height: '7px',
                            fill: member.user.isActive ? '#22c55e' : '#9ca3af',
                            color: member.user.isActive ? '#22c55e' : '#9ca3af',
                          }} />
                          {member.user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
