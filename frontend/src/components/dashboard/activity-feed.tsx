'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AvatarWithFallback } from '@/components/ui/avatar';

export interface Activity {
  id: string;
  type: 'leave' | 'attendance' | 'document' | 'performance' | 'reward' | 'general';
  title: string;
  description?: string;
  user?: {
    name: string;
    avatar?: string;
  };
  timestamp: Date | string;
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
}

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
  emptyMessage?: string;
  title?: string;
  subtitle?: string;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

const typeColors: Record<Activity['type'], { bg: string; text: string }> = {
  leave: { bg: '#dbeafe', text: '#1e40af' },
  attendance: { bg: '#dcfce7', text: '#166534' },
  document: { bg: '#f3e8ff', text: '#7c3aed' },
  performance: { bg: '#ffedd5', text: '#c2410c' },
  reward: { bg: '#fef3c7', text: '#92400e' },
  general: { bg: '#f3f4f6', text: '#374151' },
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#dcfce7', text: '#166534' },
  completed: { bg: '#dcfce7', text: '#166534' },
  rejected: { bg: '#fef2f2', text: '#dc2626' },
};

export function ActivityFeed({
  activities,
  loading = false,
  emptyMessage = 'No recent activities',
  title = 'Recent Activities',
  subtitle,
  maxItems,
  showViewAll = false,
  onViewAll,
}: ActivityFeedProps) {
  const displayedActivities = maxItems
    ? activities.slice(0, maxItems)
    : activities;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ fontWeight: 600, fontSize: '16px', margin: 0, color: '#111827' }}>{title}</h3>
        {subtitle && (
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', margin: '4px 0 0 0' }}>{subtitle}</p>
        )}
      </div>

      <div>
        {loading ? (
          <div style={{ padding: '16px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ height: '32px', width: '32px', backgroundColor: '#e5e7eb', borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: '14px', width: '60%', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ height: '12px', width: '40%', backgroundColor: '#e5e7eb', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : displayedActivities.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
            {emptyMessage}
          </div>
        ) : (
          displayedActivities.map((activity, index) => (
            <ActivityItem key={activity.id} activity={activity} isLast={index === displayedActivities.length - 1} />
          ))
        )}
      </div>

      {showViewAll && activities.length > 0 && (
        <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={onViewAll}
            style={{
              width: '100%',
              fontSize: '14px',
              color: '#7c3aed',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
            }}
          >
            View all activities
          </button>
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity, isLast }: { activity: Activity; isLast: boolean }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const timeAgo =
    typeof activity.timestamp === 'string'
      ? activity.timestamp
      : formatDistanceToNow(activity.timestamp, { addSuffix: true });

  const colors = typeColors[activity.type];
  const status = activity.status ? statusStyles[activity.status] : null;

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: isHovered ? '#f5f3ff' : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        {activity.user ? (
          <AvatarWithFallback
            fallback={activity.user.name}
            src={activity.user.avatar}
            size="sm"
          />
        ) : (
          <div
            style={{
              height: '32px',
              width: '32px',
              minWidth: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: colors.bg,
              color: colors.text,
            }}
          >
            {activity.type[0].toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, margin: 0, color: '#111827' }}>{activity.title}</p>
              {activity.description && (
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '2px', margin: '2px 0 0 0' }}>
                  {activity.description}
                </p>
              )}
            </div>
            {status && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor: status.bg,
                  color: status.text,
                  textTransform: 'capitalize',
                  flexShrink: 0,
                }}
              >
                {activity.status}
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', margin: '4px 0 0 0' }}>{timeAgo}</p>
        </div>
      </div>
    </div>
  );
}
