// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { CaregiverProfile, Shift, Timesheet, CareRequest, TabType, CaregiverDocument } from './types'
import { login, fetchCaregiverProfile, fetchShifts, fetchTimesheets, fetchBookings, updateBookingStatus, clockIn, clockOut, updateProfile, clearAuth } from './utils/api'
import { getDocuments, refreshDocumentStatuses } from './utils/storage'
import { LoginScreen } from './components/LoginScreen'
import { BottomNav } from './components/BottomNav'

// Lazy-load tabs — each becomes a separate JS chunk (~150-250KB each)
const HomeTab = React.lazy(() => import('./components/HomeTab').then(m => ({ default: m.HomeTab })))
const ScheduleTab = React.lazy(() => import('./components/ScheduleTab').then(m => ({ default: m.ScheduleTab })))
const RequestsTab = React.lazy(() => import('./components/RequestsTab').then(m => ({ default: m.RequestsTab })))
const EarningsTab = React.lazy(() => import('./components/EarningsTab').then(m => ({ default: m.EarningsTab })))
const ProfileTab = React.lazy(() => import('./components/ProfileTab').then(m => ({ default: m.ProfileTab })))

const TabSpinner = () => (
  <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh'}}>
    <div style={{width:40,height:40,border:'3px solid rgba(124,92,255,0.2)',borderTopColor:'#7C5CFF',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
  </div>
)

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

  let urgency: 'today' | 'this_week' | 'flexible' = 'flexible'
  if (b.preferredDate) {
    const daysDiff = (new Date(b.preferredDate).getTime() - Date.now()) / (1000 * 86400)
    if (daysDiff <= 1) urgency = 'today'
    else if (daysDiff <= 7) urgency = 'this_week'
  }

  return {
    id: b.id,
    clientName: b.clientName || (b.isUnlocked ? b.clientEmail : '') || 'Client',
    clientPhone: b.clientPhone || undefined,
    clientEmail: b.clientEmail || undefined,
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
  const [profileDeepLink, setProfileDeepLink] = useState<string | undefined>(undefined)
  const [profileInitialSection, setProfileInitialSection] = useState<'profile' | 'documents' | 'badges' | undefined>(undefined)

  const handleNavigateToSection = (section: 'profile' | 'documents', scrollTo: string) => {
    setProfileInitialSection(section)
    setProfileDeepLink(scrollTo)
    setActiveTab('profile')
  }
  const [profile, setProfile] = useState<CaregiverProfile | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [requests, setRequests] = useState<CareRequest[]>(DEMO_REQUESTS)
  const [usingDemoRequests, setUsingDemoRequests] = useState(true)
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<CaregiverDocument[]>(getDocuments())

  // Refresh local documents
  const refreshDocs = () => setDocuments(refreshDocumentStatuses())

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
      loadData(profile.id)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [loggedIn, profile, loadData])

  // Refresh document statuses on mount
  useEffect(() => { refreshDocs() }, [])

  const handleLogin = async (email: string, password: string) => {
    setLoginError('')
    setLoginLoading(true)
    try {
      const result = await login(email, password)
      if (result.token && result.user) {
        const user = result.user
        const cgProfile: CaregiverProfile = {
          id: user.id,
          firstName: user.firstName || user.name?.split(' ')[0] || email.split('@')[0],
          lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email || email,
          phone: user.phone || '',
          status: 'active',
          hourlyRate: user.hourlyRate || 0,
          skills: user.skills || user.care_types?.split(',').map((s: string) => s.trim()) || [],
          languages: user.languages || [],
          rating: 4.8,
          totalJobs: 47,
          totalReviews: 12,
          bio: user.bio || '',
          location: user.location || undefined,
          profilePhoto: user.profilePhoto || undefined,
        }
        setProfile(cgProfile)
        setLoggedIn(true)
        refreshDocs()
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
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'accepted' as const } : r))
    if (!usingDemoRequests) {
      try { await updateBookingStatus(requestId, 'accepted') } catch (e) { console.error(e) }
    }
  }

  const handleDeclineRequest = async (requestId: number) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'declined' as const } : r))
    if (!usingDemoRequests) {
      try { await updateBookingStatus(requestId, 'declined') } catch (e) { console.error(e) }
    }
  }

  const handleUpdateProfile = async (data: any) => {
    if (!profile) return
    // Always update local React state immediately for responsive UI
    setProfile(prev => prev ? { ...prev, ...data } : prev)
    try {
      const cgToken = typeof window !== 'undefined' ? (localStorage.getItem('cgp_token') || '') : ''
      if (cgToken) {
        // D1-backed: self-registered caregiver
        const payload: any = { token: cgToken }
        if (data.firstName !== undefined || data.lastName !== undefined) {
          const p = profile as any
          payload.name = `${data.firstName ?? p.firstName ?? ''} ${data.lastName ?? p.lastName ?? ''}`.trim()
        }
        if (data.bio !== undefined)           payload.bio = data.bio
        if (data.hourlyRate !== undefined)    payload.hourlyRate = data.hourlyRate
        if (data.phone !== undefined)         payload.phone = data.phone
        if (data.location !== undefined)      { payload.city = data.location?.city || ''; payload.state = data.location?.state || '' }
        if (data.languages !== undefined)     payload.languages = data.languages
        if (data.skills !== undefined)        payload.skills = data.skills
        if (data.certifications !== undefined) payload.certifications = data.certifications
        if (data.profilePhoto !== undefined)  payload.photoUrl = data.profilePhoto
        const res = await fetch('https://gotocare-original.jjioji.workers.dev/api/caregiver-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await res.json()
        if (!result.success) console.error('D1 profile save failed:', result.error)
      } else {
        // Payload CMS: agency-registered caregiver
        await updateProfile(profile.id, data)
      }
    } catch (e) {
      console.error('Profile update failed:', e)
    }
  }

  const handleMarketplaceAuth = async (token: string, account: any) => {
    // Store session token from marketplace registration/login
    try {
      localStorage.setItem('cgp_token', token)
      localStorage.setItem('cgp_account', JSON.stringify(account))
      localStorage.setItem('cgp_auth_type', 'marketplace')
    } catch {}
    // Fetch fresh full profile from D1 (includes all new columns)
    let fullAccount = account
    try {
      const res = await fetch(`https://gotocare-original.jjioji.workers.dev/api/caregiver-account?token=${encodeURIComponent(token)}`)
      const data = await res.json()
      if (data.success && data.account) fullAccount = { ...account, ...data.account }
    } catch (e) { /* use passed account as fallback */ }
    const cgProfile: CaregiverProfile = {
      id: fullAccount.id || fullAccount.email,
      firstName: fullAccount.name?.split(' ')[0] || fullAccount.email?.split('@')[0] || 'Caregiver',
      lastName: fullAccount.name?.split(' ').slice(1).join(' ') || '',
      email: fullAccount.email || '',
      phone: fullAccount.phone || '',
      status: 'active',
      hourlyRate: fullAccount.hourlyRate || 0,
      skills: fullAccount.skills?.length ? fullAccount.skills : (fullAccount.careTypes?.length ? fullAccount.careTypes : (fullAccount.care_types ? fullAccount.care_types.split(',').map((s: string) => s.trim()) : [])),
      languages: Array.isArray(fullAccount.languages) ? fullAccount.languages : [],
      rating: 4.8,
      totalJobs: 0,
      totalReviews: 0,
      bio: fullAccount.bio || '',
      location: (fullAccount.city) ? { city: fullAccount.city, state: fullAccount.state || '' } : (fullAccount.zipCode ? { city: fullAccount.zipCode, state: '' } : undefined),
      profilePhoto: fullAccount.photoUrl || fullAccount.profilePhoto || undefined,
      certifications: Array.isArray(fullAccount.certifications) ? fullAccount.certifications : [],
    }
    setProfile(cgProfile)
    setLoggedIn(true)

    // Fetch real booking requests for this caregiver (use D1 account id)
    try {
      const cgId = fullAccount.id
      if (cgId) {
        const bookingsRes = await fetch(
          `https://gotocare-original.jjioji.workers.dev/api/caregiver-bookings?token=${encodeURIComponent(token)}`
        )
        const bookingsData = await bookingsRes.json()
        if (bookingsData?.bookings && bookingsData.bookings.length > 0) {
          setRequests(bookingsData.bookings.map(mapBookingToRequest))
          setUsingDemoRequests(false)
        }
      }
    } catch (e) { /* keep demo requests */ }
  }

  if (!loggedIn) {
    return (
      <LoginScreen
        onMarketplaceAuth={handleMarketplaceAuth}
        onAgencyLogin={handleLogin}
        agencyError={loginError}
        agencyLoading={loginLoading}
      />
    )
  }

  const pendingRequestCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        <div className="tab-content max-w-lg mx-auto">
          <React.Suspense fallback={<TabSpinner />}>
          {activeTab === 'home' && (
            <HomeTab
              profile={profile}
              shifts={shifts}
              timesheets={timesheets}
              requests={requests}
              loading={loading}
              documents={documents}
              onNavigateToRequests={() => setActiveTab('requests')}
              onNavigateToSchedule={() => setActiveTab('schedule')}
              onNavigateToEarnings={() => setActiveTab('earnings')}
              onNavigateToProfile={() => setActiveTab('profile')}
              onNavigateToSection={handleNavigateToSection}
              onClockIn={handleClockIn}
              onTimerUpdate={refreshDocs}
            />
          )}
          {activeTab === 'schedule' && (
            <ScheduleTab shifts={shifts} loading={loading} onClockIn={handleClockIn} onTimerUpdate={refreshDocs} />
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
            <ProfileTab
              profile={profile}
              documents={documents}
              onLogout={handleLogout}
              onUpdateProfile={handleUpdateProfile}
              onDocumentsChange={refreshDocs}
              deepLink={profileDeepLink}
              initialSection={profileInitialSection}
              onNavigateHome={() => { setActiveTab('home'); setProfileDeepLink(undefined); setProfileInitialSection(undefined); }}
            />
          )}
          </React.Suspense>
        </div>
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        requestCount={pendingRequestCount}
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
