// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { CaregiverProfile, Shift, Timesheet, CareRequest, TabType, CaregiverDocument } from './types'
import { login, fetchCaregiverProfile, fetchShifts, fetchTimesheets, fetchBookings, updateBookingStatus, clockIn, clockOut, updateProfile, clearAuth } from './utils/api'
import { cloudSetActiveTimer } from './utils/cloud-api'
import { getDocuments, refreshDocumentStatuses } from './utils/storage'
import { LoginScreen } from './components/LoginScreen'
import { BottomNav } from './components/BottomNav'

// Module-level API base URL (used in useEffect hooks below)
const API_BASE = 'https://gotocare-original.jjioji.workers.dev'

// SECURITY (RISK-02 + RISK-06): Authenticated fetch wrapper
// - Sends Authorization: Bearer <token> header on every call
// - Triggers auto-logout when backend returns 401
let _autoLogout: (() => void) | null = null
function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = (typeof localStorage !== 'undefined' ? localStorage.getItem('cgp_token') : '') || ''
  const existingHeaders = (init?.headers as Record<string, string>) || {}
  const headers: Record<string, string> = { ...existingHeaders }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...init, headers }).then(res => {
    if (res.status === 401 && _autoLogout) { _autoLogout(); }
    return res
  })
}

// ── Push Notification Helpers ───────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

async function registerPushNotifications(token: string): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    const keyRes = await fetch(`${API_BASE}/api/vapid-public-key`)
    const keyData = await keyRes.json() as any
    if (!keyData.publicKey) return
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    })
    const subJson = subscription.toJSON()
    await fetch(`${API_BASE}/api/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh || null,
        auth: subJson.keys?.auth || null,
        user_agent: navigator.userAgent,
      }),
    })
  } catch (_) {
    // Push registration is best-effort — never crash the app
  }
}
// ────────────────────────────────────────────────────────────────────────────

// Lazy-load tabs — each becomes a separate JS chunk (~150-250KB each)
const HomeTab = React.lazy(() => import('./components/HomeTab').then(m => ({ default: m.HomeTab })))
const ScheduleTab = React.lazy(() => import('./components/ScheduleTab').then(m => ({ default: m.ScheduleTab })))
const RequestsTab = React.lazy(() => import('./components/RequestsTab').then(m => ({ default: m.RequestsTab })))
const MarketingTab = React.lazy(() => import('./components/MarketingTab'))
const EarningsTab = React.lazy(() => import('./components/EarningsTab').then(m => ({ default: m.EarningsTab })))
const ProfileTab = React.lazy(() => import('./components/ProfileTab').then(m => ({ default: m.ProfileTab })))
const PublicProfileView = React.lazy(() => import('./components/PublicProfileView'))
const ReviewLinkView = React.lazy(() => import('./components/ReviewLinkView'))

const VALID_TABS: TabType[] = ['home', 'schedule', 'requests', 'earnings', 'profile', 'marketing']

function shiftClientName(shift?: Shift): string {
  const client = shift?.client
  if (!client) return 'Client'
  if (typeof client === 'object') {
    return `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim()
      || client.name
      || client.email
      || 'Client'
  }
  return `Client #${client}`
}

function shiftClientEmail(shift?: Shift): string {
  const client = shift?.client
  if (!client || typeof client !== 'object') return ''
  return client.email || client.clientEmail || client.client_email || ''
}

