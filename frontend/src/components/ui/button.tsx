import * as React from 'react';

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  whiteSpace: 'nowrap',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'all 0.2s',
  cursor: 'pointer',
  border: 'none',
  outline: 'none',
};

const variantStyles: Record<string, React.CSSProperties> = {
  default: {
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.35)',
  },
  destructive: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.35)',
  },
  outline: {
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#374151',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },
  secondary: {
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#374151',
  },
  link: {
    backgroundColor: 'transparent',
    color: '#7c3aed',
    textDecoration: 'underline',
    textUnderlineOffset: '4px',
  },
};

const hoverStyles: Record<string, React.CSSProperties> = {
  default: { backgroundColor: '#6d28d9' },
  destructive: { backgroundColor: '#dc2626' },
  outline: { backgroundColor: '#f9fafb' },
  secondary: { backgroundColor: '#ddd6fe' },
  ghost: { backgroundColor: '#f5f3ff', color: '#7c3aed' },
  link: {},
};

const sizeStyles: Record<string, React.CSSProperties> = {
  default: { height: '40px', padding: '8px 16px' },
  sm: { height: '36px', padding: '8px 12px' },
  lg: { height: '48px', padding: '12px 32px' },
  icon: { height: '40px', width: '40px', padding: '0' },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', style, disabled, ...props }, ref) => {
    const [hovered, setHovered] = React.useState(false);

    const combinedStyle: React.CSSProperties = {
      ...baseStyle,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...(hovered && hoverStyles[variant]),
      ...(disabled && { pointerEvents: 'none', opacity: 0.5 }),
      ...style,
    };

    return (
      <button
        ref={ref}
        style={combinedStyle}
        disabled={disabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// For backward compatibility
const buttonVariants = () => '';

export { Button, buttonVariants };
