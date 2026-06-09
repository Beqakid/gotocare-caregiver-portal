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
const TrustPassport = React.lazy(() => import('./components/TrustPassport').then(m => ({ default: m.TrustPassport })))

const VALID_TABS: TabType[] = ['home', 'schedule', 'requests', 'earnings', 'profile', 'marketing']
const LAST_TAB_KEY = 'cgp_last_tab'

// ── Phase 26B: Caregiver Pending Subscription Action Helpers ─────────────────
const CGP_PENDING_KEY        = 'cgp_pending_subscription_action'
const CGP_PENDING_BACKUP_KEY = 'cgp_pending_subscription_action_backup'

type CaregiverPendingActionContext = {
  action: 'respond_to_request' | 'unlock_request' | 'accept_request' | 'create_invoice' | 'send_invoice' | 'boost_profile' | 'continue_trust_passport' | 'view_client_contact' | 'priority_visibility'
  requestId?: string | number
  invoiceId?: string | number
  clientId?: string | number
  trustModuleId?: string
  plan?: string
  returnTab?: 'today' | 'work' | 'money' | 'profile'
  returnView?: string
  createdAt: string
  source: 'caregiver_subscription_unlock'
}

function saveCaregiverPendingSubscriptionAction(ctx: CaregiverPendingActionContext): void {
  const str = JSON.stringify(ctx)
  try { sessionStorage.setItem(CGP_PENDING_KEY, str) } catch {}
  try { localStorage.setItem(CGP_PENDING_BACKUP_KEY, str) } catch {}
}

function readCaregiverPendingSubscriptionAction(): CaregiverPendingActionContext | null {
  const sources: Array<() => string | null> = [
    () => { try { return sessionStorage.getItem(CGP_PENDING_KEY) } catch { return null } },
    () => { try { return localStorage.getItem(CGP_PENDING_BACKUP_KEY) } catch { return null } },
  ]
  for (const src of sources) {
    const raw = src()
    if (!raw) continue
    try {
      const ctx = JSON.parse(raw) as CaregiverPendingActionContext
      if (ctx?.source === 'caregiver_subscription_unlock') return ctx
    } catch {}
  }
  return null
}

