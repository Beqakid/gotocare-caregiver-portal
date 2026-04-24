// @ts-nocheck
export interface Shift {
  id: number
  client: any
  caregiver: any
  date: string
  startTime: string
  endTime: string
  totalHours?: number
  status: string
  priority: string
  notes?: string
}

export interface Timesheet {
  id: number
  shift: any
  caregiver: any
  client: any
  date: string
  clockIn: string
  clockOut?: string
  hoursWorked?: number
  hourlyRate?: number
  totalPay?: number
  status: string
  notes?: string
}

export interface CaregiverProfile {
  id: number
  firstName: string
  lastName: string
  email: string
  phone?: string
  status: string
  hourlyRate?: number
}
