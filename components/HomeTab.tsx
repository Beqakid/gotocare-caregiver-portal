// @ts-nocheck
import { getTrustPassportSummary, WorkHistoryData, computeTrustedProEligibility } from '../utils/trustEngine'
import { getEligibilityFromTrustLevel, ELIGIBILITY_LABELS } from '../utils/matchingEngine'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Inbox,
  Play,
  Shield,
  Square,
  Timer,
  TrendingUp,
  Trophy,
  User,
  Users,
} from 'lucide-react'
import { CaregiverProfile, Shift, Timesheet, CareRequest, TimeEntry, CaregiverDocument } from '../types'
// Phase 25 — location check-in
import { CheckInModal } from './CheckInModal'
import { extractCareLocation } from '../utils/geoUtils'
import {
  addTimeEntry,
  calculateCompleteness,
  getActiveTimer,
  getInvoices,
  getTimeEntries,
  setActiveTimer,
  updateTimeEntry,
} from '../utils/storage'
import { cloudAddTimeEntry, cloudSetActiveTimer } from '../utils/cloud-api'

const API = 'https://gotocare-original.jjioji.workers.dev/api'
const VAPID_PUBLIC_KEY = 'BOtlZWOtOu_PS_Bdkvvyw_ctpyeQvW2OlMrhidaXqbNcYbpXONe-3PaJdlj3X0CB2zU-S46PWHvnyuUI9k0jFDA'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

