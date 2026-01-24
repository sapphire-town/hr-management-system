'use client';

import * as React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  primary: {
    backgroundColor: '#ede9fe',
    color: '#6d28d9',
  },
  success: {
    backgroundColor: '#d1fae5',
    color: '#047857',
  },
  warning: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  destructive: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  outline: {
    backgroundColor: '#ffffff',
    color: '#7c3aed',
    border: '1px solid #ddd6fe',
  },
};

export function Badge({ variant = 'default', style, children, ...props }: BadgeProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '9999px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'all 0.2s',
    ...variantStyles[variant],
    ...style,
  };

  return (
    <span style={baseStyle} {...props}>
      {children}
    </span>
  );
}
