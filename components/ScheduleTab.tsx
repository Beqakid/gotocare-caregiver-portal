// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, User, Users, Play, Square, Plus, Trash2, Timer, X, Car, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { Shift, TimeEntry, PrivateClient, MileageEntry } from '../types'
import { getTimeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry, getActiveTimer, setActiveTimer, getPrivateClients, addPrivateClient, deletePrivateClient, addMileageEntry, getMileageEntries } from '../utils/storage'

interface ScheduleTabProps {
  shifts: Shift[]
  loading: boolean
  onClockIn: (shiftId: number) => void
  onTimerUpdate: () => void
}

// ---- Billing calculation helper ----
function calcEarnings(
  durationMins: number,
  rate: number,
  billingType: string,
  otAfterHrs: number,
  otMultiplier: number
) {
  const totalHrs = durationMins / 60
  if (billingType !== 'split_rate') {
    return {
      regularHours: totalHrs,
      overtimeHours: 0,
      regularPay: totalHrs * rate,
      overtimePay: 0,
      totalPay: totalHrs * rate,
    }
  }
  const regularHrs = Math.min(totalHrs, otAfterHrs)
  const otHrs = Math.max(0, totalHrs - otAfterHrs)
  const regularPay = regularHrs * rate
  const overtimePay = otHrs * rate * otMultiplier
  return {
    regularHours: regularHrs,
    overtimeHours: otHrs,
    regularPay,
    overtimePay,
    totalPay: regularPay + overtimePay,
  }
}

