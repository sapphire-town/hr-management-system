'use client';

import * as React from 'react';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Users,
  Target,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Briefcase,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { roleAPI } from '@/lib/api-client';

interface ReportingParam {
  key: string;
  label: string;
  target: number;
  type: string;
  allowProof?: boolean;
}

interface Role {
  id: string;
  name: string;
  dailyReportingParams: ReportingParam[];
  performanceChartConfig: any;
  isActive: boolean;
  employeeCount: number;
  minimumRequired: number;
}

export default function DailyReportingConfigPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [expandedRole, setExpandedRole] = React.useState<string | null>(null);
  const [editingRole, setEditingRole] = React.useState<string | null>(null);
  const [editParams, setEditParams] = React.useState<ReportingParam[]>([]);
  const [newParam, setNewParam] = React.useState<ReportingParam>({
    key: '',
    label: '',
    target: 0,
    type: 'number',
  });
  const [showAddParam, setShowAddParam] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check if user is a director or HR Head
  const isDirector = user?.role === 'DIRECTOR' || user?.role === 'HR_HEAD';

  const fetchRoles = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await roleAPI.getAll();
      setRoles(response.data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setMessage({ type: 'error', text: 'Failed to load roles' });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleExpandRole = (roleId: string) => {
    if (expandedRole === roleId) {
      setExpandedRole(null);
      setEditingRole(null);
    } else {
      setExpandedRole(roleId);
      const role = roles.find((r) => r.id === roleId);
      if (role) {
        setEditParams([...(role.dailyReportingParams || [])]);
      }
    }
  };

  const handleStartEdit = (roleId: string) => {
    setEditingRole(roleId);
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      setEditParams([...(role.dailyReportingParams || [])]);
    }
    setShowAddParam(false);
    setNewParam({ key: '', label: '', target: 0, type: 'number', allowProof: false });
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setShowAddParam(false);
    setNewParam({ key: '', label: '', target: 0, type: 'number', allowProof: false });
    const role = roles.find((r) => r.id === expandedRole);
    if (role) {
      setEditParams([...(role.dailyReportingParams || [])]);
    }
  };

  const handleParamChange = (index: number, field: keyof ReportingParam, value: string | number) => {
    const updated = [...editParams];
    updated[index] = { ...updated[index], [field]: value };
    setEditParams(updated);
  };

  const handleDeleteParam = (index: number) => {
    setEditParams(editParams.filter((_, i) => i !== index));
  };

  const handleAddParam = () => {
    if (!newParam.key.trim() || !newParam.label.trim()) {
      setMessage({ type: 'error', text: 'Key and Label are required' });
      return;
    }
    // Check for duplicate key
    if (editParams.some((p) => p.key === newParam.key)) {
      setMessage({ type: 'error', text: 'A parameter with this key already exists' });
      return;
    }
    setEditParams([...editParams, { ...newParam }]);
    setNewParam({ key: '', label: '', target: 0, type: 'number', allowProof: false });
    setShowAddParam(false);
    setMessage(null);
  };

  const handleSave = async (roleId: string) => {
    setSaving(roleId);
    setMessage(null);
    console.log('Saving parameters for role:', roleId, 'Params:', editParams);
    try {
      const response = await roleAPI.update(roleId, { dailyReportingParams: editParams });
      console.log('Save response:', response.data);
      await fetchRoles();
      setEditingRole(null);
      setMessage({ type: 'success', text: 'Parameters saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving parameters:', error);
      console.error('Error response:', error.response?.data);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save parameters' });
    } finally {
      setSaving(null);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: '#ffffff',
    outline: 'none',
  };

  const buttonPrimary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  };

  const buttonSecondary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  };

  if (!isDirector) {
    return (
      <DashboardLayout title="Access Denied" description="You do not have permission to access this page">
        <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
          <AlertCircle style={{ height: '48px', width: '48px', color: '#ef4444', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
            Access Denied
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Only Directors can configure daily reporting parameters.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Daily Reporting Configuration" description="Configure reporting parameters for each role">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Loading roles...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Daily Reporting Configuration"
      description="Configure reporting parameters and expected results for each role"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Info Banner */}
        <div
          style={{
            ...cardStyle,
            padding: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            border: '1px solid #ddd6fe',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Settings style={{ height: '20px', width: '20px', color: '#ffffff' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 4px 0' }}>
              Configure Daily Reporting Parameters
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Define the metrics and targets that employees in each role need to report daily.
              These parameters will appear in the employee's daily report form, helping them track their progress against expected results.
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {message.type === 'success' ? (
              <CheckCircle style={{ height: '20px', width: '20px', color: '#22c55e' }} />
            ) : (
              <AlertCircle style={{ height: '20px', width: '20px', color: '#ef4444' }} />
            )}
            <span style={{ fontSize: '14px', color: message.type === 'success' ? '#166534' : '#dc2626' }}>
              {message.text}
            </span>
          </div>
        )}

        {/* Roles List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {roles.map((role) => {
            const isExpanded = expandedRole === role.id;
            const isEditing = editingRole === role.id;
            const displayParams = isEditing ? editParams : (role.dailyReportingParams || []);

            return (
              <div key={role.id} style={cardStyle}>
                {/* Role Header */}
                <div
                  style={{
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                  }}
                  onClick={() => handleExpandRole(role.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: '#f5f3ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Briefcase style={{ height: '24px', width: '24px', color: '#7c3aed' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 4px 0' }}>
                        {role.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users style={{ height: '14px', width: '14px' }} />
                          {role.employeeCount} employees
                        </span>
                        <span style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Target style={{ height: '14px', width: '14px' }} />
                          {(role.dailyReportingParams || []).length} parameters
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!role.isActive && (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                        }}
                      >
                        Inactive
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp style={{ height: '20px', width: '20px', color: '#6b7280' }} />
                    ) : (
                      <ChevronDown style={{ height: '20px', width: '20px', color: '#6b7280' }} />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ padding: '20px' }}>
                    {/* Parameters Table */}
                    {displayParams.length > 0 ? (
                      <div style={{ marginBottom: '20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                                Key
                              </th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                                Label
                              </th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                                Target
                              </th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                                Type
                              </th>
                              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                                Proof
                              </th>
                              {isEditing && (
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                                  Actions
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {displayParams.map((param, index) => (
                              <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '16px' }}>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={param.key}
                                      onChange={(e) => handleParamChange(index, 'key', e.target.value)}
                                      style={{ ...inputStyle, width: '150px' }}
                                      placeholder="e.g., calls_made"
                                    />
                                  ) : (
                                    <code style={{ fontSize: '13px', color: '#7c3aed', backgroundColor: '#f5f3ff', padding: '2px 8px', borderRadius: '4px' }}>
                                      {param.key}
                                    </code>
                                  )}
                                </td>
                                <td style={{ padding: '16px' }}>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={param.label}
                                      onChange={(e) => handleParamChange(index, 'label', e.target.value)}
                                      style={{ ...inputStyle, width: '200px' }}
                                      placeholder="e.g., Calls Made"
                                    />
                                  ) : (
                                    <span style={{ fontSize: '14px', color: '#111827', fontWeight: 500 }}>{param.label}</span>
                                  )}
                                </td>
                                <td style={{ padding: '16px' }}>
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={param.target}
                                      onChange={(e) => handleParamChange(index, 'target', parseInt(e.target.value) || 0)}
                                      style={{ ...inputStyle, width: '100px' }}
                                      min="0"
                                    />
                                  ) : (
                                    <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 600 }}>{param.target}</span>
                                  )}
                                </td>
                                <td style={{ padding: '16px' }}>
                                  {isEditing ? (
                                    <select
                                      value={param.type}
                                      onChange={(e) => handleParamChange(index, 'type', e.target.value)}
                                      style={{ ...inputStyle, width: '120px' }}
                                    >
                                      <option value="number">Number</option>
                                      <option value="percentage">Percentage</option>
                                      <option value="currency">Currency</option>
                                    </select>
                                  ) : (
                                    <span style={{ fontSize: '13px', color: '#6b7280', textTransform: 'capitalize' }}>{param.type}</span>
                                  )}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                  {isEditing ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...editParams];
                                        updated[index] = { ...updated[index], allowProof: !updated[index].allowProof };
                                        setEditParams(updated);
                                      }}
                                      style={{
                                        width: 40,
                                        height: 22,
                                        borderRadius: 11,
                                        border: 'none',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        background: param.allowProof ? '#7c3aed' : '#d1d5db',
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
                                        left: param.allowProof ? 21 : 3,
                                        transition: 'left 0.2s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                      }} />
                                    </button>
                                  ) : (
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: '9999px',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      backgroundColor: param.allowProof ? '#dcfce7' : '#f3f4f6',
                                      color: param.allowProof ? '#166534' : '#9ca3af',
                                    }}>
                                      {param.allowProof ? 'Yes' : 'No'}
                                    </span>
                                  )}
                                </td>
                                {isEditing && (
                                  <td style={{ padding: '16px', textAlign: 'center' }}>
                                    <button
                                      onClick={() => handleDeleteParam(index)}
                                      style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: '#fef2f2',
                                        color: '#dc2626',
                                        cursor: 'pointer',
                                      }}
                                      title="Delete parameter"
                                    >
                                      <Trash2 style={{ height: '16px', width: '16px' }} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '12px', marginBottom: '20px' }}>
                        <Target style={{ height: '40px', width: '40px', color: '#9ca3af', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                          No reporting parameters configured for this role.
                          {isEditing && ' Click "Add Parameter" to add one.'}
                        </p>
                      </div>
                    )}

                    {/* Add New Parameter Form */}
                    {isEditing && showAddParam && (
                      <div
                        style={{
                          padding: '16px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '12px',
                          marginBottom: '20px',
                          border: '1px dashed #d1d5db',
                        }}
                      >
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
                          Add New Parameter
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>
                              Key (unique identifier)
                            </label>
                            <input
                              type="text"
                              value={newParam.key}
                              onChange={(e) => setNewParam({ ...newParam, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                              style={inputStyle}
                              placeholder="e.g., calls_made"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>
                              Label (display name)
                            </label>
                            <input
                              type="text"
                              value={newParam.label}
                              onChange={(e) => setNewParam({ ...newParam, label: e.target.value })}
                              style={inputStyle}
                              placeholder="e.g., Calls Made"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>
                              Target (expected result)
                            </label>
                            <input
                              type="number"
                              value={newParam.target}
                              onChange={(e) => setNewParam({ ...newParam, target: parseInt(e.target.value) || 0 })}
                              style={inputStyle}
                              min="0"
                              placeholder="e.g., 50"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}>
                              Type
                            </label>
                            <select
                              value={newParam.type}
                              onChange={(e) => setNewParam({ ...newParam, type: e.target.value })}
                              style={inputStyle}
                            >
                              <option value="number">Number</option>
                              <option value="percentage">Percentage</option>
                              <option value="currency">Currency</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
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
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280' }}>
                            Allow proof document upload (optional for employees)
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                          <button onClick={handleAddParam} style={buttonPrimary}>
                            <Plus style={{ height: '16px', width: '16px' }} />
                            Add Parameter
                          </button>
                          <button onClick={() => setShowAddParam(false)} style={buttonSecondary}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      {isEditing ? (
                        <>
                          {!showAddParam && (
                            <button onClick={() => setShowAddParam(true)} style={buttonSecondary}>
                              <Plus style={{ height: '16px', width: '16px' }} />
                              Add Parameter
                            </button>
                          )}
                          <button onClick={handleCancelEdit} style={buttonSecondary}>
                            <X style={{ height: '16px', width: '16px' }} />
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(role.id)}
                            disabled={saving === role.id}
                            style={{
                              ...buttonPrimary,
                              opacity: saving === role.id ? 0.7 : 1,
                              cursor: saving === role.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Save style={{ height: '16px', width: '16px' }} />
                            {saving === role.id ? 'Saving...' : 'Save Changes'}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleStartEdit(role.id)} style={buttonPrimary}>
                          <Edit style={{ height: '16px', width: '16px' }} />
                          Edit Parameters
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {roles.length === 0 && (
            <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
              <Briefcase style={{ height: '48px', width: '48px', color: '#9ca3af', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
                No Roles Found
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Create roles first to configure their daily reporting parameters.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
