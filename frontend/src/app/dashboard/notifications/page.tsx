'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useNotificationStore, Notification } from '@/store/notification-store';
import { notificationAPI } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, setNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

  React.useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        const response = await notificationAPI.getMy();
        setNotifications(response.data);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [setNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      // Mark all unread notifications as read on backend
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(n => notificationAPI.markAsRead(n.id))
      );
      markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await notificationAPI.markAsRead(notification.id);
        markAsRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate based on notification type and metadata
    if (notification.metadata?.driveId) {
      router.push(`/dashboard/my-drives?driveId=${notification.metadata.driveId}`);
    }
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => !n.isRead);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INTERVIEWER_ASSIGNED':
      case 'STUDENT_ADDED':
      case 'DRIVE_UPDATE':
      case 'DRIVE_REMINDER':
        return '📅';
      case 'LEAVE_STATUS':
        return '🏖️';
      case 'DOCUMENT_RELEASED':
        return '📄';
      case 'TICKET_ASSIGNED':
        return '🎫';
      case 'PROMOTION':
      case 'REWARD':
        return '🎉';
      default:
        return '🔔';
    }
  };

  return (
    <DashboardLayout
      title="Notifications"
      description="View and manage your notifications"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck style={{ height: '16px', width: '16px', marginRight: '8px' }} />
              Mark all as read
            </Button>
          )}
        </div>
      }
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Filter tabs */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              color: filter === 'all' ? '#7c3aed' : '#6b7280',
              borderBottom: filter === 'all' ? '2px solid #7c3aed' : '2px solid transparent',
              fontWeight: filter === 'all' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              color: filter === 'unread' ? '#7c3aed' : '#6b7280',
              borderBottom: filter === 'unread' ? '2px solid #7c3aed' : '2px solid transparent',
              fontWeight: filter === 'unread' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications list */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Bell style={{ height: '48px', width: '48px', margin: '0 auto 16px', color: '#d1d5db' }} />
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              {filter === 'unread'
                ? 'All caught up! You have no unread notifications.'
                : 'When you receive notifications, they will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  padding: '16px',
                  cursor: notification.metadata?.driveId ? 'pointer' : 'default',
                  backgroundColor: notification.isRead ? 'white' : '#faf5ff',
                  borderLeft: notification.isRead ? '3px solid transparent' : '3px solid #7c3aed',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (notification.metadata?.driveId) {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                  {/* Icon */}
                  <div
                    style={{
                      fontSize: '24px',
                      flexShrink: 0,
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: notification.isRead ? '#f3f4f6' : '#ede9fe',
                      borderRadius: '8px',
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '8px' }}>
                      <div>
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: notification.isRead ? 500 : 600,
                            color: notification.isRead ? '#4b5563' : '#111827',
                            margin: '0 0 4px',
                          }}
                        >
                          {notification.subject}
                        </h3>
                        <p
                          style={{
                            fontSize: '14px',
                            color: '#6b7280',
                            margin: '0 0 8px',
                            lineHeight: 1.5,
                          }}
                        >
                          {notification.message}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          {notification.metadata?.collegeName && (
                            <>
                              <span style={{ color: '#d1d5db' }}>•</span>
                              <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 500 }}>
                                {notification.metadata.collegeName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#7c3aed',
                            flexShrink: 0,
                            marginTop: '4px',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
