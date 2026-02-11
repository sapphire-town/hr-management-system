'use client';

import * as React from 'react';
import {
  DollarSign,
  Calendar,
  ChevronDown,
  FileText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Modal } from '@/components/ui/modal';
import { useAuthStore } from '@/store/auth-store';
import { payrollAPI } from '@/lib/api-client';
import { format } from 'date-fns';

interface Payslip {
  id: string;
  employeeId: string;
  month: string;
  baseSalary: number;
  workingDays: number;
  actualWorkingDays: number;
  unpaidLeaves: number;
  unapprovedAbsences: number;
  holidaySandwich: number;
  rewards: number;
  reimbursements: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  generatedAt: string;
  regeneratedAt: string | null;
  employee: {
    firstName: string;
    lastName: string;
    role: { name: string };
  };
}

export default function PayslipsPage() {
  const { user } = useAuthStore();
  const [payslips, setPayslips] = React.useState<Payslip[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isIntern, setIsIntern] = React.useState(false);
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear().toString());
  const [selectedPayslip, setSelectedPayslip] = React.useState<Payslip | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const response = await payrollAPI.getMyPayslips(selectedYear);
      // Handle new response format with isIntern flag
      if (response.data?.isIntern !== undefined) {
        setIsIntern(response.data.isIntern);
        setPayslips(response.data.payslips || []);
      } else {
        // Fallback for old format
        setPayslips(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching payslips:', error);
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPayslips();
  }, [selectedYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const viewPayslipDetails = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setDetailModalOpen(true);
  };

  // Calculate year totals
  const yearTotals = payslips.reduce(
    (acc, p) => ({
      totalEarned: acc.totalEarned + p.netPay,
      totalDeductions: acc.totalDeductions + p.deductions,
      totalRewards: acc.totalRewards + p.rewards,
    }),
    { totalEarned: 0, totalDeductions: 0, totalRewards: 0 }
  );

  return (
    <DashboardLayout
      title="My Payslips"
      description="View your salary and payment history"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Intern Notice */}
        {isIntern && !loading && (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1px solid #fbbf24',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <DollarSign style={{ width: 32, height: 32, color: '#92400e' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#92400e', margin: '0 0 8px 0' }}>
              Salary Slips Not Available for Interns
            </h3>
            <p style={{ fontSize: 14, color: '#a16207', margin: 0, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
              As an intern, you receive a stipend which is processed differently from regular salary. Please contact HR for any queries regarding your stipend payments.
            </p>
          </div>
        )}

        {/* Year Filter - Only show for non-interns */}
        {!isIntern && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar style={{ height: '20px', width: '20px', color: '#6b7280' }} />
            <span style={{ fontWeight: '500', color: '#374151' }}>Filter by Year</span>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                appearance: 'none',
                padding: '8px 36px 8px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                minWidth: '120px'
              }}
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              height: '16px',
              width: '16px',
              color: '#6b7280',
              pointerEvents: 'none'
            }} />
          </div>
        </div>
        )}

        {/* Year Summary - Only for non-interns */}
        {!isIntern && payslips.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '20px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <DollarSign style={{ height: '18px', width: '18px', opacity: 0.9 }} />
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Total Earned ({selectedYear})</p>
              </div>
              <p style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>
                {formatCurrency(yearTotals.totalEarned)}
              </p>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderLeft: '4px solid #ef4444'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <TrendingDown style={{ height: '18px', width: '18px', color: '#ef4444' }} />
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Total Deductions</p>
              </div>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#111827' }}>
                {formatCurrency(yearTotals.totalDeductions)}
              </p>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderLeft: '4px solid #22c55e'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <TrendingUp style={{ height: '18px', width: '18px', color: '#22c55e' }} />
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Total Rewards</p>
              </div>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#111827' }}>
                {formatCurrency(yearTotals.totalRewards)}
              </p>
            </div>
          </div>
        )}

        {/* Payslips List - Only for non-interns */}
        {!isIntern && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 20px 0' }}>
            Payslips for {selectedYear}
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Loading payslips...
            </div>
          ) : payslips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <FileText style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No payslips found for {selectedYear}</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                Payslips will appear here once generated by HR
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {payslips.map((payslip) => (
                <div
                  key={payslip.id}
                  onClick={() => viewPayslipDetails(payslip)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px',
                    background: '#f9fafb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '14px'
                    }}>
                      {format(new Date(payslip.month + '-01'), 'MMM').toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', color: '#111827', fontSize: '16px' }}>
                        {format(new Date(payslip.month + '-01'), 'MMMM yyyy')}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                        Generated on {format(new Date(payslip.generatedAt), 'PP')}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#22c55e' }}>
                      {formatCurrency(payslip.netPay)}
                    </p>
                    {payslip.deductions > 0 && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ef4444' }}>
                        -{formatCurrency(payslip.deductions)} deductions
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Payslip Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedPayslip(null);
        }}
        title="Payslip Details"
      >
        {selectedPayslip && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Month Header */}
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              color: 'white',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Payslip for</p>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700' }}>
                {format(new Date(selectedPayslip.month + '-01'), 'MMMM yyyy')}
              </h3>
            </div>

            {/* Earnings */}
            <div>
              <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#22c55e' }}>
                Earnings
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Base Salary</span>
                  <span style={{ fontWeight: '500' }}>{formatCurrency(selectedPayslip.baseSalary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Rewards</span>
                  <span style={{ fontWeight: '500', color: selectedPayslip.rewards > 0 ? '#22c55e' : '#374151' }}>
                    {formatCurrency(selectedPayslip.rewards)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Reimbursements</span>
                  <span style={{ fontWeight: '500' }}>{formatCurrency(selectedPayslip.reimbursements)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ fontWeight: '600' }}>Gross Pay</span>
                  <span style={{ fontWeight: '600', color: '#22c55e' }}>{formatCurrency(selectedPayslip.grossPay)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>
                Deductions
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedPayslip.unpaidLeaves > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Unpaid Leaves ({selectedPayslip.unpaidLeaves} days)</span>
                    <span style={{ fontWeight: '500', color: '#ef4444' }}>
                      -{formatCurrency(selectedPayslip.unpaidLeaves * (selectedPayslip.baseSalary / selectedPayslip.workingDays))}
                    </span>
                  </div>
                )}
                {selectedPayslip.unapprovedAbsences > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Unapproved Absences ({selectedPayslip.unapprovedAbsences} days)</span>
                    <span style={{ fontWeight: '500', color: '#ef4444' }}>
                      -{formatCurrency(selectedPayslip.unapprovedAbsences * (selectedPayslip.baseSalary / selectedPayslip.workingDays) * 2)}
                    </span>
                  </div>
                )}
                {selectedPayslip.holidaySandwich > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Holiday Sandwich ({selectedPayslip.holidaySandwich} days)</span>
                    <span style={{ fontWeight: '500', color: '#ef4444' }}>
                      -{formatCurrency(selectedPayslip.holidaySandwich * (selectedPayslip.baseSalary / selectedPayslip.workingDays))}
                    </span>
                  </div>
                )}
                {selectedPayslip.deductions === 0 && (
                  <p style={{ color: '#6b7280', fontStyle: 'italic', margin: 0 }}>No deductions this month</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ fontWeight: '600' }}>Total Deductions</span>
                  <span style={{ fontWeight: '600', color: '#ef4444' }}>{formatCurrency(selectedPayslip.deductions)}</span>
                </div>
              </div>
            </div>

            {/* Attendance Summary */}
            <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '10px' }}>
              <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
                Attendance Summary
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Working Days</p>
                  <p style={{ margin: '2px 0 0 0', fontWeight: '600', fontSize: '18px' }}>{selectedPayslip.workingDays}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Days Worked</p>
                  <p style={{ margin: '2px 0 0 0', fontWeight: '600', fontSize: '18px', color: '#22c55e' }}>
                    {selectedPayslip.actualWorkingDays}
                  </p>
                </div>
              </div>
            </div>

            {/* Net Pay */}
            <div style={{
              padding: '24px',
              background: '#f0fdf4',
              borderRadius: '12px',
              border: '2px solid #22c55e'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: '600', color: '#166534' }}>Net Pay</span>
                <span style={{ fontSize: '32px', fontWeight: '700', color: '#22c55e' }}>
                  {formatCurrency(selectedPayslip.netPay)}
                </span>
              </div>
            </div>

            {/* Generated Info */}
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
              Generated: {format(new Date(selectedPayslip.generatedAt), 'PPpp')}
            </p>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
