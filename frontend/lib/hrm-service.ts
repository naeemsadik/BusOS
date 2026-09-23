import { api } from './api'

export type EmploymentStatus = 'active' | 'inactive' | 'terminated'
export type AttendanceStatus = 'present' | 'absent' | 'paid_leave' | 'unpaid_leave' | 'holiday'
export type PayType = 'monthly' | 'daily'
export type PayrollStatus = 'draft' | 'finalized' | 'paid'

export interface HrmSettings {
  id: string
  timezone: string
  currencyCode: string
  workDays: number[]
  workStartTime: string
  workEndTime: string
  graceMinutes: number
  isConfigured: boolean
}

export interface OrganizationUnit {
  id: string
  name: string
  description?: string
  departmentId?: string
  isActive: boolean
}

export interface Employee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  joiningDate: string
  terminationDate?: string
  terminationReason?: string
  status: EmploymentStatus
  departmentId?: string
  designationId?: string
  department?: OrganizationUnit
  designation?: OrganizationUnit
  linkedUserId?: string
  workDaysOverride?: number[]
  workStartTimeOverride?: string
  workEndTimeOverride?: string
  graceMinutesOverride?: number
  notes?: string
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  employee: Employee
  workDate: string
  status: AttendanceStatus
  source: 'self' | 'manual'
  checkInAt?: string
  checkOutAt?: string
  workedMinutes: number
  lateMinutes: number
  notes?: string
}

export interface Holiday {
  id: string
  holidayDate: string
  name: string
  isPaid: boolean
}

export interface Compensation {
  id: string
  employeeId: string
  payType: PayType
  baseRate: number
  currencyCode: string
  effectiveFrom: string
  effectiveTo?: string
  notes?: string
}

export interface PayrollAdjustment {
  label: string
  type: 'earning' | 'deduction'
  amount: number
}

export interface PayrollItem {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  payType: PayType
  baseRate: number
  baseEarnings: number
  adjustments: PayrollAdjustment[]
  additionsTotal: number
  deductionsTotal: number
  netPay: number
  presentDays: number
  absentDays: number
  paidLeaveDays: number
  unpaidLeaveDays: number
  paidHolidayDays: number
  unresolvedDays: number
  workedMinutes: number
  lateMinutes: number
}

export interface PayrollRun {
  id: string
  year: number
  month: number
  periodStart: string
  periodEnd: string
  currencyCode: string
  status: PayrollStatus
  totalNetPay: number
  paidAt?: string
  paymentReference?: string
  items?: PayrollItem[]
}

export interface HrmOverview {
  activeEmployees: number
  todayAttendance: number
  today: string
  currentDraftPayroll?: PayrollRun
}

const downloadCsv = async (url: string, filename: string) => {
  const response = await api.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(href)
}

