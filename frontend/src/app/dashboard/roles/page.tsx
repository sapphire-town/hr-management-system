'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Target,
  ArrowLeft,
  Check,
  AlertCircle,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { roleAPI } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- Type Definitions ---
interface DailyReportingParam {
  key: string;
  label: string;
  target: number;
  type: string;
  allowProof?: boolean;
}

interface ChartConfig {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area';
  metrics: string[];
  color: string;
}

interface PerformanceChartConfig {
  charts: ChartConfig[];
}

interface Role {
  id: string;
  name: string;
  dailyReportingParams: DailyReportingParam[];
  performanceChartConfig: PerformanceChartConfig;
  isActive: boolean;
  minimumRequired: number;
  createdAt: string;
  _count?: {
    employees: number;
  };
}

interface RoleStats {
  id: string;
  name: string;
  current: number;
  required: number;
  shortage: number;
  fulfillmentRate: number;
}

interface StatsSummary {
  totalEmployees: number;
  totalRequired: number;
  totalShortage: number;
  overallFulfillment: number;
}

// --- Constants ---
const CHART_COLORS = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6',
];

const PARAM_TYPES = [
  { value: 'number', label: 'Number' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'currency', label: 'Currency' },
  { value: 'text', label: 'Text' },
];

const CHART_TYPES: { value: ChartConfig['type']; label: string }[] = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'area', label: 'Area Chart' },
];

const getChartIcon = (type: string) => {
  const s = { width: 16, height: 16 };
  switch (type) {
    case 'bar': return <BarChart3 style={s} />;
    case 'line': return <LineChart style={s} />;
    case 'pie': return <PieChart style={s} />;
    case 'area': return <Activity style={s} />;
    default: return <BarChart3 style={s} />;
  }
};

const generateKey = (label: string): string => {
  return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

const generateChartId = (title: string): string => {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);
};

// --- Shared Styles ---
const thStyle: React.CSSProperties = {
  padding: '14px 20px',
  textAlign: 'center',
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  background: '#fff',
  cursor: 'pointer',
};

const badgeBase: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
};

