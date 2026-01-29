'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const SelectContext = React.createContext<SelectContextValue>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
});

const useSelect = () => React.useContext(SelectContext);

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, triggerRef }}>
      {children}
    </SelectContext.Provider>
  );
}

const SelectGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value } = useSelect();
  return <span>{value || placeholder || 'Select...'}</span>;
};

const triggerStyle: React.CSSProperties = {
  display: 'flex',
  height: '48px',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#f9fafb',
  padding: '12px 16px',
  fontSize: '14px',
  cursor: 'pointer',
  outline: 'none',
  transition: 'all 0.2s',
  boxSizing: 'border-box',
};

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ children, style, ...props }, ref) => {
    const { open, setOpen, triggerRef } = useSelect();
    const [focused, setFocused] = React.useState(false);

    const combinedRef = (node: HTMLButtonElement) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    };

    const combinedStyle: React.CSSProperties = {
      ...triggerStyle,
      ...(focused && {
        borderColor: '#a78bfa',
        backgroundColor: '#ffffff',
        boxShadow: '0 0 0 3px rgba(167, 139, 250, 0.2)',
      }),
      ...style,
    };

    return (
      <button
        ref={combinedRef}
        type="button"
        onClick={() => setOpen(!open)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={combinedStyle}
        {...props}
      >
        {children}
        <ChevronDown style={{ width: '16px', height: '16px', color: '#9ca3af', flexShrink: 0 }} />
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

const contentStyle: React.CSSProperties = {
  position: 'absolute',
  zIndex: 10001,
  maxHeight: '300px',
  minWidth: '8rem',
  overflow: 'auto',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
  padding: '6px',
};

interface SelectContentProps {
  children: React.ReactNode;
}

const SelectContent = ({ children }: SelectContentProps) => {
  const { open, setOpen, triggerRef } = useSelect();
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 });
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [open, triggerRef]);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, setOpen, triggerRef]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={contentRef}
      style={{
        ...contentStyle,
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

const SelectLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '6px 32px 6px 8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
    {children}
  </div>
);

const itemStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  width: '100%',
  cursor: 'pointer',
  alignItems: 'center',
  borderRadius: '8px',
  padding: '10px 12px 10px 36px',
  fontSize: '14px',
  outline: 'none',
  transition: 'background-color 0.15s',
  border: 'none',
  backgroundColor: 'transparent',
  textAlign: 'left',
};

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const SelectItem = ({ value, children, disabled }: SelectItemProps) => {
  const { value: selectedValue, onValueChange, setOpen } = useSelect();
  const [hovered, setHovered] = React.useState(false);
  const isSelected = selectedValue === value;

  const handleClick = () => {
    if (disabled) return;
    onValueChange?.(value);
    setOpen(false);
  };

  const combinedStyle: React.CSSProperties = {
    ...itemStyle,
    ...(hovered && { backgroundColor: '#f5f3ff', color: '#7c3aed' }),
    ...(disabled && { pointerEvents: 'none', opacity: 0.5 }),
  };

  return (
    <button
      type="button"
      style={combinedStyle}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
    >
      <span style={{
        position: 'absolute',
        left: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
      }}>
        {isSelected && <Check style={{ width: '16px', height: '16px', color: '#7c3aed' }} />}
      </span>
      {children}
    </button>
  );
};

const SelectSeparator = () => (
  <div style={{ height: '1px', margin: '4px -6px', backgroundColor: '#e5e7eb' }} />
);

// These are no-op components for compatibility
const SelectScrollUpButton = () => null;
const SelectScrollDownButton = () => null;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
