// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { MapPin, Clock, ChevronRight, Star, Briefcase, TrendingUp, Zap, Bell, Calendar, Timer, FileText, FolderOpen, Users, Play, Square, Plus, CheckCircle2, AlertTriangle } from 'lucide-react'
import { CaregiverProfile, Shift, Timesheet, CareRequest, TimeEntry, CaregiverDocument } from '../types'
import { getActiveTimer, setActiveTimer, addTimeEntry, updateTimeEntry, getDocuments, calculateCompleteness, getTimeEntries } from '../utils/storage'

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
  } catch (e) {
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

// Circular progress ring SVG
const ProgressRing = ({ score }: { score: number }) => {
  const r = 38, c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#7C5CFF'
  return (
    <svg width="96" height="96" className="transform -rotate-90">
      <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-base-300" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  )
}

export const HomeTab: React.FC<HomeTabProps> = ({
  profile, shifts, timesheets, requests, loading, documents,
  notifCount = 0, onBellPress,
  onNavigateToRequests, onNavigateToSchedule, onNavigateToEarnings, onNavigateToProfile, onNavigateToSection, onClockIn, onTimerUpdate
}) => {
  const [activeTimer, setActiveTimerState] = useState<TimeEntry | null>(getActiveTimer())
  const [elapsed, setElapsed] = useState(0)
  const [showQuickTimer, setShowQuickTimer] = useState(false)
  const [quickClient, setQuickClient] = useState('')
  const [quickRate, setQuickRate] = useState(String(profile?.hourlyRate || 25))

  // Online/Offline toggle
  const [isOnline, setIsOnline] = useState(() =>
    localStorage.getItem('cgp_online_status') !== 'offline'
  )
  const [notifPermission, setNotifPermission] = useState<string>(() => {
    if (typeof Notification !== 'undefined') return Notification.permission
    return 'unsupported'
  })
  const [showNotifPrompt, setShowNotifPrompt] = useState(false)
  const [notifSubscribing, setNotifSubscribing] = useState(false)

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
        setShowNotifPrompt(false)
      } else {
        setShowNotifPrompt(false)
      }
    } finally {
      setNotifSubscribing(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const todayShifts = shifts.filter(s => s.date === today || s.date?.startsWith(today))
  const activeTimesheets = timesheets.filter(t => t.status === 'clocked_in')
  const pendingRequests = requests.filter(r => r.status === 'pending')

  // Profile completeness
  const { score: completeness, items: completenessItems } = calculateCompleteness(profile, documents)

  // This week's hours + earnings
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => getTimeEntries())

  useEffect(() => {
    setTimeEntries(getTimeEntries())
    const onVisible = () => {
      if (document.visibilityState === 'visible') setTimeEntries(getTimeEntries())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const getWeekStart = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    return monday.toISOString().split('T')[0]
  }
  const weekStart = getWeekStart()

  const weekEntries = timeEntries.filter(e =>
    e.status === 'completed' && e.date >= weekStart
  )
  const completedWeekHours = weekEntries.reduce((sum, e) => {
    if (e.regularHours !== undefined || e.overtimeHours !== undefined) {
      return sum + (e.regularHours || 0) + (e.overtimeHours || 0)
    }
    return sum + (e.duration ? e.duration / 60 : 0)
  }, 0)
  const completedWeekEarnings = weekEntries.reduce((sum, e) => sum + (e.totalPay || 0), 0)

  const activeTimerThisWeek = activeTimer
    ? new Date(activeTimer.startTime).toISOString().split('T')[0] >= weekStart
    : false
  const liveHoursNow = activeTimerThisWeek ? elapsed / 3600 : 0
  const liveEarningsNow = activeTimerThisWeek ? liveHoursNow * (activeTimer?.hourlyRate || 0) : 0

  const weekHours = completedWeekHours + liveHoursNow
  const weekEarnings = completedWeekEarnings + liveEarningsNow

  // Expiring docs
  const expiringDocs = documents.filter(d => d.status === 'expiring_soon' || d.status === 'expired')

  // Timer tick
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

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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

  const stopTimer = () => {
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

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
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
    <div className="p-4 space-y-5 pb-4">
      {/* 1. Greeting header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-base-content">
            {greeting()}, {profile?.firstName || 'Caregiver'} &#x1F44B;
          </h1>
          <p className="text-xs text-base-content/65 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Bell + Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onBellPress}
            style={{
              position: 'relative', width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(124,92,255,0.08)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Bell size={20} style={{ color: '#7C5CFF' }} />
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                minWidth: 18, height: 18, borderRadius: 9,
                background: '#EF4444', color: '#fff',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: '18px',
                border: '2px solid #f5f3ff',
              }}>
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </span>
          </div>
        </div>
      </div>

      {/* 1.5 — "Get Started" onboarding — compact single-row with next action */}
      {(() => {
        const hasPhoto = !!(profile?.profilePhoto)
        const hasAvailability = (() => {
          try {
            const av = JSON.parse(localStorage.getItem('cgp_availability') || '{}')
            return Object.values(av).some((d: any) => d.available)
          } catch { return false }
        })()
        const hasDocs = documents.length > 0
        if (hasPhoto && hasAvailability && hasDocs) return null
        const steps = [
          { done: hasPhoto, label: 'Add your photo', benefit: 'Profiles with photos get 3× more requests', action: () => onNavigateToSection('profile', 'section-photo') },
          { done: hasAvailability, label: 'Set your availability', benefit: 'Families match based on your schedule', action: onNavigateToSchedule },
          { done: hasDocs, label: 'Upload a document', benefit: 'Verified caregivers get priority matching', action: () => onNavigateToSection('documents', 'section-docs') },
        ]
        const doneCount = steps.filter(s => s.done).length
        const nextIdx = steps.findIndex(s => !s.done)
        if (nextIdx === -1) return null
        return (
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 to-primary/3 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-2 border-b border-primary/10">
              <div className="flex-1">
                <p className="font-bold text-sm text-base-content">Complete your profile</p>
                <p className="text-xs text-base-content/50">Get 3× more interview requests</p>
              </div>
              <div className="flex gap-1.5 items-center">
                {steps.map((s, i) => (
                  <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${s.done ? 'bg-success' : i === nextIdx ? 'bg-primary/50' : 'bg-base-300'}`} />
                ))}
              </div>
            </div>
            {/* Steps */}
            {steps.map((s, i) => (
              <button key={i} onClick={s.done ? undefined : s.action} disabled={s.done}
                className={`w-full flex items-start gap-3 px-4 py-3 border-b border-primary/8 last:border-0 text-left ${!s.done && i === nextIdx ? 'press-card bg-primary/5' : ''}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${s.done ? 'bg-success' : i === nextIdx ? 'bg-primary/20' : 'bg-base-300/60'}`}>
                  {s.done
                    ? <span className="text-white text-xs font-bold">✓</span>
                    : <span className={`text-xs font-bold ${i === nextIdx ? 'text-primary' : 'text-base-content/30'}`}>{i + 1}</span>
                  }
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${s.done ? 'text-base-content/40 line-through' : i === nextIdx ? 'text-base-content' : 'text-base-content/40'}`}>{s.label}</p>
                  {!s.done && <p className="text-xs text-base-content/45 mt-0.5">{s.benefit}</p>}
                </div>
                {!s.done && i === nextIdx && <ChevronRight size={14} className="text-primary/70 mt-1 flex-shrink-0" />}
              </button>
            ))}
          </div>
        )
      })()}

      {/* 2. Online/Offline toggle card */}
      <div
        onClick={toggleOnline}
        className={`rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all press-card ${isOnline ? 'bg-success/10 border-l-4 border-success' : 'bg-base-200 border-l-4 border-base-300'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOnline ? 'bg-success/15' : 'bg-base-300/60'}`}>
            <span
              className={`w-3 h-3 rounded-full ${isOnline ? 'bg-success online-dot' : 'bg-base-content/30'}`}
              style={isOnline ? { boxShadow: '0 0 8px #22C55E' } : {}}
            />
          </div>
          <div>
            <p className={`font-bold text-sm ${isOnline ? 'text-success' : 'text-base-content/50'}`}>
              {isOnline ? "You're Online" : "You're Offline"}
            </p>
            <p className="text-xs text-base-content/65">
              {isOnline ? 'Families can discover and request you' : 'Go online so families can find you'}
            </p>
          </div>
        </div>
        <div className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${isOnline ? 'bg-success' : 'bg-base-300'}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isOnline ? 'left-6' : 'left-0.5'}`} />
        </div>
      </div>

      {/* Notification Permission Prompt */}
      {showNotifPrompt && notifPermission === 'default' && (
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">&#x1F514;</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-base-content">Don't miss care requests</p>
              <p className="text-xs text-base-content/60 mt-0.5">Enable notifications so you hear about new requests immediately — even when the app is closed.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEnableNotifications}
              disabled={notifSubscribing}
              className="flex-1 btn btn-primary btn-sm text-white font-bold"
            >
              {notifSubscribing ? <span className="loading loading-spinner loading-xs" /> : '&#x1F514; Enable Notifications'}
            </button>
            <button
              onClick={() => setShowNotifPrompt(false)}
              className="btn btn-ghost btn-sm text-base-content/60"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Notifications enabled confirmation */}
      {notifPermission === 'granted' && (
        <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-2 flex items-center gap-2">
          <span className="text-success text-sm">&#x1F514;</span>
          <p className="text-xs text-success font-medium">Notifications enabled — you won't miss a request</p>
        </div>
      )}

      {/* 3. New requests banner */}
      {pendingRequests.length > 0 && (
        <div
          onClick={onNavigateToRequests}
          className="bg-warning/10 border border-warning/30 border-l-4 border-l-warning rounded-2xl p-4 flex items-center gap-3 press-card"
        >
          <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">&#x1F525;</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-base-content">
              {pendingRequests.length} New Care Request{pendingRequests.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-base-content/60">
              Up to ${Math.max(...pendingRequests.map(r => r.hourlyRate || 0))}/hr &#183; Tap to respond
            </p>
          </div>
          <ChevronRight size={18} className="text-warning" />
        </div>
      )}

      {/* 4. Active Timer Banner */}
      {activeTimer && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Timer size={24} className="text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-2xl font-mono font-bold text-base-content">{formatElapsed(elapsed)}</p>
                <p className="text-xs text-base-content/60">{activeTimer.clientName} &#183; ${activeTimer.hourlyRate}/hr</p>
              </div>
            </div>
            <button onClick={stopTimer} className="btn btn-error btn-sm gap-1">
              <Square size={14} fill="currentColor" /> Stop
            </button>
          </div>
          <div className="mt-2 text-right">
            <span className="text-xs font-medium text-success">
              Est: ${((elapsed / 3600) * activeTimer.hourlyRate).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* 7. Quick Actions grid */}
      <div>
        <h2 className="font-bold text-base text-base-content mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Play, label: 'Clock In', color: 'bg-success/10 text-success', action: () => setShowQuickTimer(true) },
            { icon: FileText, label: 'Invoice', color: 'bg-primary/10 text-primary', action: onNavigateToEarnings },
            { icon: FolderOpen, label: 'Documents', color: 'bg-warning/10 text-warning', action: onNavigateToProfile },
            { icon: Users, label: 'My Clients', color: 'bg-info/10 text-info', action: onNavigateToSchedule },
          ].map((item, i) => (
            <button key={i} onClick={item.action} className="flex flex-col items-center gap-1.5 p-3 bg-base-200 rounded-2xl press-card">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                <item.icon size={20} />
              </div>
              <span className="text-[10px] font-medium text-base-content/70">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Earnings Card (this week) */}
      <div className="earnings-card rounded-2xl p-5 text-white" onClick={onNavigateToEarnings}>
        <p className="text-white/90 text-xs font-medium uppercase tracking-wide">This Week</p>
        <div className="flex items-end justify-between mt-1">
          <div>
            <p className="text-3xl font-bold">${weekEarnings.toFixed(0)}</p>
            <p className="text-white/85 text-sm mt-0.5">{weekHours.toFixed(1)} hours worked</p>
          </div>
          <div className="flex items-center gap-1 bg-white/25 rounded-full px-2.5 py-1">
            <TrendingUp size={14} />
            <span className="text-xs font-medium">+12%</span>
          </div>
        </div>
        <div className="mt-3 bg-white/25 rounded-full h-1.5">
          <div className="bg-white rounded-full h-1.5" style={{ width: `${Math.min((weekHours / 40) * 100, 100)}%` }} />
        </div>
        <p className="text-white/85 text-[10px] mt-1">{weekHours.toFixed(0)}/40 hours goal</p>
      </div>

      {/* 6a. Search Visibility Warning — additive banner, shows only when profile < 70% gate */}
      {completeness < 70 && (
        <button
          onClick={onNavigateToProfile}
          className="w-full rounded-2xl p-4 flex items-center gap-3 press-card text-left"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)' }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.12)' }}>
            <AlertTriangle size={20} className="text-error" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-error">Not visible in search yet</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(15,23,42,0.55)' }}>
              Reach 70% profile strength to appear when families search for caregivers
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {completenessItems.filter(i => !i.done).slice(0, 3).map((item: any, idx: number) => (
                <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                  + {item.label}
                </span>
              ))}
              {completenessItems.filter((i: any) => !i.done).length > 3 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(15,23,42,0.45)' }}>
                  +{completenessItems.filter((i: any) => !i.done).length - 3} more
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={18} className="text-error flex-shrink-0" style={{ opacity: 0.55 }} />
        </button>
      )}

      {/* 6. Profile Completeness */}
      {completeness < 100 && (
        <button
          onClick={onNavigateToProfile}
          className="w-full bg-base-200 rounded-2xl p-4 flex items-center gap-4 press-card text-left"
        >
          <div className="relative flex-shrink-0">
            <ProgressRing score={completeness} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold text-base-content">{completeness}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-base-content">Profile Strength</p>
            <p className="text-xs text-base-content/60 mt-0.5">
              {completenessItems.filter(i => !i.done).length} items to complete &#183; 3&#xD7; more requests
            </p>
            <div className="w-full bg-base-300 rounded-full h-1.5 mt-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${completeness >= 80 ? 'bg-success' : completeness >= 50 ? 'bg-warning' : 'bg-primary'}`}
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
          <ChevronRight size={18} className="text-primary opacity-60 flex-shrink-0" />
        </button>
      )}

      {/* Quick Timer Modal */}
      {showQuickTimer && !activeTimer && (
        <div className="bg-base-200 rounded-2xl p-4 border-2 border-primary/30">
          <p className="font-semibold text-sm text-base-content mb-3">Start Time Tracker</p>
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
              <button onClick={startTimer} className="btn btn-primary btn-sm flex-1 gap-1">
                <Play size={14} /> Start
              </button>
            </div>
            <button onClick={() => setShowQuickTimer(false)} className="btn btn-ghost btn-xs w-full">Cancel</button>
          </div>
        </div>
      )}

      {/* 8. Document Alerts */}
      {expiringDocs.length > 0 && (
        <div className="bg-error/5 border border-error/20 rounded-2xl p-4 press-card" onClick={onNavigateToProfile}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-error" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-base-content">
                {expiringDocs.filter(d => d.status === 'expired').length > 0 ? 'Documents expired!' : 'Documents expiring soon'}
              </p>
              <p className="text-xs text-base-content/60 mt-0.5">
                {expiringDocs.map(d => d.name).join(', ')}
              </p>
            </div>
            <ChevronRight size={18} className="opacity-40" />
          </div>
        </div>
      )}

      {/* Active Shift Banner */}
      {activeTimesheets.length > 0 && (
        <div className="bg-success/10 border border-success/20 rounded-2xl p-4 flex items-center gap-3" onClick={onNavigateToSchedule}>
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
            <Zap size={20} className="text-success" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-base-content">Shift in Progress</p>
            <p className="text-xs text-base-content/60">{activeTimesheets.length} active — tap to view</p>
          </div>
          <ChevronRight size={18} className="opacity-40" />
        </div>
      )}

      {/* 9. Today's Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base text-base-content">Today's Schedule</h2>
          <button onClick={onNavigateToSchedule} className="text-xs text-primary font-medium">View All</button>
        </div>
        {todayShifts.length === 0 ? (
          <div className="bg-base-200 rounded-2xl p-6 text-center">
            <Calendar size={32} className="mx-auto opacity-30 mb-2" />
            <p className="text-sm text-base-content/60">No shifts scheduled today</p>
            <p className="text-xs text-base-content/60 mt-1">Use the timer to track private client hours</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayShifts.map((shift) => (
              <div key={shift.id} className="bg-base-200 rounded-2xl p-4 press-card">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                      <Clock size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-base-content">
                        {typeof shift.client === 'object' ? `${shift.client.firstName || ''} ${shift.client.lastName || ''}`.trim() : `Client #${shift.client}`}
                      </p>
                      <p className="text-xs text-base-content/60 mt-0.5">
                        {shift.startTime} &#8212; {shift.endTime}
                      </p>
                      {shift.careType && (
                        <span className="inline-block mt-1.5 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {shift.careType}
                        </span>
                      )}
                    </div>
                  </div>
                  {shift.status === 'scheduled' && (
                    <button onClick={() => onClockIn(shift.id)} className="btn btn-primary btn-sm text-xs">Check In</button>
                  )}
                  {shift.status === 'in_progress' && (
                    <span className="badge badge-success badge-sm">In Progress</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
