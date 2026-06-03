// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, User, Users, Play, Square, Plus, Trash2, Timer, X, Car, ChevronDown, ChevronUp, Zap, Edit2, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Shift, TimeEntry, PrivateClient, MileageEntry } from '../types'
import { getTimeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry, getActiveTimer, setActiveTimer, getPrivateClients, addPrivateClient, deletePrivateClient, addMileageEntry, getMileageEntries } from '../utils/storage'
import { cloudGetTimeEntries, cloudAddTimeEntry, cloudDeleteTimeEntry, cloudGetActiveTimer, cloudSetActiveTimer, cloudGetPrivateClients, cloudAddPrivateClient, cloudDeletePrivateClient, cloudAddMileage, cloudGetMileage } from '../utils/cloud-api'

interface ScheduleTabProps {
  shifts: Shift[]
  loading: boolean
  onClockIn: (shiftId: number) => void
  onTimerUpdate: () => void
}

const SCHEDULE_VIEW_KEY = 'cgp_schedule_view'
const SCHEDULE_MONTH_KEY = 'cgp_schedule_month'
type ScheduleViewMode = 'schedule' | 'timesheet' | 'clients' | 'availability'

function getSavedScheduleView(): ScheduleViewMode {
  try {
    const saved = localStorage.getItem(SCHEDULE_VIEW_KEY) as ScheduleViewMode | null
    if (saved === 'schedule' || saved === 'timesheet' || saved === 'clients' || saved === 'availability') return saved
  } catch {}
  return 'schedule'
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

// ---- Mini Calendar Component ----
interface MiniCalendarProps {
  selectedDates: string[] // 'YYYY-MM-DD'
  onToggleDate: (date: string) => void
}
const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDates, onToggleDate }) => {
  const [viewDate, setViewDate] = useState(() => {
    try {
      const saved = localStorage.getItem(SCHEDULE_MONTH_KEY)
      if (saved) {
        const parsed = new Date(saved)
        if (!Number.isNaN(parsed.getTime())) {
          parsed.setDate(1)
          return parsed
        }
      }
    } catch {}
    const d = new Date(); d.setDate(1); return d
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = new Date().toISOString().split('T')[0]

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const toStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const setCalendarMonth = (date: Date) => {
    setViewDate(date)
    try { localStorage.setItem(SCHEDULE_MONTH_KEY, date.toISOString()) } catch {}
  }
  const prevMonth = () => { const d = new Date(year, month - 1, 1); setCalendarMonth(d) }
  const nextMonth = () => { const d = new Date(year, month + 1, 1); setCalendarMonth(d) }

  return (
    <div className="bg-base-100 rounded-2xl p-3 border border-base-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="btn btn-ghost btn-xs btn-circle"><ChevronLeft size={14} /></button>
        <span className="text-xs font-semibold text-base-content">{monthName}</span>
        <button onClick={nextMonth} className="btn btn-ghost btn-xs btn-circle"><ChevronRight size={14} /></button>
      </div>
      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[9px] font-medium text-base-content/60 py-0.5">{d}</div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const dateStr = toStr(day)
          const isSelected = selectedDates.includes(dateStr)
          const isToday = dateStr === todayStr
          return (
            <button
              key={dateStr}
              onClick={() => onToggleDate(dateStr)}
              className={`aspect-square rounded-lg text-[11px] font-medium transition-all
                ${isSelected
                  ? 'bg-primary text-white'
                  : isToday
                    ? 'border border-primary/40 text-primary'
                    : 'hover:bg-base-200 text-base-content/80'
                }`}
            >
              {day}
            </button>
          )
        })}
      </div>
      {selectedDates.length > 0 && (
        <p className="text-[10px] text-primary text-center mt-2 font-medium">
          {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ shifts, loading, onClockIn, onTimerUpdate }) => {
  const [viewMode, setViewMode] = useState<ScheduleViewMode>(getSavedScheduleView)
  const [confirmedSchedules, setConfirmedSchedules] = useState<any[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)

  // Availability state
  const [availability, setAvailability] = useState<Record<string, { available: boolean; start: string; end: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('cgp_availability') || '{}') } catch { return {} }
  })
  const [availabilitySaved, setAvailabilitySaved] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(getTimeEntries())
  const [activeTimer, setActiveTimerState] = useState<TimeEntry | null>(getActiveTimer())
  const [elapsed, setElapsed] = useState(0)
  const [clients, setClients] = useState<PrivateClient[]>(getPrivateClients())
  const [showAddClient, setShowAddClient] = useState(false)
  const [showStartTimer, setShowStartTimer] = useState(false)
  const [showLogHours, setShowLogHours] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)

  // Edit state for a time entry
  const [editDate, setEditDate] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  // Add client form state
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
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
  // Manual start time for timer
  const [timerCustomStart, setTimerCustomStart] = useState('')
  const [timerCustomEnd, setTimerCustomEnd] = useState('')
  const [timerMode, setTimerMode] = useState<'live' | 'manual'>('live')

  // Log Hours (calendar) state
  const [logClient, setLogClient] = useState('')
  const [logClientObj, setLogClientObj] = useState<PrivateClient | null>(null)
  const [logRate, setLogRate] = useState('25')
  const [logSelectedDates, setLogSelectedDates] = useState<string[]>([])
  const [logHoursPerDay, setLogHoursPerDay] = useState('24')
  const [logStartTime, setLogStartTime] = useState('08:00')
  const [logNotes, setLogNotes] = useState('')

  // Mileage
  const [showMileage, setShowMileage] = useState(false)
  const [mileageClient, setMileageClient] = useState('')
  const [mileageMiles, setMileageMiles] = useState('')

  const DAYS = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
  ]

  const navigateToViewMode = (mode: ScheduleViewMode) => {
    setViewMode(mode)
    try { localStorage.setItem(SCHEDULE_VIEW_KEY, mode) } catch {}
  }

  const toggleDay = (key: string) => {
    setAvailability(prev => ({
      ...prev,
      [key]: { available: !prev[key]?.available, start: prev[key]?.start || '08:00', end: prev[key]?.end || '18:00' }
    }))
  }

  const updateDayTime = (key: string, field: 'start' | 'end', value: string) => {
    setAvailability(prev => ({ ...prev, [key]: { ...prev[key], [field]: value, available: true } }))
  }

  const saveAvailability = async () => {
    localStorage.setItem('cgp_availability', JSON.stringify(availability))
    // Cloud sync
    const token = localStorage.getItem('cgp_token')
    if (token) {
      try {
        await fetch(`https://gotocare-original.jjioji.workers.dev/api/caregiver-availability?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ availability }),
        })
      } catch {}
    }
    setAvailabilitySaved(true)
    setTimeout(() => setAvailabilitySaved(false), 2500)
  }

  const quickSet = (preset: 'weekdays' | 'weekends' | 'everyday') => {
    const defaultSlot = { available: true, start: '08:00', end: '18:00' }
    const offSlot = { available: false, start: '', end: '' }
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri']
    const weekends = ['sat', 'sun']
    const all = [...weekdays, ...weekends]
    const newAv: Record<string, any> = {}
    all.forEach(d => {
      if (preset === 'weekdays') newAv[d] = weekdays.includes(d) ? defaultSlot : offSlot
      else if (preset === 'weekends') newAv[d] = weekends.includes(d) ? defaultSlot : offSlot
      else newAv[d] = defaultSlot
    })
    setAvailability(newAv)
  }

  const refresh = async () => {
    // Always load localStorage first for instant render
    setTimeEntries(getTimeEntries())
    setActiveTimerState(getActiveTimer())
    setClients(getPrivateClients())
    // Then merge cloud data
    const token = localStorage.getItem('cgp_token')
    if (token) {
      const [cloudEntries, cloudTimer, cloudClients] = await Promise.all([
        cloudGetTimeEntries(),
        cloudGetActiveTimer(),
        cloudGetPrivateClients(),
      ])
      // Merge: cloud entries take precedence (they have cloudId prefix)
      const localOnly = getTimeEntries().filter(e => !e.id.startsWith('cloud_') && !e.cloudId)
      const merged = [...cloudEntries, ...localOnly]
      merged.sort((a, b) => (b.date > a.date ? 1 : -1))
      setTimeEntries(merged)
      if (cloudTimer && !getActiveTimer()) {
        // Restore timer from cloud if not running locally
        setActiveTimerState({ ...cloudTimer, id: 'cloud_timer', createdAt: new Date().toISOString() })
      }
      if (cloudClients.length > 0) {
        const localOnly2 = getPrivateClients().filter(c => !c.id.startsWith('cloud_'))
        setClients([...cloudClients, ...localOnly2])
      }
    }
  }

  // Fetch confirmed schedules (from hire agreements) when schedule tab is active
  useEffect(() => {
    if (viewMode !== 'schedule') return
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setSchedulesLoading(true)
    fetch(`https://gotocare-original.jjioji.workers.dev/api/caregiver-work-schedule?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => { if (d.success) setConfirmedSchedules(d.schedules || []) })
      .catch(() => {})
      .finally(() => setSchedulesLoading(false))
  }, [viewMode])

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

  const liveInOT = liveEarnings && activeTimer?.billingType === 'split_rate' && liveEarnings.overtimeHours > 0

  // ---- Log Hours Preview Calculation ----
  const logPreview = () => {
    if (!logSelectedDates.length || !logHoursPerDay) return null
    const hrs = parseFloat(logHoursPerDay) || 0
    const rate = parseFloat(logRate) || 25
    const billing = logClientObj?.billingType || 'hourly'
    const otAfter = logClientObj?.overtimeAfterHours || 8
    const otMult = logClientObj?.overtimeMultiplier || 1.5
    const perDay = calcEarnings(hrs * 60, rate, billing, otAfter, otMult)
    const days = logSelectedDates.length
    return {
      days,
      hrs,
      totalHrs: hrs * days,
      perDay,
      totalPay: perDay.totalPay * days,
      regularPay: perDay.regularPay * days,
      overtimePay: perDay.overtimePay * days,
      regularHours: perDay.regularHours * days,
      overtimeHours: perDay.overtimeHours * days,
      isSplit: billing === 'split_rate' && perDay.overtimeHours > 0,
    }
  }

  const startTimer = () => {
    if (!timerClient.trim()) return
    const client = timerClientObj

    let startISO = new Date().toISOString()
    if (timerMode === 'manual' && timerCustomStart) {
      const today = new Date().toISOString().split('T')[0]
      startISO = new Date(`${today}T${timerCustomStart}:00`).toISOString()
    }

    // If manual mode with end time, just save a completed entry
    if (timerMode === 'manual' && timerCustomStart && timerCustomEnd) {
      const today = new Date().toISOString().split('T')[0]
      const startDt = new Date(`${today}T${timerCustomStart}:00`)
      const endDt = new Date(`${today}T${timerCustomEnd}:00`)
      // handle overnight
      if (endDt <= startDt) endDt.setDate(endDt.getDate() + 1)
      const durationMins = Math.round((endDt.getTime() - startDt.getTime()) / 60000)
      const billing = calcEarnings(
        durationMins,
        parseFloat(timerRate) || 25,
        client?.billingType || 'hourly',
        client?.overtimeAfterHours || 8,
        client?.overtimeMultiplier || 1.5
      )
      addTimeEntry({
        clientName: timerClient.trim(),
        date: today,
        startTime: startDt.toISOString(),
        endTime: endDt.toISOString(),
        duration: durationMins,
        hourlyRate: parseFloat(timerRate) || 25,
        notes: timerNotes || undefined,
        status: 'completed',
        billingType: client?.billingType || 'hourly',
        overtimeAfterHours: client?.overtimeAfterHours || 8,
        overtimeMultiplier: client?.overtimeMultiplier || 1.5,
        regularHours: billing.regularHours,
        overtimeHours: billing.overtimeHours,
        regularPay: billing.regularPay,
        overtimePay: billing.overtimePay,
        totalPay: billing.totalPay,
      })
      setShowStartTimer(false)
      setTimerClient('')
      setTimerClientObj(null)
      setTimerNotes('')
      setTimerCustomStart('')
      setTimerCustomEnd('')
      setTimerMode('live')
      refresh()
      onTimerUpdate()
      return
    }

    const entry = addTimeEntry({
      clientName: timerClient.trim(),
      date: new Date().toISOString().split('T')[0],
      startTime: startISO,
      hourlyRate: parseFloat(timerRate) || 25,
      notes: timerNotes || undefined,
      status: 'active',
      billingType: client?.billingType || 'hourly',
      overtimeAfterHours: client?.overtimeAfterHours || 8,
      overtimeMultiplier: client?.overtimeMultiplier || 1.5,
    })
    setActiveTimer(entry)
    setActiveTimerState(entry)
    cloudSetActiveTimer({ clientName: entry.clientName, clientEmail: client?.email || '', startTime: entry.startTime, hourlyRate: entry.hourlyRate, billingType: entry.billingType || 'hourly', otAfterHrs: entry.overtimeAfterHours || 8, otMultiplier: entry.overtimeMultiplier || 1.5, notes: entry.notes || '' })
    setShowStartTimer(false)
    setTimerClient('')
    setTimerClientObj(null)
    setTimerNotes('')
    setTimerCustomStart('')
    setTimerCustomEnd('')
    setTimerMode('live')
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
    cloudSetActiveTimer(null)
    const completedEntry = getTimeEntries().find(e => e.id === activeTimer.id)
    if (completedEntry) cloudAddTimeEntry(completedEntry)
    refresh()
    onTimerUpdate()
  }

  // ---- Edit a completed time entry ----
  const openEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry.id)
    setEditDate(entry.date)
    // parse start/end times to HH:MM
    if (entry.startTime) {
      const d = new Date(entry.startTime)
      setEditStart(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`)
    }
    if (entry.endTime) {
      const d = new Date(entry.endTime)
      setEditEnd(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`)
    }
  }

  const saveEditEntry = (entry: TimeEntry) => {
    if (!editDate || !editStart || !editEnd) return
    const startDt = new Date(`${editDate}T${editStart}:00`)
    const endDt = new Date(`${editDate}T${editEnd}:00`)
    if (endDt <= startDt) endDt.setDate(endDt.getDate() + 1) // overnight
    const durationMins = Math.round((endDt.getTime() - startDt.getTime()) / 60000)
    const billing = calcEarnings(
      durationMins,
      entry.hourlyRate,
      entry.billingType || 'hourly',
      entry.overtimeAfterHours || 8,
      entry.overtimeMultiplier || 1.5
    )
    updateTimeEntry(entry.id, {
      date: editDate,
      startTime: startDt.toISOString(),
      endTime: endDt.toISOString(),
      duration: durationMins,
      regularHours: billing.regularHours,
      overtimeHours: billing.overtimeHours,
      regularPay: billing.regularPay,
      overtimePay: billing.overtimePay,
      totalPay: billing.totalPay,
    })
    setEditingEntry(null)
    refresh()
    onTimerUpdate()
  }

  // ---- Log Hours from calendar selection ----
  const handleLogHours = () => {
    if (!logClient.trim() || !logSelectedDates.length || !logHoursPerDay) return
    const hrsPerDay = parseFloat(logHoursPerDay) || 0
    const rate = parseFloat(logRate) || 25
    const client = logClientObj

    logSelectedDates.sort().forEach(dateStr => {
      const startDt = new Date(`${dateStr}T${logStartTime}:00`)
      const endDt = new Date(startDt.getTime() + hrsPerDay * 3600 * 1000)
      const durationMins = hrsPerDay * 60
      const billing = calcEarnings(
        durationMins,
        rate,
        client?.billingType || 'hourly',
        client?.overtimeAfterHours || 8,
        client?.overtimeMultiplier || 1.5
      )
      addTimeEntry({
        clientName: logClient.trim(),
        date: dateStr,
        startTime: startDt.toISOString(),
        endTime: endDt.toISOString(),
        duration: durationMins,
        hourlyRate: rate,
        notes: logNotes || undefined,
        status: 'completed',
        billingType: client?.billingType || 'hourly',
        overtimeAfterHours: client?.overtimeAfterHours || 8,
        overtimeMultiplier: client?.overtimeMultiplier || 1.5,
        regularHours: billing.regularHours,
        overtimeHours: billing.overtimeHours,
        regularPay: billing.regularPay,
        overtimePay: billing.overtimePay,
        totalPay: billing.totalPay,
      })
    })

    setShowLogHours(false)
    setLogClient('')
    setLogClientObj(null)
    setLogRate('25')
    setLogSelectedDates([])
    setLogHoursPerDay('24')
    setLogStartTime('08:00')
    setLogNotes('')
    refresh()
    onTimerUpdate()
  }

  const handleAddClient = () => {
    if (!newClientName.trim()) return
    const newClientData = {
      name: newClientName.trim(),
      phone: newClientPhone || undefined,
      hourlyRate: parseFloat(newClientRate) || 25,
      careType: newClientCare || undefined,
      billingType: newClientBilling,
      overtimeAfterHours: newClientBilling === 'split_rate' ? parseFloat(newClientOTHours) || 8 : undefined,
      overtimeMultiplier: newClientBilling === 'split_rate' ? parseFloat(newClientOTMult) || 1.5 : undefined,
    }
    addPrivateClient(newClientData)
    cloudAddPrivateClient({ name: newClientData.name, email: newClientEmail.trim() || '', phone: newClientData.phone || '', hourlyRate: newClientData.hourlyRate, careType: newClientData.careType || '', billingType: newClientData.billingType, otAfterHrs: newClientData.overtimeAfterHours || 8, otMultiplier: newClientData.overtimeMultiplier || 1.5 })
    setShowAddClient(false)
    setNewClientName('')
    setNewClientEmail('')
    setNewClientPhone('')
    setNewClientRate('25')
    setNewClientCare('')
    setNewClientBilling('hourly')
    setNewClientOTHours('8')
    setNewClientOTMult('1.5')
    refresh()
  }

  const handleDeleteTimeEntry = (id: string, entry?: TimeEntry) => {
    deleteTimeEntry(id)
    if (id.startsWith('cloud_')) {
      cloudDeleteTimeEntry(id.replace('cloud_', ''))
    } else if (entry?.cloudId) {
      cloudDeleteTimeEntry(String(entry.cloudId))
    }
    refresh()
    onTimerUpdate()
  }

  const handleDeleteClient = (id: string) => {
    if (id.startsWith('cloud_')) {
      cloudDeletePrivateClient(id.replace('cloud_', ''))
    }
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
    cloudAddMileage({ date: new Date().toISOString().split('T')[0], clientName: mileageClient.trim(), miles: parseFloat(mileageMiles) || 0 })
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

  const preview = logPreview()

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
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { key: 'schedule' as const, icon: '📅', label: 'Schedule' },
            { key: 'timesheet' as const, icon: '⏱', label: 'Tracker' },
            { key: 'clients' as const, icon: '👥', label: 'Clients' },
            { key: 'availability' as const, icon: '🗓', label: 'Availability' },
          ].map(t => (
            <button
              key={t.key}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-semibold transition-all ${viewMode === t.key ? 'bg-primary text-primary-content shadow-md' : 'bg-base-200/60 text-base-content/70 hover:bg-base-200'}`}
              onClick={() => navigateToViewMode(t.key)}
            >
              <span className="text-base leading-none">{t.icon}</span>
              <span className="leading-tight">{t.label}</span>
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
          {/* ── Confirmed Schedules (from signed hire agreements) ── */}
          {(confirmedSchedules.length > 0 || schedulesLoading) && (
            <div>
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Confirmed Schedules</p>
              {schedulesLoading && confirmedSchedules.length === 0 ? (
                <div className="skeleton-shimmer h-16 rounded-2xl" />
              ) : (
                <div className="space-y-2">
                  {confirmedSchedules.map((sched: any, idx: number) => (
                    <div key={idx} className="bg-gradient-to-r from-primary/8 to-primary/4 border border-primary/15 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary">{(sched.client_display_name || '?').charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-base-content">{sched.client_display_name || sched.client_email}</p>
                            <p className="text-xs text-base-content/60 mt-0.5">
                              {sched.days?.split(',').join(' · ')} &nbsp;·&nbsp; {sched.start_time} – {sched.end_time}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {sched.care_type && (
                            <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{sched.care_type}</span>
                          )}
                          <p className="text-[10px] text-base-content/40 mt-1">View only</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={40} className="mx-auto opacity-20 mb-3" />
              <p className="text-base-content/60 text-sm">No upcoming shifts</p>
              <p className="text-xs text-base-content/60 mt-1">Check Requests for new care opportunities</p>
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
                            <span className="text-xs text-base-content/65">{shift.endTime || '13:00'}</span>
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

          {/* Action buttons */}
          {!activeTimer && !showStartTimer && !showLogHours && (
            <div className="flex gap-2">
              <button onClick={() => setShowStartTimer(true)} className="btn btn-primary flex-1 gap-1.5 rounded-2xl">
                <Play size={16} /> Live Timer
              </button>
              <button onClick={() => setShowLogHours(true)} className="btn btn-outline flex-1 gap-1.5 rounded-2xl border-primary/65 text-primary bg-primary/10">
                <Calendar size={16} /> Log Hours
              </button>
            </div>
          )}

          {/* ---- LIVE TIMER FORM ---- */}
          {showStartTimer && !activeTimer && (
            <div className="bg-base-200 rounded-2xl p-4 border-2 border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">Start Timer</p>
                <button onClick={() => { setShowStartTimer(false); setTimerClientObj(null); setTimerMode('live') }} className="btn btn-ghost btn-xs btn-circle"><X size={14} /></button>
              </div>

              {/* Live vs Manual toggle */}
              <div className="flex gap-1.5 mb-3 bg-base-300 rounded-xl p-1">
                <button
                  onClick={() => setTimerMode('live')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${timerMode === 'live' ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/50'}`}
                >
                  ⏱ Live
                </button>
                <button
                  onClick={() => setTimerMode('manual')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${timerMode === 'manual' ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/50'}`}
                >
                  ✏️ Manual
                </button>
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
                        {c.billingType === 'split_rate' && <span className="ml-1 text-amber-400">⚡</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Split-rate billing banner */}
                {timerClientObj?.billingType === 'split_rate' && (
                  <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-2">
                    <p className="text-xs text-amber-400 font-semibold">⚡ Split-Rate Billing</p>
                    <p className="text-[11px] text-base-content/70 mt-0.5">
                      First {timerClientObj.overtimeAfterHours || 8}h @ ${timerClientObj.hourlyRate}/hr
                      {' · '}
                      After {timerClientObj.overtimeAfterHours || 8}h @ ${(timerClientObj.hourlyRate * (timerClientObj.overtimeMultiplier || 1.5)).toFixed(2)}/hr
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

                {/* Manual start/end time */}
                {timerMode === 'manual' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-base-content/50 block mb-1">Start Time</label>
                        <input type="time" className="input input-bordered input-sm w-full"
                          value={timerCustomStart} onChange={e => setTimerCustomStart(e.target.value)} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-base-content/50 block mb-1">End Time</label>
                        <input type="time" className="input input-bordered input-sm w-full"
                          value={timerCustomEnd} onChange={e => setTimerCustomEnd(e.target.value)} />
                      </div>
                    </div>
                    {timerCustomStart && timerCustomEnd && (() => {
                      const s = new Date(`2000-01-01T${timerCustomStart}:00`)
                      const e = new Date(`2000-01-01T${timerCustomEnd}:00`)
                      if (e <= s) e.setDate(2)
                      const mins = Math.round((e.getTime() - s.getTime()) / 60000)
                      const bill = calcEarnings(mins, parseFloat(timerRate)||25, timerClientObj?.billingType||'hourly', timerClientObj?.overtimeAfterHours||8, timerClientObj?.overtimeMultiplier||1.5)
                      return (
                        <div className="bg-base-100 rounded-xl px-3 py-2 text-xs text-base-content/70">
                          Duration: <span className="font-semibold text-base-content">{formatDuration(mins)}</span>
                          {' · '}Total: <span className="font-bold text-primary">${bill.totalPay.toFixed(2)}</span>
                          {bill.overtimeHours > 0 && <span className="ml-1 text-amber-400">⚡ incl. OT</span>}
                        </div>
                      )
                    })()}
                  </div>
                )}

                <button onClick={startTimer} className="btn btn-primary btn-sm w-full gap-1">
                  {timerMode === 'live'
                    ? <><Play size={14} /> Start Timer</>
                    : <><Check size={14} /> Save Entry</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ---- LOG HOURS (CALENDAR) FORM ---- */}
          {showLogHours && (
            <div className="bg-base-200 rounded-2xl p-4 border-2 border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">Log Hours by Day</p>
                <button onClick={() => { setShowLogHours(false); setLogSelectedDates([]) }} className="btn btn-ghost btn-xs btn-circle"><X size={14} /></button>
              </div>
              <div className="space-y-3">
                {/* Client chips */}
                {clients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setLogClient(c.name)
                          setLogRate(String(c.hourlyRate))
                          setLogClientObj(c)
                          if (c.billingType === 'split_rate') setLogHoursPerDay('24')
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          logClient === c.name ? 'bg-primary text-white border-primary' : 'bg-base-100 border-base-300 text-base-content/70'
                        }`}
                      >
                        {c.name}
                        {c.billingType === 'split_rate' && <span className="ml-1 text-amber-400">⚡</span>}
                      </button>
                    ))}
                  </div>
                )}

                <input type="text" className="input input-bordered input-sm w-full" placeholder="Client name *"
                  value={logClient} onChange={e => { setLogClient(e.target.value); setLogClientObj(null) }} />

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-base-content/50 block mb-1">Rate ($/hr)</label>
                    <input type="number" className="input input-bordered input-sm w-full" placeholder="25"
                      value={logRate} onChange={e => setLogRate(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-base-content/50 block mb-1">Hours per day</label>
                    <input type="number" step="0.5" className="input input-bordered input-sm w-full" placeholder="24"
                      value={logHoursPerDay} onChange={e => setLogHoursPerDay(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-base-content/50 block mb-1">Start time</label>
                    <input type="time" className="input input-bordered input-sm w-full"
                      value={logStartTime} onChange={e => setLogStartTime(e.target.value)} />
                  </div>
                </div>

                {/* Split-rate info */}
                {logClientObj?.billingType === 'split_rate' && (
                  <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-2">
                    <p className="text-[11px] text-amber-400 font-semibold">
                      ⚡ Split-Rate · First {logClientObj.overtimeAfterHours || 8}h @ ${logClientObj.hourlyRate}/hr · After @ ${(logClientObj.hourlyRate * (logClientObj.overtimeMultiplier || 1.5)).toFixed(2)}/hr
                    </p>
                  </div>
                )}

                {/* Calendar */}
                <MiniCalendar
                  selectedDates={logSelectedDates}
                  onToggleDate={d => setLogSelectedDates(prev =>
                    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
                  )}
                />

                <input type="text" className="input input-bordered input-sm w-full" placeholder="Notes (optional)"
                  value={logNotes} onChange={e => setLogNotes(e.target.value)} />

                {/* Preview */}
                {preview && (
                  <div className="bg-base-100 rounded-2xl p-3 space-y-1.5 border border-base-300">
                    <p className="text-xs font-semibold text-base-content mb-2">Invoice Preview</p>
                    {preview.isSplit ? (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-base-content/70">Regular ({fmtHrs(preview.regularHours)} @ ${parseFloat(logRate)||25}/hr)</span>
                          <span className="font-semibold">${preview.regularPay.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-400">Overtime ({fmtHrs(preview.overtimeHours)} @ ${((parseFloat(logRate)||25) * (logClientObj?.overtimeMultiplier||1.5)).toFixed(2)}/hr)</span>
                          <span className="font-semibold text-amber-400">${preview.overtimePay.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-base-300 pt-1.5">
                          <span className="font-bold">{preview.days} day{preview.days !== 1 ? 's' : ''} × {preview.hrs}h/day = {preview.totalHrs}h total</span>
                          <span className="font-bold text-primary">${preview.totalPay.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs">
                        <span className="text-base-content/70">{preview.days} day{preview.days !== 1 ? 's' : ''} × {preview.hrs}h × ${parseFloat(logRate)||25}/hr</span>
                        <span className="font-bold text-primary">${preview.totalPay.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleLogHours}
                  disabled={!logClient.trim() || !logSelectedDates.length || !logHoursPerDay}
                  className="btn btn-primary btn-sm w-full gap-1 disabled:opacity-40"
                >
                  <Check size={14} /> Save {logSelectedDates.length > 1 ? `${logSelectedDates.length} Entries` : 'Entry'}
                </button>
              </div>
            </div>
          )}

          {/* Log mileage */}
          <button onClick={() => setShowMileage(!showMileage)} className="btn btn-ghost btn-sm gap-1 w-full text-primary">
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
                <p className="text-xs text-base-content/60">Start a timer or log hours to track your shifts</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedEntries.slice(0, 30).map(entry => {
                  const isSplit = entry.billingType === 'split_rate' && entry.overtimeHours > 0
                  const pay = entry.totalPay ?? ((entry.duration || 0) / 60 * entry.hourlyRate)
                  const isExpanded = expandedEntry === entry.id
                  const isEditing = editingEntry === entry.id

                  return (
                    <div key={entry.id} className="bg-base-200 rounded-xl overflow-hidden">
                      {/* View mode */}
                      {!isEditing && (
                        <div className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSplit ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                              {isSplit ? <Zap size={14} className="text-amber-400" /> : <Clock size={14} className="text-primary" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-base-content">{entry.clientName}</p>
                              <p className="text-[10px] text-base-content/60">
                                {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {entry.startTime && entry.endTime && (() => {
                                  const s = new Date(entry.startTime)
                                  const e = new Date(entry.endTime)
                                  return ` · ${s.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})} – ${e.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})}`
                                })()}
                                {entry.duration ? ` · ${formatDuration(entry.duration)}` : ''}
                                {isSplit && <span className="ml-1 text-amber-400">⚡</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="text-right">
                              <span className="text-sm font-bold text-base-content">${pay.toFixed(2)}</span>
                              {isSplit && (
                                <button
                                  onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                                  className="block ml-auto text-[10px] text-base-content/60 hover:text-base-content/70"
                                >
                                  {isExpanded ? '▲ hide' : '▼ breakdown'}
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => openEditEntry(entry)}
                              className="btn btn-outline btn-xs btn-circle border-primary/30 text-primary"
                              title="Edit times"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => handleDeleteTimeEntry(entry.id)} className="btn btn-outline btn-xs btn-circle border-error/30 text-error">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Edit mode */}
                      {isEditing && (
                        <div className="p-3 space-y-2 border-2 border-primary/30 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-base-content">Edit: {entry.clientName}</p>
                            <button onClick={() => setEditingEntry(null)} className="btn btn-ghost btn-xs btn-circle"><X size={12} /></button>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-base-content/50 block mb-1">Date</label>
                              <input type="date" className="input input-bordered input-xs w-full"
                                value={editDate} onChange={e => setEditDate(e.target.value)} />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-base-content/50 block mb-1">Start Time</label>
                              <input type="time" className="input input-bordered input-xs w-full"
                                value={editStart} onChange={e => setEditStart(e.target.value)} />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-base-content/50 block mb-1">End Time</label>
                              <input type="time" className="input input-bordered input-xs w-full"
                                value={editEnd} onChange={e => setEditEnd(e.target.value)} />
                            </div>
                          </div>
                          {editStart && editEnd && (() => {
                            const s = new Date(`${editDate || entry.date}T${editStart}:00`)
                            const e = new Date(`${editDate || entry.date}T${editEnd}:00`)
                            if (e <= s) e.setDate(e.getDate() + 1)
                            const mins = Math.round((e.getTime() - s.getTime()) / 60000)
                            const bill = calcEarnings(mins, entry.hourlyRate, entry.billingType||'hourly', entry.overtimeAfterHours||8, entry.overtimeMultiplier||1.5)
                            return (
                              <div className="bg-base-100 rounded-xl px-3 py-2 text-xs text-base-content/70">
                                <span className="font-semibold text-base-content">{formatDuration(mins)}</span>
                                {' → '}
                                <span className="font-bold text-primary">${bill.totalPay.toFixed(2)}</span>
                                {bill.overtimeHours > 0 && <span className="ml-1 text-amber-400">⚡ incl. OT</span>}
                              </div>
                            )
                          })()}
                          <button onClick={() => saveEditEntry(entry)} className="btn btn-primary btn-xs w-full gap-1">
                            <Check size={11} /> Save Changes
                          </button>
                        </div>
                      )}

                      {/* Breakdown panel */}
                      {!isEditing && isSplit && isExpanded && (
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

      {/* ---- AVAILABILITY VIEW ---- */}
      {viewMode === 'availability' && (
        <div className="px-4 space-y-4 pb-4">
          <p className="text-xs text-base-content/60">
            Set your weekly schedule so clients know when you're available. This helps match you with the right care requests.
          </p>

          {/* Quick set buttons */}
          <div className="flex gap-2">
            {[
              { label: 'Mon–Fri', preset: 'weekdays' as const },
              { label: 'Weekends', preset: 'weekends' as const },
              { label: 'Every Day', preset: 'everyday' as const },
            ].map(b => (
              <button
                key={b.preset}
                onClick={() => quickSet(b.preset)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-primary/15 text-primary border-2 border-primary/45 press-card"
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Days */}
          <div className="space-y-2">
            {DAYS.map(({ key, label }) => {
              const day = availability[key] || { available: false, start: '08:00', end: '18:00' }
              return (
                <div
                  key={key}
                  className={`rounded-2xl border transition-all ${day.available ? 'bg-success/5 border-success/25' : 'bg-base-200 border-base-300/70'}`}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => toggleDay(key)}
                        className={`w-12 h-6 rounded-full cursor-pointer transition-all relative flex-shrink-0 ${day.available ? 'bg-success' : 'bg-base-300'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${day.available ? 'left-6' : 'left-0.5'}`} />
                      </div>
                      <span className={`text-sm font-semibold ${day.available ? 'text-base-content' : 'text-base-content/60'}`}>
                        {label}
                      </span>
                    </div>
                    {day.available && (
                      <span className="text-xs text-success font-medium">
                        {day.start} – {day.end}
                      </span>
                    )}
                  </div>
                  {day.available && (
                    <div className="flex gap-3 px-4 pb-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-base-content/50 block mb-1">Start</label>
                        <input
                          type="time"
                          className="input input-bordered input-xs w-full"
                          value={day.start || '08:00'}
                          onChange={e => updateDayTime(key, 'start', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-base-content/50 block mb-1">End</label>
                        <input
                          type="time"
                          className="input input-bordered input-xs w-full"
                          value={day.end || '18:00'}
                          onChange={e => updateDayTime(key, 'end', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary */}
          {Object.values(availability).some((d: any) => d.available) && (
            <div className="bg-success/8 border border-success/20 rounded-2xl p-3">
              <p className="text-xs font-semibold text-success mb-1">Your Schedule</p>
              <p className="text-xs text-base-content/70">
                Available {Object.values(availability).filter((d: any) => d.available).length} day{Object.values(availability).filter((d: any) => d.available).length !== 1 ? 's' : ''} per week
              </p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={saveAvailability}
            className={`btn w-full rounded-2xl gap-2 ${availabilitySaved ? 'btn-success' : 'btn-primary'}`}
          >
            {availabilitySaved ? '✓ Saved!' : 'Save Availability'}
          </button>
        </div>
      )}

      {/* ---- MY CLIENTS VIEW ---- */}
      {viewMode === 'clients' && (
        <div className="px-4 space-y-4">
          <p className="text-xs text-base-content/60">
            Manage your private clients — track hours and create invoices for anyone you work with, even outside Carehia.
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
                <input type="email" className="input input-bordered input-sm w-full" placeholder="Client email (optional)"
                  value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} />
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
              <p className="text-xs text-base-content/60 mt-1">Add clients you work with privately to track hours and invoice them</p>
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
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                                ⚡ ${client.hourlyRate}/hr → ${otRate}/hr after {client.overtimeAfterHours || 8}h
                              </span>
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
                            navigateToViewMode('timesheet')
                          }}
                          className="btn btn-primary btn-xs gap-1"
                        >
                          <Play size={12} /> Track
                        </button>
                        <button onClick={() => handleDeleteClient(client.id)} className="btn btn-outline btn-xs btn-circle border-error/30 text-error">
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
