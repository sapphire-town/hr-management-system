'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Users,
  TrendingDown,
  RefreshCw,
  Eye,
  FileText,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
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
    user: { email: string };
    role: { name: string };
  };
}

interface PayrollSummary {
  employeeCount: number;
  totalBaseSalary: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalRewards: number;
  totalReimbursements: number;
}

export default function PayrollPage() {
  const { user } = useAuthStore();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [payslips, setPayslips] = React.useState<Payslip[]>([]);
  const [summary, setSummary] = React.useState<PayrollSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [selectedPayslip, setSelectedPayslip] = React.useState<Payslip | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const monthString = `${year}-${String(month).padStart(2, '0')}`;

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await payrollAPI.getPayslipsByMonth(monthString);
      setPayslips(response.data.data || []);
      setSummary(response.data.summary || null);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      setPayslips([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [monthString]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleGeneratePayslips = async () => {
    if (!confirm(`Generate payslips for ${format(currentDate, 'MMMM yyyy')}? This will calculate payslips for all active employees.`)) {
      return;
    }

    try {
      setGenerating(true);
      await payrollAPI.generatePayslips(monthString);
      await fetchData();
      alert('Payslips generated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to generate payslips');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegeneratePayslip = async (id: string) => {
    if (!confirm('Regenerate this payslip? This will recalculate based on current data.')) {
      return;
    }

    try {
      await payrollAPI.regeneratePayslip(id);
      await fetchData();
      alert('Payslip regenerated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to regenerate payslip');
    }
  };

  const viewPayslipDetails = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setDetailModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout
      title="Payroll Management"
      description="Generate and manage employee payslips"
      actions={
        <Button onClick={handleGeneratePayslips} disabled={generating}>
          <FileText style={{ height: '16px', width: '16px', marginRight: '8px' }} />
          {generating ? 'Generating...' : 'Generate Payslips'}
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Month Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '16px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={handlePrevMonth}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft style={{ height: '20px', width: '20px' }} />
          </button>
          <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0, minWidth: '200px', textAlign: 'center' }}>
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <button
            onClick={handleNextMonth}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <ChevronRight style={{ height: '20px', width: '20px' }} />
          </button>
        </div>

        {/* Summary Stats */}
        {summary && summary.employeeCount > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {[
              { label: 'Employees', value: summary.employeeCount, color: '#3b82f6', icon: Users, isCurrency: false },
              { label: 'Total Net Pay', value: summary.totalNetPay, color: '#22c55e', icon: DollarSign, isCurrency: true },
              { label: 'Total Deductions', value: summary.totalDeductions, color: '#ef4444', icon: TrendingDown, isCurrency: true },
              { label: 'Total Rewards', value: summary.totalRewards, color: '#a855f7', icon: DollarSign, isCurrency: true },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${stat.color}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <stat.icon style={{ height: '18px', width: '18px', color: stat.color }} />
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{stat.label}</p>
                </div>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#111827' }}>
                  {stat.isCurrency ? formatCurrency(stat.value) : stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Payslips Table */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 20px 0' }}>
            Payslips for {format(currentDate, 'MMMM yyyy')}
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Loading payslips...
            </div>
          ) : payslips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <FileText style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No payslips generated for this month</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                Click "Generate Payslips" to create payslips for all employees
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Employee</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Role</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Base Salary</th>
                    <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Working Days</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Deductions</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Net Pay</th>
                    <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((payslip) => (
                    <tr key={payslip.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '16px 8px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: '500', color: '#111827' }}>
                            {payslip.employee.firstName} {payslip.employee.lastName}
                          </p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                            {payslip.employee.user.email}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', color: '#374151' }}>
                        {payslip.employee.role.name}
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right', color: '#374151' }}>
                        {formatCurrency(payslip.baseSalary)}
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                        <span style={{ color: '#22c55e', fontWeight: '500' }}>{payslip.actualWorkingDays}</span>
                        <span style={{ color: '#9ca3af' }}> / {payslip.workingDays}</span>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right', color: '#ef4444', fontWeight: '500' }}>
                        {formatCurrency(payslip.deductions)}
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right', color: '#22c55e', fontWeight: '600' }}>
                        {formatCurrency(payslip.netPay)}
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button
                            onClick={() => viewPayslipDetails(payslip)}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              background: 'white',
                              cursor: 'pointer'
                            }}
                            title="View Details"
                          >
                            <Eye style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                          </button>
                          <button
                            onClick={() => handleRegeneratePayslip(payslip.id)}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              background: 'white',
                              cursor: 'pointer'
                            }}
                            title="Regenerate"
                          >
                            <RefreshCw style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
            {/* Employee Info */}
            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                {selectedPayslip.employee.firstName} {selectedPayslip.employee.lastName}
              </h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                {selectedPayslip.employee.role.name} | {format(new Date(selectedPayslip.month + '-01'), 'MMMM yyyy')}
              </p>
            </div>

            {/* Earnings */}
            <div>
              <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#22c55e' }}>Earnings</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Base Salary</span>
                  <span style={{ fontWeight: '500' }}>{formatCurrency(selectedPayslip.baseSalary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Rewards</span>
                  <span style={{ fontWeight: '500' }}>{formatCurrency(selectedPayslip.rewards)}</span>
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
              <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>Deductions</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Unpaid Leaves ({selectedPayslip.unpaidLeaves} days)</span>
                  <span style={{ fontWeight: '500', color: '#ef4444' }}>
                    {formatCurrency(selectedPayslip.unpaidLeaves * (selectedPayslip.baseSalary / selectedPayslip.workingDays))}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Unapproved Absences ({selectedPayslip.unapprovedAbsences} days x2)</span>
                  <span style={{ fontWeight: '500', color: '#ef4444' }}>
                    {formatCurrency(selectedPayslip.unapprovedAbsences * (selectedPayslip.baseSalary / selectedPayslip.workingDays) * 2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Holiday Sandwich ({selectedPayslip.holidaySandwich} days)</span>
                  <span style={{ fontWeight: '500', color: '#ef4444' }}>
                    {formatCurrency(selectedPayslip.holidaySandwich * (selectedPayslip.baseSalary / selectedPayslip.workingDays))}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ fontWeight: '600' }}>Total Deductions</span>
                  <span style={{ fontWeight: '600', color: '#ef4444' }}>{formatCurrency(selectedPayslip.deductions)}</span>
                </div>
              </div>
            </div>

            {/* Working Days */}
            <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280' }}>Total Working Days</span>
                <span style={{ fontWeight: '500' }}>{selectedPayslip.workingDays}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Actual Days Worked</span>
                <span style={{ fontWeight: '500' }}>{selectedPayslip.actualWorkingDays}</span>
              </div>
            </div>

            {/* Net Pay */}
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: '500' }}>Net Pay</span>
                <span style={{ fontSize: '28px', fontWeight: '700' }}>{formatCurrency(selectedPayslip.netPay)}</span>
              </div>
            </div>

            {/* Generated Info */}
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
              Generated: {format(new Date(selectedPayslip.generatedAt), 'PPpp')}
              {selectedPayslip.regeneratedAt && (
                <> | Last Regenerated: {format(new Date(selectedPayslip.regeneratedAt), 'PPpp')}</>
              )}
            </p>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
