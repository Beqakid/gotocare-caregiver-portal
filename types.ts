// @ts-nocheck

export interface CaregiverProfile {
  id: number
  firstName: string
  lastName: string
  email: string
  phone?: string
  status: 'onboarding' | 'active' | 'inactive' | 'suspended'
  hourlyRate?: number
  bio?: string
  skills?: string[]
  certifications?: string[]
  languages?: string[]
  rating?: number
  totalReviews?: number
  totalJobs?: number
  profilePhoto?: string
  availability?: WeeklyAvailability
  location?: { city: string; state: string; zipCode: string }
  createdAt?: string
}

export interface WeeklyAvailability {
  monday?: TimeSlot[]
  tuesday?: TimeSlot[]
  wednesday?: TimeSlot[]
  thursday?: TimeSlot[]
  friday?: TimeSlot[]
  saturday?: TimeSlot[]
  sunday?: TimeSlot[]
}

export interface TimeSlot {
  start: string // "09:00"
  end: string   // "17:00"
}

export interface Shift {
  id: number
  client: any
  caregiver: any
  date: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  careType?: string
  notes?: string
  location?: any
  address?: string
}

export interface CareRequest {
  id: number
  clientName: string
  careType: string
  description: string
  location: string
  distance?: string
  schedule: string
  hourlyRate: number
  weeklyHours?: number
  weeklyEarnings?: number
  matchScore?: number
  postedAt: string
  status: 'pending' | 'accepted' | 'declined'
  clientPhoto?: string
  urgency?: 'today' | 'this_week' | 'flexible'
}

export interface Earning {
  id: number
  date: string
  clientName: string
  hours: number
  rate: number
  total: number
  status: 'pending' | 'paid'
  shiftId?: number
}

export interface Timesheet {
  id: number
  shift: any
  caregiver: any
  date: string
  clockIn?: string
  clockOut?: string
  hoursWorked?: number
  totalPay?: number
  status: 'clocked_in' | 'clocked_out' | 'approved' | 'paid'
}

export type TabType = 'home' | 'schedule' | 'requests' | 'earnings' | 'profile'
