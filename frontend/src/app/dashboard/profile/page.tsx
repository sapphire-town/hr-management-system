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
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal states
  const [editPersonalOpen, setEditPersonalOpen] = React.useState(false);
  const [editEmergencyOpen, setEditEmergencyOpen] = React.useState(false);
  const [editBankOpen, setEditBankOpen] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Form states
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

  const handleSavePersonal = async () => {
    try {
      setSaving(true);
      const response = await employeeAPI.updateMe(personalForm);
      setProfile(response.data);
      setEditPersonalOpen(false);
      // Update auth store with new data
      if (user) {
        setUser({
          ...user,
          employee: {
            ...user.employee,
            firstName: response.data.firstName,
            lastName: response.data.lastName,
          },
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmergency = async () => {
    try {
      setSaving(true);
      const response = await employeeAPI.updateMe(emergencyForm);
      setProfile(response.data);
      setEditEmergencyOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update emergency contact');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async () => {
    try {
      setSaving(true);
      const response = await employeeAPI.updateMe(bankForm);
      setProfile(response.data);
      setEditBankOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update bank details');
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

    try {
      setSaving(true);
      await employeeAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setChangePasswordOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password changed successfully');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="My Profile" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading profile...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout title="My Profile" description="Error loading profile">
        <div className="card p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error || 'Profile not found'}</span>
          </div>
          <Button onClick={fetchProfile} className="mt-4">
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
          <Lock className="h-4 w-4 mr-2" />
          Change Password
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <AvatarWithFallback fallback={fullName} size="xl" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold">{fullName}</h2>
                <Badge variant="primary">{ROLE_LABELS[userRole] || userRole}</Badge>
              </div>
              <p className="text-muted-foreground mt-1">{profile.role?.name || 'No role assigned'}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile.user?.email || user?.email}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
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

          <TabsContent value="personal" className="mt-4">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Personal Information</h3>
                <Button variant="outline" size="sm" onClick={() => setEditPersonalOpen(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoRow
                  icon={User}
                  label="Full Name"
                  value={fullName}
                />
                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={profile.user?.email || '-'}
                />
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={profile.phone || 'Not provided'}
                />
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={profile.address || 'Not provided'}
                />
                <InfoRow
                  icon={Calendar}
                  label="Date of Birth"
                  value={profile.dateOfBirth ? format(new Date(profile.dateOfBirth), 'MMM dd, yyyy') : 'Not provided'}
                />
                <InfoRow
                  icon={User}
                  label="Gender"
                  value={profile.gender || 'Not provided'}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="work" className="mt-4">
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Work Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoRow
                  icon={Briefcase}
                  label="Role"
                  value={profile.role?.name || 'Not assigned'}
                />
                <InfoRow
                  icon={Shield}
                  label="Access Level"
                  value={ROLE_LABELS[userRole] || userRole}
                />
                <InfoRow
                  icon={User}
                  label="Reports To"
                  value={profile.manager ? `${profile.manager.firstName} ${profile.manager.lastName}` : 'None'}
                />
                <InfoRow
                  icon={Calendar}
                  label="Join Date"
                  value={profile.joinDate ? format(new Date(profile.joinDate), 'MMM dd, yyyy') : 'Not available'}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="emergency" className="mt-4">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Emergency Contact</h3>
                <Button variant="outline" size="sm" onClick={() => setEditEmergencyOpen(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoRow
                  icon={User}
                  label="Name"
                  value={profile.emergencyContactName || 'Not provided'}
                />
                <InfoRow
                  icon={User}
                  label="Relation"
                  value={profile.emergencyContactRelation || 'Not provided'}
                />
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={profile.emergencyContactPhone || 'Not provided'}
                />
                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={profile.emergencyContactEmail || 'Not provided'}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bank" className="mt-4">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Bank Details</h3>
                <Button variant="outline" size="sm" onClick={() => setEditBankOpen(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoRow
                  icon={User}
                  label="Account Holder"
                  value={profile.bankAccountHolder || 'Not provided'}
                />
                <InfoRow
                  icon={Building2}
                  label="Bank Name"
                  value={profile.bankName || 'Not provided'}
                />
                <InfoRow
                  icon={CreditCard}
                  label="Account Number"
                  value={profile.bankAccountNumber ? `****${profile.bankAccountNumber.slice(-4)}` : 'Not provided'}
                />
                <InfoRow
                  icon={Shield}
                  label="IFSC Code"
                  value={profile.bankIfsc || 'Not provided'}
                />
                <InfoRow
                  icon={Building2}
                  label="Branch"
                  value={profile.bankBranch || 'Not provided'}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Personal Info Modal */}
      <Modal
        isOpen={editPersonalOpen}
        onClose={() => setEditPersonalOpen(false)}
        title="Edit Personal Information"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={personalForm.phone}
              onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
              placeholder="Enter phone number"
            />
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
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditPersonalOpen(false)}>
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
        onClose={() => setEditEmergencyOpen(false)}
        title="Edit Emergency Contact"
      >
        <div className="space-y-4">
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
              value={emergencyForm.emergencyContactPhone}
              onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyContactPhone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <Label htmlFor="emergencyEmail">Email (Optional)</Label>
            <Input
              id="emergencyEmail"
              type="email"
              value={emergencyForm.emergencyContactEmail}
              onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyContactEmail: e.target.value })}
              placeholder="Enter email address"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditEmergencyOpen(false)}>
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
        onClose={() => setEditBankOpen(false)}
        title="Edit Bank Details"
      >
        <div className="space-y-4">
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
              value={bankForm.bankAccountNumber}
              onChange={(e) => setBankForm({ ...bankForm, bankAccountNumber: e.target.value })}
              placeholder="Enter account number"
            />
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
              onChange={(e) => setBankForm({ ...bankForm, bankIfsc: e.target.value })}
              placeholder="Enter IFSC code"
            />
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
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditBankOpen(false)}>
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
        <div className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
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
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={saving}>
              {saving ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </div>
      </Modal>
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
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}