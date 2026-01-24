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
  getMe: () => apiClient.get('/employees/me'),
  updateMe: (data: any) => apiClient.patch('/employees/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/employees/me/change-password', { currentPassword, newPassword }),
  getManagers: () => apiClient.get('/employees/list/managers'),
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
  apply: (data: any) => apiClient.post('/leave/apply', data),
  getMyBalance: () => apiClient.get('/leave/balance'),
  getMyHistory: () => apiClient.get('/leave/history'),
  getPendingForManager: () => apiClient.get('/leave/pending/manager'),
  getPendingForHR: () => apiClient.get('/leave/pending/hr'),
  managerApprove: (id: string) => apiClient.patch(`/leave/${id}/manager-approve`),
  managerReject: (id: string, reason: string) =>
    apiClient.patch(`/leave/${id}/manager-reject`, { reason }),
  hrApprove: (id: string) => apiClient.patch(`/leave/${id}/hr-approve`),
  hrReject: (id: string, reason: string) =>
    apiClient.patch(`/leave/${id}/hr-reject`, { reason }),
  cancel: (id: string) => apiClient.delete(`/leave/${id}/cancel`),
};

export const attendanceAPI = {
  mark: (data: any) => apiClient.post('/attendance/mark', data),
  bulkMark: (data: any) => apiClient.post('/attendance/bulk-mark', data),
  getMyCalendar: (month: string) => apiClient.get('/attendance/calendar', { params: { month } }),
  getUserCalendar: (userId: string, month: string) =>
    apiClient.get(`/attendance/calendar/${userId}`, { params: { month } }),
  createHoliday: (data: any) => apiClient.post('/attendance/holiday', data),
  getAllHolidays: () => apiClient.get('/attendance/holiday'),
};

export const performanceAPI = {
  submitDailyReport: (data: any) => apiClient.post('/performance/daily-report', data),
  verifyReport: (id: string, comment?: string) =>
    apiClient.patch(`/performance/daily-report/${id}/verify`, { comment }),
  getMyReports: () => apiClient.get('/performance/my-reports'),
  getPerformanceReport: (userId: string, period?: string) =>
    apiClient.get(`/performance/employee/${userId}`, { params: { period } }),
  getTeamPerformance: () => apiClient.get('/performance/team/performance'),
};

export const documentAPI = {
  getMyDocuments: () => apiClient.get('/document/my'),
  download: (id: string) => apiClient.get(`/document/${id}/download`, { responseType: 'blob' }),
  upload: (data: FormData) => apiClient.post('/document/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  release: (data: any) => apiClient.post('/document/release', data),
  verify: (id: string) => apiClient.patch(`/document/${id}/verify`),
  reject: (id: string, reason: string) =>
    apiClient.patch(`/document/${id}/reject`, { reason }),
};

export const ticketAPI = {
  create: (data: any) => apiClient.post('/ticket', data),
  getMyTickets: () => apiClient.get('/ticket/my'),
  getAssignedTickets: () => apiClient.get('/ticket/assigned'),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/ticket/${id}/status`, { status }),
  addComment: (id: string, comment: string) =>
    apiClient.post(`/ticket/${id}/comment`, { comment }),
  resolve: (id: string) => apiClient.patch(`/ticket/${id}/resolve`),
};

export const feedbackAPI = {
  submit: (data: any) => apiClient.post('/feedback', data),
  getMyFeedback: () => apiClient.get('/feedback/my'),
  getEmployeeFeedback: (employeeId: string) =>
    apiClient.get(`/feedback/employee/${employeeId}`),
};

export const assetAPI = {
  request: (data: any) => apiClient.post('/asset/request', data),
  getMyRequests: () => apiClient.get('/asset/my'),
  getPendingForManager: () => apiClient.get('/asset/pending/manager'),
  getPendingForHR: () => apiClient.get('/asset/pending/hr'),
  managerApprove: (id: string) => apiClient.patch(`/asset/${id}/manager-approve`),
  hrApprove: (id: string, assetSerialNo: string) =>
    apiClient.patch(`/asset/${id}/hr-approve`, { assetSerialNo }),
  acknowledge: (id: string) => apiClient.patch(`/asset/${id}/acknowledge`),
};

export const reimbursementAPI = {
  submit: (data: FormData) => apiClient.post('/reimbursement', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMyReimbursements: () => apiClient.get('/reimbursement/my'),
  getPendingForManager: () => apiClient.get('/reimbursement/pending/manager'),
  getPendingForHR: () => apiClient.get('/reimbursement/pending/hr'),
  managerApprove: (id: string) => apiClient.patch(`/reimbursement/${id}/manager-approve`),
  hrApprove: (id: string) => apiClient.patch(`/reimbursement/${id}/hr-approve`),
  processPayment: (id: string) => apiClient.patch(`/reimbursement/${id}/process-payment`),
  acknowledge: (id: string) => apiClient.patch(`/reimbursement/${id}/acknowledge`),
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
  getMyPayslips: () => apiClient.get('/payroll/my'),
  downloadPayslip: (id: string) =>
    apiClient.get(`/payroll/${id}/download`, { responseType: 'blob' }),
  generatePayslips: (month: string) => apiClient.post('/payroll/generate', { month }),
  getPayslipsByMonth: (month: string) => apiClient.get(`/payroll/month/${month}`),
};

export const rewardAPI = {
  create: (data: any) => apiClient.post('/reward', data),
  getEmployeeRewards: (employeeId: string) => apiClient.get(`/reward/employee/${employeeId}`),
};

export const notificationAPI = {
  getMy: () => apiClient.get('/notification/my'),
  markAsRead: (id: string) => apiClient.patch(`/notification/${id}/read`),
};
