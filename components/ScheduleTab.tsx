// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, User, Play, Square, Plus, Trash2, Timer, X, Car } from 'lucide-react'
import { Shift, TimeEntry, PrivateClient, MileageEntry } from '../types'
import { getTimeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry, getActiveTimer, setActiveTimer, getPrivateClients, addPrivateClient, deletePrivateClient, addMileageEntry, getMileageEntries } from '../utils/storage'

interface ScheduleTabProps {
  shifts: Shift[]
  loading: boolean
  onClockIn: (shiftId: number) => void
  onTimerUpdate: () => void
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ shifts, loading, onClockIn, onTimerUpdate }) => {
  const [viewMode, setViewMode] = useState<'schedule' | 'timesheet' | 'clients'>('schedule')
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(getTimeEntries())
  const [activeTimer, setActiveTimerState] = useState<TimeEntry | null>(getActiveTimer())
  const [elapsed, setElapsed] = useState(0)
  const [clients, setClients] = useState<PrivateClient[]>(getPrivateClients())
  const [showAddClient, setShowAddClient] = useState(false)
  const [showStartTimer, setShowStartTimer] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientRate, setNewClientRate] = useState('25')
  const [newClientCare, setNewClientCare] = useState('')
  const [timerClient, setTimerClient] = useState('')
  const [timerRate, setTimerRate] = useState('25')
  const [timerNotes, setTimerNotes] = useState('')
  const [showMileage, setShowMileage] = useState(false)
  const [mileageClient, setMileageClient] = useState('')
  const [mileageMiles, setMileageMiles] = useState('')

  // Refresh local data
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

  const startTimer = () => {
    if (!timerClient.trim()) return
    const entry = addTimeEntry({
      clientName: timerClient.trim(),
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toISOString(),
      hourlyRate: parseFloat(timerRate) || 25,
      notes: timerNotes || undefined,
      status: 'active',
    })
    setActiveTimer(entry)
    setActiveTimerState(entry)
    setShowStartTimer(false)
    setTimerClient('')
    setTimerNotes('')
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
    })
    setShowAddClient(false)
    setNewClientName('')
    setNewClientPhone('')
    setNewClientRate('25')
    setNewClientCare('')
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

  // Completed entries by date
  const completedEntries = timeEntries.filter(e => e.status === 'completed')
  const totalTrackedToday = completedEntries
    .filter(e => e.date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + (e.duration || 0), 0)
  const totalEarnedToday = completedEntries
    .filter(e => e.date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + ((e.duration || 0) / 60) * e.hourlyRate, 0)

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
        <div className="mx-4 mb-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer size={24} className="text-primary animate-pulse" />
              <div>
                <p className="text-2xl font-mono font-bold text-base-content">{formatElapsed(elapsed)}</p>
                <p className="text-xs text-base-content/75">{activeTimer.clientName} · ${activeTimer.hourlyRate}/hr</p>
              </div>
            </div>
            <button onClick={stopTimer} className="btn btn-error btn-sm gap-1">
              <Square size={14} fill="currentColor" /> Stop
            </button>
          </div>
        </div>
      )}

      {/* ---- SCHEDULE VIEW ---- */}
      {viewMode === 'schedule' && (
        <div className="px-4 space-y-5">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={40} className="mx-auto opacity-20 mb-3" />
              <p className="text-base-content/60 text-sm">No upcoming shifts</p>
              <p className="text-xs text-base-content/65 mt-1">Check Requests for new care opportunities</p>
            </div>
          ) : (
            Object.entries(grouped).map(([date, dateShifts]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-base-content/70 uppercase tracking-wide mb-2">
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
                            <span className="text-xs text-base-content/70">{shift.endTime || '13:00'}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-base-content">
                              {typeof shift.client === 'object'
                                ? `${shift.client?.firstName || ''} ${shift.client?.lastName || ''}`.trim()
                                : `Client #${shift.client}`}
                            </p>
                            {shift.careType && (
                              <span className="inline-block mt-1 text-[10px] font-medium bg-violet-500/25 text-violet-300 px-2 py-0.5 rounded-full font-medium">
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
              <p className="text-[10px] text-base-content/70 uppercase">Tracked Today</p>
            </div>
            <div className="bg-base-200 rounded-2xl p-4 text-center">
              <div className="text-xl font-bold text-base-content">${totalEarnedToday.toFixed(0)}</div>
              <p className="text-[10px] text-base-content/70 uppercase">Earned Today</p>
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
                <button onClick={() => setShowStartTimer(false)} className="btn btn-ghost btn-xs btn-circle"><X size={14} /></button>
              </div>
              <div className="space-y-2">
                {clients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setTimerClient(c.name); setTimerRate(String(c.hourlyRate)) }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          timerClient === c.name ? 'bg-primary text-white border-primary' : 'bg-base-100 border-base-300 text-base-content/70'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="text" className="input input-bordered input-sm w-full" placeholder="Client name"
                  value={timerClient} onChange={e => setTimerClient(e.target.value)} autoFocus
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
                <p className="text-xs text-base-content/65">Start a timer to track your hours</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedEntries.slice(0, 20).map(entry => (
                  <div key={entry.id} className="bg-base-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-base-content">{entry.clientName}</p>
                        <p className="text-[11px] text-base-content/75">
                          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {entry.duration ? ` · ${formatDuration(entry.duration)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-base-content">
                        ${((entry.duration || 0) / 60 * entry.hourlyRate).toFixed(2)}
                      </span>
                      <button onClick={() => handleDeleteTimeEntry(entry.id)} className="btn btn-ghost btn-xs btn-circle opacity-40">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- MY CLIENTS VIEW ---- */}
      {viewMode === 'clients' && (
        <div className="px-4 space-y-4">
          <p className="text-xs text-base-content/75">
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
                <button onClick={handleAddClient} className="btn btn-primary btn-sm w-full">Save Client</button>
              </div>
            </div>
          )}

          {clients.length === 0 && !showAddClient ? (
            <div className="text-center py-10">
              <Users size={36} className="mx-auto opacity-20 mb-2" />
              <p className="text-sm text-base-content/60">No clients yet</p>
              <p className="text-xs text-base-content/65 mt-1">Add clients you work with privately to track hours and invoice them</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map(client => (
                <div key={client.id} className="bg-base-200 rounded-2xl p-4 press-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{client.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-base-content">{client.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-base-content/75">${client.hourlyRate}/hr</span>
                          {client.careType && (
                            <span className="text-[10px] bg-violet-500/25 text-violet-300 px-2 py-0.5 rounded-full font-medium">{client.careType}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setTimerClient(client.name); setTimerRate(String(client.hourlyRate)); setShowStartTimer(true); setViewMode('timesheet') }}
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