export const hrmService = {
  getOverview: async (): Promise<HrmOverview> => (await api.get('/hrm/overview')).data,
  getSettings: async (): Promise<HrmSettings> => (await api.get('/hrm/settings')).data,
  updateSettings: async (data: Omit<HrmSettings, 'id' | 'isConfigured'>): Promise<HrmSettings> =>
    (await api.patch('/hrm/settings', data)).data,

  getDepartments: async (): Promise<OrganizationUnit[]> => (await api.get('/hrm/departments')).data,
  createDepartment: async (data: { name: string; description?: string }) => (await api.post('/hrm/departments', data)).data,
  getDesignations: async (): Promise<OrganizationUnit[]> => (await api.get('/hrm/designations')).data,
  createDesignation: async (data: { name: string; departmentId?: string; description?: string }) =>
    (await api.post('/hrm/designations', data)).data,

  getEmployees: async (params: Record<string, unknown> = {}): Promise<{ employees: Employee[]; total: number; page: number; totalPages: number }> =>
    (await api.get('/hrm/employees', { params })).data,
  getEmployee: async (id: string): Promise<Employee> => (await api.get(`/hrm/employees/${id}`)).data,
  createEmployee: async (data: Partial<Employee>): Promise<Employee> => (await api.post('/hrm/employees', data)).data,
  updateEmployee: async (id: string, data: Partial<Employee>): Promise<Employee> => (await api.patch(`/hrm/employees/${id}`, data)).data,
  archiveEmployee: async (id: string): Promise<Employee> => (await api.post(`/hrm/employees/${id}/archive`)).data,
  linkEmployee: async (id: string, userId: string | null): Promise<Employee> =>
    (await api.patch(`/hrm/employees/${id}/account-link`, { userId })).data,
  getAccountCandidates: async (): Promise<Array<{ id: string; firstName: string; lastName: string; email: string }>> =>
    (await api.get('/hrm/employees/account-candidates')).data,

  getAttendance: async (params: Record<string, unknown> = {}): Promise<{ records: AttendanceRecord[]; total: number }> =>
    (await api.get('/hrm/attendance', { params })).data,
  upsertAttendance: async (data: Record<string, unknown>): Promise<AttendanceRecord> =>
    (await api.post('/hrm/attendance/manual', data)).data,
  recordLeave: async (data: Record<string, unknown>) => (await api.post('/hrm/attendance/leave', data)).data,
  getMyEmployee: async (): Promise<Employee> => (await api.get('/hrm/employees/me/profile')).data,
  getMyAttendance: async (params: Record<string, unknown> = {}): Promise<{ records: AttendanceRecord[]; total: number }> =>
    (await api.get('/hrm/attendance/me', { params })).data,
  clockIn: async (): Promise<AttendanceRecord> => (await api.post('/hrm/attendance/clock-in')).data,
  clockOut: async (): Promise<AttendanceRecord> => (await api.post('/hrm/attendance/clock-out')).data,
  exportAttendance: (params: URLSearchParams) => downloadCsv(`/hrm/attendance/export.csv?${params}`, 'attendance.csv'),

  getHolidays: async (): Promise<Holiday[]> => (await api.get('/hrm/holidays')).data,
  createHoliday: async (data: Omit<Holiday, 'id'>): Promise<Holiday> => (await api.post('/hrm/holidays', data)).data,

  getCompensations: async (employeeId: string): Promise<Compensation[]> =>
    (await api.get(`/hrm/employees/${employeeId}/compensations`)).data,
  createCompensation: async (employeeId: string, data: Omit<Compensation, 'id' | 'employeeId' | 'currencyCode'>): Promise<Compensation> =>
    (await api.post(`/hrm/employees/${employeeId}/compensations`, data)).data,

  getPayrollRuns: async (params: Record<string, unknown> = {}): Promise<{ runs: PayrollRun[]; total: number }> =>
    (await api.get('/hrm/payroll/runs', { params })).data,
  getPayrollRun: async (id: string): Promise<PayrollRun> => (await api.get(`/hrm/payroll/runs/${id}`)).data,
  generatePayroll: async (year: number, month: number): Promise<PayrollRun> =>
    (await api.post('/hrm/payroll/runs', { year, month })).data,
  updatePayrollItem: async (runId: string, itemId: string, adjustments: PayrollAdjustment[]): Promise<PayrollItem> =>
    (await api.patch(`/hrm/payroll/runs/${runId}/items/${itemId}`, { adjustments })).data,
  finalizePayroll: async (id: string): Promise<PayrollRun> => (await api.post(`/hrm/payroll/runs/${id}/finalize`)).data,
  reopenPayroll: async (id: string): Promise<PayrollRun> => (await api.post(`/hrm/payroll/runs/${id}/reopen`)).data,
  markPayrollPaid: async (id: string, data: { paidAt?: string; paymentReference?: string; paymentNote?: string }): Promise<PayrollRun> =>
    (await api.post(`/hrm/payroll/runs/${id}/mark-paid`, data)).data,
  exportPayroll: (id: string) => downloadCsv(`/hrm/payroll/runs/${id}/export.csv`, `payroll-${id}.csv`),
}
