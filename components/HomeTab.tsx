// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Play,
  Square,
  Timer,
  TrendingUp,
  User,
  Users,
} from 'lucide-react'
import { CaregiverProfile, Shift, Timesheet, CareRequest, TimeEntry, CaregiverDocument } from '../types'
import {
  addTimeEntry,
  calculateCompleteness,
  getActiveTimer,
  getInvoices,
  getTimeEntries,
  setActiveTimer,
  updateTimeEntry,
} from '../utils/storage'

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
  onNavigateToSection: (section: 'profile' | 'documents', scrollTo: string) => void
  onClockIn: (shiftId: number) => void
  onTimerUpdate: () => void
}

const sectionTitle = 'text-[11px] font-bold uppercase tracking-wide text-base-content/45'

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
  const pendingInvoices = getInvoices().filter(i => i.status === 'sent' || i.status === 'overdue')
  const { score: completeness, items: completenessItems } = calculateCompleteness(profile, documents)
  const missingProfileItems = completenessItems.filter((i: any) => !i.done)
  const expiringDocs = documents.filter(d => d.status === 'expiring_soon' || d.status === 'expired')

  const completedWeekEntries = timeEntries.filter(e => e.status === 'completed' && e.date >= weekStart)
  const uninvoicedEntries = timeEntries.filter(e => e.status === 'completed' && !e.isInvoiced)
  const uninvoicedHours = uninvoicedEntries.reduce((sum, entry) => sum + hoursFromEntry(entry), 0)
  const uninvoicedAmount = uninvoicedEntries.reduce((sum, entry) => sum + (entry.totalPay || hoursFromEntry(entry) * entry.hourlyRate), 0)
  const weekHours = completedWeekEntries.reduce((sum, entry) => sum + hoursFromEntry(entry), 0)
  const weekEarnings = completedWeekEntries.reduce((sum, entry) => sum + (entry.totalPay || hoursFromEntry(entry) * entry.hourlyRate), 0)
  const activeTimerAmount = activeTimer ? (elapsed / 3600) * (activeTimer.hourlyRate || 0) : 0

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
        action: stopTimer,
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

  return (
    <div className="p-4 space-y-4 pb-4">
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

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className={sectionTitle}>Priority Tasks</p>
          <span className="text-[11px] text-base-content/45">{priorityTasks.length} open</span>
        </div>
        {priorityTasks.map((task, index) => <TaskRow key={`${task.title}-${index}`} task={task} />)}
      </section>

      <section className="rounded-2xl earnings-card p-4 text-white" onClick={onNavigateToEarnings}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wide">Money</p>
            <p className="text-3xl font-black mt-1">${(weekEarnings + activeTimerAmount).toFixed(0)}</p>
            <p className="text-xs text-white/75">{(weekHours + (activeTimer ? elapsed / 3600 : 0)).toFixed(1)} hours this week</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-[11px]">Ready to invoice</p>
            <p className="text-lg font-bold">${uninvoicedAmount.toFixed(0)}</p>
            <p className="text-[11px] text-white/70">{uninvoicedHours.toFixed(1)} hrs</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onNavigateToEarnings} className="btn btn-sm border-0 bg-white text-primary rounded-xl">
            <FileText size={15} /> Create invoice
          </button>
          <button onClick={onNavigateToEarnings} className="btn btn-sm border-white/30 bg-white/15 text-white rounded-xl">
            View money
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-base-200 border border-base-300/70 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className={sectionTitle}>Today's Work</p>
          <button onClick={onNavigateToSchedule} className="text-xs font-semibold text-primary">Schedule</button>
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
              <button onClick={stopTimer} className="btn btn-error btn-sm text-white">
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
              <button onClick={() => onClockIn(nextShift.id)} className="btn btn-primary btn-sm text-white">Clock in</button>
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

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button onClick={() => setShowQuickTimer(true)} className="rounded-xl bg-base-100 border border-base-300 px-2.5 py-2 text-left">
            <Timer size={16} className="text-success mb-1" />
            <p className="text-[11px] font-bold text-base-content">Track time</p>
          </button>
          <button onClick={onNavigateToSchedule} className="rounded-xl bg-base-100 border border-base-300 px-2.5 py-2 text-left">
            <Calendar size={16} className="text-primary mb-1" />
            <p className="text-[11px] font-bold text-base-content">Availability</p>
          </button>
          <button onClick={onNavigateToEarnings} className="rounded-xl bg-base-100 border border-base-300 px-2.5 py-2 text-left">
            <FileText size={16} className="text-warning mb-1" />
            <p className="text-[11px] font-bold text-base-content">Invoice</p>
          </button>
        </div>
      </section>

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

      <section className="rounded-2xl bg-base-200 border border-base-300/70 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className={sectionTitle}>New Opportunities</p>
          <button onClick={onNavigateToRequests} className="text-xs font-semibold text-primary">Review</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={onNavigateToRequests} className="rounded-xl bg-base-100 border border-base-300 p-3 text-left">
            <Bell size={16} className="text-warning mb-2" />
            <p className="text-lg font-black text-base-content">{pendingRequests.length}</p>
            <p className="text-[11px] text-base-content/55">Live</p>
          </button>
          <button onClick={onNavigateToRequests} className="rounded-xl bg-base-100 border border-base-300 p-3 text-left">
            <Users size={16} className="text-primary mb-2" />
            <p className="text-lg font-black text-base-content">{requests.length}</p>
            <p className="text-[11px] text-base-content/55">Interviews</p>
          </button>
          <button onClick={onNavigateToProfile} className="rounded-xl bg-base-100 border border-base-300 p-3 text-left">
            <TrendingUp size={16} className="text-success mb-2" />
            <p className="text-lg font-black text-base-content">{completeness}%</p>
            <p className="text-[11px] text-base-content/55">Search</p>
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-base-200 border border-base-300/70 p-4">
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
              <p className="text-xs text-base-content/60">
                {completeness >= 70 ? 'Visible in search' : 'Reach 70% to appear in search'}
              </p>
            </div>
          </div>
          <button onClick={onNavigateToProfile} className="btn btn-ghost btn-sm text-primary">Continue</button>
        </div>
        {missingProfileItems.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {missingProfileItems.slice(0, 4).map((item: any) => (
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
    </div>
  )
}
