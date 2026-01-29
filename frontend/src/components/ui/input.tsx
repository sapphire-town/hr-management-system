import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const inputBaseStyle: React.CSSProperties = {
  display: 'flex',
  height: '48px',
  width: '100%',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#f9fafb',
  padding: '12px 16px',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.2s',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '8px',
};

const errorStyle: React.CSSProperties = {
  marginTop: '6px',
  fontSize: '14px',
  color: '#dc2626',
};

const iconContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  paddingLeft: '16px',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'none',
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, style, disabled, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);

    const combinedStyle: React.CSSProperties = {
      ...inputBaseStyle,
      ...(icon && { paddingLeft: '48px' }),
      ...(error && { borderColor: '#f87171' }),
      ...(focused && {
        borderColor: '#a78bfa',
        backgroundColor: '#ffffff',
        boxShadow: '0 0 0 3px rgba(167, 139, 250, 0.2)',
      }),
      ...(disabled && { cursor: 'not-allowed', opacity: 0.5 }),
      ...style,
    };

    return (
      <div style={{ width: '100%' }}>
        {label && <label style={labelStyle}>{label}</label>}
        <div style={{ position: 'relative' }}>
          {icon && <div style={iconContainerStyle}>{icon}</div>}
          <input
            type={type}
            style={combinedStyle}
            ref={ref}
            disabled={disabled}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
        </div>
        {error && <p style={errorStyle}>{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
