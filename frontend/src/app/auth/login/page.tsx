'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authAPI } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Mail, Lock, ArrowRight, Building2 } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, _hasHydrated } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      setError('');
      const response = await authAPI.login(data.email, data.password);

      if (response.data.access_token && response.data.user) {
        setAuth(response.data.user, response.data.access_token);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputBaseStyle: React.CSSProperties = {
    width: '100%',
    height: '48px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    padding: '0 16px 0 48px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
  };

  const inputFocusStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderColor: '#a78bfa',
    boxShadow: '0 0 0 3px rgba(167, 139, 250, 0.1)',
  };

  const inputErrorStyle: React.CSSProperties = {
    borderColor: '#f87171',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px',
        background: 'linear-gradient(180deg, #dbeafe 0%, #e9d5ff 50%, #fae8ff 100%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '40px',
          }}
        >
          {/* Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div
              style={{
                height: '80px',
                width: '80px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%)',
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)',
              }}
            >
              <Building2 style={{ height: '40px', width: '40px', color: 'white' }} strokeWidth={1.5} />
            </div>
          </div>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
              }}
            >
              HR Management System
            </h1>
            <p style={{ marginTop: '12px', color: '#6b7280', fontSize: '14px' }}>
              Sign in to your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    paddingLeft: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <Mail style={{ height: '20px', width: '20px', color: '#9ca3af' }} />
                </div>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  type="email"
                  placeholder="admin@example.com"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  style={{
                    ...inputBaseStyle,
                    ...(emailFocused ? inputFocusStyle : {}),
                    ...(errors.email ? inputErrorStyle : {}),
                  }}
                />
              </div>
              {errors.email && (
                <p style={{ marginTop: '6px', fontSize: '12px', color: '#dc2626' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    paddingLeft: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <Lock style={{ height: '20px', width: '20px', color: '#9ca3af' }} />
                </div>
                <input
                  {...register('password', {
                    required: 'Password is required',
                  })}
                  type="password"
                  placeholder="••••••••"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  style={{
                    ...inputBaseStyle,
                    ...(passwordFocused ? inputFocusStyle : {}),
                    ...(errors.password ? inputErrorStyle : {}),
                  }}
                />
              </div>
              {errors.password && (
                <p style={{ marginTop: '6px', fontSize: '12px', color: '#dc2626' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  marginBottom: '20px',
                  borderRadius: '12px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  padding: '12px 16px',
                }}
              >
                <p style={{ fontSize: '14px', color: '#b91c1c', margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%)',
                boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.35)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <>
                  <svg
                    style={{
                      height: '20px',
                      width: '20px',
                      animation: 'spin 1s linear infinite',
                    }}
                    viewBox="0 0 24 24"
                  >
                    <circle
                      style={{ opacity: 0.25 }}
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      style={{ opacity: 0.75 }}
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight style={{ height: '20px', width: '20px' }} />
                </>
              )}
            </button>
          </form>

          {/* Default Credentials */}
          <div
            style={{
              marginTop: '32px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid #f3f4f6',
            }}
          >
            <p
              style={{
                textAlign: 'center',
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '8px',
              }}
            >
              Test credentials (password: <span style={{ color: '#7c3aed', fontWeight: 500 }}>password123</span>)
            </p>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6' }}>
              <div><span style={{ color: '#7c3aed', fontWeight: 500 }}>hr@company.com</span> - HR Head</div>
              <div><span style={{ color: '#7c3aed', fontWeight: 500 }}>director@company.com</span> - Director</div>
              <div><span style={{ color: '#7c3aed', fontWeight: 500 }}>manager@company.com</span> - Manager</div>
              <div><span style={{ color: '#7c3aed', fontWeight: 500 }}>employee@company.com</span> - Employee</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add keyframes for spinner animation */}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
