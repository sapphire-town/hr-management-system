'use client';

import * as React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CalendarEvent {
  date: Date | string;
  type: 'present' | 'absent' | 'leave' | 'holiday' | 'half_day' | 'event';
  label?: string;
}

interface CalendarWidgetProps {
  events?: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  title?: string;
}

const eventColors: Record<CalendarEvent['type'], string> = {
  present: '#22c55e',
  absent: '#ef4444',
  leave: '#3b82f6',
  holiday: '#a855f7',
  half_day: '#eab308',
  event: '#f97316',
};

export function CalendarWidget({
  events = [],
  selectedDate,
  onDateSelect,
  title = 'Calendar',
}: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [hoveredDay, setHoveredDay] = React.useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date;
      return isSameDay(eventDate, date);
    });
  };

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const navButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '32px',
    width: '32px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#6b7280',
    transition: 'all 0.2s',
  };

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
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ fontWeight: 600, fontSize: '16px', margin: 0, color: '#111827' }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={goToPreviousMonth}
            style={navButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f3ff';
              e.currentTarget.style.color = '#7c3aed';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <ChevronLeft style={{ height: '18px', width: '18px' }} />
          </button>
          <button
            onClick={goToToday}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f5f3ff',
              color: '#7c3aed',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ede9fe';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f3ff';
            }}
          >
            {format(currentMonth, 'MMMM yyyy')}
          </button>
          <button
            onClick={goToNextMonth}
            style={navButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f3ff';
              e.currentTarget.style.color = '#7c3aed';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <ChevronRight style={{ height: '18px', width: '18px' }} />
          </button>
        </div>
      </div>

      {/* Calendar Body */}
      <div style={{ padding: '16px' }}>
        {/* Weekday headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            marginBottom: '8px',
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 600,
                color: '#9ca3af',
                padding: '8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
          }}
        >
          {days.map((day) => {
            const dayKey = day.toISOString();
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isDayToday = isToday(day);
            const isHovered = hoveredDay === dayKey;

            let backgroundColor = 'transparent';
            let textColor = isCurrentMonth ? '#111827' : '#d1d5db';

            if (isSelected) {
              backgroundColor = '#7c3aed';
              textColor = '#ffffff';
            } else if (isDayToday) {
              backgroundColor = '#ede9fe';
              textColor = '#7c3aed';
            } else if (isHovered && isCurrentMonth) {
              backgroundColor = '#f5f3ff';
            }

            // Check if day has events and use that color for background tint
            if (dayEvents.length > 0 && !isSelected) {
              const eventType = dayEvents[0].type;
              if (eventType === 'holiday') {
                backgroundColor = '#faf5ff';
                textColor = '#7c3aed';
              }
            }

            return (
              <button
                key={dayKey}
                onClick={() => onDateSelect?.(day)}
                onMouseEnter={() => setHoveredDay(dayKey)}
                onMouseLeave={() => setHoveredDay(null)}
                style={{
                  position: 'relative',
                  height: '44px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: isDayToday ? 700 : 500,
                  backgroundColor,
                  color: textColor,
                  border: 'none',
                  cursor: isCurrentMonth ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                }}
              >
                <span>{format(day, 'd')}</span>
                {dayEvents.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '3px',
                      position: 'absolute',
                      bottom: '4px',
                    }}
                  >
                    {dayEvents.slice(0, 3).map((event, idx) => (
                      <span
                        key={idx}
                        style={{
                          height: '6px',
                          width: '6px',
                          borderRadius: '50%',
                          backgroundColor: eventColors[event.type],
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {[
            { type: 'present', label: 'Present' },
            { type: 'absent', label: 'Absent' },
            { type: 'leave', label: 'Leave' },
            { type: 'holiday', label: 'Holiday' },
          ].map((item) => (
            <div
              key={item.type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  height: '10px',
                  width: '10px',
                  borderRadius: '50%',
                  backgroundColor: eventColors[item.type as CalendarEvent['type']],
                }}
              />
              <span style={{ fontSize: '13px', color: '#6b7280' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