function fmtHrs(hrs: number) {
  if (hrs < 0.017) return '0m'
  const h = Math.floor(hrs)
  const m = Math.round((hrs - h) * 60)
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ shifts, loading, onClockIn, onTimerUpdate }) => {
  const [viewMode, setViewMode] = useState<'schedule' | 'timesheet' | 'clients'>('schedule')
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(getTimeEntries())
  const [activeTimer, setActiveTimerState] = useState<TimeEntry | null>(getActiveTimer())
  const [elapsed, setElapsed] = useState(0)
  const [clients, setClients] = useState<PrivateClient[]>(getPrivateClients())
  const [showAddClient, setShowAddClient] = useState(false)
  const [showStartTimer, setShowStartTimer] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  // Add client form state
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientRate, setNewClientRate] = useState('25')
  const [newClientCare, setNewClientCare] = useState('')
  const [newClientBilling, setNewClientBilling] = useState<'hourly' | 'split_rate'>('hourly')
  const [newClientOTHours, setNewClientOTHours] = useState('8')
  const [newClientOTMult, setNewClientOTMult] = useState('1.5')

  // Timer form state
  const [timerClient, setTimerClient] = useState('')
  const [timerClientObj, setTimerClientObj] = useState<PrivateClient | null>(null)
  const [timerRate, setTimerRate] = useState('25')
  const [timerNotes, setTimerNotes] = useState('')

  // Mileage
  const [showMileage, setShowMileage] = useState(false)
  const [mileageClient, setMileageClient] = useState('')
  const [mileageMiles, setMileageMiles] = useState('')

  const refresh = () => {
    setTimeEntries(getTimeEntries())
    setActiveTimerState(getActiveTimer())
    setClients(getPrivateClients())
  }

  // Timer tick
  useEffect(() => {
    if (!activeTimer) return
    const tick = () => {
      const start = new Date(activeTimer.startTime).getTime()
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [activeTimer])

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return `${m}m`
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  // Real-time earnings estimate for the active timer
  const liveEarnings = activeTimer
    ? calcEarnings(
        elapsed / 60,
        activeTimer.hourlyRate,
        activeTimer.billingType || 'hourly',
        activeTimer.overtimeAfterHours || 8,
        activeTimer.overtimeMultiplier || 1.5
      )
    : null

  // Is the active timer currently in OT?
  const liveInOT = liveEarnings && activeTimer?.billingType === 'split_rate' && liveEarnings.overtimeHours > 0

  const startTimer = () => {
    if (!timerClient.trim()) return
    const client = timerClientObj
    const entry = addTimeEntry({
      clientName: timerClient.trim(),
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      hourlyRate: parseFloat(timerRate) || 25,
      notes: timerNotes || undefined,
      status: 'active',
      billingType: client?.billingType || 'hourly',
      overtimeAfterHours: client?.overtimeAfterHours || 8,
      overtimeMultiplier: client?.overtimeMultiplier || 1.5,
    })
    setActiveTimer(entry)
    setActiveTimerState(entry)
    setShowStartTimer(false)
    setTimerClient('')
    setTimerClientObj(null)
    setTimerNotes('')
    onTimerUpdate()
  }

  const stopTimer = () => {
    if (!activeTimer) return
    const start = new Date(activeTimer.startTime).getTime()
    const durationMins = Math.round((Date.now() - start) / 60000)
    const billing = calcEarnings(
      durationMins,
      activeTimer.hourlyRate,
      activeTimer.billingType || 'hourly',
      activeTimer.overtimeAfterHours || 8,
      activeTimer.overtimeMultiplier || 1.5
    )
    updateTimeEntry(activeTimer.id, {
      endTime: new Date().toISOString(),
      duration: durationMins,
      status: 'completed',
      regularHours: billing.regularHours,
      overtimeHours: billing.overtimeHours,
      regularPay: billing.regularPay,
      overtimePay: billing.overtimePay,
      totalPay: billing.totalPay,
    })
    setActiveTimer(null)
    setActiveTimerState(null)
    setElapsed(0)
    refresh()
    onTimerUpdate()
  }

  const handleAddClient = () => {
    if (!newClientName.trim()) return
    addPrivateClient({
      name: newClientName.trim(),
      phone: newClientPhone || undefined,
      hourlyRate: parseFloat(newClientRate) || 25,
      careType: newClientCare || undefined,
      billingType: newClientBilling,
      overtimeAfterHours: newClientBilling === 'split_rate' ? parseFloat(newClientOTHours) || 8 : undefined,
      overtimeMultiplier: newClientBilling === 'split_rate' ? parseFloat(newClientOTMult) || 1.5 : undefined,
    })
    setShowAddClient(false)
    setNewClientName('')
    setNewClientPhone('')
    setNewClientRate('25')
    setNewClientCare('')
    setNewClientBilling('hourly')
    setNewClientOTHours('8')
    setNewClientOTMult('1.5')
    refresh()
  }

  const handleDeleteTimeEntry = (id: string) => {
    deleteTimeEntry(id)
    refresh()
    onTimerUpdate()
  }

  const handleDeleteClient = (id: string) => {
    deletePrivateClient(id)
    refresh()
  }

  const handleAddMileage = () => {
    if (!mileageClient.trim() || !mileageMiles) return
    addMileageEntry({
      date: new Date().toISOString().split('T')[0],
      clientName: mileageClient.trim(),
      miles: parseFloat(mileageMiles) || 0,
    })
    setShowMileage(false)
    setMileageClient('')
    setMileageMiles('')
  }

  // Shift grouping
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sortedShifts = [...shifts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const upcomingShifts = sortedShifts.filter(s => new Date(s.date) >= today)
  const grouped: Record<string, Shift[]> = {}
  upcomingShifts.forEach(s => {
    const dateKey = s.date?.split('T')[0] || s.date
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(s)
  })

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const todayStr = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === todayStr) return 'Today'
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const completedEntries = timeEntries.filter(e => e.status === 'completed')
  const totalTrackedToday = completedEntries
    .filter(e => e.date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + (e.duration || 0), 0)
  const totalEarnedToday = completedEntries
    .filter(e => e.date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + (e.totalPay ?? ((e.duration || 0) / 60) * e.hourlyRate), 0)

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-base-content">Schedule & Time</h1>
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          {[
            { key: 'schedule' as const, label: 'Schedule' },
            { key: 'timesheet' as const, label: 'Time Tracker' },
            { key: 'clients' as const, label: 'My Clients' },
          ].map(t => (
            <button
              key={t.key}
              className={`btn btn-sm rounded-full whitespace-nowrap ${viewMode === t.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- ACTIVE TIMER (shown in all views) ---- */}
      {activeTimer && (
        <div className={`mx-4 mb-4 rounded-2xl p-4 border ${liveInOT
          ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-400/30'
          : 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer size={24} className={`animate-pulse ${liveInOT ? 'text-amber-400' : 'text-primary'}`} />
              <div>
                <p className="text-2xl font-mono font-bold text-base-content">{formatElapsed(elapsed)}</p>
                <p className="text-xs text-base-content/60">
                  {activeTimer.clientName}
                  {activeTimer.billingType === 'split_rate' ? (
                    <span className={`ml-1 font-semibold ${liveInOT ? 'text-amber-400' : 'text-primary'}`}>
                      {liveInOT ? '⚡ Overtime' : `· regular until ${activeTimer.overtimeAfterHours || 8}h`}
                    </span>
                  ) : (
                    <span> · ${activeTimer.hourlyRate}/hr</span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-base-content">
                ${liveEarnings ? liveEarnings.totalPay.toFixed(2) : '0.00'}
              </p>
              {liveInOT && (
                <p className="text-[10px] text-amber-400">incl. OT</p>
              )}
              <button onClick={stopTimer} className="btn btn-error btn-xs gap-1 mt-1">
                <Square size={12} fill="currentColor" /> Stop
              </button>
            </div>
          </div>

          {/* Split-rate progress bar */}
          {activeTimer.billingType === 'split_rate' && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-base-content/50 mb-1">
                <span>Regular ({fmtHrs(liveEarnings?.regularHours || 0)})</span>
                <span className={liveInOT ? 'text-amber-400 font-semibold' : ''}>
                  {liveInOT ? `OT: ${fmtHrs(liveEarnings?.overtimeHours || 0)} (+${((activeTimer.overtimeMultiplier || 1.5) * 100 - 100).toFixed(0)}%)` : `OT starts at ${activeTimer.overtimeAfterHours || 8}h`}
                </span>
              </div>
              <div className="h-1.5 bg-base-300 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${liveInOT ? 'bg-amber-400' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, (elapsed / 3600 / (activeTimer.overtimeAfterHours || 8)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- SCHEDULE VIEW ---- */}
      {viewMode === 'schedule' && (
        <div className="px-4 space-y-5">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={40} className="mx-auto opacity-20 mb-3" />
              <p className="text-base-content/60 text-sm">No upcoming shifts</p>
              <p className="text-xs text-base-content/40 mt-1">Check Requests for new care opportunities</p>
            </div>
          ) : (
            Object.entries(grouped).map(([date, dateShifts]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">
                  {formatDate(date)}
                </p>
                <div className="space-y-2">
                  {dateShifts.map(shift => (
                    <div key={shift.id} className="bg-base-200 rounded-2xl p-4 press-card">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-base-content">{shift.startTime || '9:00'}</span>
                            <div className="w-px h-4 bg-base-300 my-0.5" />
                            <span className="text-xs text-base-content/50">{shift.endTime || '13:00'}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-base-content">
                              {typeof shift.client === 'object'
                                ? `${shift.client?.firstName || ''} ${shift.client?.lastName || ''}`.trim()
                                : `Client #${shift.client}`}
                            </p>
                            {shift.careType && (
                              <span className="inline-block mt-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {shift.careType}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {shift.status === 'scheduled' && (
                            <button onClick={() => onClockIn(shift.id)} className="btn btn-primary btn-xs">Check In</button>
                          )}
                          {shift.status === 'in_progress' && (
                            <span className="badge badge-success badge-sm">In Progress</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ---- TIME TRACKER VIEW ---- */}
      {viewMode === 'timesheet' && (
        <div className="px-4 space-y-4">
          {/* Today summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-base-200 rounded-2xl p-4 text-center">
              <Clock size={20} className="mx-auto text-primary mb-1" />
              <p className="text-xl font-bold text-base-content">{formatDuration(totalTrackedToday)}</p>
              <p className="text-[10px] text-base-content/50 uppercase">Tracked Today</p>
            </div>
            <div className="bg-base-200 rounded-2xl p-4 text-center">
              <div className="text-xl font-bold text-base-content">${totalEarnedToday.toFixed(0)}</div>
              <p className="text-[10px] text-base-content/50 uppercase">Earned Today</p>
            </div>
          </div>

          {/* Start timer button */}
          {!activeTimer && !showStartTimer && (
            <button onClick={() => setShowStartTimer(true)} className="btn btn-primary w-full gap-2 rounded-2xl">
              <Play size={18} /> Start New Timer
            </button>
          )}

          {/* Start timer form */}
          {showStartTimer && !activeTimer && (
            <div className="bg-base-200 rounded-2xl p-4 border-2 border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">Start Timer</p>
                <button onClick={() => { setShowStartTimer(false); setTimerClientObj(null) }} className="btn btn-ghost btn-xs btn-circle"><X size={14} /></button>
              </div>
              <div className="space-y-2">
                {/* Client chips */}
                {clients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setTimerClient(c.name)
                          setTimerRate(String(c.hourlyRate))
                          setTimerClientObj(c)
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          timerClient === c.name ? 'bg-primary text-white border-primary' : 'bg-base-100 border-base-300 text-base-content/70'
                        }`}
                      >
                        {c.name}
                        {c.billingType === 'split_rate' && (
                          <span className="ml-1 text-amber-400">⚡</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected client billing info banner */}
                {timerClientObj?.billingType === 'split_rate' && (
                  <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-2">
                    <p className="text-xs text-amber-400 font-semibold">
                      ⚡ Split-Rate Billing
                    </p>
                    <p className="text-[11px] text-base-content/70 mt-0.5">
                      First {timerClientObj.overtimeAfterHours || 8}h @ ${timerClientObj.hourlyRate}/hr
                      {' · '}
                      After {timerClientObj.overtimeAfterHours || 8}h @ ${(timerClientObj.hourlyRate * (timerClientObj.overtimeMultiplier || 1.5)).toFixed(2)}/hr ({((timerClientObj.overtimeMultiplier || 1.5) * 100 - 100).toFixed(0)}% extra)
                    </p>
                  </div>
                )}

                <input
                  type="text" className="input input-bordered input-sm w-full" placeholder="Client name"
                  value={timerClient}
                  onChange={e => { setTimerClient(e.target.value); setTimerClientObj(null) }}
                  autoFocus={clients.length === 0}
                />
                <div className="flex gap-2">
                  <input
                    type="number" className="input input-bordered input-sm flex-1" placeholder="$/hr"
                    value={timerRate} onChange={e => setTimerRate(e.target.value)}
                  />
                  <input
                    type="text" className="input input-bordered input-sm flex-1" placeholder="Notes (optional)"
                    value={timerNotes} onChange={e => setTimerNotes(e.target.value)}
                  />
                </div>
                <button onClick={startTimer} className="btn btn-primary btn-sm w-full gap-1">
                  <Play size={14} /> Start Timer
                </button>
              </div>
            </div>
          )}

          {/* Log mileage */}
          <button onClick={() => setShowMileage(!showMileage)} className="btn btn-ghost btn-sm gap-1 w-full">
            <Car size={14} /> Log Mileage
          </button>
          {showMileage && (
            <div className="bg-base-200 rounded-2xl p-4">
              <div className="flex gap-2">
                <input type="text" className="input input-bordered input-sm flex-1" placeholder="Client"
                  value={mileageClient} onChange={e => setMileageClient(e.target.value)} />
                <input type="number" className="input input-bordered input-sm w-20" placeholder="Miles"
                  value={mileageMiles} onChange={e => setMileageMiles(e.target.value)} />
                <button onClick={handleAddMileage} className="btn btn-primary btn-sm">Add</button>
              </div>
            </div>
          )}

          {/* Time entries history */}
          <div>
            <p className="text-sm font-semibold text-base-content mb-3">Recent Time Entries</p>
            {completedEntries.length === 0 ? (
              <div className="text-center py-8">
                <Timer size={32} className="mx-auto opacity-20 mb-2" />
                <p className="text-sm text-base-content/60">No time entries yet</p>
                <p className="text-xs text-base-content/40">Start a timer to track your hours</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedEntries.slice(0, 20).map(entry => {
                  const isSplit = entry.billingType === 'split_rate' && entry.overtimeHours > 0
                  const pay = entry.totalPay ?? ((entry.duration || 0) / 60 * entry.hourlyRate)
                  const isExpanded = expandedEntry === entry.id
                  return (
                    <div key={entry.id} className="bg-base-200 rounded-xl overflow-hidden">
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSplit ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                            {isSplit ? <Zap size={14} className="text-amber-400" /> : <Clock size={14} className="text-primary" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-base-content">{entry.clientName}</p>
                            <p className="text-[10px] text-base-content/60">
                              {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {entry.duration ? ` · ${formatDuration(entry.duration)}` : ''}
                              {isSplit && <span className="ml-1 text-amber-400">⚡ split</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-sm font-bold text-base-content">${pay.toFixed(2)}</span>
                            {isSplit && (
                              <button
                                onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                                className="block ml-auto text-[10px] text-base-content/40 hover:text-base-content/70"
                              >
                                {isExpanded ? '▲ hide' : '▼ breakdown'}
                              </button>
                            )}
                          </div>
                          <button onClick={() => handleDeleteTimeEntry(entry.id)} className="btn btn-ghost btn-xs btn-circle opacity-40">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Breakdown panel */}
                      {isSplit && isExpanded && (
                        <div className="px-3 pb-3 border-t border-base-300/50">
                          <div className="bg-base-100 rounded-xl p-3 mt-2 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-base-content/70">Regular ({fmtHrs(entry.regularHours || 0)} @ ${entry.hourlyRate}/hr)</span>
                              <span className="font-semibold text-base-content">${(entry.regularPay || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-amber-400">Overtime ({fmtHrs(entry.overtimeHours || 0)} @ ${(entry.hourlyRate * (entry.overtimeMultiplier || 1.5)).toFixed(2)}/hr)</span>
                              <span className="font-semibold text-amber-400">${(entry.overtimePay || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs border-t border-base-300/50 pt-1.5 mt-1">
                              <span className="font-bold text-base-content">Total</span>
                              <span className="font-bold text-base-content">${pay.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- MY CLIENTS VIEW ---- */}
      {viewMode === 'clients' && (
        <div className="px-4 space-y-4">
          <p className="text-xs text-base-content/60">
            Manage your private clients — track hours and create invoices for anyone you work with, even outside GoToCare.
          </p>

          <button onClick={() => setShowAddClient(true)} className="btn btn-primary btn-sm w-full gap-1 rounded-2xl">
            <Plus size={16} /> Add Client
          </button>

          {showAddClient && (
            <div className="bg-base-200 rounded-2xl p-4 border-2 border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">New Client</p>
                <button onClick={() => setShowAddClient(false)} className="btn btn-ghost btn-xs btn-circle"><X size={14} /></button>
              </div>
              <div className="space-y-2">
                <input type="text" className="input input-bordered input-sm w-full" placeholder="Client name *"
                  value={newClientName} onChange={e => setNewClientName(e.target.value)} autoFocus />
                <input type="tel" className="input input-bordered input-sm w-full" placeholder="Phone number"
                  value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} />
                <div className="flex gap-2">
                  <input type="number" className="input input-bordered input-sm flex-1" placeholder="$/hr"
                    value={newClientRate} onChange={e => setNewClientRate(e.target.value)} />
                  <input type="text" className="input input-bordered input-sm flex-1" placeholder="Care type"
                    value={newClientCare} onChange={e => setNewClientCare(e.target.value)} />
                </div>

                {/* Billing type toggle */}
                <div>
                  <p className="text-xs text-base-content/60 mb-1.5 font-medium">Billing Type</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewClientBilling('hourly')}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        newClientBilling === 'hourly'
                          ? 'bg-primary text-white border-primary'
                          : 'bg-base-100 border-base-300 text-base-content/60'
                      }`}
                    >
                      Hourly (flat)
                    </button>
                    <button
                      onClick={() => setNewClientBilling('split_rate')}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        newClientBilling === 'split_rate'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-base-100 border-base-300 text-base-content/60'
                      }`}
                    >
                      ⚡ 24hr Split Rate
                    </button>
                  </div>
                </div>

                {/* Split rate options */}
                {newClientBilling === 'split_rate' && (
                  <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-3 space-y-2">
                    <p className="text-[11px] text-amber-400 font-semibold">Split-Rate Configuration</p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-base-content/50 block mb-1">Regular hrs (before OT)</label>
                        <input
                          type="number" className="input input-bordered input-xs w-full" placeholder="8"
                          value={newClientOTHours} onChange={e => setNewClientOTHours(e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-base-content/50 block mb-1">OT multiplier</label>
                        <input
                          type="number" step="0.1" className="input input-bordered input-xs w-full" placeholder="1.5"
                          value={newClientOTMult} onChange={e => setNewClientOTMult(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-base-content/50">
                      First {newClientOTHours || 8}h @ ${parseFloat(newClientRate || '25').toFixed(2)}/hr
                      · After {newClientOTHours || 8}h @ ${(parseFloat(newClientRate || '25') * parseFloat(newClientOTMult || '1.5')).toFixed(2)}/hr
                    </p>
                  </div>
                )}

                <button onClick={handleAddClient} className="btn btn-primary btn-sm w-full">Save Client</button>
              </div>
            </div>
          )}

          {clients.length === 0 && !showAddClient ? (
            <div className="text-center py-10">
              <Users size={36} className="mx-auto opacity-20 mb-2" />
              <p className="text-sm text-base-content/60">No clients yet</p>
              <p className="text-xs text-base-content/40 mt-1">Add clients you work with privately to track hours and invoice them</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map(client => {
                const isSplit = client.billingType === 'split_rate'
                const otRate = (client.hourlyRate * (client.overtimeMultiplier || 1.5)).toFixed(2)
                return (
                  <div key={client.id} className={`rounded-2xl p-4 press-card border ${isSplit ? 'bg-amber-500/5 border-amber-400/20' : 'bg-base-200 border-transparent'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSplit ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                          <span className={`text-sm font-bold ${isSplit ? 'text-amber-400' : 'text-primary'}`}>{client.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-base-content">{client.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {isSplit ? (
                              <>
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                                  ⚡ ${client.hourlyRate}/hr → ${otRate}/hr after {client.overtimeAfterHours || 8}h
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-base-content/60">${client.hourlyRate}/hr</span>
                            )}
                            {client.careType && (
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{client.careType}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setTimerClient(client.name)
                            setTimerRate(String(client.hourlyRate))
                            setTimerClientObj(client)
                            setShowStartTimer(true)
                            setViewMode('timesheet')
                          }}
                          className="btn btn-primary btn-xs gap-1"
                        >
                          <Play size={12} /> Track
                        </button>
                        <button onClick={() => handleDeleteClient(client.id)} className="btn btn-ghost btn-xs btn-circle opacity-40">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