export default function RolesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [stats, setStats] = React.useState<RoleStats[]>([]);
  const [summary, setSummary] = React.useState<StatsSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showRequirementModal, setShowRequirementModal] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Wizard state
  const [currentStep, setCurrentStep] = React.useState(1);
  const [formData, setFormData] = React.useState({
    name: '',
    isActive: true,
    dailyReportingParams: [] as DailyReportingParam[],
    performanceChartConfig: { charts: [] } as PerformanceChartConfig,
  });
  const [requirementValue, setRequirementValue] = React.useState('0');

  // Add param sub-form
  const [showAddParam, setShowAddParam] = React.useState(false);
  const [newParam, setNewParam] = React.useState<DailyReportingParam>({ key: '', label: '', target: 0, type: 'number', allowProof: false });
  const [editingParamIndex, setEditingParamIndex] = React.useState<number | null>(null);

  // Add chart sub-form
  const [showAddChart, setShowAddChart] = React.useState(false);
  const [newChart, setNewChart] = React.useState<ChartConfig>({ id: '', title: '', type: 'bar', metrics: [], color: CHART_COLORS[0] });

  const isDirector = user?.role === 'DIRECTOR';
  const isHRHead = user?.role === 'HR_HEAD';
  const canManageRoles = isDirector || isHRHead;

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, statsRes] = await Promise.all([
        roleAPI.getAll(),
        roleAPI.getStatistics(),
      ]);
      setRoles(rolesRes.data || []);
      const statsData = statsRes.data;
      if (statsData && statsData.roles) {
        setStats(statsData.roles);
        setSummary(statsData.summary);
      } else {
        setStats([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      name: '',
      isActive: true,
      dailyReportingParams: [],
      performanceChartConfig: { charts: [] },
    });
    setCurrentStep(1);
    setShowAddParam(false);
    setShowAddChart(false);
    setNewParam({ key: '', label: '', target: 0, type: 'number', allowProof: false });
    setNewChart({ id: '', title: '', type: 'bar', metrics: [], color: CHART_COLORS[0] });
    setEditingParamIndex(null);
  };

  const handleCreateRole = async () => {
    try {
      setSubmitting(true);
      await roleAPI.create({
        name: formData.name,
        dailyReportingParams: formData.dailyReportingParams,
        performanceChartConfig: formData.performanceChartConfig,
      });
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;
    try {
      setSubmitting(true);
      await roleAPI.update(selectedRole.id, {
        name: formData.name,
        dailyReportingParams: formData.dailyReportingParams,
        performanceChartConfig: formData.performanceChartConfig,
        isActive: formData.isActive,
      });
      setShowEditModal(false);
      setSelectedRole(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetRequirement = async () => {
    if (!selectedRole) return;
    try {
      setSubmitting(true);
      await roleAPI.setRequirements(selectedRole.id, parseInt(requirementValue) || 0);
      setShowRequirementModal(false);
      setSelectedRole(null);
      setRequirementValue('0');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update requirement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    try {
      setSubmitting(true);
      await roleAPI.delete(selectedRole.id);
      setShowDeleteConfirm(false);
      setSelectedRole(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete role');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    const params = Array.isArray(role.dailyReportingParams) ? role.dailyReportingParams : [];
    const chartConfig = role.performanceChartConfig?.charts
      ? { charts: [...role.performanceChartConfig.charts] }
      : { charts: [] };
    setFormData({
      name: role.name,
      isActive: role.isActive !== false,
      dailyReportingParams: [...params],
      performanceChartConfig: chartConfig,
    });
    setCurrentStep(1);
    setShowEditModal(true);
  };

  const openRequirementModal = (role: Role) => {
    setSelectedRole(role);
    setRequirementValue(role.minimumRequired?.toString() || '0');
    setShowRequirementModal(true);
  };

  const openDeleteConfirm = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteConfirm(true);
  };

  const handleToggleActive = async (role: Role) => {
    try {
      await roleAPI.update(role.id, { isActive: !(role.isActive !== false) });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update role status');
    }
  };

  // --- Param CRUD ---
  const addParam = () => {
    const key = newParam.key || generateKey(newParam.label);
    if (!newParam.label.trim()) return;
    if (formData.dailyReportingParams.some((p, i) => p.key === key && i !== editingParamIndex)) {
      alert('A parameter with this key already exists');
      return;
    }
    const param = { ...newParam, key };
    if (editingParamIndex !== null) {
      const updated = [...formData.dailyReportingParams];
      updated[editingParamIndex] = param;
      setFormData({ ...formData, dailyReportingParams: updated });
      setEditingParamIndex(null);
    } else {
      setFormData({ ...formData, dailyReportingParams: [...formData.dailyReportingParams, param] });
    }
    setNewParam({ key: '', label: '', target: 0, type: 'number', allowProof: false });
    setShowAddParam(false);
  };

  const editParam = (index: number) => {
    setNewParam({ ...formData.dailyReportingParams[index] });
    setEditingParamIndex(index);
    setShowAddParam(true);
  };

  const removeParam = (index: number) => {
    const removedKey = formData.dailyReportingParams[index].key;
    const updatedParams = formData.dailyReportingParams.filter((_, i) => i !== index);
    // Clean up chart metrics that reference the removed param
    const updatedCharts = formData.performanceChartConfig.charts.map(c => ({
      ...c,
      metrics: c.metrics.filter(m => m !== removedKey),
    }));
    setFormData({
      ...formData,
      dailyReportingParams: updatedParams,
      performanceChartConfig: { charts: updatedCharts },
    });
  };

  // --- Chart CRUD ---
  const addChart = () => {
    if (!newChart.title.trim()) return;
    if (newChart.metrics.length === 0) {
      alert('Select at least one metric for the chart');
      return;
    }
    const chart = { ...newChart, id: generateChartId(newChart.title) };
    setFormData({
      ...formData,
      performanceChartConfig: {
        charts: [...formData.performanceChartConfig.charts, chart],
      },
    });
    setNewChart({ id: '', title: '', type: 'bar', metrics: [], color: CHART_COLORS[0] });
    setShowAddChart(false);
  };

  const removeChart = (index: number) => {
    const updatedCharts = formData.performanceChartConfig.charts.filter((_, i) => i !== index);
    setFormData({ ...formData, performanceChartConfig: { charts: updatedCharts } });
  };

  const toggleChartMetric = (key: string) => {
    setNewChart(prev => ({
      ...prev,
      metrics: prev.metrics.includes(key) ? prev.metrics.filter(m => m !== key) : [...prev.metrics, key],
    }));
  };

  const getRoleStats = (roleId: string) => stats.find((s) => s.id === roleId);

  const totalEmployees = summary?.totalEmployees ?? stats.reduce((sum, s) => sum + s.current, 0);
  const totalRequired = summary?.totalRequired ?? stats.reduce((sum, s) => sum + s.required, 0);
  const totalDeficit = summary?.totalShortage ?? stats.reduce((sum, s) => sum + s.shortage, 0);

  // --- Step Indicator ---
  const steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Daily Parameters' },
    { num: 3, label: 'Performance Charts' },
  ];

  const renderStepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
      {steps.map((step, i) => (
        <React.Fragment key={step.num}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => {
              if (step.num === 1 || (step.num === 2 && formData.name.trim()) || (step.num === 3 && formData.name.trim())) {
                setCurrentStep(step.num);
              }
            }}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              background: currentStep === step.num ? '#7c3aed' : currentStep > step.num ? '#10b981' : '#e5e7eb',
              color: currentStep >= step.num ? '#fff' : '#9ca3af',
              transition: 'all 0.2s',
            }}>
              {currentStep > step.num ? <Check style={{ width: 16, height: 16 }} /> : step.num}
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: currentStep === step.num ? 600 : 400,
              color: currentStep === step.num ? '#7c3aed' : currentStep > step.num ? '#10b981' : '#6b7280',
            }}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: 40,
              height: 2,
              background: currentStep > step.num ? '#10b981' : '#e5e7eb',
              margin: '0 8px',
              transition: 'background 0.2s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // --- Step 1: Basic Info ---
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label>Role Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Sales Executive, Software Engineer"
          style={{ marginTop: 6 }}
        />
      </div>
      {showEditModal && (
        <div>
          <Label>Status</Label>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              style={{
                width: 48,
                height: 26,
                borderRadius: 13,
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                background: formData.isActive ? '#10b981' : '#d1d5db',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 3,
                left: formData.isActive ? 25 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
            <span style={{ fontSize: 14, color: formData.isActive ? '#059669' : '#6b7280', fontWeight: 500 }}>
              {formData.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  // --- Step 2: Daily Reporting Parameters ---
  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Daily Reporting Parameters</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Define what employees in this role should report daily</div>
        </div>
        {!showAddParam && (
          <button
            onClick={() => { setEditingParamIndex(null); setNewParam({ key: '', label: '', target: 0, type: 'number', allowProof: false }); setShowAddParam(true); }}
            style={{
              padding: '6px 14px',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add Parameter
          </button>
        )}
      </div>

      {formData.dailyReportingParams.length > 0 ? (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569' }}>Key</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569' }}>Label</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569' }}>Target</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569' }}>Type</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569' }}>Proof</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {formData.dailyReportingParams.map((param, index) => (
                <tr key={param.key} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{param.key}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{param.label}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: param.type === 'text' ? '#9ca3af' : '#7c3aed' }}>{param.type === 'text' ? '—' : param.target}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{ ...badgeBase, background: '#ede9fe', color: '#7c3aed' }}>
                      {param.type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{ ...badgeBase, background: param.allowProof ? '#dcfce7' : '#f1f5f9', color: param.allowProof ? '#166534' : '#9ca3af' }}>
                      {param.allowProof ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => editParam(index)} style={{ padding: 6, background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#475569' }}>
                        <Edit style={{ width: 14, height: 14 }} />
                      </button>
                      <button onClick={() => removeParam(index)} style={{ padding: 6, background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#dc2626' }}>
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !showAddParam ? (
        <div style={{ padding: 32, textAlign: 'center', background: '#f8fafc', borderRadius: 8, color: '#6b7280', fontSize: 14 }}>
          No parameters configured yet. Click "Add Parameter" to define daily reporting metrics.
        </div>
      ) : null}

      {/* Add/Edit Param Form */}
      {showAddParam && (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
            {editingParamIndex !== null ? 'Edit Parameter' : 'New Parameter'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 4 }}>Label *</label>
              <input
                value={newParam.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setNewParam({ ...newParam, label, key: generateKey(label) });
                }}
                placeholder="e.g., Calls Made"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 4 }}>Key</label>
              <input
                value={newParam.key}
                onChange={(e) => setNewParam({ ...newParam, key: e.target.value })}
                placeholder="Auto-generated"
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 4 }}>Type</label>
              <select
                value={newParam.type}
                onChange={(e) => setNewParam({ ...newParam, type: e.target.value, ...(e.target.value === 'text' ? { target: 0 } : {}) })}
                style={selectStyle}
              >
                {PARAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {newParam.type !== 'text' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 4 }}>Daily Target *</label>
                <input
                  type="number"
                  min="0"
                  value={newParam.target}
                  onChange={(e) => setNewParam({ ...newParam, target: parseInt(e.target.value) || 0 })}
                  style={inputStyle}
                />
              </div>
            )}
          </div>
          {/* Allow Proof Upload toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setNewParam({ ...newParam, allowProof: !newParam.allowProof })}
              style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                background: newParam.allowProof ? '#7c3aed' : '#d1d5db',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 3,
                left: newParam.allowProof ? 21 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer' }}
              onClick={() => setNewParam({ ...newParam, allowProof: !newParam.allowProof })}
            >
              Allow proof document upload
            </label>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>(optional for employees)</span>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              onClick={() => { setShowAddParam(false); setEditingParamIndex(null); setNewParam({ key: '', label: '', target: 0, type: 'number', allowProof: false }); }}
              style={{ padding: '6px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#475569' }}
            >
              Cancel
            </button>
            <button
              onClick={addParam}
              disabled={!newParam.label.trim()}
              style={{
                padding: '6px 16px',
                background: newParam.label.trim() ? '#7c3aed' : '#d1d5db',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: newParam.label.trim() ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {editingParamIndex !== null ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // --- Step 3: Performance Chart Config ---
  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Performance Chart Configuration</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Design charts to visualize this role's performance metrics</div>
        </div>
        {!showAddChart && formData.dailyReportingParams.length > 0 && (
          <button
            onClick={() => { setNewChart({ id: '', title: '', type: 'bar', metrics: [], color: CHART_COLORS[0] }); setShowAddChart(true); }}
            style={{
              padding: '6px 14px',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add Chart
          </button>
        )}
      </div>

      {formData.dailyReportingParams.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', background: '#fef3c7', borderRadius: 8, color: '#92400e', fontSize: 14 }}>
          <AlertCircle style={{ width: 20, height: 20, margin: '0 auto 8px', display: 'block' }} />
          Add daily reporting parameters in Step 2 first to configure chart metrics.
        </div>
      ) : formData.performanceChartConfig.charts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {formData.performanceChartConfig.charts.map((chart, index) => (
            <div key={chart.id || index} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 14,
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: chart.color + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: chart.color,
                }}>
                  {getChartIcon(chart.type)}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14, color: '#1e293b' }}>{chart.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ ...badgeBase, background: chart.color + '15', color: chart.color, fontSize: 11 }}>
                      {CHART_TYPES.find(t => t.value === chart.type)?.label || chart.type}
                    </span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      {chart.metrics.length} metric{chart.metrics.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => removeChart(index)} style={{ padding: 6, background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#dc2626' }}>
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ))}
        </div>
      ) : !showAddChart ? (
        <div style={{ padding: 32, textAlign: 'center', background: '#f8fafc', borderRadius: 8, color: '#6b7280', fontSize: 14 }}>
          No charts configured yet. Click "Add Chart" to create performance visualizations.
        </div>
      ) : null}

      {/* Add Chart Form */}
      {showAddChart && (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>New Chart</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 4 }}>Chart Title *</label>
                <input
                  value={newChart.title}
                  onChange={(e) => setNewChart({ ...newChart, title: e.target.value })}
                  placeholder="e.g., Sales Performance"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 4 }}>Chart Type</label>
                <select
                  value={newChart.type}
                  onChange={(e) => setNewChart({ ...newChart, type: e.target.value as ChartConfig['type'] })}
                  style={selectStyle}
                >
                  {CHART_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 6 }}>Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {CHART_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewChart({ ...newChart, color })}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: color,
                      border: newChart.color === color ? '3px solid #1e293b' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'border 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Metrics Selection */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 6 }}>
                Metrics (select parameters to include) *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {formData.dailyReportingParams.filter(p => p.type !== 'text').map(param => (
                  <label
                    key={param.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: newChart.metrics.includes(param.key) ? '#ede9fe' : '#fff',
                      borderRadius: 8,
                      border: `1px solid ${newChart.metrics.includes(param.key) ? '#7c3aed' : '#e5e7eb'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newChart.metrics.includes(param.key)}
                      onChange={() => toggleChartMetric(param.key)}
                      style={{ accentColor: '#7c3aed' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{param.label}</span>
                    <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>({param.key})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button
              onClick={() => { setShowAddChart(false); setNewChart({ id: '', title: '', type: 'bar', metrics: [], color: CHART_COLORS[0] }); }}
              style={{ padding: '6px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#475569' }}
            >
              Cancel
            </button>
            <button
              onClick={addChart}
              disabled={!newChart.title.trim() || newChart.metrics.length === 0}
              style={{
                padding: '6px 16px',
                background: newChart.title.trim() && newChart.metrics.length > 0 ? '#7c3aed' : '#d1d5db',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: newChart.title.trim() && newChart.metrics.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Add Chart
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // --- Wizard Modal (shared for Create and Edit) ---
  const isWizardOpen = showAddModal || showEditModal;
  const isEditing = showEditModal;
  const wizardTitle = isEditing ? 'Edit Role' : 'Create New Role';

  const renderWizardModal = () => (
    <Dialog open={isWizardOpen} onOpenChange={(open) => {
      if (!open) {
        if (showAddModal) setShowAddModal(false);
        if (showEditModal) setShowEditModal(false);
        resetForm();
      }
    }}>
      <DialogContent style={{ maxWidth: 700 }}>
        <DialogHeader>
          <DialogTitle>{wizardTitle}</DialogTitle>
        </DialogHeader>
        <div style={{ padding: '8px 0' }}>
          {renderStepIndicator()}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>
        <DialogFooter style={{ justifyContent: 'space-between' }}>
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                <ArrowLeft style={{ width: 14, height: 14, marginRight: 6 }} /> Back
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" onClick={() => {
              if (showAddModal) setShowAddModal(false);
              if (showEditModal) setShowEditModal(false);
              resetForm();
            }}>
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={currentStep === 1 && !formData.name.trim()}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={isEditing ? handleUpdateRole : handleCreateRole}
                disabled={submitting || !formData.name.trim()}
              >
                {submitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Role')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <DashboardLayout
      title="Role Management"
      description="Manage organizational roles and staffing requirements"
      actions={
        canManageRoles ? (
          <>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/employees')}
              style={{ marginRight: 8 }}
            >
              <ArrowLeft style={{ width: 16, height: 16, marginRight: 8 }} />
              Back to Employees
            </Button>
            <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
              <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
              Create Role
            </Button>
          </>
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            borderRadius: 16,
            padding: 24,
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users style={{ width: 24, height: 24 }} />
              </div>
              <div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>Total Roles</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{roles.length}</div>
              </div>
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            borderRadius: 16,
            padding: 24,
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check style={{ width: 24, height: 24 }} />
              </div>
              <div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>Filled Positions</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{totalEmployees} / {totalRequired || '-'}</div>
              </div>
            </div>
          </div>
          <div style={{
            background: totalDeficit > 0
              ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
              : 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
            borderRadius: 16,
            padding: 24,
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {totalDeficit > 0 ? <AlertCircle style={{ width: 24, height: 24 }} /> : <Target style={{ width: 24, height: 24 }} />}
              </div>
              <div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>
                  {totalDeficit > 0 ? 'Hiring Deficit' : 'Staffing Status'}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>
                  {totalDeficit > 0 ? `-${totalDeficit}` : 'Optimal'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Roles Table */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              All Roles & Staffing Requirements
            </h3>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              Loading roles...
            </div>
          ) : roles.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              No roles defined yet. Create your first role to get started.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Role Name</th>
                    <th style={thStyle}>Current Employees</th>
                    <th style={thStyle}>Minimum Required</th>
                    <th style={thStyle}>Parameters</th>
                    <th style={thStyle}>Charts</th>
                    <th style={thStyle}>Active</th>
                    <th style={thStyle}>Status</th>
                    {canManageRoles && (
                      <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => {
                    const roleStat = getRoleStats(role.id);
                    const currentCount = roleStat?.current ?? role._count?.employees ?? 0;
                    const minRequired = roleStat?.required ?? role.minimumRequired ?? 0;
                    const shortage = roleStat?.shortage ?? (minRequired > 0 ? Math.max(0, minRequired - currentCount) : 0);
                    const isDeficit = shortage > 0;
                    const isSurplus = currentCount > minRequired && minRequired > 0;
                    const paramCount = Array.isArray(role.dailyReportingParams) ? role.dailyReportingParams.length : 0;
                    const chartCount = role.performanceChartConfig?.charts?.length || 0;
                    const isActive = role.isActive !== false;

                    return (
                      <tr
                        key={role.id}
                        style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#faf5ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: 10,
                              background: isActive ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#d1d5db',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 600, fontSize: 14,
                            }}>
                              {role.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ fontWeight: 500, color: isActive ? '#1e293b' : '#9ca3af' }}>{role.name}</div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '6px 14px', borderRadius: 8,
                            fontSize: 14, fontWeight: 600, background: '#f1f5f9', color: '#475569',
                          }}>
                            {currentCount}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '6px 14px', borderRadius: 8,
                            fontSize: 14, fontWeight: 600,
                            background: minRequired > 0 ? '#ede9fe' : '#f1f5f9',
                            color: minRequired > 0 ? '#7c3aed' : '#9ca3af',
                          }}>
                            {minRequired > 0 ? minRequired : 'Not Set'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <span style={{
                            ...badgeBase,
                            background: paramCount > 0 ? '#dbeafe' : '#f1f5f9',
                            color: paramCount > 0 ? '#1d4ed8' : '#9ca3af',
                          }}>
                            {paramCount > 0 ? `${paramCount} param${paramCount > 1 ? 's' : ''}` : 'None'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <span style={{
                            ...badgeBase,
                            background: chartCount > 0 ? '#fef3c7' : '#f1f5f9',
                            color: chartCount > 0 ? '#92400e' : '#9ca3af',
                          }}>
                            {chartCount > 0 ? `${chartCount} chart${chartCount > 1 ? 's' : ''}` : 'None'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          {canManageRoles ? (
                            <button
                              onClick={() => handleToggleActive(role)}
                              style={{
                                width: 44,
                                height: 24,
                                borderRadius: 12,
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                background: isActive ? '#10b981' : '#d1d5db',
                                transition: 'background 0.2s',
                              }}
                            >
                              <div style={{
                                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                position: 'absolute', top: 3,
                                left: isActive ? 23 : 3,
                                transition: 'left 0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }} />
                            </button>
                          ) : (
                            <span style={{
                              ...badgeBase,
                              background: isActive ? '#dcfce7' : '#fee2e2',
                              color: isActive ? '#166534' : '#991b1b',
                            }}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          {minRequired === 0 ? (
                            <span style={{ ...badgeBase, background: '#f1f5f9', color: '#6b7280' }}>No Target</span>
                          ) : isDeficit ? (
                            <span style={{ ...badgeBase, background: '#fee2e2', color: '#991b1b' }}>Need {shortage} more</span>
                          ) : isSurplus ? (
                            <span style={{ ...badgeBase, background: '#dbeafe', color: '#1e40af' }}>+{currentCount - minRequired} surplus</span>
                          ) : (
                            <span style={{ ...badgeBase, background: '#dcfce7', color: '#166534' }}>Optimal</span>
                          )}
                        </td>
                        {canManageRoles && (
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => openEditModal(role)}
                                style={{
                                  padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6,
                                  background: '#f1f5f9', border: 'none', borderRadius: 8,
                                  cursor: 'pointer', fontSize: 13, color: '#475569', transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                              >
                                <Edit style={{ width: 14, height: 14 }} /> Edit
                              </button>
                              <button
                                onClick={() => openRequirementModal(role)}
                                style={{
                                  padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6,
                                  background: '#ede9fe', border: 'none', borderRadius: 8,
                                  cursor: 'pointer', fontSize: 13, color: '#7c3aed', transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#ddd6fe'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ede9fe'; }}
                              >
                                <Target style={{ width: 14, height: 14 }} /> Set Target
                              </button>
                              <button
                                onClick={() => openDeleteConfirm(role)}
                                style={{
                                  padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6,
                                  background: '#fee2e2', border: 'none', borderRadius: 8,
                                  cursor: 'pointer', fontSize: 13, color: '#dc2626', transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fecaca'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                              >
                                <Trash2 style={{ width: 14, height: 14 }} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Wizard Modal (Create / Edit) */}
      {renderWizardModal()}

      {/* Set Requirement Modal */}
      <Dialog open={showRequirementModal} onOpenChange={setShowRequirementModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Staffing Requirement</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            {selectedRole && (
              <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontWeight: 500 }}>{selectedRole.name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Set the minimum number of employees required for this role
                </div>
              </div>
            )}
            <div>
              <Label>Minimum Required Employees</Label>
              <Input
                type="number"
                min="0"
                value={requirementValue}
                onChange={(e) => setRequirementValue(e.target.value)}
                placeholder="0"
              />
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                Set to 0 to disable staffing targets for this role
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequirementModal(false)}>Cancel</Button>
            <Button onClick={handleSetRequirement} disabled={submitting}>
              {submitting ? 'Saving...' : 'Set Requirement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            <p>Are you sure you want to delete <strong>{selectedRole?.name}</strong>?</p>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
              This action cannot be undone. Employees with this role will need to be reassigned.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
