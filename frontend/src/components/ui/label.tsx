'use client';

import * as React from 'react';

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  lineHeight: 1,
  display: 'block',
  marginBottom: '6px',
  color: '#374151',
};

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ style, ...props }, ref) => (
  <label
    ref={ref}
    style={{ ...labelStyle, ...style }}
    {...props}
  />
));
Label.displayName = 'Label';

export { Label };