'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onSearch?: (value: string) => void;
  debounceMs?: number;
}

export function SearchInput({
  onSearch,
  debounceMs = 300,
  placeholder,
  ...props
}: SearchInputProps) {
  const [value, setValue] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);
  const debounceRef = React.useRef<NodeJS.Timeout>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (onSearch) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearch(newValue);
      }, debounceMs);
    }
  };

  const handleClear = () => {
    setValue('');
    if (onSearch) {
      onSearch('');
    }
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <Search
        style={{
          position: 'absolute',
          left: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          height: '16px',
          width: '16px',
          color: '#9ca3af',
        }}
      />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        style={{
          height: '44px',
          width: '100%',
          borderRadius: '12px',
          border: isFocused ? '1px solid #a78bfa' : '1px solid #e5e7eb',
          backgroundColor: isFocused ? '#ffffff' : 'rgba(249, 250, 251, 0.5)',
          paddingLeft: '44px',
          paddingRight: '40px',
          fontSize: '14px',
          color: '#111827',
          outline: 'none',
          boxShadow: isFocused ? '0 0 0 3px rgba(167, 139, 250, 0.2)' : 'none',
          transition: 'all 0.2s',
        }}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X style={{ height: '16px', width: '16px' }} />
        </button>
      )}
    </div>
  );
}
