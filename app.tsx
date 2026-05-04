// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { CaregiverProfile, Shift, Timesheet, CareRequest, TabType } from './types'
import { login, fetchCaregiverProfile, fetchShifts, fetchTimesheets, fetchBookings, updateBookingStatus, clockIn, clockOut, updateProfile, clearAuth } from './utils/api'
import { LoginScreen } from './components/LoginScreen'
import { HomeTab } from './components/HomeTab'
import { ScheduleTab } from './components/ScheduleTab'
import { RequestsTab } from './components/RequestsTab'
import { EarningsTab } from './components/EarningsTab'
import { ProfileTab } from './components/ProfileTab'
import { BottomNav } from './components/BottomNav'

// Demo care requests — shown when no real bookings exist yet
const DEMO_REQUESTS: CareRequest[] = [
  {
    id: 1, clientName: 'Sarah M.', careType: 'Dementia Care',
    description: 'Looking for a compassionate caregiver for my 82-year-old mother who has early-stage dementia. Needs help with meals, light activities, and companionship.',
    location: 'Buckhead, Atlanta', distance: '2.3 mi', schedule: 'Mon-Fri, 9am-1pm',
    hourlyRate: 24, weeklyHours: 20, weeklyEarnings: 480, matchScore: 95,
    postedAt: new Date().toISOString(), status: 'pending', urgency: 'this_week'
  },
  {
    id: 2, clientName: 'R. Chen', careType: 'Post-Surgery Recovery',
    description: 'Need assistance after hip replacement surgery. Help with mobility, medication reminders, and light housekeeping.',
    location: 'Midtown, Atlanta', distance: '4.1 mi', schedule: 'Daily, 2pm-6pm',
    hourlyRate: 28, weeklyHours: 28, weeklyEarnings: 784, matchScore: 88,
    postedAt: new Date().toISOString(), status: 'pending', urgency: 'today'
  },
  {
    id: 3, clientName: 'E. Torres', careType: 'Overnight Care',
    description: 'Seeking overnight caregiver for my father. Needs monitoring and occasional assistance throughout the night.',
    location: 'Decatur, GA', distance: '6.5 mi', schedule: 'Weekends, 8pm-8am',
    hourlyRate: 22, weeklyHours: 24, weeklyEarnings: 528, matchScore: 78,
    postedAt: new Date().toISOString(), status: 'pending', urgency: 'flexible'
  },
]

// Map a D1 booking record to CareRequest shape
function mapBookingToRequest(b: any): CareRequest {
  const scheduleStr = b.preferredDate && b.preferredTime
    ? `${b.preferredDate} at ${b.preferredTime}`
    : b.preferredDate || 'Schedule TBD'

  // Rough urgency from date
  let urgency: 'today' | 'this_week' | 'flexible' = 'flexible'
  if (b.preferredDate) {
    const daysDiff = (new Date(b.preferredDate).getTime() - Date.now()) / (1000 * 86400)
    if (daysDiff <= 1) urgency = 'today'
    else if (daysDiff <= 7) urgency = 'this_week'
  }

  return {
    id: b.id,
    clientName: b.clientEmail || 'Client',
    careType: b.careNeeds || 'Care Request',
    description: b.notes || '',
    location: b.isUnlocked ? 'See details below' : 'Unlock to view',
    distance: '',
    schedule: scheduleStr,
    hourlyRate: 25,
    weeklyHours: undefined,
    weeklyEarnings: undefined,
    matchScore: undefined,
    postedAt: b.createdAt || new Date().toISOString(),
    status: (b.status as any) || 'pending',
    urgency,
    isUnlocked: b.isUnlocked,
    caregiverId: b.caregiverId,
  }
}