async function subscribeToPush(token: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    const subJson = sub.toJSON()
    await fetch(`${API}/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        endpoint: sub.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        user_agent: navigator.userAgent,
      }),
    })
    return true
  } catch {
    return false
  }
}

interface HomeTabProps {
  profile: CaregiverProfile | null
  shifts: Shift[]
  timesheets: Timesheet[]
  requests: CareRequest[]
  loading: boolean
  documents: CaregiverDocument[]
  notifCount?: number
  onBellPress?: () => void
  onNavigateToRequests: () => void
  onNavigateToSchedule: () => void
  onNavigateToEarnings: () => void
  onNavigateToProfile: () => void
  onNavigateToSection: (section: 'overview' | 'verification' | 'certifications' | 'documents' | 'badges' | 'settings' | 'trust-passport', scrollTo: string) => void
  onClockIn: (shiftId: number) => void
  onTimerUpdate: () => void
}

const sectionTitle = 'text-[11px] font-bold uppercase tracking-wide text-base-content/45'

function hasHomeDoc(docs: CaregiverDocument[], test: (doc: CaregiverDocument) => boolean): boolean {
  return docs.some(test)
}

// Phase 8 — getHomeVerification now delegates to the Trust Passport Engine
// Returns the same shape as before (for backwards compat) + new engine fields
function getHomeVerification(profile: CaregiverProfile | null, documents: CaregiverDocument[], _completeness: number) {
  const summary = getTrustPassportSummary(profile, documents)
  return {
    // Legacy-compatible fields
    progress:       summary.completionPercentage,
    trustScore:     summary.trustScore,
    nextStep:       summary.nextRecommendedStep,
    trustLevel:     summary.trustLevel,
    trustLevelName: summary.trustLevelName,
    unlockMessage:  summary.nextUnlock,
    // New Phase 8 fields
    nextActionExplanation: summary.nextActionExplanation,
    publicBadges:   summary.publicBadges,
    clientVisibilityStatus: summary.clientVisibilityStatus,
  }
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatElapsed(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function hoursFromEntry(entry: TimeEntry) {
  if (entry.regularHours !== undefined || entry.overtimeHours !== undefined) {
    return (entry.regularHours || 0) + (entry.overtimeHours || 0)
  }
  return entry.duration ? entry.duration / 60 : 0
}

const ProgressRing = ({ score, size = 52 }: { score: number; size?: number }) => {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#7C5CFF'
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-base-300" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  )
}

const TaskRow = ({ task }: { task: any }) => {
  const Icon = task.icon
  return (
    <button
      onClick={task.action}
      className="w-full rounded-2xl bg-base-200 border border-base-300/70 p-3.5 text-left press-card"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${task.iconBg}`}>
          <Icon size={19} className={task.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-base-content leading-snug">{task.title}</p>
            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap ${task.badgeClass}`}>
              {task.badge}
            </span>
          </div>
          <p className="text-xs text-base-content/55 mt-1 leading-snug">{task.detail}</p>
        </div>
        <ChevronRight size={16} className="text-base-content/25 flex-shrink-0 mt-3" />
      </div>
    </button>
  )
}

export const HomeTab: React.FC<HomeTabProps> = ({
  profile,
  shifts,
  timesheets,
  requests,
  loading,
  documents,
  notifCount = 0,
  onBellPress,
  onNavigateToRequests,
  onNavigateToSchedule,
  onNavigateToEarnings,
  onNavigateToProfile,
  onNavigateToSection,
  onClockIn,
  onTimerUpdate,
}) => {
  const [activeTimer, setActiveTimerState] = useState<TimeEntry | null>(getActiveTimer())
  const [elapsed, setElapsed] = useState(0)
  const [showQuickTimer, setShowQuickTimer] = useState(false)
  const [quickClient, setQuickClient] = useState('')
  const [quickRate, setQuickRate] = useState(String(profile?.hourlyRate || 25))
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => getTimeEntries())
  const [isOnline, setIsOnline] = useState(() => localStorage.getItem('cgp_online_status') !== 'offline')
  const [notifPermission, setNotifPermission] = useState<string>(() => {
    if (typeof Notification !== 'undefined') return Notification.permission
    return 'unsupported'
  })
  const [showNotifPrompt, setShowNotifPrompt] = useState(false)
  const [notifSubscribing, setNotifSubscribing] = useState(false)

  useEffect(() => {
    setTimeEntries(getTimeEntries())
    const onVisible = () => {
      if (document.visibilityState === 'visible') setTimeEntries(getTimeEntries())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (!activeTimer) return
    const tick = () => {
      const start = new Date(activeTimer.startTime).getTime()
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeTimer])

  const today = new Date().toISOString().split('T')[0]
  const weekStart = getWeekStart()
  const todayShifts = shifts.filter(s => s.date === today || s.date?.startsWith(today))
  const nextShift = todayShifts[0]
  const activeTimesheets = timesheets.filter(t => t.status === 'clocked_in')
  const pendingRequests = requests.filter(r => r.status === 'pending')

  // Phase 3 fix: fetch live dispatch count so Home "Live Jobs" matches RequestsTab activeLiveCount
  const [liveJobCount, setLiveJobCount] = React.useState(0)
  useEffect(() => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    fetch(`https://gotocare-original.jjioji.workers.dev/api/caregiver-live-requests?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        const active = (d.requests || []).filter((r: any) => !r.is_expired && r.request_status !== 'taken')
        setLiveJobCount(active.length)
      })
      .catch(() => {})
  }, [])

  // Phase 11: work history trust data for Trusted Pro encouragement card
  const [workData, setWorkData] = React.useState<WorkHistoryData | null>(null)
  useEffect(() => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    fetch(`https://carehia-admin.jjioji.workers.dev/work-history-trust?token=${encodeURIComponent(token)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setWorkData(d) })
      .catch(() => {})
  }, [])

  const pendingInvoices = getInvoices().filter(i => i.status === 'sent' || i.status === 'overdue')
  const { score: completeness, items: completenessItems } = calculateCompleteness(profile, documents)
  const missingProfileItems = completenessItems.filter((i: any) => !i.done)
  const expiringDocs = documents.filter(d => d.status === 'expiring_soon' || d.status === 'expired')
  const homeVerification = getHomeVerification(profile, documents, completeness)
  const verificationAlerts = [
    ...expiringDocs.slice(0, 2).map(d => d.status === 'expired' ? `${d.name} expired` : `${d.name} expires soon`),
    ...(homeVerification.nextStep === 'Give background check permission' ? ['Background check not started'] : []),
  ].slice(0, 3)

  const completedWeekEntries = timeEntries.filter(e => e.status === 'completed' && e.date >= weekStart)
  // Build claimed entry IDs from invoice objects + stored map (fixes paid/draft entries re-appearing)
  const _allInvoices = getInvoices()
  const _invMap: Record<string, string[]> = JSON.parse(localStorage.getItem('gtc_inv_entry_map') || '{}')
  const _claimedIds = new Set<string>(
    _allInvoices
      .filter((inv: any) => inv.status === 'draft' || inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'paid')
      .flatMap((inv: any) => [...(inv.timeEntryIds || []), ...(inv.cloudTimeEntryIds || []), ...(_invMap[inv.id] || [])])
  )
  const uninvoicedEntries = timeEntries.filter(e =>
    e.status === 'completed' && !e.isInvoiced && !_claimedIds.has(String(e.id))
  )
  const uninvoicedHours = uninvoicedEntries.reduce((sum, entry) => sum + hoursFromEntry(entry), 0)
  const uninvoicedAmount = uninvoicedEntries.reduce((sum, entry) => sum + (entry.totalPay || hoursFromEntry(entry) * entry.hourlyRate), 0)
  const weekHours = completedWeekEntries.reduce((sum, entry) => sum + hoursFromEntry(entry), 0)
  const weekEarnings = completedWeekEntries.reduce((sum, entry) => sum + (entry.totalPay || hoursFromEntry(entry) * entry.hourlyRate), 0)
  const activeTimerAmount = activeTimer ? (elapsed / 3600) * (activeTimer.hourlyRate || 0) : 0

  // ── Phase 25: Check-In / Check-Out modal state — defined BEFORE useMemo hooks ──
  const [checkInModalState, setCheckInModalState] = useState<{
    mode: 'checkin' | 'checkout'
    shiftId?: number
    shift?: Shift
  } | null>(null)

  const handleCheckInClick = useCallback((shiftId: number) => {
    setCheckInModalState({ mode: 'checkin', shiftId, shift: nextShift ?? undefined })
  }, [nextShift])

  const handleCheckOutClick = useCallback(() => {
    setCheckInModalState({ mode: 'checkout' })
  }, [])
  // ─────────────────────────────────────────────────────────────────────────

  // ── existing priorityTasks (unchanged — still used for secondary task rows) ──
  const priorityTasks = useMemo(() => {
    const tasks: any[] = []

    if (activeTimer) {
      tasks.push({
        title: `Clock out of ${activeTimer.clientName}`,
        detail: `${formatElapsed(elapsed)} tracked so far. Stop the timer when care is complete.`,
        badge: 'Now',
        badgeClass: 'bg-success/15 text-success',
        icon: Timer,
        iconBg: 'bg-success/10',
        iconColor: 'text-success',
        action: handleCheckOutClick,
      })
    }

    if (pendingRequests.length > 0) {
      tasks.push({
        title: `Review ${pendingRequests.length} care request${pendingRequests.length > 1 ? 's' : ''}`,
        detail: 'Respond quickly so families know whether you are available.',
        badge: 'Earn',
        badgeClass: 'bg-warning/20 text-warning',
        icon: Bell,
        iconBg: 'bg-warning/10',
        iconColor: 'text-warning',
        action: onNavigateToRequests,
      })
    }

    if (uninvoicedHours > 0) {
      tasks.push({
        title: `Create invoice for ${uninvoicedHours.toFixed(1)} tracked hours`,
        detail: `$${uninvoicedAmount.toFixed(0)} is ready to bill from completed time entries.`,
        badge: 'Money',
        badgeClass: 'bg-primary/15 text-primary',
        icon: FileText,
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        action: onNavigateToEarnings,
      })
    }

    if (pendingInvoices.length > 0) {
      tasks.push({
        title: `${pendingInvoices.length} invoice${pendingInvoices.length > 1 ? 's' : ''} waiting on payment`,
        detail: 'Open Money to review sent and overdue invoices.',
        badge: 'Follow up',
        badgeClass: 'bg-error/10 text-error',
        icon: DollarSign,
        iconBg: 'bg-error/10',
        iconColor: 'text-error',
        action: onNavigateToEarnings,
      })
    }

    if (nextShift) {
      tasks.push({
        title: `Prepare for ${nextShift.startTime || 'today'} care visit`,
        detail: `${nextShift.careType || 'Care'}${nextShift.endTime ? ` until ${nextShift.endTime}` : ''}.`,
        badge: 'Today',
        badgeClass: 'bg-info/15 text-info',
        icon: Calendar,
        iconBg: 'bg-info/10',
        iconColor: 'text-info',
        action: onNavigateToSchedule,
      })
    }

    if (expiringDocs.length > 0) {
      tasks.push({
        title: expiringDocs.some(d => d.status === 'expired') ? 'Update expired documents' : 'Review expiring documents',
        detail: expiringDocs.map(d => d.name).slice(0, 2).join(', '),
        badge: 'Trust',
        badgeClass: 'bg-error/10 text-error',
        icon: AlertTriangle,
        iconBg: 'bg-error/10',
        iconColor: 'text-error',
        action: onNavigateToProfile,
      })
    }

    if (completeness < 70 && missingProfileItems.length > 0) {
      const next = missingProfileItems[0]
      tasks.push({
        title: `${next.label} to appear in search`,
        detail: 'Reach 70% profile strength so families can discover you.',
        badge: 'Profile',
        badgeClass: 'bg-primary/15 text-primary',
        icon: User,
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        action: () => onNavigateToSection(next.action.section, next.action.scrollTo),
      })
    }

    if (tasks.length === 0) {
      tasks.push({
        title: 'You are caught up',
        detail: 'Stay online and keep your availability current for new care requests.',
        badge: 'Ready',
        badgeClass: 'bg-success/15 text-success',
        icon: CheckCircle2,
        iconBg: 'bg-success/10',
        iconColor: 'text-success',
        action: onNavigateToRequests,
      })
    }

    return tasks.slice(0, 4)
  }, [activeTimer, elapsed, pendingRequests.length, uninvoicedHours, uninvoicedAmount, pendingInvoices.length, nextShift, expiringDocs.length, completeness, missingProfileItems.length])

  // ── Phase 2: heroAction — rich card data for the top-priority Next Best Action ──
  const heroAction = useMemo(() => {
    // 1. Active timer running
    if (activeTimer) {
      return {
        icon: Timer,
        iconBg: 'bg-success/15',
        iconColor: 'text-success',
        badge: 'Live',
        badgeClass: 'bg-success/15 text-success',
        title: "You're clocked in",
        subtitle: `${activeTimer.clientName} — ${formatElapsed(elapsed)} tracked so far.`,
        primaryLabel: 'View Timer',
        primaryAction: onNavigateToSchedule,
        secondaryLabel: 'Stop Timer',
        secondaryAction: handleCheckOutClick,
        note: null,
      }
    }
    // 2. Scheduled visit today
    if (nextShift) {
      return {
        icon: Calendar,
        iconBg: 'bg-info/15',
        iconColor: 'text-info',
        badge: 'Today',
        badgeClass: 'bg-info/15 text-info',
        title: "Today's Visit",
        subtitle: `Your next visit is scheduled for ${nextShift.startTime || 'today'}.`,
        primaryLabel: 'Start Timer',
        primaryAction: () => handleCheckInClick(nextShift.id),
        secondaryLabel: 'View Work',
        secondaryAction: onNavigateToSchedule,
        note: null,
      }
    }
    // 3. Invoice ready
    if (uninvoicedHours > 0) {
      return {
        icon: FileText,
        iconBg: 'bg-primary/15',
        iconColor: 'text-primary',
        badge: 'Money',
        badgeClass: 'bg-primary/15 text-primary',
        title: 'Invoice Ready',
        subtitle: `$${uninvoicedAmount.toFixed(0)} ready to bill from ${uninvoicedHours.toFixed(1)} tracked hours.`,
        primaryLabel: 'Create Invoice',
        primaryAction: onNavigateToEarnings,
        secondaryLabel: 'View Money',
        secondaryAction: onNavigateToEarnings,
        note: null,
      }
    }
    // 4. Open care requests
    if (pendingRequests.length > 0) {
      return {
        icon: Inbox,
        iconBg: 'bg-warning/15',
        iconColor: 'text-warning',
        badge: 'New',
        badgeClass: 'bg-warning/15 text-warning',
        title: 'Review Care Requests',
        subtitle: `You have ${pendingRequests.length} care request${pendingRequests.length > 1 ? 's' : ''} waiting for your response.`,
        primaryLabel: 'Review Requests',
        primaryAction: onNavigateToRequests,
        secondaryLabel: null,
        secondaryAction: null,
        note: 'Respond quickly so families know whether you are available.',
      }
    }
    // 5. Expiring documents
    if (expiringDocs.length > 0) {
      return {
        icon: AlertTriangle,
        iconBg: 'bg-error/15',
        iconColor: 'text-error',
        badge: 'Urgent',
        badgeClass: 'bg-error/15 text-error',
        title: expiringDocs.some(d => d.status === 'expired') ? 'Update Expired Documents' : 'Documents Expiring Soon',
        subtitle: expiringDocs.map(d => d.name).slice(0, 2).join(', '),
        primaryLabel: 'Update Documents',
        primaryAction: onNavigateToProfile,
        secondaryLabel: null,
        secondaryAction: null,
        note: null,
      }
    }
    // 6. New caregiver / incomplete profile
    if (completeness < 70 && missingProfileItems.length > 0) {
      return {
        icon: User,
        iconBg: 'bg-primary/15',
        iconColor: 'text-primary',
        badge: 'Setup',
        badgeClass: 'bg-primary/15 text-primary',
        title: 'Finish Setting Up Your Profile',
        subtitle: 'Complete a few steps to improve your profile and client trust.',
        primaryLabel: 'Continue Setup',
        primaryAction: onNavigateToProfile,
        secondaryLabel: null,
        secondaryAction: null,
        note: null,
      }
    }
    // 7. Default caught-up state
    return {
      icon: CheckCircle2,
      iconBg: 'bg-success/15',
      iconColor: 'text-success',
      badge: 'Ready',
      badgeClass: 'bg-success/15 text-success',
      title: "You're all caught up",
      subtitle: "We'll show visits, requests, invoices, and profile steps here when they need your attention.",
      primaryLabel: 'View Requests',
      primaryAction: onNavigateToRequests,
      secondaryLabel: 'Update Availability',
      secondaryAction: onNavigateToSchedule,
      note: null,
    }
  }, [activeTimer, elapsed, nextShift, uninvoicedHours, uninvoicedAmount, pendingRequests.length, expiringDocs.length, completeness, missingProfileItems.length])

  const toggleOnline = async () => {
    const next = !isOnline
    setIsOnline(next)
    localStorage.setItem('cgp_online_status', next ? 'online' : 'offline')
    const token = localStorage.getItem('cgp_token')
    if (token) {
      fetch(`${API}/caregiver-online-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, is_online: next }),
      }).catch(() => {})
    }
    if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      setShowNotifPrompt(true)
    }
  }

  const handleEnableNotifications = async () => {
    setNotifSubscribing(true)
    try {
      const permission = await Notification.requestPermission()
      setNotifPermission(permission)
      if (permission === 'granted') {
        const token = localStorage.getItem('cgp_token')
        if (token) await subscribeToPush(token)
      }
      setShowNotifPrompt(false)
    } finally {
      setNotifSubscribing(false)
    }
  }

  const startTimer = () => {
    if (!quickClient.trim()) return
    const entry: TimeEntry = {
      id: '',
      clientName: quickClient.trim(),
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      hourlyRate: parseFloat(quickRate) || 25,
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    const saved = addTimeEntry(entry)
    setActiveTimer(saved)
    setActiveTimerState(saved)
    cloudSetActiveTimer({
      clientName: saved.clientName,
      startTime: saved.startTime,
      hourlyRate: saved.hourlyRate,
      billingType: saved.billingType || 'hourly',
      otAfterHrs: saved.overtimeAfterHours || 8,
      otMultiplier: saved.overtimeMultiplier || 1.5,
      notes: saved.notes || '',
    })
    setShowQuickTimer(false)
    setQuickClient('')
    onTimerUpdate()
  }

  function stopTimer() {
    if (!activeTimer) return
    const start = new Date(activeTimer.startTime).getTime()
    const duration = Math.round((Date.now() - start) / 60000)
    updateTimeEntry(activeTimer.id, {
      endTime: new Date().toISOString(),
      duration,
      status: 'completed',
    })
    setActiveTimer(null)
    setActiveTimerState(null)
    setElapsed(0)
    setTimeEntries(getTimeEntries())
    cloudSetActiveTimer(null)
    const completedEntry = getTimeEntries().find(e => e.id === activeTimer.id)
    if (completedEntry) cloudAddTimeEntry(completedEntry)
    onTimerUpdate()
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="skeleton-shimmer h-8 w-48 rounded-lg" />
        <div className="skeleton-shimmer h-32 rounded-2xl" />
        <div className="skeleton-shimmer h-24 rounded-2xl" />
      </div>
    )
  }

  // ── Hero Card icon component helper ──
  const HeroIcon = heroAction.icon

  return (
    <div className="p-4 space-y-4 pb-4">

      {/* ── 1. Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={sectionTitle}>Today</p>
          <h1 className="text-xl font-bold text-base-content mt-1">
            {getGreeting()}, {profile?.firstName || 'Caregiver'}
          </h1>
          <p className="text-xs text-base-content/60 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBellPress}
            className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Bell size={19} className="text-primary" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center border-2 border-base-100">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
          <button
            onClick={onNavigateToProfile}
            className="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center text-sm font-bold text-primary"
          >
            {profile?.profilePhoto ? (
              <img src={profile.profilePhoto} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span>{profile?.firstName?.[0]}{profile?.lastName?.[0]}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. Online toggle ── */}
      <button
        onClick={toggleOnline}
        className={`w-full rounded-2xl p-3.5 flex items-center justify-between text-left press-card ${isOnline ? 'bg-success/10 border border-success/25' : 'bg-base-200 border border-base-300'}`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-success online-dot' : 'bg-base-content/30'}`} />
          <div>
            <p className={`text-sm font-bold ${isOnline ? 'text-success' : 'text-base-content/60'}`}>
              {isOnline ? 'Online for care requests' : 'Offline'}
            </p>
            <p className="text-xs text-base-content/55">
              {isOnline ? 'Families can discover and request you' : 'Go online to receive matching requests'}
            </p>
          </div>
        </div>
        <div className={`w-11 h-6 rounded-full relative transition-all ${isOnline ? 'bg-success' : 'bg-base-300'}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isOnline ? 'left-5' : 'left-0.5'}`} />
        </div>
      </button>

      {/* ── Notification permission prompt (conditional) ── */}
      {showNotifPrompt && notifPermission === 'default' && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div>
            <p className="font-bold text-sm text-base-content">Do not miss care requests</p>
            <p className="text-xs text-base-content/60 mt-1">Enable notifications so new work reaches you immediately.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleEnableNotifications} disabled={notifSubscribing} className="btn btn-primary btn-sm flex-1 text-white">
              {notifSubscribing ? <span className="loading loading-spinner loading-xs" /> : 'Enable notifications'}
            </button>
            <button onClick={() => setShowNotifPrompt(false)} className="btn btn-ghost btn-sm">Not now</button>
          </div>
        </div>
      )}

      {/* ── 3. Dynamic Hero Card — Next Best Action ── */}
      <section className="rounded-2xl bg-base-100 border-2 border-primary/12 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${heroAction.iconBg}`}>
            <HeroIcon size={24} className={heroAction.iconColor} />
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${heroAction.badgeClass}`}>
            {heroAction.badge}
          </span>
        </div>
        <h2 className="text-[17px] font-black text-base-content leading-snug">{heroAction.title}</h2>
        <p className="text-sm text-base-content/60 mt-1 leading-relaxed">{heroAction.subtitle}</p>
        {heroAction.note && (
          <p className="text-xs text-base-content/40 mt-1">{heroAction.note}</p>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={heroAction.primaryAction}
            className="btn btn-primary btn-sm flex-1 text-white rounded-xl"
          >
            {heroAction.primaryLabel}
          </button>
          {heroAction.secondaryLabel && (
            <button
              onClick={heroAction.secondaryAction}
              className="btn btn-ghost btn-sm flex-1 rounded-xl border border-base-300"
            >
              {heroAction.secondaryLabel}
            </button>
          )}
        </div>
      </section>

      {/* ── 4. Compact Quick Actions ── */}
      <section>
        <div className="grid grid-cols-3 gap-2">
          {activeTimer ? (
            <button
              onClick={handleCheckOutClick}
              className="rounded-2xl bg-error/8 border border-error/20 px-3 py-3 text-left press-card"
            >
              <Square size={18} className="text-error mb-1.5" fill="currentColor" />
              <p className="text-[12px] font-bold text-base-content">Stop Timer</p>
            </button>
          ) : (
            <button
              onClick={() => setShowQuickTimer(true)}
              className="rounded-2xl bg-base-100 border border-base-300 px-3 py-3 text-left press-card"
            >
              <Timer size={18} className="text-success mb-1.5" />
              <p className="text-[12px] font-bold text-base-content">Track Time</p>
            </button>
          )}
          <button
            onClick={onNavigateToSchedule}
            className="rounded-2xl bg-base-100 border border-base-300 px-3 py-3 text-left press-card"
          >
            <Briefcase size={18} className="text-primary mb-1.5" />
            <p className="text-[12px] font-bold text-base-content">Availability</p>
          </button>
          <button
            onClick={onNavigateToEarnings}
            className="rounded-2xl bg-base-100 border border-base-300 px-3 py-3 text-left press-card"
          >
            <FileText size={18} className="text-warning mb-1.5" />
            <p className="text-[12px] font-bold text-base-content">Invoice</p>
          </button>
        </div>
      </section>

      {/* ── 5. Secondary tasks (overflow items after hero) ── */}
      {priorityTasks.length > 1 && (
        <section className="space-y-2">
          <p className={sectionTitle}>Also needs attention</p>
          {priorityTasks.slice(1, 3).filter((task: any) => !(heroAction.badge === 'Money' && task.badge === 'Money')).map((task, index) => (
            <TaskRow key={`${task.title}-${index}`} task={task} />
          ))}
        </section>
      )}

      {/* ── Quick Timer form (conditional) ── */}
      {showQuickTimer && !activeTimer && (
        <section className="bg-base-200 rounded-2xl p-4 border-2 border-primary/30">
          <p className="font-bold text-sm text-base-content mb-3">Start Time Tracker</p>
          <div className="space-y-2">
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              placeholder="Client name"
              value={quickClient}
              onChange={(e) => setQuickClient(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <input
                type="number"
                className="input input-bordered input-sm flex-1"
                placeholder="Rate/hr"
                value={quickRate}
                onChange={(e) => setQuickRate(e.target.value)}
              />
              <button onClick={startTimer} className="btn btn-primary btn-sm flex-1 text-white">
                <Play size={14} /> Start
              </button>
            </div>
            <button onClick={() => setShowQuickTimer(false)} className="btn btn-ghost btn-xs w-full">Cancel</button>
          </div>
        </section>
      )}

      {/* ── 6. Money card ── */}
      {uninvoicedAmount > 0 && heroAction.badge !== 'Money' ? (
        /* Invoice-ready state: lead with the actionable amount — only shown when hero isn't already Invoice Ready */
        <section className="rounded-2xl earnings-card p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white/70 text-[11px] font-bold uppercase tracking-wide">Invoice Ready</p>
              <p className="text-3xl font-black mt-1">${uninvoicedAmount.toFixed(0)}</p>
              <p className="text-xs text-white/75">{uninvoicedHours.toFixed(1)} hrs ready to invoice</p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-[11px]">Earned this week</p>
              <p className="text-lg font-bold">${(weekEarnings + activeTimerAmount).toFixed(0)}</p>
              <p className="text-[11px] text-white/70">{(weekHours + (activeTimer ? elapsed / 3600 : 0)).toFixed(1)} hrs</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={(e) => { e.stopPropagation(); onNavigateToEarnings() }} className="btn btn-sm border-0 bg-white text-primary rounded-xl font-bold">
              <FileText size={15} /> Create Invoice
            </button>
            <button onClick={(e) => { e.stopPropagation(); onNavigateToEarnings() }} className="btn btn-sm border-white/30 bg-white/15 text-white rounded-xl">
              View Money
            </button>
          </div>
        </section>
      ) : (
        /* Zero state: compact, no big $0 emphasis */
        <section className="rounded-2xl bg-base-200 border border-base-300/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-base-content">{uninvoicedAmount > 0 ? `$${uninvoicedAmount.toFixed(0)} ready to bill` : 'No invoice ready yet'}</p>
                <p className="text-xs text-base-content/55 mt-0.5">{uninvoicedAmount > 0 ? `${uninvoicedHours.toFixed(1)} hrs · see the card above to create` : 'Track time to prepare your next invoice.'}</p>
              </div>
            </div>
            <button onClick={onNavigateToEarnings} className="btn btn-ghost btn-sm text-primary shrink-0">
              View Money
            </button>
          </div>
        </section>
      )}

      {/* ── 7. Today's Work (simplified — active timer / next shift display only) ── */}
      <section className="rounded-2xl bg-base-200 border border-base-300/70 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className={sectionTitle}>Today's Work</p>
          <button onClick={onNavigateToSchedule} className="text-xs font-semibold text-primary">Work tab</button>
        </div>

        {activeTimer ? (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Timer size={22} className="text-primary animate-pulse" />
                <div>
                  <p className="font-mono text-xl font-bold text-base-content">{formatElapsed(elapsed)}</p>
                  <p className="text-xs text-base-content/60">{activeTimer.clientName} at ${activeTimer.hourlyRate}/hr</p>
                </div>
              </div>
              <button onClick={handleCheckOutClick} className="btn btn-error btn-sm text-white">
                <Square size={13} fill="currentColor" /> Stop
              </button>
            </div>
          </div>
        ) : nextShift ? (
          <div className="rounded-xl bg-base-100 border border-base-300 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Clock size={21} className="text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-base-content truncate">{nextShift.careType || 'Care visit'}</p>
                <p className="text-xs text-base-content/60">{nextShift.startTime} to {nextShift.endTime}</p>
              </div>
            </div>
            {nextShift.status === 'scheduled' && (
              <button onClick={() => handleCheckInClick(nextShift.id)} className="btn btn-primary btn-sm text-white">Check In</button>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-base-100 border border-base-300 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-base-content">No scheduled visit today</p>
              <p className="text-xs text-base-content/60 mt-0.5">Track private client hours or update availability.</p>
            </div>
            <button onClick={() => setShowQuickTimer(true)} className="btn btn-primary btn-sm text-white">
              <Play size={14} /> Timer
            </button>
          </div>
        )}
      </section>

      {/* ── 8. Opportunities ── */}
      <section className="rounded-2xl bg-base-200 border border-base-300/70 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className={sectionTitle}>Opportunities</p>
          <button onClick={onNavigateToRequests} className="text-xs font-semibold text-primary">Review</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={onNavigateToRequests} className="rounded-xl bg-base-100 border border-base-300 p-3 text-left">
            <Bell size={16} className="text-warning mb-2" />
            <p className="text-lg font-black text-base-content">{liveJobCount}</p>
            <p className="text-[11px] text-base-content/55">Care Requests</p>
          </button>
          <button onClick={onNavigateToRequests} className="rounded-xl bg-base-100 border border-base-300 p-3 text-left">
            <Users size={16} className="text-primary mb-2" />
            <p className="text-lg font-black text-base-content">{requests.length}</p>
            <p className="text-[11px] text-base-content/55">Interviews</p>
          </button>
          <button onClick={onNavigateToProfile} className="rounded-xl bg-base-100 border border-base-300 p-3 text-left">
            <TrendingUp size={16} className="text-success mb-2" />
            <p className="text-lg font-black text-base-content">{completeness}%</p>
            <p className="text-[11px] text-base-content/55">Search Ready</p>
          </button>
        </div>
      </section>

      {/* ── 9. Carehia Trust Passport ── */}
      <section className="rounded-2xl bg-base-200 border border-primary/20 p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Shield size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={sectionTitle}>Carehia Trust Passport</p>
            <p className="text-sm font-bold text-base-content leading-tight">{homeVerification.progress}% — Level {homeVerification.trustLevel}: {homeVerification.trustLevelName}</p>
            <p className="text-xs text-base-content/50 truncate mt-0.5">{homeVerification.nextStep}</p>
          </div>
          <span className="text-xl font-black text-primary shrink-0">{homeVerification.progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-base-100 overflow-hidden mb-3">
          <div className="h-full rounded-full bg-primary" style={{ width: `${homeVerification.progress}%` }} />
        </div>
        {/* ── Phase 12: Visibility status pill ── */}
        {(() => {
          const _el12 = getEligibilityFromTrustLevel(homeVerification.trustLevel)
          const _info12 = ELIGIBILITY_LABELS[_el12]
          return (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
                style={{ color: _info12.color, borderColor: _info12.color + '33', background: _info12.color + '12' }}>
                {_info12.emoji} {_info12.label}
              </span>
            </div>
          )
        })()}
        {verificationAlerts.length > 0 && (
          <div className="mb-2 space-y-1">
            {verificationAlerts.map(alert => (
              <div key={alert} className="flex items-center gap-2 text-xs text-warning">
                <AlertTriangle size={13} />
                <span>{alert}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => onNavigateToSection('trust-passport', '')} className="btn btn-primary btn-sm w-full rounded-2xl text-white">
          Continue Trust Passport
        </button>
      </section>

      {/* ── 9.5. Trusted Pro Encouragement (Phase 11 — conditional, non-intrusive) ── */}
      {workData && workData.nearlyEligible && !workData.isTrustedProEligible && completeness >= 70 && (() => {
        const tpe = computeTrustedProEligibility(workData)
        return (
          <section className="rounded-2xl border border-amber-200 p-4" style={{ background: 'linear-gradient(135deg, rgba(254,243,199,0.6), rgba(253,230,138,0.3))' }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Trophy size={18} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-800">You're close to Trusted Pro!</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-snug">
                  {tpe.missingForTrustedPro[0]
                    ? `Complete ${tpe.missingForTrustedPro[0]} to unlock priority visibility.`
                    : 'Keep completing care visits to build your status.'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-amber-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${(tpe.metRequirements / tpe.totalRequirements) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 shrink-0">{tpe.metRequirements}/{tpe.totalRequirements}</span>
                </div>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ── 10. Profile Growth (hidden once search-ready) ── */}
      {completeness < 70 && (
        <section className="rounded-2xl bg-base-200 border border-base-300/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ProgressRing score={completeness} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-black text-base-content">{completeness}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-base-content">Profile Growth</p>
                <p className="text-xs text-base-content/60">Reach 70% to appear in search</p>
              </div>
            </div>
            <button onClick={onNavigateToProfile} className="btn btn-ghost btn-sm text-primary shrink-0">Fix →</button>
          </div>
          {missingProfileItems.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missingProfileItems.slice(0, 3).map((item: any) => (
                <button
                  key={item.label}
                  onClick={() => onNavigateToSection(item.action.section, item.action.scrollTo)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-base-100 border border-base-300 text-base-content/65"
                >
                  + {item.label}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Phase 25: Location Check-In / Check-Out Modal ─────────────── */}
      {checkInModalState && (
        <CheckInModal
          mode={checkInModalState.mode}
          shiftId={checkInModalState.shiftId}
          clientName={checkInModalState.shift?.client?.name || checkInModalState.shift?.careType || undefined}
          scheduledStart={checkInModalState.shift?.startTime || null}
          scheduledEnd={checkInModalState.shift?.endTime || null}
          careLocation={extractCareLocation(checkInModalState.shift ?? null)}
          onCancel={() => setCheckInModalState(null)}
          onConfirm={(result) => {
            const pendingMode = checkInModalState.mode
            const pendingShiftId = checkInModalState.shiftId
            setCheckInModalState(null)
            // Record location data to backend (non-blocking, best-effort)
            const token = localStorage.getItem('cgp_token')
            if (token) {
              fetch('https://carehia-admin.jjioji.workers.dev/location-checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  shiftId: pendingShiftId ?? null,
                  mode: result.mode,
                  checkInStatus: result.status,
                  caregiverLat: result.location?.lat ?? null,
                  caregiverLng: result.location?.lng ?? null,
                  gpsAccuracyMeters: result.location?.accuracy ?? null,
                  distanceMeters: result.distanceMeters ?? null,
                  manualReason: result.manualReason ?? null,
                  manualNote: result.manualNote ?? null,
                }),
              }).catch(() => {})
            }
            // Proceed with original timer action
            if (pendingMode === 'checkin' && pendingShiftId != null) {
              onClockIn(pendingShiftId)
            } else if (pendingMode === 'checkout') {
              stopTimer()
            }
          }}
        />
      )}

    </div>
  )
}
