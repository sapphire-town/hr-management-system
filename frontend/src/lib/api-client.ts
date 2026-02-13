import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  resetPassword: (email: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { email, newPassword }),
  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { oldPassword, newPassword }),
};

export const employeeAPI = {
  getAll: (params?: any) => apiClient.get('/employees', { params }),
  getById: (id: string) => apiClient.get(`/employees/${id}`),
  getComprehensive: (id: string) => apiClient.get(`/employees/${id}/comprehensive`),
  getMe: () => apiClient.get('/employees/me'),
  updateMe: (data: any) => apiClient.patch('/employees/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/employees/me/change-password', { currentPassword, newPassword }),
  getManagers: () => apiClient.get('/employees/list/managers'),
  // Manager team endpoints
  getMyTeam: () => apiClient.get('/employees/team'),
  getMyTeamAttendance: () => apiClient.get('/employees/team/attendance'),
  create: (data: any) => apiClient.post('/employees', data),
  update: (id: string, data: any) => apiClient.patch(`/employees/${id}`, data),
  promote: (id: string, data: { newUserRole: string; newRoleId: string; newSalary?: number }) =>
    apiClient.patch(`/employees/${id}/promote`, data),
  assignManager: (employeeId: string, managerId: string) =>
    apiClient.patch(`/employees/${employeeId}/assign-manager`, { managerId }),
  assignTeamMembers: (managerId: string, employeeIds: string[]) =>
    apiClient.post(`/employees/${managerId}/team-members`, { employeeIds }),
  resetPassword: (id: string) => apiClient.post(`/employees/${id}/reset-password`),
  reactivate: (id: string) => apiClient.post(`/employees/${id}/reactivate`),
  delete: (id: string) => apiClient.delete(`/employees/${id}`),
  initializeLeaveBalances: () => apiClient.post('/employees/admin/initialize-leave-balances'),
  // Bulk import
  downloadBulkImportTemplate: () => apiClient.get('/employees/bulk-import/template', { responseType: 'blob' }),
  bulkImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/employees/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const roleAPI = {
  getAll: () => apiClient.get('/roles'),
  getById: (id: string) => apiClient.get(`/roles/${id}`),
  create: (data: { name: string; dailyReportingParams?: any[]; performanceChartConfig?: any }) =>
    apiClient.post('/roles', data),
  update: (id: string, data: any) => apiClient.patch(`/roles/${id}`, data),
  setRequirements: (id: string, minimumRequired: number) =>
    apiClient.patch(`/roles/${id}/requirements`, { minimumRequired }),
  getStatistics: () => apiClient.get('/roles/statistics'),
  delete: (id: string) => apiClient.delete(`/roles/${id}`),
};

export const leaveAPI = {
  apply: (data: { leaveType: string; startDate: string; endDate: string; reason: string }) =>
    apiClient.post('/leaves', data),
  getMyBalance: () => apiClient.get('/leaves/balance'),
  getMyLeaves: (params?: any) => apiClient.get('/leaves/my', { params }),
  getAll: (params?: any) => apiClient.get('/leaves', { params }),
  getPendingForManager: () => apiClient.get('/leaves/pending/manager'),
  getPendingForHR: () => apiClient.get('/leaves/pending/hr'),
  approve: (id: string, comments?: string) =>
    apiClient.patch(`/leaves/${id}/approve`, { comments }),
  reject: (id: string, comments: string) =>
    apiClient.patch(`/leaves/${id}/reject`, { comments }),
  cancel: (id: string) => apiClient.delete(`/leaves/${id}`),
  // Analytics endpoints
  getAnalytics: (params?: { year?: number; month?: number }) =>
    apiClient.get('/leaves/analytics', { params }),
  getReport: (year: number, month?: number) =>
    apiClient.get('/leaves/reports', { params: { year, month } }),
  getTrends: (year: number) =>
    apiClient.get('/leaves/trends', { params: { year } }),
  getTeamCalendar: (year: number, month: number) =>
    apiClient.get('/leaves/team-calendar', { params: { year, month } }),
  getDepartmentStats: () => apiClient.get('/leaves/department-stats'),
};

export const attendanceAPI = {
  mark: (data: { status: string; notes?: string }) =>
    apiClient.post('/attendance/mark', data),
  checkOut: () => apiClient.post('/attendance/checkout'),
  bulkMark: (data: { date: string; records: Array<{ employeeId: string; status: string; notes?: string }> }) =>
    apiClient.post('/attendance/bulk', data),
  getTodayStatus: () => apiClient.get('/attendance/today'),
  getCalendar: (month: number, year: number) =>
    apiClient.get('/attendance/calendar', { params: { month, year } }),
  getCalendarWithHolidays: (month: number, year: number) =>
    apiClient.get('/attendance/calendar-full', { params: { month, year } }),
  getSummary: (month: number, year: number) =>
    apiClient.get('/attendance/summary', { params: { month, year } }),
  getTeamAttendance: (date?: string) =>
    apiClient.get('/attendance/team', { params: { date } }),
  getAllEmployeesAttendance: (date: string) =>
    apiClient.get('/attendance/all-employees', { params: { date } }),
  override: (data: { employeeId: string; date: string; status: string; notes?: string }) =>
    apiClient.post('/attendance/override', data),
  // Holiday management
  getHolidays: (year?: number) =>
    apiClient.get('/attendance/holidays', { params: year ? { year } : {} }),
  getHolidaysForMonth: (month: number, year: number) =>
    apiClient.get('/attendance/holidays/month', { params: { month, year } }),
  createHoliday: (data: { date: string; name: string; description?: string }) =>
    apiClient.post('/attendance/holidays', data),
  updateHoliday: (id: string, data: { date?: string; name?: string; description?: string }) =>
    apiClient.patch(`/attendance/holidays/${id}`, data),
  deleteHoliday: (id: string) => apiClient.delete(`/attendance/holidays/${id}`),
  exportCsv: (startDate: string, endDate: string) =>
    apiClient.get('/attendance/export', { params: { startDate, endDate }, responseType: 'blob' }),
};

export const performanceAPI = {
  // Employee endpoints
  getMyPerformance: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    apiClient.get('/performance/my-performance', { params }),
  getMyHistory: (months?: number) =>
    apiClient.get('/performance/my-history', { params: { months } }),

  // Manager/HR/Director endpoints
  getEmployeePerformance: (employeeId: string, params?: { period?: string }) =>
    apiClient.get(`/performance/employee/${employeeId}`, { params }),
  getEmployeeHistory: (employeeId: string, months?: number) =>
    apiClient.get(`/performance/employee/${employeeId}/history`, { params: { months } }),
  getTeamPerformance: (params?: { period?: string }) =>
    apiClient.get('/performance/team', { params }),
  getTeamDashboard: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    apiClient.get('/performance/team/dashboard', { params }),
  getAllTeams: (params?: { period?: string }) =>
    apiClient.get('/performance/team/all', { params }),
  getManagerTeamDashboard: (managerId: string, params?: { period?: string }) =>
    apiClient.get(`/performance/team/dashboard/${managerId}`, { params }),

  // Director/HR endpoints
  getAllEmployeesPerformance: (params?: { period?: string }) =>
    apiClient.get('/performance/all-employees', { params }),
  getDepartmentPerformance: (params?: { period?: string }) =>
    apiClient.get('/performance/departments', { params }),
  getCompanyPerformance: (params?: { period?: string }) =>
    apiClient.get('/performance/company', { params }),

  // Chart data
  getTrends: (months?: number) =>
    apiClient.get('/performance/trends', { params: { months } }),
  getChartData: (type: 'department' | 'trend' | 'distribution', params?: { period?: string }) =>
    apiClient.get(`/performance/chart/${type}`, { params }),
};

export const documentAPI = {
  // Employee documents (released by HR)
  getMyDocuments: () => apiClient.get('/documents/my-documents'),
  download: (id: string) => apiClient.get(`/documents/my-documents/${id}/download`, { responseType: 'blob' }),

  // Document verification (employee uploads)
  upload: (data: FormData) => apiClient.post('/documents/verification/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMyVerificationDocuments: () => apiClient.get('/documents/verification/my-documents'),

  // HR endpoints
  getDocumentTypes: () => apiClient.get('/documents/types'),
  getStats: () => apiClient.get('/documents/stats'),
  getAllDocuments: (params?: any) => apiClient.get('/documents/all', { params }),
  release: (data: FormData) => apiClient.post('/documents/release', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  bulkRelease: (data: FormData) => apiClient.post('/documents/release/bulk', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getPendingVerifications: (params?: any) => apiClient.get('/documents/verification/pending', { params }),
  viewVerificationDocument: (id: string) => apiClient.get(`/documents/verification/${id}/view`, { responseType: 'blob' }),
  verify: (id: string) => apiClient.patch(`/documents/verification/${id}/verify`, { status: 'VERIFIED' }),
  reject: (id: string, rejectionReason: string) =>
    apiClient.patch(`/documents/verification/${id}/verify`, { status: 'REJECTED', rejectionReason }),

  // Document Templates
  getPlaceholders: () => apiClient.get('/documents/templates/placeholders'),
  getTemplates: () => apiClient.get('/documents/templates'),
  uploadTemplate: (file: File, data: { name: string; documentType: string; description?: string }) => {
    const formData = new FormData();
    formData.append('template', file);
    formData.append('name', data.name);
    formData.append('documentType', data.documentType);
    if (data.description) formData.append('description', data.description);
    return apiClient.post('/documents/templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteTemplate: (id: string) => apiClient.delete(`/documents/templates/${id}`),
  downloadTemplate: (id: string) => apiClient.get(`/documents/templates/${id}/download`, { responseType: 'blob' }),
  generateDocuments: (templateId: string, employeeIds: string[]) =>
    apiClient.post(`/documents/templates/${templateId}/generate`, { employeeIds }),
};

export const ticketAPI = {
  create: (data: any) => apiClient.post('/ticket', data),
  getMyTickets: () => apiClient.get('/ticket/my'),
  getAssignedTickets: () => apiClient.get('/ticket/assigned'),
  getTeamTickets: () => apiClient.get('/ticket/team'),
  getAll: (params?: any) => apiClient.get('/ticket/all', { params }),
  getById: (id: string) => apiClient.get(`/ticket/${id}`),
  getStatistics: () => apiClient.get('/ticket/statistics'),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/ticket/${id}/status`, { status }),
  addComment: (id: string, comment: string) =>
    apiClient.post(`/ticket/${id}/comment`, { comment }),
  resolve: (id: string) => apiClient.patch(`/ticket/${id}/resolve`),
};

export const feedbackAPI = {
  submit: (data: any) => apiClient.post('/feedback', data),
  submitHRFeedback: (data: { toId: string; subject: string; content: string }) =>
    apiClient.post('/feedback/hr', data),
  submitBulkHRFeedback: (data: { toIds: string[]; subject: string; content: string }) =>
    apiClient.post('/feedback/hr/bulk', data),
  getAll: (params?: { subject?: string }) => apiClient.get('/feedback', { params }),
  getStatistics: () => apiClient.get('/feedback/statistics'),
  getMySubmitted: () => apiClient.get('/feedback/my/submitted'),
  getMyReceived: () => apiClient.get('/feedback/my/received'),
  getBySubject: (subject: string) => apiClient.get(`/feedback/subject/${subject}`),
  getById: (id: string) => apiClient.get(`/feedback/${id}`),
  getEmployeeFeedback: (employeeId: string) =>
    apiClient.get(`/feedback/employee/${employeeId}`),
  delete: (id: string) => apiClient.delete(`/feedback/${id}`),
};

export const assetAPI = {
  // Employee endpoints
  request: (data: { assetType: string; reason: string; urgency: string }) =>
    apiClient.post('/assets/request', data),
  getMyRequests: () => apiClient.get('/assets/my-requests'),
  acknowledge: (id: string) => apiClient.patch(`/assets/${id}/acknowledge`),

  // Manager endpoints
  getTeamRequests: (params?: { status?: string }) =>
    apiClient.get('/assets/team', { params }),
  managerApprove: (id: string, comments?: string) =>
    apiClient.patch(`/assets/${id}/manager-approve`, { comments }),
  managerReject: (id: string, rejectionReason: string) =>
    apiClient.patch(`/assets/${id}/manager-reject`, { rejectionReason }),

  // HR endpoints
  getTypes: () => apiClient.get('/assets/types'),
  getStats: () => apiClient.get('/assets/stats'),
  getPending: (params?: { status?: string }) =>
    apiClient.get('/assets/pending', { params }),
  getById: (id: string) => apiClient.get(`/assets/${id}`),
  hrApprove: (id: string, comments?: string) =>
    apiClient.patch(`/assets/${id}/hr-approve`, { comments }),
  hrReject: (id: string, rejectionReason: string) =>
    apiClient.patch(`/assets/${id}/hr-reject`, { rejectionReason }),
  allocate: (id: string, assetSerialNo: string) =>
    apiClient.patch(`/assets/${id}/allocate`, { assetSerialNo }),
};

export const reimbursementAPI = {
  // Employee endpoints
  submit: (data: FormData) => apiClient.post('/reimbursements/claim', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMyClaims: () => apiClient.get('/reimbursements/my-claims'),
  getMyStats: () => apiClient.get('/reimbursements/my-stats'),
  acknowledge: (id: string) => apiClient.patch(`/reimbursements/${id}/acknowledge`),
  getReceipt: (id: string) => apiClient.get(`/reimbursements/${id}/receipt`, { responseType: 'blob' }),
  getById: (id: string) => apiClient.get(`/reimbursements/${id}`),

  // Manager endpoints
  getTeamClaims: (params?: { status?: string; category?: string; employeeId?: string; startDate?: string; endDate?: string }) =>
    apiClient.get('/reimbursements/team', { params }),
  managerApprove: (id: string, comments?: string) =>
    apiClient.patch(`/reimbursements/${id}/manager-approve`, { comments }),
  managerReject: (id: string, rejectionReason: string) =>
    apiClient.patch(`/reimbursements/${id}/manager-reject`, { rejectionReason }),

  // HR endpoints
  getCategories: () => apiClient.get('/reimbursements/categories'),
  getStats: () => apiClient.get('/reimbursements/stats'),
  getPending: (params?: { status?: string; category?: string; employeeId?: string }) =>
    apiClient.get('/reimbursements/pending', { params }),
  hrApprove: (id: string, comments?: string) =>
    apiClient.patch(`/reimbursements/${id}/hr-approve`, { comments }),
  hrReject: (id: string, rejectionReason: string) =>
    apiClient.patch(`/reimbursements/${id}/hr-reject`, { rejectionReason }),
  processPayment: (id: string) => apiClient.patch(`/reimbursements/${id}/process-payment`),
};

export const resignationAPI = {
  // Employee endpoints
  submit: (data: { noticePeriodDays: number; reason: string; lastWorkingDay: string }) =>
    apiClient.post('/resignations', data),
  getMy: () => apiClient.get('/resignations/my-resignation'),
  withdraw: () => apiClient.delete('/resignations/withdraw'),

  // Manager endpoints
  getTeam: (params?: { status?: string }) =>
    apiClient.get('/resignations/team', { params }),
  managerApprove: (id: string, data?: { comments?: string; adjustedLastWorkingDay?: string }) =>
    apiClient.patch(`/resignations/${id}/manager-approve`, data || {}),
  managerReject: (id: string, rejectionReason: string) =>
    apiClient.patch(`/resignations/${id}/manager-reject`, { rejectionReason }),

  // HR endpoints
  getStats: () => apiClient.get('/resignations/stats'),
  getAll: (params?: { status?: string; employeeId?: string }) =>
    apiClient.get('/resignations/all', { params }),
  getById: (id: string) => apiClient.get(`/resignations/${id}`),
  hrApprove: (id: string, data?: { comments?: string; adjustedLastWorkingDay?: string }) =>
    apiClient.patch(`/resignations/${id}/hr-approve`, data || {}),
  hrReject: (id: string, rejectionReason: string) =>
    apiClient.patch(`/resignations/${id}/hr-reject`, { rejectionReason }),
  updateExitStatus: (id: string, data: { assetHandover?: boolean; accountDeactivated?: boolean; noDueClearanceSent?: boolean }) =>
    apiClient.patch(`/resignations/${id}/exit-status`, data),
};

export const payrollAPI = {
  getMyPayslips: (year?: string) => apiClient.get('/payroll/my', { params: year ? { year } : {} }),
  getPayslipById: (id: string) => apiClient.get(`/payroll/${id}`),
  generatePayslips: (month: string) => apiClient.post('/payroll/generate', { month }),
  getPayslipsByMonth: (month: string) => apiClient.get(`/payroll/month/${month}`),
  getPayrollStats: (month: string) => apiClient.get(`/payroll/stats/${month}`),
  regeneratePayslip: (id: string) => apiClient.post(`/payroll/${id}/regenerate`),
  // Working days configuration
  getWorkingDays: (month: string) => apiClient.get(`/payroll/working-days/${month}`),
  setWorkingDays: (data: { month: string; workingDays: number; notes?: string; overrides?: any[] }) =>
    apiClient.post('/payroll/working-days', data),
  // Leave balance management
  getLeaveBalances: () => apiClient.get('/payroll/leave-balances'),
  adjustLeaveBalance: (employeeId: string, data: { leaveType: string; adjustment: number; reason: string }) =>
    apiClient.patch(`/payroll/leave-balance/${employeeId}`, data),
};

export const rewardAPI = {
  // Rewards
  create: (data: any) => apiClient.post('/reward', data),
  getAll: (params?: any) => apiClient.get('/reward/all', { params }),
  getMyRewards: () => apiClient.get('/reward/my'),
  getEmployeeRewards: (employeeId: string) => apiClient.get(`/reward/employee/${employeeId}`),
  getById: (id: string) => apiClient.get(`/reward/${id}`),
  deleteReward: (id: string) => apiClient.delete(`/reward/${id}`),
  getStats: () => apiClient.get('/reward/stats'),
  // Badges
  getAllBadges: (includeInactive?: boolean) =>
    apiClient.get('/reward/badges', { params: includeInactive ? { includeInactive: 'true' } : {} }),
  getBadgeById: (id: string) => apiClient.get(`/reward/badges/${id}`),
  createBadge: (data: any) => apiClient.post('/reward/badges', data),
  updateBadge: (id: string, data: any) => apiClient.patch(`/reward/badges/${id}`, data),
  deleteBadge: (id: string) => apiClient.delete(`/reward/badges/${id}`),
};

export const directorsListAPI = {
  // Nomination endpoints
  nominate: (data: { employeeId: string; period: string; reason: string }) =>
    apiClient.post('/directors-list', data),
  getAll: (params?: { period?: string; status?: string; page?: string; limit?: string }) =>
    apiClient.get('/directors-list', { params }),
  getCurrent: () => apiClient.get('/directors-list/current'),
  getStats: () => apiClient.get('/directors-list/stats'),
  getByPeriod: (period: string) => apiClient.get(`/directors-list/period/${period}`),
  getEmployeeHistory: (employeeId: string) => apiClient.get(`/directors-list/employee/${employeeId}`),
  approve: (id: string, isApproved: boolean) =>
    apiClient.patch(`/directors-list/${id}/approve`, { isApproved }),
};

export const notificationAPI = {
  getMy: () => apiClient.get('/notification/my'),
  markAsRead: (id: string) => apiClient.patch(`/notification/${id}/read`),
};

export const recruitmentAPI = {
  // Placement Drives
  createDrive: (data: { collegeName: string; driveDate: string; roles: any[] }) =>
    apiClient.post('/recruitment/drives', data),
  getDrives: (params?: { search?: string; page?: string; limit?: string }) =>
    apiClient.get('/recruitment/drives', { params }),
  getDriveById: (id: string) => apiClient.get(`/recruitment/drives/${id}`),
  updateDrive: (id: string, data: any) => apiClient.patch(`/recruitment/drives/${id}`, data),
  deleteDrive: (id: string) => apiClient.delete(`/recruitment/drives/${id}`),
  getDriveStatistics: (id: string) => apiClient.get(`/recruitment/drives/${id}/statistics`),
  getMyDrives: () => apiClient.get('/recruitment/drives/my'),

  // Interviewers
  getAvailableInterviewers: () => apiClient.get('/recruitment/interviewers'),
  assignInterviewers: (driveId: string, interviewerIds: string[]) =>
    apiClient.post(`/recruitment/drives/${driveId}/interviewers`, { interviewerIds }),

  // Students
  addStudent: (driveId: string, data: { name: string; email: string; phone: string; studentData?: any }) =>
    apiClient.post(`/recruitment/drives/${driveId}/students`, data),
  bulkAddStudents: (driveId: string, students: any[]) =>
    apiClient.post(`/recruitment/drives/${driveId}/students/bulk`, { students }),
  getStudents: (driveId: string) => apiClient.get(`/recruitment/drives/${driveId}/students`),
  deleteStudent: (studentId: string) => apiClient.delete(`/recruitment/students/${studentId}`),
  importStudents: (driveId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/recruitment/drives/${driveId}/students/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadStudentTemplate: () =>
    apiClient.get('/recruitment/students/import-template', { responseType: 'blob' }),

  // Evaluations
  evaluateStudent: (studentId: string, round: number, data: { status: string; comments?: string }) =>
    apiClient.post(`/recruitment/students/${studentId}/evaluate/${round}`, data),
  getEvaluationHistory: (evaluationId: string) =>
    apiClient.get(`/recruitment/evaluations/${evaluationId}/history`),

  // Statistics
  getOverallStatistics: () => apiClient.get('/recruitment/statistics'),
};

export const hiringAPI = {
  create: (data: { roleId: string; positions: number; justification: string; urgency: string }) =>
    apiClient.post('/hiring', data),
  getAll: (params?: { status?: string; urgency?: string; roleId?: string; page?: string; limit?: string }) =>
    apiClient.get('/hiring', { params }),
  getStats: () => apiClient.get('/hiring/stats'),
  getById: (id: string) => apiClient.get(`/hiring/${id}`),
  update: (id: string, data: { positions?: number; justification?: string; urgency?: string }) =>
    apiClient.patch(`/hiring/${id}`, data),
  approve: (id: string, data: { approve: boolean; rejectionReason?: string }) =>
    apiClient.patch(`/hiring/${id}/approve`, data),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/hiring/${id}/status`, { status }),
  delete: (id: string) => apiClient.delete(`/hiring/${id}`),
};

export const settingsAPI = {
  getSettings: () => apiClient.get('/settings'),
  updateCompany: (data: { companyName?: string; workingHoursStart?: string; workingHoursEnd?: string; workingDays?: number[] }) =>
    apiClient.patch('/settings/company', data),
  updateLeavePolicies: (data: { sickLeavePerYear?: number; casualLeavePerYear?: number; earnedLeavePerYear?: number; maxConsecutiveDays?: number; carryForwardAllowed?: boolean; maxCarryForward?: number }) =>
    apiClient.patch('/settings/leave-policies', data),
  updateNotifications: (data: { emailNotifications?: boolean; inAppNotifications?: boolean; reminderDaysBefore?: number }) =>
    apiClient.patch('/settings/notifications', data),
  resetLeaveSystem: () => apiClient.post('/settings/reset-leave-system'),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return apiClient.post('/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updatePayslipTemplate: (data: {
    companyAddress?: string;
    registrationNumber?: string;
    signatoryName?: string;
    signatoryTitle?: string;
    footerText?: string;
    primaryColor?: string;
  }) => apiClient.patch('/settings/payslip-template', data),
  getLogoUrl: (logoPath: string) => {
    const filename = logoPath.split('/').pop();
    return `${apiClient.defaults.baseURL}/settings/logo/${filename}`;
  },
  getPayslipTemplate: () => apiClient.get('/settings/payslip-template'),
};

export const targetAPI = {
  // Create target for an employee
  create: (data: { employeeId: string; targetMonth: string; targetData: any[]; notes?: string }) =>
    apiClient.post('/targets', data),
  // Bulk create targets for multiple employees
  bulkCreate: (data: { employeeIds: string[]; targetMonth: string; targetData: any[]; notes?: string }) =>
    apiClient.post('/targets/bulk', data),
  // Get all targets with optional filters
  getAll: (params?: { employeeId?: string; targetMonth?: string; managerId?: string }) =>
    apiClient.get('/targets', { params }),
  // Get targets for manager's team
  getTeamTargets: (targetMonth?: string) =>
    apiClient.get('/targets/team', { params: targetMonth ? { targetMonth } : {} }),
  // Get team target statistics
  getTeamStats: (targetMonth: string) =>
    apiClient.get('/targets/team/stats', { params: { targetMonth } }),
  // Get targets for a specific employee
  getEmployeeTargets: (employeeId: string, targetMonth?: string) =>
    apiClient.get(`/targets/employee/${employeeId}`, { params: targetMonth ? { targetMonth } : {} }),
  // Get target by ID
  getById: (id: string) => apiClient.get(`/targets/${id}`),
  // Update target
  update: (id: string, data: { targetData?: any[]; notes?: string; isActive?: boolean }) =>
    apiClient.patch(`/targets/${id}`, data),
  // Soft delete target
  delete: (id: string) => apiClient.delete(`/targets/${id}`),
  // Permanently delete target
  permanentDelete: (id: string) => apiClient.delete(`/targets/${id}/permanent`),
};

// Types for daily report data values (number for metrics, string for text params)
type ParamData = number | string;

interface Attachment {
  fileName: string;
  filePath: string;
  paramKey?: string;
}

export const dailyReportAPI = {
  // Employee endpoints
  getMyParams: () => apiClient.get('/daily-reports/my-params'),
  submit: (data: {
    reportDate: string;
    reportData: Record<string, ParamData>;
    generalNotes?: string;
    attachments?: Attachment[];
  }) => apiClient.post('/daily-reports', data),
  getMyReports: (params?: { startDate?: string; endDate?: string; isVerified?: boolean }) =>
    apiClient.get('/daily-reports/my', { params }),
  getToday: () => apiClient.get('/daily-reports/today'),
  getMyStats: (month?: string) =>
    apiClient.get('/daily-reports/my-stats', { params: month ? { month } : {} }),
  update: (id: string, data: {
    reportData?: Record<string, ParamData>;
    generalNotes?: string;
    attachments?: Attachment[];
  }) => apiClient.patch(`/daily-reports/${id}`, data),
  delete: (id: string) => apiClient.delete(`/daily-reports/${id}`),
  getById: (id: string) => apiClient.get(`/daily-reports/${id}`),

  // File upload
  uploadAttachments: (files: File[], paramKey?: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (paramKey) formData.append('paramKey', paramKey);
    return apiClient.post('/daily-reports/upload-attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAttachmentUrl: (filename: string) =>
    `${apiClient.defaults.baseURL}/daily-reports/attachment/${filename}`,

  // Manager endpoints
  getTeamReports: (params?: { employeeId?: string; startDate?: string; endDate?: string; isVerified?: boolean }) =>
    apiClient.get('/daily-reports/team', { params }),
  getPendingTeamReports: () => apiClient.get('/daily-reports/team/pending'),
  verify: (id: string, data?: { managerComment?: string }) =>
    apiClient.patch(`/daily-reports/${id}/verify`, data || {}),

  // Performance analytics endpoints
  getMyPerformance: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    apiClient.get('/daily-reports/performance/my', { params }),
  getEmployeePerformance: (employeeId: string, params?: { period?: string; startDate?: string; endDate?: string }) =>
    apiClient.get(`/daily-reports/performance/employee/${employeeId}`, { params }),
  getTeamPerformance: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    apiClient.get('/daily-reports/performance/team', { params }),
  getAllPerformance: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    apiClient.get('/daily-reports/performance/all', { params }),
};