function clearCaregiverPendingSubscriptionAction(): void {
  try { sessionStorage.removeItem(CGP_PENDING_KEY) } catch {}
  try { localStorage.removeItem(CGP_PENDING_BACKUP_KEY) } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

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
    // Phase 26B: caregiver subscription return — route to the correct tab immediately
    const subStatus = params.get('subscription')
    const subRole   = params.get('role')
    if (subStatus && subRole === 'caregiver') {
      const rt = params.get('return_tab')
      const tabMap: Record<string, TabType> = { work: 'schedule', today: 'home', money: 'earnings', profile: 'profile' }
      if (rt && tabMap[rt]) return tabMap[rt]
      // fallback: read from localStorage backup
      try {
        const raw = localStorage.getItem(CGP_PENDING_BACKUP_KEY)
        if (raw) {
          const ctx = JSON.parse(raw) as CaregiverPendingActionContext
          if (ctx?.returnTab && tabMap[ctx.returnTab]) return tabMap[ctx.returnTab]
        }
      } catch {}
      return 'schedule'
    }
    const queryTab = params.get('tab') as TabType | null
    // Phase 7: 'requests' is now a sub-tab inside Work; map to 'schedule' for initial render
    if (queryTab && VALID_TABS.includes(queryTab)) return queryTab === 'requests' ? 'schedule' : queryTab
    const hash = window.location.hash.replace('#', '') as TabType
    if (VALID_TABS.includes(hash)) return hash === 'requests' ? 'schedule' : hash
    if (localStorage.getItem('cgp_token')) {
      const savedTab = localStorage.getItem(LAST_TAB_KEY) as TabType | null
      if (savedTab && VALID_TABS.includes(savedTab)) return savedTab === 'requests' ? 'schedule' : savedTab
    }
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
  // Phase 20: capture invite/referral URL params
  const [p20InviteCode] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('invite') } catch { return null }
  })
  const [p20RefCode] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('ref') } catch { return null }
  })
  const [p20Campaign] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('campaign') } catch { return null }
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

  // Phase 7: work hub initial view signal — 'requests' when navigating from Today/Stripe/notifications
  // Initialized lazily so deep-linking to #requests also works on first load
  const [workInitialView, setWorkInitialView] = useState<'requests' | undefined>(() => {
    try {
      const hash = window.location.hash.replace('#', '')
      const params = new URLSearchParams(window.location.search)
      if (hash === 'requests' || params.get('tab') === 'requests') return 'requests'
    } catch {}
    return undefined
  })

  const navigateToTab = useCallback((tab: TabType) => {
    // Phase 7: 'requests' is merged into Work — redirect to Work with Requests sub-tab active
    if (tab === 'requests') {
      setWorkInitialView('requests')
      setActiveTab('schedule')
      try {
        localStorage.setItem(LAST_TAB_KEY, 'schedule')
        window.history.pushState({ tab: 'schedule' }, '', '#schedule')
      } catch {}
      return
    }
    // Tapping Work directly resets the initial view (let ScheduleTab restore its own saved view)
    if (tab === 'schedule') {
      setWorkInitialView(undefined)
    }
    setActiveTab(tab)
    try {
      localStorage.setItem(LAST_TAB_KEY, tab)
      window.history.pushState({ tab }, '', '#' + tab)
    } catch {}
  }, [])

  useEffect(() => {
    const syncTabFromLocation = (stateTab?: TabType) => {
      try {
        let nextTab = (stateTab && VALID_TABS.includes(stateTab)) ? stateTab : getTabFromLocation()
        // Phase 7: 'requests' is merged into Work — redirect to schedule + open Requests sub-tab
        if (nextTab === 'requests') {
          nextTab = 'schedule'
          setWorkInitialView('requests')
        }
        setActiveTab(nextTab)
        localStorage.setItem(LAST_TAB_KEY, nextTab)
      } catch {}
    }
    const onPop = (e: PopStateEvent) => syncTabFromLocation(e.state?.tab as TabType | undefined)
    const onHashChange = () => syncTabFromLocation()
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    try { localStorage.setItem(LAST_TAB_KEY, activeTab) } catch {}
  }, [loggedIn, activeTab])

  useEffect(() => {
    const onNotificationClick = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: TabType }>).detail?.tab
      if (tab && VALID_TABS.includes(tab)) navigateToTab(tab)
    }
    window.addEventListener('carehia:notification-click', onNotificationClick)
    return () => window.removeEventListener('carehia:notification-click', onNotificationClick)
  }, [navigateToTab])

  const [profileDeepLink, setProfileDeepLink] = useState<string | undefined>(undefined)
  const [profileInitialSection, setProfileInitialSection] = useState<'overview' | 'verification' | 'certifications' | 'documents' | 'badges' | 'settings' | undefined>(undefined)

  // Phase 5: Trust Passport overlay state
  const [showTrustPassport, setShowTrustPassport] = useState(false)
  const handleOpenTrustPassport = () => setShowTrustPassport(true)
  const handleCloseTrustPassport = () => setShowTrustPassport(false)

  const handleNavigateToSection = (section: 'overview' | 'verification' | 'certifications' | 'documents' | 'badges' | 'settings' | 'profile' | 'trust' | 'clients' | 'trust-passport', scrollTo: string) => {
    if (section === 'trust-passport') { setShowTrustPassport(true); return }
    const mappedSection = section === 'profile' || section === 'clients' ? 'overview' : section === 'trust' ? 'verification' : section
    setProfileInitialSection(mappedSection)
    setProfileDeepLink(scrollTo)
    navigateToTab('profile')
  }
  const [returnedSubscription, setReturnedSubscription] = useState(false)
  const [returnedBookingId, setReturnedBookingId] = useState<string | null>(null)
  // Phase 26B: caregiver subscription return state
  const [cgSubReturnState, setCgSubReturnState] = useState<null | 'confirming' | 'success' | 'failed' | 'cancelled'>(null)
  const [cgSubReturnMsg, setCgSubReturnMsg] = useState('')
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

  // Phase 15: mark single notification read
  const markOneRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n)
      try { localStorage.setItem('cgp_notifications', JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  // Phase 15: navigate from notification action label to correct tab
  const navigateFromNotification = useCallback((action?: string) => {
    setShowNotifPanel(false)
    switch (action) {
      case 'work_requests':
        setWorkInitialView('requests')
        setActiveTab('schedule')
        break
      case 'work_schedule':
        setWorkInitialView('schedule')
        setActiveTab('schedule')
        break
      case 'money':
        setActiveTab('earnings')
        break
      case 'trust_passport':
        setShowTrustPassport(true)
        break
      case 'profile':
        setActiveTab('profile')
        break
      case 'today':
      default:
        setActiveTab('home')
        break
    }
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

  // Handle Stripe return URLs (Phase 26B: full caregiver subscription restore)
  useEffect(() => {
    if (!loggedIn || !profile) return
    const params = new URLSearchParams(window.location.search)
    const unlockedBookingId  = params.get('booking_unlocked')
    const subscriptionStatus = params.get('subscription')
    const role               = params.get('role')

    if (unlockedBookingId) {
      setReturnedBookingId(unlockedBookingId)
      navigateToTab('requests')
      loadData(profile.id)
      window.history.replaceState({ tab: 'schedule' }, '', '#schedule')
      return
    }

    // Phase 26B: caregiver subscription return with full restore
    if (subscriptionStatus === 'success' && role === 'caregiver') {
      const sessionId     = params.get('session_id') || ''
      const actionFromUrl = params.get('caregiver_action') || 'unlock_request'
      const requestIdFromUrl = params.get('request_id') || ''
      const returnTabFromUrl = params.get('return_tab') || 'work'
      const returnViewFromUrl = params.get('return_view') || 'requests'

      // Read pending action (storage takes priority over URL)
      const stored = readCaregiverPendingSubscriptionAction()
      const effectiveCtx: CaregiverPendingActionContext = stored || {
        action: actionFromUrl as CaregiverPendingActionContext['action'],
        requestId: requestIdFromUrl || undefined,
        returnTab: returnTabFromUrl as CaregiverPendingActionContext['returnTab'],
        returnView: returnViewFromUrl,
        plan: 'unlimited',
        createdAt: new Date().toISOString(),
        source: 'caregiver_subscription_unlock',
      }

      // Route to correct tab immediately
      const tabMap: Record<string, TabType> = { work: 'schedule', today: 'home', money: 'earnings', profile: 'profile' }
      const targetTab = tabMap[effectiveCtx.returnTab || 'work'] || 'schedule'
      if (targetTab === 'schedule') setWorkInitialView('requests')
      setActiveTab(targetTab)
      window.history.replaceState({ tab: targetTab }, '', '#' + targetTab)

      setCgSubReturnState('confirming')
      setCgSubReturnMsg('Confirming your Carehia Pro access...')

      const token = localStorage.getItem('cgp_token') || '';
      (async () => {
        // Step 1: call confirm endpoint (best-effort)
        try {
          await fetch(`${API_BASE}/api/confirm-caregiver-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, sessionId }),
          })
        } catch {}

        // Step 2: retry subscription status check 3x with 1s gaps
        setCgSubReturnMsg('Almost done — confirming your upgrade...')
        let subscribed = false
        for (let i = 0; i < 3; i++) {
          try {
            const r = await fetch(`${API_BASE}/api/caregiver-subscription?token=${encodeURIComponent(token)}`)
            const d = await r.json() as any
            if (d.subscribed) { subscribed = true; break }
          } catch {}
          if (i < 2) await new Promise<void>(res => setTimeout(res, 1000))
        }

        if (subscribed) {
          // Step 3: resume — clear pending action, show message
          setReturnedSubscription(true)
          clearCaregiverPendingSubscriptionAction()
          const actionMsgMap: Record<string, string> = {
            respond_to_request: 'Your plan is active. You can now respond to this request.',
            unlock_request:     'All requests are now unlocked.',
            accept_request:     'Your plan is active. You can now accept this request.',
            create_invoice:     'Invoice tools unlocked. Continue your invoice.',
            send_invoice:       'Invoice tools unlocked.',
            boost_profile:      'Visibility tools unlocked.',
            priority_visibility:'Visibility tools unlocked.',
            continue_trust_passport: 'Continue your Trust Passport.',
            view_client_contact: 'Contact info is now available.',
          }
          const resumeMsg = actionMsgMap[effectiveCtx.action] || 'Your Carehia Pro access is now active.'
          setCgSubReturnMsg(resumeMsg)
          setCgSubReturnState('success')
          // Open Trust Passport if that was the action
          if (effectiveCtx.action === 'continue_trust_passport') {
            setTimeout(() => setShowTrustPassport(true), 600)
          }
          // Auto-dismiss after 4s
          setTimeout(() => setCgSubReturnState(null), 4000)
        } else {
          setCgSubReturnState('failed')
          setCgSubReturnMsg('We could not confirm your upgrade yet. If you just paid, wait a moment and try again.')
        }
      })()
      return
    }

    // Phase 26B: cancel return
    if (subscriptionStatus === 'cancelled' && role === 'caregiver') {
      const returnTabFromUrl = params.get('return_tab') || 'work'
      const tabMap: Record<string, TabType> = { work: 'schedule', today: 'home', money: 'earnings', profile: 'profile' }
      const targetTab = tabMap[returnTabFromUrl] || 'schedule'
      if (targetTab === 'schedule') setWorkInitialView('requests')
      setActiveTab(targetTab)
      window.history.replaceState({ tab: targetTab }, '', '#' + targetTab)
      setCgSubReturnState('cancelled')
      setCgSubReturnMsg('Checkout was cancelled. You can upgrade when you are ready.')
      setTimeout(() => setCgSubReturnState(null), 5000)
      return
    }

    // Legacy fallback (subscription=success without role=caregiver param)
    if (subscriptionStatus === 'success') {
      setReturnedSubscription(true)
      navigateToTab('requests')
      window.history.replaceState({ tab: 'schedule' }, '', '#schedule')
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
          setProfile(prev => {
            if (!prev) return prev
            const a = d.account
            const updated = {
              ...prev,
              // Phase 20 Bug #2: merge ALL profile fields from API on session restore
              phone: a.phone || prev.phone || '',
              bio: a.bio || prev.bio || '',
              hourlyRate: a.hourlyRate || prev.hourlyRate || 0,
              skills: (a.skills && a.skills.length > 0) ? a.skills : prev.skills || [],
              languages: (a.languages && a.languages.length > 0) ? a.languages : prev.languages || [],
              location: (a.city || a.state) ? { city: a.city || '', state: a.state || '', zipCode: a.zipCode || '' } : prev.location,
              profilePhoto: a.photoUrl || prev.profilePhoto || undefined,
              rating: a.avgRating || null,
              totalJobs: a.totalJobs || 0,
              totalReviews: a.reviewCount || 0,
              completenessScore: a.completenessScore ?? prev.completenessScore,
              missingFields: a.missingFields ?? prev.missingFields,
              isVisibleInSearch: a.isVisibleInSearch ?? prev.isVisibleInSearch,
            }
            try { localStorage.setItem('cgp_account', JSON.stringify(updated)) } catch {}
            return updated
          })
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
      try {
        localStorage.setItem(LAST_TAB_KEY, 'home')
        window.history.replaceState({ tab: 'home' }, '', '#home')
      } catch {}
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
    try {
      localStorage.removeItem(LAST_TAB_KEY)
      window.history.replaceState({}, '', window.location.pathname)
    } catch {}
  }
  // SECURITY (RISK-06): Register auto-logout handler for authFetch 401 responses
  // Phase 20: persist invite/ref codes to localStorage for registration
  React.useEffect(() => {
    try {
      if (p20InviteCode) localStorage.setItem('cgp_invite_code', p20InviteCode)
      if (p20RefCode) localStorage.setItem('cgp_ref_code', p20RefCode)
      if (p20Campaign) localStorage.setItem('cgp_source', p20Campaign)
    } catch {}
  }, [])
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
        if (data.travelRadiusMiles !== undefined) payload.travelRadiusMiles = data.travelRadiusMiles
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
      travelRadiusMiles: fullAccount.travelRadiusMiles || 10,
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
                onClick={() => {
                  try { localStorage.setItem('cgp_login_screen', 'signin') } catch {}
                  setVerifyStatus(null)
                }}
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
            <ScheduleTab
              shifts={shifts}
              loading={loading}
              onClockIn={handleClockIn}
              onTimerUpdate={refreshDocs}
              initialView={workInitialView}
              profile={profile}
              returnedBookingId={returnedBookingId}
              returnedSubscription={returnedSubscription}
            />
          )}
          {activeTab === 'requests' && (
            <RequestsTab
              requests={requests}
              loading={loading}
              onAccept={handleAcceptRequest}
              onDecline={handleDeclineRequest}
              returnedBookingId={returnedBookingId}
              returnedSubscription={returnedSubscription}
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
              onOpenTrustPassport={handleOpenTrustPassport}
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

      {/* ── Phase 26B: Caregiver Subscription Return Banner ───────────────── */}
      {cgSubReturnState && (
        <div style={{
          position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 480, zIndex: 8000,
          background: cgSubReturnState === 'success' ? '#f0fdf4' : cgSubReturnState === 'cancelled' ? '#fff7ed' : cgSubReturnState === 'failed' ? '#fff1f2' : '#f5f3ff',
          border: `1px solid ${cgSubReturnState === 'success' ? 'rgba(34,197,94,0.3)' : cgSubReturnState === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(124,92,255,0.3)'}`,
          borderRadius: 16, padding: '14px 16px 12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
              {cgSubReturnState === 'confirming' ? '⏳' : cgSubReturnState === 'success' ? '✅' : cgSubReturnState === 'cancelled' ? '↩️' : '⚠️'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: '1.4' }}>{cgSubReturnMsg}</p>
              {cgSubReturnState === 'failed' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setCgSubReturnState('confirming')
                      setCgSubReturnMsg('Retrying...')
                      const tkn = localStorage.getItem('cgp_token') || '';
                      (async () => {
                        let ok = false
                        for (let i = 0; i < 3; i++) {
                          try {
                            const r = await fetch(`${API_BASE}/api/caregiver-subscription?token=${encodeURIComponent(tkn)}`)
                            const d = await r.json() as any
                            if (d.subscribed) { ok = true; break }
                          } catch {}
                          if (i < 2) await new Promise<void>(res => setTimeout(res, 1000))
                        }
                        if (ok) {
                          setReturnedSubscription(true)
                          clearCaregiverPendingSubscriptionAction()
                          setCgSubReturnMsg('Your Carehia Pro access is now active.')
                          setCgSubReturnState('success')
                          setTimeout(() => setCgSubReturnState(null), 4000)
                        } else {
                          setCgSubReturnState('failed')
                          setCgSubReturnMsg('We could not confirm your upgrade yet. If you just paid, wait a moment and try again.')
                        }
                      })()
                    }}
                    style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: '#7C5CFF', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer' }}
                  >Try Again</button>
                  <button
                    onClick={() => { navigateToTab('home'); setCgSubReturnState(null) }}
                    style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: 'transparent', color: '#7C5CFF', border: '1px solid rgba(124,92,255,0.4)', borderRadius: 20, cursor: 'pointer' }}
                  >Go to Today</button>
                  <a href="mailto:support@carehia.com" style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 20, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
                    Contact Support
                  </a>
                </div>
              )}
            </div>
            {cgSubReturnState !== 'confirming' && (
              <button onClick={() => setCgSubReturnState(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, flexShrink: 0, lineHeight: 1, padding: 2 }}>&#x2715;</button>
            )}
          </div>
        </div>
      )}

      {/* ── Phase 5: Trust Passport full-screen overlay ────────────────── */}
      {showTrustPassport && (
        <React.Suspense fallback={null}>
          <TrustPassport
            profile={profile}
            documents={documents}
            onClose={handleCloseTrustPassport}
            onOpenDocUpload={() => {
              setShowTrustPassport(false)
              setProfileInitialSection('documents')
              setProfileDeepLink('section-documents')
              navigateToTab('profile')
            }}
            onNavigateTo={(section, scrollTo) => {
              handleNavigateToSection(section as any, scrollTo)
            }}
          />
        </React.Suspense>
      )}

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
                {/* Phase 15: enhanced notification cards — priority accent, emoji, action button */}
                {notifications.map((n) => {
                  // Priority accent colour — falls back gracefully for old push notifications
                  const priorityCfg: Record<string, { accent: string; border: string }> = {
                    urgent:    { accent: '#EF4444', border: 'rgba(239,68,68,0.45)'   },
                    important: { accent: '#7C5CFF', border: 'rgba(124,92,255,0.45)' },
                    normal:    { accent: '#4A90E2', border: 'rgba(74,144,226,0.35)' },
                    low:       { accent: '#94a3b8', border: 'rgba(148,163,184,0.25)'},
                  }
                  const pCfg = priorityCfg[n.priority || (n.read ? 'low' : 'important')]

                  // Type emoji — falls back to bell for old push notifications
                  const typeEmojiMap: Record<string, string> = {
                    new_care_request: '🔔', request_expiring: '⏰',
                    interview_request: '📋', hire_offer_received: '📄',
                    hire_offer_signed: '✅', client_confirmed: '🎉',
                    visit_upcoming: '📅', timer_reminder: '⏱️',
                    invoice_ready: '💰', payment_received: '🎉',
                    trust_passport_action_needed: '🛡️', certification_expiring: '⚠️',
                    review_received: '⭐',
                  }
                  const emoji = n.type ? (typeEmojiMap[n.type] || '🔔') : '🔔'

                  // Action button label
                  const actionLabelMap: Record<string, string> = {
                    work_requests: 'Review Now', work_schedule: 'View Schedule',
                    money: 'View Money', trust_passport: 'View Trust Passport',
                    profile: 'Update Profile', today: 'Go to Today',
                  }
                  const actionLabel = n.action ? actionLabelMap[n.action] : null

                  return (
                    <div
                      key={n.id}
                      onClick={() => markOneRead(n.id)}
                      style={{
                        background: n.read ? '#f8fafc' : '#f5f1ff',
                        border: `1px solid ${n.read ? '#e2e8f0' : pCfg.border}`,
                        borderLeft: `4px solid ${n.read ? '#e2e8f0' : pCfg.accent}`,
                        borderRadius: 14, padding: '13px 14px 11px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: n.read ? 500 : 700, fontSize: 14, margin: '0 0 3px', color: '#0f172a' }}>
                            {emoji} {n.title}
                          </p>
                          <p style={{ fontSize: 13, margin: '0 0 5px', color: '#475569', lineHeight: '1.4' }}>{n.body}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                            {new Date(n.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                          {/* Phase 15: action button — routes to correct tab */}
                          {actionLabel && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigateFromNotification(n.action) }}
                              style={{
                                marginTop: 9, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                                background: pCfg.accent, color: '#ffffff', border: 'none',
                                borderRadius: 20, cursor: 'pointer',
                              }}
                            >
                              {actionLabel}
                            </button>
                          )}
                        </div>
                        {!n.read && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: pCfg.accent, flexShrink: 0, marginTop: 3 }} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