const App: React.FC<{}> = () => {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [profile, setProfile] = useState<CaregiverProfile | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [requests, setRequests] = useState<CareRequest[]>(DEMO_REQUESTS)
  const [usingDemoRequests, setUsingDemoRequests] = useState(true)
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async (caregiverId: number) => {
    setLoading(true)
    try {
      const [shiftRes, tsRes, bookingsRes] = await Promise.all([
        fetchShifts(caregiverId),
        fetchTimesheets(caregiverId),
        fetchBookings(caregiverId),
      ])
      if (shiftRes?.docs) setShifts(shiftRes.docs)
      if (tsRes?.docs) setTimesheets(tsRes.docs)
      // Use real bookings if any exist, else keep demo
      if (bookingsRes?.bookings && bookingsRes.bookings.length > 0) {
        setRequests(bookingsRes.bookings.map(mapBookingToRequest))
        setUsingDemoRequests(false)
      }
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle Stripe return URLs
  useEffect(() => {
    if (!loggedIn || !profile) return
    const params = new URLSearchParams(window.location.search)
    const unlockedBookingId = params.get('booking_unlocked')
    const subscriptionSuccess = params.get('subscription')
    if (unlockedBookingId || subscriptionSuccess === 'success') {
      // Refresh bookings to show newly unlocked data
      loadData(profile.id)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [loggedIn, profile, loadData])

  const handleLogin = async (email: string, password: string) => {
    setLoginError('')
    setLoginLoading(true)
    try {
      const result = await login(email, password)
      if (result.token && result.user) {
        const user = result.user
        // Build profile from login response + defaults
        const cgProfile: CaregiverProfile = {
          id: user.id,
          name: user.name || email.split('@')[0],
          email: user.email || email,
          phone: user.phone || '',
          status: 'active',
          hourlyRate: 25,
          skills: user.skills || ['Elder Care', 'Dementia Care', 'Companionship', 'Medication Management'],
          languages: ['English'],
          availability: 'available',
          rating: 4.8,
          completedShifts: 47,
          agency: user.agency,
        }
        setProfile(cgProfile)
        setLoggedIn(true)
        // Skip loading shifts/timesheets in preview to avoid long-token curl issues
        // In production (Cloudflare Pages), fetch() works fine with long headers
        if (!window.tasklet?.runCommand) {
          await loadData(cgProfile.id)
        }
      } else {
        setLoginError(result.errors?.[0]?.message || 'Invalid email or password')
      }
    } catch (e) {
      setLoginError('Connection error. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    setLoggedIn(false)
    setProfile(null)
    setShifts([])
    setTimesheets([])
    setRequests(DEMO_REQUESTS)
    setUsingDemoRequests(true)
    setActiveTab('home')
  }

  const handleClockIn = async (shiftId: number) => {
    try {
      await clockIn(shiftId)
      if (profile) await loadData(profile.id)
    } catch (e) {
      console.error('Clock in failed:', e)
    }
  }

  const handleClockOut = async (timesheetId: number) => {
    try {
      await clockOut(timesheetId, profile?.hourlyRate || 25)
      if (profile) await loadData(profile.id)
    } catch (e) {
      console.error('Clock out failed:', e)
    }
  }

  const handleAcceptRequest = async (requestId: number) => {
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'accepted' as const } : r))
    if (!usingDemoRequests) {
      try {
        await updateBookingStatus(requestId, 'accepted')
      } catch (e) {
        console.error('Failed to update booking status:', e)
      }
    }
  }

  const handleDeclineRequest = async (requestId: number) => {
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'declined' as const } : r))
    if (!usingDemoRequests) {
      try {
        await updateBookingStatus(requestId, 'declined')
      } catch (e) {
        console.error('Failed to update booking status:', e)
      }
    }
  }

  const handleUpdateProfile = async (data: any) => {
    if (!profile) return
    try {
      await updateProfile(profile.id, data)
      setProfile(prev => prev ? { ...prev, ...data } : prev)
    } catch (e) {
      console.error('Profile update failed:', e)
    }
  }

  if (!loggedIn) {
    return <LoginScreen onLogin={handleLogin} error={loginError} loading={loginLoading} />
  }

  const pendingRequestCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        <div className="tab-content max-w-lg mx-auto">
          {activeTab === 'home' && (
            <HomeTab
              profile={profile}
              shifts={shifts}
              timesheets={timesheets}
              requests={requests}
              loading={loading}
              onNavigateToRequests={() => setActiveTab('requests')}
              onNavigateToSchedule={() => setActiveTab('schedule')}
              onClockIn={handleClockIn}
            />
          )}
          {activeTab === 'schedule' && (
            <ScheduleTab shifts={shifts} loading={loading} onClockIn={handleClockIn} />
          )}
          {activeTab === 'requests' && (
            <RequestsTab
              requests={requests}
              loading={loading}
              onAccept={handleAcceptRequest}
              onDecline={handleDeclineRequest}
            />
          )}
          {activeTab === 'earnings' && (
            <EarningsTab timesheets={timesheets} loading={loading} />
          )}
          {activeTab === 'profile' && (
            <ProfileTab profile={profile} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile} />
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        requestCount={pendingRequestCount}
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