const TabSpinner = () => (
  <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh'}}>
    <div style={{width:40,height:40,border:'3px solid rgba(124,92,255,0.2)',borderTopColor:'#7C5CFF',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
  </div>
)

// Sample requests are intentionally kept out of production state so caregivers
// never see fake jobs as active opportunities.
const SAMPLE_REQUESTS: CareRequest[] = [
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

function getTabFromLocation(): TabType {
  try {
    const params = new URLSearchParams(window.location.search)
    const queryTab = params.get('tab') as TabType | null
    if (queryTab && VALID_TABS.includes(queryTab)) return queryTab
    const hash = window.location.hash.replace('#', '') as TabType
    if (VALID_TABS.includes(hash)) return hash
    return 'home'
  } catch { return 'home' }
}

const App: React.FC<{}> = () => {
  const [publicCaregiverId] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('caregiver')
    } catch { return null }
  })
  const [reviewCaregiverId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('reviewCaregiver') || params.get('review')
    } catch { return null }
  })
  const [verifyToken] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('verify') } catch { return null }
  })
  const [verifyStatus, setVerifyStatus] = useState<null | 'pending' | 'success' | 'error'>(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('verify') ? 'pending' : null
  )
  const [verifyMessage, setVerifyMessage] = useState('')
  const sessionRestored = React.useRef(!!localStorage.getItem('cgp_token'))
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('cgp_token'))
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromLocation)

  const navigateToTab = useCallback((tab: TabType) => {
    setActiveTab(tab)
    try { window.history.pushState({ tab }, '', '#' + tab) } catch {}
  }, [])

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      try {
        const tab = e.state?.tab as TabType
        if (tab && VALID_TABS.includes(tab)) {
          setActiveTab(tab)
        } else {
          setActiveTab(getTabFromLocation())
        }
      } catch {}
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const onNotificationClick = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: TabType }>).detail?.tab
      if (tab && VALID_TABS.includes(tab)) navigateToTab(tab)
    }
    window.addEventListener('carehia:notification-click', onNotificationClick)
    return () => window.removeEventListener('carehia:notification-click', onNotificationClick)
  }, [navigateToTab])

  const [profileDeepLink, setProfileDeepLink] = useState<string | undefined>(undefined)
  const [profileInitialSection, setProfileInitialSection] = useState<'profile' | 'documents' | 'badges' | undefined>(undefined)

  const handleNavigateToSection = (section: 'profile' | 'documents', scrollTo: string) => {
    setProfileInitialSection(section)
    setProfileDeepLink(scrollTo)
    navigateToTab('profile')
  }
  const [returnedSubscription, setReturnedSubscription] = useState(false)
  const [profile, setProfile] = useState<CaregiverProfile | null>(() => {
    try {
      const saved = localStorage.getItem('cgp_account')
      if (!saved) return null
      const parsed = JSON.parse(saved)
      if (parsed && !parsed.firstName && parsed.name) {
        parsed.firstName = parsed.name.split(' ')[0] || parsed.email?.split('@')[0] || 'Caregiver'
        parsed.lastName = parsed.name.split(' ').slice(1).join(' ') || ''
      }
      return parsed
    } catch { return null }
  })
  const [shifts, setShifts] = useState<Shift[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [requests, setRequests] = useState<CareRequest[]>([])
  const [usingDemoRequests, setUsingDemoRequests] = useState(false)
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<CaregiverDocument[]>(getDocuments())

  // ── Notification inbox ──────────────────────────────────────────────────
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cgp_notifications') || '[]') } catch { return [] }
  })
  const [showNotifPanel, setShowNotifPanel] = useState(false)

  const addNotification = useCallback((notif) => {
    setNotifications(prev => {
      const updated = [notif, ...prev].slice(0, 50)
      try { localStorage.setItem('cgp_notifications', JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }))
      try { localStorage.setItem('cgp_notifications', JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])
  // ────────────────────────────────────────────────────────────────────────

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
      setRequests((bookingsRes?.bookings || []).map(mapBookingToRequest))
      setUsingDemoRequests(false)
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle email verification token in URL
  useEffect(() => {
    if (!verifyToken) return
    fetch(`${API_BASE}/api/caregiver-verify-email?token=${encodeURIComponent(verifyToken)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setVerifyStatus('success')
          setVerifyMessage(d.name ? `Welcome, ${d.name}! Your email is verified.` : 'Email verified! You can now sign in.')
        } else {
          setVerifyStatus('error')
          setVerifyMessage(d.error || 'Verification failed. The link may have expired.')
        }
        try { window.history.replaceState({}, '', window.location.pathname) } catch {}
      })
      .catch(() => {
        setVerifyStatus('error')
        setVerifyMessage('Network error. Please try again.')
      })
  }, [verifyToken])

  // Handle Stripe return URLs
  useEffect(() => {
    if (!loggedIn || !profile) return
    const params = new URLSearchParams(window.location.search)
    const unlockedBookingId = params.get('booking_unlocked')
    const subscriptionSuccess = params.get('subscription')
    if (unlockedBookingId) {
      navigateToTab('requests')
      loadData(profile.id)
      window.history.replaceState({ tab: 'requests' }, '', '#requests')
    } else if (subscriptionSuccess === 'success') {
      setReturnedSubscription(true)
      navigateToTab('profile')
      window.history.replaceState({ tab: 'profile' }, '', '#profile')
    }
  }, [loggedIn, profile, loadData])

  // Refresh document statuses on mount
  useEffect(() => { refreshDocs() }, [])

  // Phase 3 fix: Re-fetch bookings when home tab becomes active so counts stay in sync with RequestsTab
  useEffect(() => {
    if (activeTab !== 'home') return
    if (!localStorage.getItem('cgp_token')) return
    // SECURITY (RISK-02): use authFetch — Bearer header, no token in URL
    authFetch(`${API_BASE}/api/caregiver-bookings`)
      .then(r => r.json())
      .then(d => { if (d?.bookings) { setRequests(d.bookings.map(mapBookingToRequest)); setUsingDemoRequests(false) } })
      .catch(() => {})
  }, [activeTab])

  // Listen for push notification messages from SW → update in-app inbox
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NEW_NOTIFICATION' && event.data.notification) {
        addNotification(event.data.notification)
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [addNotification])

  // Fetch real rating + jobs stats after login/session restore
  useEffect(() => {
    if (!loggedIn) return
    if (!localStorage.getItem('cgp_token')) return
    // SECURITY (RISK-02): use authFetch — Bearer header, no token in URL
    authFetch(`${API_BASE}/api/caregiver-account`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.account) {
          setProfile(prev => prev ? {
            ...prev,
            rating: d.account.avgRating || null,
            totalJobs: d.account.totalJobs || 0,
            totalReviews: d.account.reviewCount || 0,
          } : prev)
        }
      })
      .catch(() => {})
  }, [loggedIn])

  useEffect(() => {
    if (loggedIn) {
      if (sessionRestored.current) {
        sessionRestored.current = false
        return
      }
      try { window.history.replaceState({ tab: 'home' }, '', '#home') } catch {}
      setActiveTab('home')
    }
  }, [loggedIn])

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
          rating: null,
          totalJobs: 0,
          totalReviews: 0,
          bio: user.bio || '',
          location: user.location || undefined,
          profilePhoto: user.profilePhoto || undefined,
        }
        try {
          localStorage.setItem('cgp_token', result.token)
          localStorage.setItem('cgp_account', JSON.stringify(cgProfile))
          localStorage.setItem('cgp_auth_type', 'agency')
        } catch {}
        setProfile(cgProfile)
        setLoggedIn(true)
        registerPushNotifications(result.token).catch(() => {})
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
    setRequests([])
    setUsingDemoRequests(false)
    setActiveTab('home')
    try { window.history.replaceState({}, '', window.location.pathname) } catch {}
  }
  // SECURITY (RISK-06): Register auto-logout handler for authFetch 401 responses
  React.useEffect(() => { _autoLogout = handleLogout; return () => { _autoLogout = null } }, [])

  const handleClockIn = async (shiftId: number) => {
    try {
      const shift = shifts.find(s => Number(s.id) === Number(shiftId))
      const startedAt = new Date().toISOString()
      await clockIn(shiftId)
      await cloudSetActiveTimer({
        clientName: shiftClientName(shift),
        clientEmail: shiftClientEmail(shift),
        startTime: startedAt,
        hourlyRate: profile?.hourlyRate || 25,
        billingType: 'hourly',
        notes: shift?.notes || 'Scheduled shift',
        shiftId,
      })
      if (profile) await loadData(profile.id)
    } catch (e) {
      console.error('Clock in failed:', e)
    }
  }

  const handleClockOut = async (timesheetId: number) => {
    try {
      await clockOut(timesheetId, profile?.hourlyRate || 25)
      await cloudSetActiveTimer(null)
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
    setProfile(prev => prev ? { ...prev, ...data } : prev)
    try {
      const cgToken = typeof window !== 'undefined' ? (localStorage.getItem('cgp_token') || '') : ''
      if (cgToken) {
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
        await updateProfile(profile.id, data)
      }
    } catch (e) {
      console.error('Profile update failed:', e)
    }
  }

  const handleMarketplaceAuth = async (token: string, account: any) => {
    try {
      localStorage.setItem('cgp_token', token)
      localStorage.setItem('cgp_auth_type', 'marketplace')
    } catch {}
    let fullAccount = account
    try {
      const res = await fetch(`${API_BASE}/api/caregiver-account?token=${encodeURIComponent(token)}`)
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
      rating: null,
      totalJobs: 0,
      totalReviews: 0,
      bio: fullAccount.bio || '',
      location: (fullAccount.city) ? { city: fullAccount.city, state: fullAccount.state || '' } : (fullAccount.zipCode ? { city: fullAccount.zipCode, state: '' } : undefined),
      profilePhoto: fullAccount.photoUrl || fullAccount.profilePhoto || undefined,
      certifications: Array.isArray(fullAccount.certifications) ? fullAccount.certifications : [],
    }
    try { localStorage.setItem('cgp_account', JSON.stringify(cgProfile)) } catch {}
    setProfile(cgProfile)
    setLoggedIn(true)
    registerPushNotifications(token).catch(() => {})

    try {
      const cgId = fullAccount.id
      if (cgId) {
        const bookingsRes = await fetch(
          `${API_BASE}/api/caregiver-bookings?token=${encodeURIComponent(token)}`
        )
        const bookingsData = await bookingsRes.json()
        if (bookingsData?.bookings && bookingsData.bookings.length > 0) {
          setRequests(bookingsData.bookings.map(mapBookingToRequest))
          setUsingDemoRequests(false)
        }
      }
    } catch (e) { /* keep demo requests */ }
  }

  // Email verification screen
  if (verifyStatus) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1e1b4b 0%, #2d1b69 40%, #0f2a5e 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
      }}>
        <div style={{
          width: '100%', maxWidth: '380px',
          background: 'rgba(255,255,255,0.09)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: '28px', padding: '32px 24px',
          textAlign: 'center',
        }}>
          {verifyStatus === 'pending' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#9203;</div>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Verifying your email&#8230;</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Just a moment</p>
            </>
          )}
          {verifyStatus === 'success' && (
            <>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>&#9989;</div>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Email Verified!</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', marginBottom: '28px' }}>{verifyMessage}</p>
              <button
                onClick={() => setVerifyStatus(null)}
                style={{
                  width: '100%', padding: '13px', borderRadius: '50px',
                  background: 'linear-gradient(135deg, #7C5CFF, #4A90E2)',
                  border: 'none', cursor: 'pointer',
                  fontSize: '15px', fontWeight: 700, color: '#ffffff',
                  boxShadow: '0 4px 16px rgba(124,92,255,0.35)',
                }}
              >
                Sign In to Carehia
              </button>
            </>
          )}
          {verifyStatus === 'error' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#10060;</div>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Verification Failed</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '24px' }}>{verifyMessage}</p>
              <button
                onClick={() => setVerifyStatus(null)}
                style={{
                  width: '100%', padding: '13px', borderRadius: '50px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer', fontSize: '14px', color: 'rgba(255,255,255,0.7)',
                }}
              >
                Back to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Public profile route — no login required
  if (reviewCaregiverId) {
    return (
      <React.Suspense fallback={<TabSpinner />}>
        <ReviewLinkView caregiverId={reviewCaregiverId} onBack={() => { window.location.href = window.location.origin }} />
      </React.Suspense>
    )
  }

  if (publicCaregiverId) {
    return (
      <React.Suspense fallback={<TabSpinner />}>
        <PublicProfileView caregiverId={publicCaregiverId} onBack={() => { window.location.href = window.location.origin }} />
      </React.Suspense>
    )
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
  const unreadNotifCount = notifications.filter(n => !n.read).length

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-base-100, #f5f3ff)' }}>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 80 }}>
        <div style={{ maxWidth: 512, margin: '0 auto' }}>
          <React.Suspense fallback={<TabSpinner />}>
          {activeTab === 'home' && (
            <HomeTab
              profile={profile}
              shifts={shifts}
              timesheets={timesheets}
              requests={requests}
              loading={loading}
              documents={documents}
              notifCount={unreadNotifCount}
              onBellPress={() => { setShowNotifPanel(true); markAllRead() }}
              onNavigateToRequests={() => navigateToTab('requests')}
              onNavigateToSchedule={() => navigateToTab('schedule')}
              onNavigateToEarnings={() => navigateToTab('earnings')}
              onNavigateToProfile={() => navigateToTab('profile')}
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
              returnedSubscription={returnedSubscription}
              onNavigateHome={() => { navigateToTab('home'); setProfileDeepLink(undefined); setProfileInitialSection(undefined); }}
            />
          )}
          {activeTab === 'marketing' && (
            <React.Suspense fallback={<div style={{color:'#fff',textAlign:'center',padding:40}}>Loading...</div>}>
              <MarketingTab userEmail={profile?.email || ''} />
            </React.Suspense>
          )}
          </React.Suspense>
        </div>
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={navigateToTab}
        requestCount={pendingRequestCount}
      />

      {/* ── In-App Notification Panel ──────────────────────────────────── */}
      {showNotifPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={() => setShowNotifPanel(false)}
          />
          {/* Panel */}
          <div style={{
            position: 'relative', background: '#ffffff', borderRadius: '24px 24px 0 0',
            maxHeight: '72vh', overflowY: 'auto', padding: '20px 20px 40px',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, margin: 0, color: '#0f172a' }}>Notifications</h2>
              <button
                onClick={() => setShowNotifPanel(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b', padding: 4, lineHeight: 1 }}
              >
                &#x2715;
              </button>
            </div>
            {/* Empty state */}
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>&#x1F514;</div>
                <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>No notifications yet</p>
                <p style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>New care requests will appear here</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {notifications.map((n) => (
                  <div key={n.id} style={{
                    background: n.read ? '#f8fafc' : '#f0ebff',
                    border: `1px solid ${n.read ? '#e2e8f0' : 'rgba(124,92,255,0.25)'}`,
                    borderRadius: 16, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: n.read ? 500 : 700, fontSize: 14, margin: '0 0 4px', color: '#0f172a' }}>{n.title}</p>
                        <p style={{ fontSize: 13, margin: '0 0 6px', color: '#475569', lineHeight: '1.4' }}>{n.body}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                          {new Date(n.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.read && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C5CFF', flexShrink: 0, marginTop: 3 }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
