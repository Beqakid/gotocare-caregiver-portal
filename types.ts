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
  caregiverId?: string | number
  isUnlocked?: boolean
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

// ---- NEW: Day-1 Value Tools ----

export interface TimeEntry {
  id: string
  clientName: string
  date: string
  startTime: string
  endTime?: string
  duration?: number // minutes
  hourlyRate: number
  notes?: string
  status: 'active' | 'completed'
  createdAt: string
}

export interface CaregiverDocument {
  id: string
  name: string
  type: 'certification' | 'license' | 'training' | 'background_check' | 'health' | 'insurance' | 'other'
  expiryDate?: string
  status: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry'
  addedAt: string
  notes?: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  clientName: string
  clientEmail?: string
  items: InvoiceItem[]
  subtotal: number
  tax?: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  issueDate: string
  dueDate: string
  notes?: string
  createdAt: string
}

export interface InvoiceItem {
  description: string
  hours: number
  rate: number
  amount: number
}

export interface PrivateClient {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  careType?: string
  hourlyRate: number
  notes?: string
  createdAt: string
}

export interface MileageEntry {
  id: string
  date: string
  clientName: string
  miles: number
  notes?: string
}

export type TabType = 'home' | 'schedule' | 'requests' | 'earnings' | 'profile'
