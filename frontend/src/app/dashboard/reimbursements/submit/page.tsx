'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Receipt,
  Upload,
  AlertCircle,
  IndianRupee,
  CheckCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { reimbursementAPI } from '@/lib/api-client';

const defaultCategories = [
  { value: 'travel', label: 'Travel', description: 'Flight, train, bus fares' },
  { value: 'food', label: 'Food & Meals', description: 'Business meals and refreshments' },
  { value: 'communication', label: 'Communication', description: 'Phone, internet bills' },
  { value: 'accommodation', label: 'Accommodation', description: 'Hotel stays' },
  { value: 'transport', label: 'Local Transport', description: 'Cab, auto, metro' },
  { value: 'medical', label: 'Medical', description: 'Medical expenses' },
  { value: 'training', label: 'Training & Certification', description: 'Courses, certifications' },
  { value: 'equipment', label: 'Equipment & Supplies', description: 'Office supplies' },
  { value: 'other', label: 'Other', description: 'Miscellaneous expenses' },
];

export default function SubmitReimbursementPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [categories, setCategories] = React.useState(defaultCategories);
  const [formData, setFormData] = React.useState({
    category: '',
    amount: '',
    expenseDate: '',
    description: '',
    receipt: null as File | null,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Fetch categories from backend
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await reimbursementAPI.getCategories();
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setCategories(res.data.map((cat: any) => ({
            value: cat.value || cat.name?.toLowerCase() || cat,
            label: cat.label || cat.name || cat,
            description: cat.description || '',
          })));
        }
      } catch (error) {
        // Use default categories if fetch fails
        console.log('Using default categories');
      }
    };
    fetchCategories();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.category) newErrors.category = 'Please select a category';
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (!formData.expenseDate) newErrors.expenseDate = 'Please select expense date';
    if (!formData.description.trim()) newErrors.description = 'Please provide a description';
    if (!formData.receipt) newErrors.receipt = 'Please upload a receipt';

    // Check if expense date is not in future
    if (formData.expenseDate && new Date(formData.expenseDate) > new Date()) {
      newErrors.expenseDate = 'Expense date cannot be in the future';
    }

    // Check if expense date is within 30 days
    if (formData.expenseDate) {
      const expDate = new Date(formData.expenseDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (expDate < thirtyDaysAgo) {
        newErrors.expenseDate = 'Claims must be submitted within 30 days of expense';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const submitData = new FormData();
      submitData.append('category', formData.category);
      submitData.append('amount', formData.amount);
      submitData.append('expenseDate', formData.expenseDate);
      submitData.append('description', formData.description);
      if (formData.receipt) {
        submitData.append('receipt', formData.receipt);
      }

      await reimbursementAPI.submit(submitData);
      router.push('/dashboard/reimbursements');
    } catch (error: any) {
      console.error('Error submitting claim:', error);
      setSubmitError(
        error.response?.data?.message ||
        'Failed to submit claim. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: '#ffffff',
    outline: 'none',
    transition: 'all 0.2s',
  };

  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: '#ef4444',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  };

  const errorTextStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '4px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    padding: '24px',
  };

  return (
    <DashboardLayout
      title="Submit Reimbursement"
      description="Submit a new expense claim"
      actions={
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            color: '#374151',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <ArrowLeft style={{ height: '16px', width: '16px' }} />
          Back
        </button>
      }
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 24px 0', color: '#111827' }}>
              Expense Details
            </h3>

            {/* Error Alert */}
            {submitError && (
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <AlertCircle style={{ height: '20px', width: '20px', color: '#ef4444', flexShrink: 0 }} />
                <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>{submitError}</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Category Selection */}
              <div>
                <label style={labelStyle}>
                  <Receipt style={{ height: '14px', width: '14px', display: 'inline', marginRight: '6px' }} />
                  Expense Category *
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: formData.category === cat.value ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                        backgroundColor: formData.category === cat.value ? '#f5f3ff' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: formData.category === cat.value ? '#7c3aed' : '#111827',
                          margin: 0,
                        }}
                      >
                        {cat.label}
                      </p>
                      {cat.description && (
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0 0' }}>
                          {cat.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
                {errors.category && <p style={errorTextStyle}>{errors.category}</p>}
              </div>

              {/* Amount and Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>
                    <IndianRupee style={{ height: '14px', width: '14px', display: 'inline', marginRight: '6px' }} />
                    Amount *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6b7280',
                        fontSize: '14px',
                      }}
                    >
                      ₹
                    </span>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      min="1"
                      step="0.01"
                      style={{
                        ...(errors.amount ? inputErrorStyle : inputStyle),
                        paddingLeft: '32px',
                      }}
                    />
                  </div>
                  {errors.amount && <p style={errorTextStyle}>{errors.amount}</p>}
                </div>

                <div>
                  <label style={labelStyle}>
                    <Calendar style={{ height: '14px', width: '14px', display: 'inline', marginRight: '6px' }} />
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    style={errors.expenseDate ? inputErrorStyle : inputStyle}
                  />
                  {errors.expenseDate && <p style={errorTextStyle}>{errors.expenseDate}</p>}
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details about the expense..."
                  rows={3}
                  style={{
                    ...(errors.description ? inputErrorStyle : inputStyle),
                    resize: 'vertical',
                    minHeight: '80px',
                  }}
                />
                {errors.description && <p style={errorTextStyle}>{errors.description}</p>}
              </div>

              {/* Receipt Upload */}
              <div>
                <label style={labelStyle}>
                  <Upload style={{ height: '14px', width: '14px', display: 'inline', marginRight: '6px' }} />
                  Receipt *
                </label>
                <div
                  style={{
                    border: errors.receipt ? '2px dashed #ef4444' : '2px dashed #e5e7eb',
                    borderRadius: '10px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFormData({ ...formData, receipt: e.target.files?.[0] || null })}
                    style={{ display: 'none' }}
                    id="receipt-upload"
                  />
                  <label htmlFor="receipt-upload" style={{ cursor: 'pointer' }}>
                    {formData.receipt ? (
                      <div>
                        <CheckCircle style={{ height: '32px', width: '32px', color: '#22c55e', margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '14px', color: '#22c55e', fontWeight: 500, margin: 0 }}>
                          {formData.receipt.name}
                        </p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                          Click to change file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Upload style={{ height: '32px', width: '32px', color: '#9ca3af', margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                          Click to upload receipt
                        </p>
                        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                          PDF, PNG, JPG up to 5MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                {errors.receipt && <p style={errorTextStyle}>{errors.receipt}</p>}
              </div>

              {/* Amount Summary */}
              {formData.amount && parseFloat(formData.amount) > 0 && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: '#f5f3ff',
                    border: '1px solid #e9d5ff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <IndianRupee style={{ height: '20px', width: '20px', color: '#7c3aed' }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#5b21b6', margin: 0 }}>
                      Claim Amount: ₹{parseFloat(formData.amount).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '12px', color: '#7c3aed', margin: 0, marginTop: '2px' }}>
                      {parseFloat(formData.amount) > 5000
                        ? 'Requires manager and HR approval'
                        : 'Requires manager approval'}
                    </p>
                  </div>
                </div>
              )}

              {/* Warning for high amounts */}
              {formData.amount && parseFloat(formData.amount) > 10000 && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <AlertCircle style={{ height: '20px', width: '20px', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#92400e', margin: 0 }}>
                      High value claim
                    </p>
                    <p style={{ fontSize: '12px', color: '#b45309', margin: 0, marginTop: '2px' }}>
                      Claims above ₹10,000 may require additional documentation
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => router.back()}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 32px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isSubmitting
                      ? '#d1d5db'
                      : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #ffffff',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                      Submitting...
                    </>
                  ) : (
                    'Submit Claim'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Guidelines */}
        <div
          style={{
            marginTop: '24px',
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', margin: 0, marginBottom: '12px' }}>
            Submission Guidelines
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280', fontSize: '13px', lineHeight: '1.8' }}>
            <li>Ensure the receipt clearly shows the date, amount, and vendor name</li>
            <li>For travel claims, include boarding passes or e-tickets</li>
            <li>Group related expenses into a single claim when possible</li>
            <li>Claims without proper receipts may be rejected</li>
            <li>Contact your manager if you have questions about eligible expenses</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
