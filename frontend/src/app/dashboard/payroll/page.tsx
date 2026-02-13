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
  Sliders,
  Leaf,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface WorkingDaysConfig {
  month: string;
  workingDays: number;
  isCustom: boolean;
  notes?: string;
  overrides?: { employeeId: string; employeeName: string; workingDays: number }[];
}

interface LeaveBalance {
  employeeId: string;
  employeeName: string;
  role: string;
  sickBalance: number;
  casualBalance: number;
  earnedBalance: number;
  totalBalance: number;
  consecutiveWorkingDays: number;
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

  // Working Days Configuration state
  const [workingDaysConfig, setWorkingDaysConfig] = React.useState<WorkingDaysConfig | null>(null);
  const [workingDaysModalOpen, setWorkingDaysModalOpen] = React.useState(false);
  const [wdFormDays, setWdFormDays] = React.useState<number>(22);
  const [wdFormNotes, setWdFormNotes] = React.useState('');
  const [wdFormOverrides, setWdFormOverrides] = React.useState<{ employeeId: string; employeeName: string; workingDays: number }[]>([]);
  const [wdOverridesExpanded, setWdOverridesExpanded] = React.useState(false);
  const [savingWorkingDays, setSavingWorkingDays] = React.useState(false);

  // Tab state: 'payslips' | 'leave-balances'
  const [activeTab, setActiveTab] = React.useState<'payslips' | 'leave-balances'>('payslips');

  // Leave Balances state
  const [leaveBalances, setLeaveBalances] = React.useState<LeaveBalance[]>([]);
  const [leaveBalancesLoading, setLeaveBalancesLoading] = React.useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = React.useState(false);
  const [adjustTarget, setAdjustTarget] = React.useState<LeaveBalance | null>(null);
  const [adjustLeaveType, setAdjustLeaveType] = React.useState('SICK');
  const [adjustAmount, setAdjustAmount] = React.useState<number>(0);
  const [adjustReason, setAdjustReason] = React.useState('');
  const [savingAdjustment, setSavingAdjustment] = React.useState(false);

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

  const fetchWorkingDays = async () => {
    try {
      const response = await payrollAPI.getWorkingDays(monthString);
      setWorkingDaysConfig(response.data.data || response.data || null);
    } catch (error) {
      console.error('Error fetching working days config:', error);
      setWorkingDaysConfig(null);
    }
  };

