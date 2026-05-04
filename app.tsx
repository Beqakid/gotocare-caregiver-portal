// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { CaregiverProfile, Shift, Timesheet, CareRequest, TabType, CaregiverDocument } from './types'
import { login, fetchCaregiverProfile, fetchShifts, fetchTimesheets, fetchBookings, updateBookingStatus, clockIn, clockOut, updateProfile, clearAuth, validateMarketplaceToken, saveCaregiverSetup } from './utils/api'
import { getDocuments, refreshDocumentStatuses } from './utils/storage'
import { saveMarketplaceAuth, getMarketplaceToken, getMarketplaceAccount, getAuthType, clearMarketplaceAuth, updateMarketplaceAccount } from './utils/auth'
import { LoginScreen } from './components/LoginScreen'
import { OnboardingScreen } from './components/OnboardingScreen'
import { HomeTab } from './components/HomeTab'
import { ScheduleTab } from './components/ScheduleTab'
import { RequestsTab } from './components/RequestsTab'
import { EarningsTab } from './components/EarningsTab'
import { ProfileTab } from './components/ProfileTab'
import { BottomNav } from './components/BottomNav'

type AppState = 'checking' | 'guest' | 'marketplace_setup' | 'logged_in'

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

function marketplaceAccountToProfile(account: any): CaregiverProfile {
  const nameParts = (account.name || '').split(' ')
  return {
    id: account.id,
    firstName: nameParts[0] || account.email?.split('@')[0] || 'Caregiver',
    lastName: nameParts.slice(1).join(' ') || '',
    email: account.email || '',
    phone: account.phone || '',
    status: 'active',
    hourlyRate: 25,
    skills: account.careTypes || [],
    languages: ['English'],
    rating: 4.8,
    totalJobs: 0,
    totalReviews: 0,
    bio: account.bio || '',
    location: account.zipCode ? `Zip: ${account.zipCode}` : undefined,
    profilePhoto: account.photoUrl || undefined,
  }
}

const App: React.FC<{}> = () => {
  const [appState, setAppState] = useState<AppState>('checking')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [profile, setProfile] = useState<CaregiverProfile | null>(null)
  const [marketplaceAccount, setMarketplaceAccount] = useState<any>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [requests, setRequests] = useState<CareRequest[]>(DEMO_REQUESTS)
  const [usingDemoRequests, setUsingDemoRequests] = useState(true)
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<CaregiverDocument[]>(getDocuments())

  const refreshDocs = () => setDocuments(refreshDocumentStatuses())

  // On mount: check for saved auth
  useEffect(() => {
    const checkAuth = async () => {
      const authType = getAuthType()

      if (authType === 'marketplace') {
        const token = getMarketplaceToken()
        const savedAccount = getMarketplaceAccount()
        if (token && savedAccount) {
          // Validate token with backend
          try {
            const res = await validateMarketplaceToken(token)
            if (res.success && res.account) {
              const account = res.account
              saveMarketplaceAuth(token, account)
              setMarketplaceAccount(account)
              setProfile(marketplaceAccountToProfile(account))
              setAppState(account.setupComplete ? 'logged_in' : 'marketplace_setup')
            } else {
              // Token invalid
              clearMarketplaceAuth()
              setAppState('guest')
            }
          } catch {
            // Network error — use cached data
            if (savedAccount.setupComplete) {
              setMarketplaceAccount(savedAccount)
              setProfile(marketplaceAccountToProfile(savedAccount))
              setAppState('logged_in')
            } else {
              setAppState('marketplace_setup')
            }
          }
        } else {
          setAppState('guest')
        }
      } else {
        // No auth type — check for legacy Payload token in localStorage
        const legacyToken = localStorage.getItem('payload-token')
        if (legacyToken) {
          // Trust it (Payload verifies on each request)
          // But we don't have the user data without re-fetching
          // Just show guest for now — agency caregivers will log in normally
          setAppState('guest')
        } else {
          setAppState('guest')
        }
      }

      refreshDocs()
    }

    checkAuth()
  }, [])

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
    if (appState !== 'logged_in' || !profile) return
    const params = new URLSearchParams(window.location.search)
    const unlockedBookingId = params.get('booking_unlocked')
    const subscriptionSuccess = params.get('subscription')
    if (unlockedBookingId || subscriptionSuccess === 'success') {
      loadData(profile.id)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [appState, profile, loadData])

  // ── Marketplace auth handler (called from LoginScreen after Google/email auth) ──
  const handleMarketplaceAuth = (token: string, account: any) => {
    saveMarketplaceAuth(token, account)
    setMarketplaceAccount(account)
    setProfile(marketplaceAccountToProfile(account))
    if (account.setupComplete) {
      setAppState('logged_in')
      loadData(account.id)
    } else {
      setAppState('marketplace_setup')
    }
  }

  // ── Onboarding complete ──
  const handleOnboardingComplete = async (zipCode: string, careTypes: string[]) => {
    const token = getMarketplaceToken()
    if (!token) return
    setOnboardingLoading(true)
    try {
      const res = await saveCaregiverSetup(token, zipCode, careTypes)
      if (res.success) {
        const updatedAccount = { ...marketplaceAccount, zipCode, careTypes, setupComplete: true }
        updateMarketplaceAccount({ zipCode, careTypes, setupComplete: true })
        setMarketplaceAccount(updatedAccount)
        setProfile(prev => prev ? { ...prev, skills: careTypes, location: `Zip: ${zipCode}` } : prev)
        setAppState('logged_in')
        loadData(marketplaceAccount.id)
      }
    } catch (e) {
      console.error('Setup failed:', e)
    } finally {
      setOnboardingLoading(false)
    }
  }

  // ── Agency login handler (legacy Payload auth) ──
  const handleAgencyLogin = async (email: string, password: string) => {
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
          hourlyRate: 25,
          skills: user.skills || ['Elder Care', 'Dementia Care', 'Companionship', 'Medication Management'],
          languages: ['English'],
          rating: 4.8,
          totalJobs: 47,
          totalReviews: 12,
          bio: user.bio || '',
          location: user.location || undefined,
          profilePhoto: user.profilePhoto || undefined,
        }
        setProfile(cgProfile)
        setAppState('logged_in')
        refreshDocs()
        await loadData(cgProfile.id)
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
    clearMarketplaceAuth()
    setAppState('guest')
    setProfile(null)
    setMarketplaceAccount(null)
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
    try {
      // For marketplace accounts, update locally and persist to backend
      if (getAuthType() === 'marketplace') {
        updateMarketplaceAccount(data)
        setMarketplaceAccount(prev => prev ? { ...prev, ...data } : prev)
      } else {
        await updateProfile(profile.id, data)
      }
      setProfile(prev => prev ? { ...prev, ...data } : prev)
    } catch (e) {
      console.error('Profile update failed:', e)
    }
  }

  // ── Render states ──

  if (appState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-sm text-base-content/40">Loading your workspace…</p>
        </div>
      </div>
    )
  }

  if (appState === 'guest') {
    return (
      <LoginScreen
        onMarketplaceAuth={handleMarketplaceAuth}
        onAgencyLogin={handleAgencyLogin}
        agencyError={loginError}
        agencyLoading={loginLoading}
      />
    )
  }

  if (appState === 'marketplace_setup') {
    return (
      <OnboardingScreen
        name={marketplaceAccount?.name || ''}
        onComplete={handleOnboardingComplete}
        loading={onboardingLoading}
      />
    )
  }

  // logged_in
  const pendingRequestCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        <div className="tab-content max-w-lg mx-auto">
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
            />
          )}
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
