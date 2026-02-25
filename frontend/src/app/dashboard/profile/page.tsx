'use client';

import * as React from 'react';
import { User, Mail, Phone, MapPin, Building2, Calendar, Shield, Edit2, Lock, CreditCard, AlertCircle, Briefcase } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { AvatarWithFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { ROLE_LABELS } from '@/lib/constants';
import { employeeAPI } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  joinDate?: string;
  salary?: number;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  bankBranch?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  role?: {
    id: string;
    name: string;
  };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const [editPersonalOpen, setEditPersonalOpen] = React.useState(false);
  const [editEmergencyOpen, setEditEmergencyOpen] = React.useState(false);
  const [editBankOpen, setEditBankOpen] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [personalForm, setPersonalForm] = React.useState({
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
  });

  const [emergencyForm, setEmergencyForm] = React.useState({
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    emergencyContactEmail: '',
  });

  const [bankForm, setBankForm] = React.useState({
    bankAccountHolder: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankName: '',
    bankBranch: '',
  });

  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordError, setPasswordError] = React.useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getMe();
      setProfile(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProfile();
  }, []);

  React.useEffect(() => {
    if (profile) {
      setPersonalForm({
        phone: profile.phone || '',
        address: profile.address || '',
        dateOfBirth: profile.dateOfBirth ? format(new Date(profile.dateOfBirth), 'yyyy-MM-dd') : '',
        gender: profile.gender || '',
      });
      setEmergencyForm({
        emergencyContactName: profile.emergencyContactName || '',
        emergencyContactRelation: profile.emergencyContactRelation || '',
        emergencyContactPhone: profile.emergencyContactPhone || '',
        emergencyContactEmail: profile.emergencyContactEmail || '',
      });
      setBankForm({
        bankAccountHolder: profile.bankAccountHolder || '',
        bankAccountNumber: profile.bankAccountNumber || '',
        bankIfsc: profile.bankIfsc || '',
        bankName: profile.bankName || '',
        bankBranch: profile.bankBranch || '',
      });
    }
  }, [profile]);

  const validatePhone = (phone: string): string | null => {
    if (!phone) return null; // optional
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) return 'Phone number must be 10-13 digits';
    return null;
  };

  const validateEmail = (email: string): string | null => {
    if (!email) return null; // optional
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) return 'Enter a valid email address';
    return null;
  };

  const validateBankAccount = (account: string): string | null => {
    if (!account) return null;
    if (!/^\d+$/.test(account)) return 'Account number must contain only digits';
    if (account.length < 9 || account.length > 18) return 'Account number must be 9-18 digits';
    return null;
  };

  const validateIfsc = (ifsc: string): string | null => {
    if (!ifsc) return null;
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc)) return 'IFSC format: 4 letters + 0 + 6 alphanumeric (e.g., SBIN0001234)';
    return null;
  };

  const handleSavePersonal = async () => {
    const errors: Record<string, string> = {};
    const phoneErr = validatePhone(personalForm.phone);
    if (phoneErr) errors.phone = phoneErr;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    try {
      setSaving(true);
      const response = await employeeAPI.updateMe(personalForm);
      setProfile(response.data);
      setEditPersonalOpen(false);
      toast({ title: 'Profile updated', description: 'Personal information saved successfully.', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.response?.data?.message || 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmergency = async () => {
    const errors: Record<string, string> = {};
    const phoneErr = validatePhone(emergencyForm.emergencyContactPhone);
    if (phoneErr) errors.emergencyContactPhone = phoneErr;
    const emailErr = validateEmail(emergencyForm.emergencyContactEmail);
    if (emailErr) errors.emergencyContactEmail = emailErr;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    try {
      setSaving(true);
      // Send empty email as undefined so backend @IsOptional skips validation
      const payload = {
        ...emergencyForm,
        emergencyContactEmail: emergencyForm.emergencyContactEmail?.trim() || undefined,
      };
      const response = await employeeAPI.updateMe(payload);
      setProfile(response.data);
      setEditEmergencyOpen(false);
      toast({ title: 'Contact updated', description: 'Emergency contact saved successfully.', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.response?.data?.message || 'Failed to update emergency contact.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async () => {
    const errors: Record<string, string> = {};
    const accountErr = validateBankAccount(bankForm.bankAccountNumber);
    if (accountErr) errors.bankAccountNumber = accountErr;
    const ifscErr = validateIfsc(bankForm.bankIfsc);
    if (ifscErr) errors.bankIfsc = ifscErr;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    try {
      setSaving(true);
      const response = await employeeAPI.updateMe(bankForm);
      setProfile(response.data);
      setEditBankOpen(false);
      toast({ title: 'Bank details updated', description: 'Bank information saved successfully.', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.response?.data?.message || 'Failed to update bank details.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    try {
      setSaving(true);
      await employeeAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setChangePasswordOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: 'Password changed', description: 'Your password has been updated successfully.', variant: 'success' });
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="My Profile" description="Loading...">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
          <div style={{ color: '#6b7280' }}>Loading profile...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout title="My Profile" description="Error loading profile">
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
            <AlertCircle style={{ height: '20px', width: '20px' }} />
            <span>{error || 'Profile not found'}</span>
          </div>
          <Button onClick={fetchProfile} style={{ marginTop: '16px' }}>
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const userRole = profile.user?.role || user?.role || 'EMPLOYEE';

  return (
    <DashboardLayout
      title="My Profile"
      description="View and manage your profile information"
      actions={
        <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>
          <Lock style={{ height: '16px', width: '16px', marginRight: '8px' }} />
          Change Password
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Profile Header Card */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '32px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: '600',
              border: '4px solid rgba(255,255,255,0.3)'
            }}>
              {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>{fullName}</h2>
                <span style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {ROLE_LABELS[userRole] || userRole}
                </span>
              </div>
              <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '16px' }}>
                {profile.role?.name || 'No role assigned'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px', fontSize: '14px', opacity: 0.9 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail style={{ height: '16px', width: '16px' }} />
                  {profile.user?.email || user?.email}
                </span>
                {profile.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone style={{ height: '16px', width: '16px' }} />
                    {profile.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <Tabs defaultValue="personal">
          <TabsList>
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="work">Work Info</TabsTrigger>
            <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
            <TabsTrigger value="bank">Bank Details</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" style={{ marginTop: '16px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Personal Information</h3>
                <Button variant="outline" size="sm" onClick={() => setEditPersonalOpen(true)}>
                  <Edit2 style={{ height: '14px', width: '14px', marginRight: '6px' }} />
                  Edit
                </Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <InfoRow icon={User} label="Full Name" value={fullName} />
                <InfoRow icon={Mail} label="Email" value={profile.user?.email || '-'} />
                <InfoRow icon={Phone} label="Phone" value={profile.phone || 'Not provided'} />
                <InfoRow icon={MapPin} label="Address" value={profile.address || 'Not provided'} />
                <InfoRow icon={Calendar} label="Date of Birth" value={profile.dateOfBirth ? format(new Date(profile.dateOfBirth), 'MMM dd, yyyy') : 'Not provided'} />
                <InfoRow icon={User} label="Gender" value={profile.gender || 'Not provided'} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="work" style={{ marginTop: '16px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 24px 0' }}>Work Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <InfoRow icon={Briefcase} label="Role" value={profile.role?.name || 'Not assigned'} />
                <InfoRow icon={Shield} label="Access Level" value={ROLE_LABELS[userRole] || userRole} />
                <InfoRow icon={User} label="Reports To" value={profile.manager ? `${profile.manager.firstName} ${profile.manager.lastName}` : 'None'} />
                <InfoRow icon={Calendar} label="Join Date" value={profile.joinDate ? format(new Date(profile.joinDate), 'MMM dd, yyyy') : 'Not available'} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="emergency" style={{ marginTop: '16px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Emergency Contact</h3>
                <Button variant="outline" size="sm" onClick={() => setEditEmergencyOpen(true)}>
                  <Edit2 style={{ height: '14px', width: '14px', marginRight: '6px' }} />
                  Edit
                </Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <InfoRow icon={User} label="Name" value={profile.emergencyContactName || 'Not provided'} />
                <InfoRow icon={User} label="Relation" value={profile.emergencyContactRelation || 'Not provided'} />
                <InfoRow icon={Phone} label="Phone" value={profile.emergencyContactPhone || 'Not provided'} />
                <InfoRow icon={Mail} label="Email" value={profile.emergencyContactEmail || 'Not provided'} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bank" style={{ marginTop: '16px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Bank Details</h3>
                <Button variant="outline" size="sm" onClick={() => setEditBankOpen(true)}>
                  <Edit2 style={{ height: '14px', width: '14px', marginRight: '6px' }} />
                  Edit
                </Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <InfoRow icon={User} label="Account Holder" value={profile.bankAccountHolder || 'Not provided'} />
                <InfoRow icon={Building2} label="Bank Name" value={profile.bankName || 'Not provided'} />
                <InfoRow icon={CreditCard} label="Account Number" value={profile.bankAccountNumber ? `****${profile.bankAccountNumber.slice(-4)}` : 'Not provided'} />
                <InfoRow icon={Shield} label="IFSC Code" value={profile.bankIfsc || 'Not provided'} />
                <InfoRow icon={Building2} label="Branch" value={profile.bankBranch || 'Not provided'} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Personal Info Modal */}
      <Modal
        isOpen={editPersonalOpen}
        onClose={() => { setEditPersonalOpen(false); setFormErrors({}); }}
        title="Edit Personal Information"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={personalForm.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9+\-\s]/g, '');
                setPersonalForm({ ...personalForm, phone: val });
                if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
              }}
              placeholder="e.g., 9876543210"
              maxLength={13}
            />
            {formErrors.phone && <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0' }}>{formErrors.phone}</p>}
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={personalForm.address}
              onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
              placeholder="Enter address"
            />
          </div>
          <div>
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={personalForm.dateOfBirth}
              onChange={(e) => setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              value={personalForm.gender}
              onChange={(e) => setPersonalForm({ ...personalForm, gender: e.target.value })}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                padding: '0 12px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
            <Button variant="outline" onClick={() => { setEditPersonalOpen(false); setFormErrors({}); }}>
              Cancel
            </Button>
            <Button onClick={handleSavePersonal} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Emergency Contact Modal */}
      <Modal
        isOpen={editEmergencyOpen}
        onClose={() => { setEditEmergencyOpen(false); setFormErrors({}); }}
        title="Edit Emergency Contact"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Label htmlFor="emergencyName">Contact Name</Label>
            <Input
              id="emergencyName"
              value={emergencyForm.emergencyContactName}
              onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyContactName: e.target.value })}
              placeholder="Enter contact name"
            />
          </div>
          <div>
            <Label htmlFor="emergencyRelation">Relation</Label>
            <Input
              id="emergencyRelation"
              value={emergencyForm.emergencyContactRelation}
              onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyContactRelation: e.target.value })}
              placeholder="e.g., Father, Mother, Spouse"
            />
          </div>
          <div>
            <Label htmlFor="emergencyPhone">Phone Number</Label>
            <Input
              id="emergencyPhone"
              type="tel"
              value={emergencyForm.emergencyContactPhone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9+\-\s]/g, '');
                setEmergencyForm({ ...emergencyForm, emergencyContactPhone: val });
                if (formErrors.emergencyContactPhone) setFormErrors({ ...formErrors, emergencyContactPhone: '' });
              }}
              placeholder="e.g., 9876543210"
              maxLength={13}
            />
            {formErrors.emergencyContactPhone && <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0' }}>{formErrors.emergencyContactPhone}</p>}
          </div>
          <div>
            <Label htmlFor="emergencyEmail">Email (Optional)</Label>
            <Input
              id="emergencyEmail"
              value={emergencyForm.emergencyContactEmail}
              onChange={(e) => {
                setEmergencyForm({ ...emergencyForm, emergencyContactEmail: e.target.value });
                if (formErrors.emergencyContactEmail) setFormErrors({ ...formErrors, emergencyContactEmail: '' });
              }}
              placeholder="Enter email address (optional)"
            />
            {formErrors.emergencyContactEmail && <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0' }}>{formErrors.emergencyContactEmail}</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
            <Button variant="outline" onClick={() => { setEditEmergencyOpen(false); setFormErrors({}); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmergency} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Bank Details Modal */}
      <Modal
        isOpen={editBankOpen}
        onClose={() => { setEditBankOpen(false); setFormErrors({}); }}
        title="Edit Bank Details"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Label htmlFor="bankHolder">Account Holder Name</Label>
            <Input
              id="bankHolder"
              value={bankForm.bankAccountHolder}
              onChange={(e) => setBankForm({ ...bankForm, bankAccountHolder: e.target.value })}
              placeholder="Enter account holder name"
            />
          </div>
          <div>
            <Label htmlFor="bankAccount">Account Number</Label>
            <Input
              id="bankAccount"
              inputMode="numeric"
              value={bankForm.bankAccountNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setBankForm({ ...bankForm, bankAccountNumber: val });
                if (formErrors.bankAccountNumber) setFormErrors({ ...formErrors, bankAccountNumber: '' });
              }}
              placeholder="Enter account number (digits only)"
              maxLength={18}
            />
            {formErrors.bankAccountNumber && <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0' }}>{formErrors.bankAccountNumber}</p>}
          </div>
          <div>
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={bankForm.bankName}
              onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
              placeholder="Enter bank name"
            />
          </div>
          <div>
            <Label htmlFor="bankIfsc">IFSC Code</Label>
            <Input
              id="bankIfsc"
              value={bankForm.bankIfsc}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                setBankForm({ ...bankForm, bankIfsc: val });
                if (formErrors.bankIfsc) setFormErrors({ ...formErrors, bankIfsc: '' });
              }}
              placeholder="e.g., SBIN0001234"
              maxLength={11}
            />
            {formErrors.bankIfsc && <p style={{ color: '#dc2626', fontSize: 12, margin: '4px 0 0' }}>{formErrors.bankIfsc}</p>}
          </div>
          <div>
            <Label htmlFor="bankBranch">Branch</Label>
            <Input
              id="bankBranch"
              value={bankForm.bankBranch}
              onChange={(e) => setBankForm({ ...bankForm, bankBranch: e.target.value })}
              placeholder="Enter branch name"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
            <Button variant="outline" onClick={() => { setEditBankOpen(false); setFormErrors({}); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveBank} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={changePasswordOpen}
        onClose={() => {
          setChangePasswordOpen(false);
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setPasswordError('');
        }}
        title="Change Password"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {passwordError && (
            <div style={{
              padding: '12px',
              background: '#fef2f2',
              color: '#dc2626',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {passwordError}
            </div>
          )}
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Enter new password (min 8 characters)"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={saving}>
              {saving ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </div>
      </Modal>
      <style jsx global>{`
        button[data-state='active'] {
          background-color: white !important;
          color: #7c3aed !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }
        button[data-state='inactive'] {
          background-color: transparent !important;
          color: #6b7280 !important;
          font-weight: 500 !important;
        }
        button[data-state='inactive']:hover {
          background-color: rgba(124, 58, 237, 0.05) !important;
          color: #7c3aed !important;
        }
      `}</style>
    </DashboardLayout>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <div style={{
        height: '44px',
        width: '44px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon style={{ height: '20px', width: '20px', color: 'white' }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 4px 0' }}>{label}</p>
        <p style={{ fontSize: '15px', fontWeight: '500', margin: 0, color: '#111827', wordBreak: 'break-word' }}>{value}</p>
      </div>
    </div>
  );
}