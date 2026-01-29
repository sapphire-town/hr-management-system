'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Custom Dialog implementation using React Portal with inline styles
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open: open ?? false, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}>({ open: false });

const useDialog = () => React.useContext(DialogContext);

function DialogTrigger({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = useDialog();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: () => onOpenChange?.(true),
    });
  }

  return (
    <button onClick={() => onOpenChange?.(true)} {...props}>
      {children}
    </button>
  );
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}

function DialogClose({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = useDialog();

  return (
    <button
      onClick={() => onOpenChange?.(false)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(4px)',
  zIndex: 9999,
};

const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ style, ...props }, ref) => {
  const { onOpenChange } = useDialog();

  return (
    <div
      ref={ref}
      style={{ ...overlayStyle, ...style }}
      onClick={() => onOpenChange?.(false)}
      {...props}
    />
  );
});
DialogOverlay.displayName = 'DialogOverlay';

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const contentStyle: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  width: '100%',
  maxWidth: '500px',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  border: '1px solid #e5e7eb',
  padding: '24px',
  zIndex: 10000,
  maxHeight: '90vh',
  overflow: 'auto',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: '16px',
  top: '16px',
  borderRadius: '8px',
  height: '32px',
  width: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#6b7280',
  transition: 'all 0.2s',
};

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, style, ...props }, ref) => {
    const { open, onOpenChange } = useDialog();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Handle escape key
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange?.(false);
        }
      };

      if (open) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }, [open, onOpenChange]);

    if (!open || !mounted) return null;

    return createPortal(
      <>
        <DialogOverlay />
        <div
          ref={ref}
          style={{ ...contentStyle, ...style }}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
          <button
            onClick={() => onOpenChange?.(false)}
            style={closeButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
            <span style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}>Close</span>
          </button>
        </div>
      </>,
      document.body
    );
  }
);
DialogContent.displayName = 'DialogContent';

const headerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  textAlign: 'left',
  marginBottom: '16px',
};

const DialogHeader = ({
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    style={{ ...headerStyle, ...style }}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const footerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'flex-end',
  gap: '8px',
  marginTop: '24px',
};

const DialogFooter = ({
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    style={{ ...footerStyle, ...style }}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.2',
  color: '#111827',
  margin: 0,
};

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ style, ...props }, ref) => (
  <h2
    ref={ref}
    style={{ ...titleStyle, ...style }}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

const descriptionStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: 0,
};

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ style, ...props }, ref) => (
  <p
    ref={ref}
    style={{ ...descriptionStyle, ...style }}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

// Simple Modal wrapper component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Modal,
};
