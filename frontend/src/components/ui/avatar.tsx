'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

const sizeStyles = {
  sm: { height: '32px', width: '32px', fontSize: '12px' },
  md: { height: '40px', width: '40px', fontSize: '14px' },
  lg: { height: '48px', width: '48px', fontSize: '16px' },
  xl: { height: '64px', width: '64px', fontSize: '18px' },
};

export interface AvatarWithFallbackProps {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AvatarWithFallback({
  src,
  alt,
  fallback,
  size = 'md',
}: AvatarWithFallbackProps) {
  const initials = fallback
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeStyle = sizeStyles[size];

  return (
    <AvatarPrimitive.Root
      style={{
        position: 'relative',
        display: 'flex',
        ...sizeStyle,
        flexShrink: 0,
        overflow: 'hidden',
        borderRadius: '50%',
      }}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={alt || fallback}
          style={{
            aspectRatio: '1 / 1',
            height: '100%',
            width: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      <AvatarPrimitive.Fallback
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: '#ede9fe',
          color: '#7c3aed',
          fontWeight: 500,
          fontSize: sizeStyle.fontSize,
        }}
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

// Keep the original exports for compatibility
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ style, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    style={{
      position: 'relative',
      display: 'flex',
      height: '40px',
      width: '40px',
      flexShrink: 0,
      overflow: 'hidden',
      borderRadius: '50%',
      ...style,
    }}
    {...props}
  />
));
Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ style, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    style={{
      aspectRatio: '1 / 1',
      height: '100%',
      width: '100%',
      objectFit: 'cover',
      ...style,
    }}
    {...props}
  />
));
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ style, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    style={{
      display: 'flex',
      height: '100%',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      backgroundColor: '#ede9fe',
      color: '#7c3aed',
      fontWeight: 500,
      ...style,
    }}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