  const fetchLeaveBalances = async () => {
    try {
      setLeaveBalancesLoading(true);
      const response = await payrollAPI.getLeaveBalances();
      setLeaveBalances(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching leave balances:', error);
      setLeaveBalances([]);
    } finally {
      setLeaveBalancesLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
    fetchWorkingDays();
  }, [monthString]);

  React.useEffect(() => {
    if (activeTab === 'leave-balances') {
      fetchLeaveBalances();
    }
  }, [activeTab]);

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

  // Working Days modal handlers
  const openWorkingDaysModal = () => {
    setWdFormDays(workingDaysConfig?.workingDays ?? 22);
    setWdFormNotes(workingDaysConfig?.notes ?? '');
    setWdFormOverrides(workingDaysConfig?.overrides ?? []);
    setWdOverridesExpanded(false);
    setWorkingDaysModalOpen(true);
  };

  const handleSaveWorkingDays = async () => {
    try {
      setSavingWorkingDays(true);
      await payrollAPI.setWorkingDays({
        month: monthString,
        workingDays: wdFormDays,
        notes: wdFormNotes || undefined,
        overrides: wdFormOverrides.length > 0 ? wdFormOverrides : undefined,
      });
      await fetchWorkingDays();
      setWorkingDaysModalOpen(false);
      alert('Working days configuration saved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save working days configuration');
    } finally {
      setSavingWorkingDays(false);
    }
  };

  const handleOverrideDaysChange = (index: number, value: number) => {
    setWdFormOverrides((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], workingDays: value };
      return updated;
    });
  };

  // Leave Balance adjust handlers
  const openAdjustModal = (balance: LeaveBalance) => {
    setAdjustTarget(balance);
    setAdjustLeaveType('Sick');
    setAdjustAmount(0);
    setAdjustReason('');
    setAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!adjustTarget) return;
    if (adjustAmount === 0) {
      alert('Adjustment amount cannot be zero.');
      return;
    }
    if (!adjustReason.trim()) {
      alert('Please provide a reason for the adjustment.');
      return;
    }

    try {
      setSavingAdjustment(true);
      await payrollAPI.adjustLeaveBalance(adjustTarget.employeeId, {
        leaveType: adjustLeaveType,
        adjustment: adjustAmount,
        reason: adjustReason.trim(),
      });
      await fetchLeaveBalances();
      setAdjustModalOpen(false);
      alert('Leave balance adjusted successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to adjust leave balance');
    } finally {
      setSavingAdjustment(false);
    }
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

        {/* Working Days Configuration Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #7c3aed'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sliders style={{ height: '20px', width: '20px', color: '#7c3aed' }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    Working Days for {format(currentDate, 'MMMM yyyy')}
                  </h4>
                  {workingDaysConfig ? (
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: workingDaysConfig.isCustom ? '#f3e8ff' : '#ecfdf5',
                      color: workingDaysConfig.isCustom ? '#7c3aed' : '#22c55e',
                    }}>
                      {workingDaysConfig.isCustom ? 'Custom' : 'Auto-calculated'}
                    </span>
                  ) : null}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                  {workingDaysConfig
                    ? `${workingDaysConfig.workingDays} working days${workingDaysConfig.notes ? ` - ${workingDaysConfig.notes}` : ''}`
                    : 'Loading configuration...'}
                  {workingDaysConfig?.overrides && workingDaysConfig.overrides.length > 0
                    ? ` (${workingDaysConfig.overrides.length} employee override${workingDaysConfig.overrides.length > 1 ? 's' : ''})`
                    : ''}
                </p>
              </div>
            </div>
            <Button onClick={openWorkingDaysModal} style={{ background: '#7c3aed' }}>
              <Sliders style={{ height: '14px', width: '14px', marginRight: '6px' }} />
              Set Working Days
            </Button>
          </div>
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

        {/* Tab Navigation: Payslips | Leave Balances */}
        <div style={{
          display: 'flex',
          gap: '0',
          borderBottom: '2px solid #e5e7eb',
        }}>
          <button
            onClick={() => setActiveTab('payslips')}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: activeTab === 'payslips' ? '600' : '400',
              color: activeTab === 'payslips' ? '#7c3aed' : '#6b7280',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'payslips' ? '2px solid #7c3aed' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <FileText style={{ height: '16px', width: '16px' }} />
            Payslips
          </button>
          <button
            onClick={() => setActiveTab('leave-balances')}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: activeTab === 'leave-balances' ? '600' : '400',
              color: activeTab === 'leave-balances' ? '#7c3aed' : '#6b7280',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'leave-balances' ? '2px solid #7c3aed' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <Leaf style={{ height: '16px', width: '16px' }} />
            Leave Balances
          </button>
        </div>

        {/* Payslips Tab Content */}
        {activeTab === 'payslips' && (
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
                  Click &quot;Generate Payslips&quot; to create payslips for all employees
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
        )}

        {/* Leave Balances Tab Content */}
        {activeTab === 'leave-balances' && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Leaf style={{ height: '20px', width: '20px', color: '#22c55e' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                Employee Leave Balances
              </h3>
            </div>

            {leaveBalancesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                Loading leave balances...
              </div>
            ) : leaveBalances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <Leaf style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No leave balance data available</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Employee Name</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Role</th>
                      <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Sick Balance</th>
                      <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Casual Balance</th>
                      <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Earned Balance</th>
                      <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Total</th>
                      <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Consecutive Working Days</th>
                      <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6b7280', fontWeight: '600', fontSize: '13px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveBalances.map((balance) => (
                      <tr key={balance.employeeId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '16px 8px', fontWeight: '500', color: '#111827' }}>
                          {balance.employeeName}
                        </td>
                        <td style={{ padding: '16px 8px', color: '#374151' }}>
                          {balance.role}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center', color: '#3b82f6', fontWeight: '500' }}>
                          {balance.sickBalance}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center', color: '#7c3aed', fontWeight: '500' }}>
                          {balance.casualBalance}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center', color: '#22c55e', fontWeight: '500' }}>
                          {balance.earnedBalance}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center', fontWeight: '700', color: '#111827' }}>
                          {balance.totalBalance}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center', color: '#374151' }}>
                          {balance.consecutiveWorkingDays}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => openAdjustModal(balance)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: '1px solid #7c3aed',
                              background: '#f5f3ff',
                              color: '#7c3aed',
                              fontWeight: '500',
                              fontSize: '13px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#7c3aed';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#f5f3ff';
                              e.currentTarget.style.color = '#7c3aed';
                            }}
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {/* Working Days Configuration Modal */}
      <Modal
        isOpen={workingDaysModalOpen}
        onClose={() => setWorkingDaysModalOpen(false)}
        title={`Set Working Days - ${format(currentDate, 'MMMM yyyy')}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <Label htmlFor="wd-days">Working Days</Label>
            <Input
              id="wd-days"
              type="number"
              min={1}
              max={31}
              value={wdFormDays}
              onChange={(e) => setWdFormDays(Number(e.target.value))}
              placeholder="e.g. 22"
            />
          </div>

          <div>
            <Label htmlFor="wd-notes">Notes (optional)</Label>
            <Input
              id="wd-notes"
              type="text"
              value={wdFormNotes}
              onChange={(e) => setWdFormNotes(e.target.value)}
              placeholder="e.g. Adjusted for company holiday"
            />
          </div>

          {/* Per-Employee Overrides - Expandable Section */}
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setWdOverridesExpanded(!wdOverridesExpanded)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#f9fafb',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}
            >
              <span>Per-Employee Overrides ({wdFormOverrides.length})</span>
              <ChevronRight
                style={{
                  height: '16px',
                  width: '16px',
                  transition: 'transform 0.2s',
                  transform: wdOverridesExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              />
            </button>
            {wdOverridesExpanded && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {wdFormOverrides.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
                    No per-employee overrides configured.
                  </p>
                ) : (
                  wdFormOverrides.map((override, index) => (
                    <div
                      key={override.employeeId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        background: '#f9fafb',
                        borderRadius: '8px'
                      }}
                    >
                      <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                        {override.employeeName}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={override.workingDays}
                        onChange={(e) => handleOverrideDaysChange(index, Number(e.target.value))}
                        style={{
                          width: '70px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '14px',
                          textAlign: 'center'
                        }}
                      />
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>days</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Save / Cancel buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <Button
              onClick={() => setWorkingDaysModalOpen(false)}
              style={{ background: '#f3f4f6', color: '#374151' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveWorkingDays}
              disabled={savingWorkingDays}
              style={{ background: '#7c3aed' }}
            >
              {savingWorkingDays ? 'Saving...' : 'Save Working Days'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave Balance Adjust Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => {
          setAdjustModalOpen(false);
          setAdjustTarget(null);
        }}
        title="Adjust Leave Balance"
      >
        {adjustTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Target employee info */}
            <div style={{ padding: '14px', background: '#f9fafb', borderRadius: '10px' }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                {adjustTarget.employeeName}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                {adjustTarget.role}
              </p>
            </div>

            {/* Current balances summary */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { label: 'Sick', value: adjustTarget.sickBalance, color: '#3b82f6' },
                { label: 'Casual', value: adjustTarget.casualBalance, color: '#7c3aed' },
                { label: 'Earned', value: adjustTarget.earnedBalance, color: '#22c55e' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#f9fafb',
                    border: `1px solid ${item.color}20`,
                  }}
                >
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{item.label}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700', color: item.color }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Leave type dropdown */}
            <div>
              <Label htmlFor="adjust-type">Leave Type</Label>
              <select
                id="adjust-type"
                value={adjustLeaveType}
                onChange={(e) => setAdjustLeaveType(e.target.value)}
                style={{
                  display: 'flex',
                  height: '48px',
                  width: '100%',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  padding: '12px 16px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box' as const,
                }}
              >
                <option value="SICK">Sick Leave</option>
                <option value="CASUAL">Casual Leave</option>
                <option value="EARNED">Earned Leave</option>
              </select>
            </div>

            {/* Adjustment amount */}
            <div>
              <Label htmlFor="adjust-amount">Adjustment (+/-)</Label>
              <Input
                id="adjust-amount"
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Number(e.target.value))}
                placeholder="e.g. 2 or -1"
              />
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Positive to add, negative to deduct
              </p>
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="adjust-reason">Reason</Label>
              <textarea
                id="adjust-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Reason for adjustment..."
                rows={3}
                style={{
                  display: 'flex',
                  width: '100%',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  padding: '12px 16px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box' as const,
                  resize: 'vertical' as const,
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Save / Cancel buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <Button
                onClick={() => {
                  setAdjustModalOpen(false);
                  setAdjustTarget(null);
                }}
                style={{ background: '#f3f4f6', color: '#374151' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAdjustment}
                disabled={savingAdjustment}
                style={{ background: '#7c3aed' }}
              >
                {savingAdjustment ? 'Saving...' : 'Save Adjustment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
