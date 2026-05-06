// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { MapPin, Clock, ChevronRight, Star, Briefcase, TrendingUp, Zap, Bell, Calendar, Timer, FileText, FolderOpen, Users, Play, Square, Plus, CheckCircle2, AlertTriangle } from 'lucide-react'
import { CaregiverProfile, Shift, Timesheet, CareRequest, TimeEntry, CaregiverDocument } from '../types'
import { getActiveTimer, setActiveTimer, addTimeEntry, updateTimeEntry, getDocuments, calculateCompleteness, getTimeEntries } from '../utils/storage'

interface HomeTabProps {
  profile: CaregiverProfile | null
  shifts: Shift[]
  timesheets: Timesheet[]
  requests: CareRequest[]
  loading: boolean
  documents: CaregiverDocument[]
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
  onNavigateToRequests, onNavigateToSchedule, onNavigateToEarnings, onNavigateToProfile, onNavigateToSection, onClockIn, onTimerUpdate
}) => {
  const [activeTimer, setActiveTimerState] = useState<TimeEntry | null>(getActiveTimer())
  const [elapsed, setElapsed] = useState(0)
  const [showQuickTimer, setShowQuickTimer] = useState(false)
  const [quickClient, setQuickClient] = useState('')
  const [quickRate, setQuickRate] = useState(String(profile?.hourlyRate || 25))

  const today = new Date().toISOString().split('T')[0]
  const todayShifts = shifts.filter(s => s.date === today || s.date?.startsWith(today))
  const activeTimesheets = timesheets.filter(t => t.status === 'clocked_in')
  const pendingRequests = requests.filter(r => r.status === 'pending')

  // Profile completeness
  const { score: completeness, items: completenessItems } = calculateCompleteness(profile, documents)

  // This week's hours + earnings — from Time Tracker entries (not agency timesheets)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => getTimeEntries())

  // Refresh time entries whenever tab is focused (in case ScheduleTab just saved one)
  useEffect(() => {
    setTimeEntries(getTimeEntries())
  }, [])

  const getWeekStart = () => {
    const now = new Date()
    const day = now.getDay() // 0=Sun
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Mon
    const monday = new Date(now.setDate(diff))
    return monday.toISOString().split('T')[0]
  }
  const weekStart = getWeekStart()

  const weekEntries = timeEntries.filter(e =>
    e.status === 'completed' && e.date >= weekStart
  )
  const weekHours = weekEntries.reduce((sum, e) => {
    if (e.regularHours !== undefined || e.overtimeHours !== undefined) {
      return sum + (e.regularHours || 0) + (e.overtimeHours || 0)
    }
    return sum + (e.duration ? e.duration / 60 : 0)
  }, 0)
  const weekEarnings = weekEntries.reduce((sum, e) => sum + (e.totalPay || 0), 0)

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
    const duration = Math.round((Date.now() - start) / 60000) // minutes
    updateTimeEntry(activeTimer.id, {
      endTime: new Date().toISOString(),
      duration,
      status: 'completed',
    })
    setActiveTimer(null)
    setActiveTimerState(null)
    setElapsed(0)
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
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-base-content">
            {greeting()}, {profile?.firstName || 'Caregiver'} 👋
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-success pulse-dot" />
            <span className="text-xs text-base-content/60">Available for work</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">
            {profile?.firstName?.[0]}{profile?.lastName?.[0]}
          </span>
        </div>
      </div>

      {/* Profile Completeness Card */}
      {completeness < 100 && (
        <div className="bg-base-200 rounded-2xl p-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-3">
            <div className="relative flex-shrink-0">
              <ProgressRing score={completeness} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-bold text-base-content">{completeness}%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-base-content">Profile Strength</p>
              <p className="text-xs text-base-content/60">
                {completenessItems.filter(i => !i.done).length} items left to unlock more bookings
              </p>
              {/* Mini progress bar */}
              <div className="w-full bg-base-300 rounded-full h-1.5 mt-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${completeness >= 80 ? 'bg-success' : completeness >= 50 ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
          </div>
          {/* Incomplete items — each is a deep-link row */}
          <div className="space-y-1.5">
            {completenessItems.filter(i => !i.done).map((item, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-3 bg-base-100 hover:bg-primary/5 active:scale-[0.98] rounded-xl px-3 py-2.5 text-left transition-all"
                onClick={() => onNavigateToSection(item.action.section, item.action.scrollTo)}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-base-content truncate">{item.label}</p>
                  <p className="text-[10px] text-base-content/50 truncate">{item.hint}</p>
                </div>
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">Fix →</span>
              </button>
            ))}
          </div>
          {/* Completed items (collapsed) */}
          {completenessItems.filter(i => i.done).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {completenessItems.filter(i => i.done).map((item, i) => (
                <span key={i} className="text-[10px] text-success/70 bg-success/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle2 size={9} /> {item.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Timer Banner */}
      {activeTimer && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Timer size={24} className="text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-2xl font-mono font-bold text-base-content">{formatElapsed(elapsed)}</p>
                <p className="text-xs text-base-content/60">{activeTimer.clientName} · ${activeTimer.hourlyRate}/hr</p>
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

      {/* Quick Actions — "Your Caregiving Office" */}
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

      {/* Document Alerts */}
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

      {/* Earnings Card */}
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

      {/* Today's Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base text-base-content">Today's Schedule</h2>
          <button onClick={onNavigateToSchedule} className="text-xs text-primary font-medium">View All</button>
        </div>
        {todayShifts.length === 0 ? (
          <div className="bg-base-200 rounded-2xl p-6 text-center">
            <Calendar size={32} className="mx-auto opacity-30 mb-2" />
            <p className="text-sm text-base-content/60">No shifts scheduled today</p>
            <p className="text-xs text-base-content/40 mt-1">Use the timer to track private client hours</p>
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
                        {shift.startTime} — {shift.endTime}
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

      {/* New Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-base-content">
              New Requests
              <span className="ml-2 badge badge-primary badge-sm">{pendingRequests.length}</span>
            </h2>
            <button onClick={onNavigateToRequests} className="text-xs text-primary font-medium">View All</button>
          </div>
          <div className="bg-base-200 rounded-2xl p-4 press-card" onClick={onNavigateToRequests}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Bell size={18} className="text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-base-content">
                  {pendingRequests.length} care request{pendingRequests.length > 1 ? 's' : ''} waiting
                </p>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Up to ${Math.max(...pendingRequests.map(r => r.hourlyRate || 0))}/hr · Tap to respond
                </p>
              </div>
              <ChevronRight size={18} className="opacity-40" />
            </div>
          </div>
        </div>
      )}

      {/* Your Caregiving Office Promo */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 border border-primary/10">
        <h3 className="font-bold text-sm text-base-content mb-1">Your Caregiving Office</h3>
        <p className="text-xs text-base-content/60 mb-3">Free tools to manage your entire caregiving business</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Timer, label: 'Time Tracker', desc: 'Clock hours for any client' },
            { icon: FileText, label: 'Invoicing', desc: 'Create & send invoices' },
            { icon: FolderOpen, label: 'Doc Vault', desc: 'Certifications & expiry alerts' },
            { icon: Star, label: 'Public Profile', desc: 'Your professional page' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 bg-base-100/60 rounded-xl p-2.5">
              <item.icon size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-base-content">{item.label}</p>
                <p className="text-[10px] text-base-content/50">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div>
        <h2 className="font-bold text-base text-base-content mb-3">Your Stats</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-base-200 rounded-2xl p-3 text-center">
            <Star size={18} className="mx-auto text-warning mb-1" />
            <p className="text-lg font-bold text-base-content">{profile?.rating || '4.9'}</p>
            <p className="text-[10px] text-base-content/50">Rating</p>
          </div>
          <div className="bg-base-200 rounded-2xl p-3 text-center">
            <Briefcase size={18} className="mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-base-content">{profile?.totalJobs || shifts.length}</p>
            <p className="text-[10px] text-base-content/50">Jobs Done</p>
          </div>
          <div className="bg-base-200 rounded-2xl p-3 text-center">
            <TrendingUp size={18} className="mx-auto text-success mb-1" />
            <p className="text-lg font-bold text-base-content">96%</p>
            <p className="text-[10px] text-base-content/50">Response</p>
          </div>
        </div>
      </div>
    </div>
  )
}
