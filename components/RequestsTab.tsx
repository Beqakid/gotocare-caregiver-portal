import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Lock,
  MapPin,
  Radio,
  ShieldCheck,
  Signature,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react'

const API = 'https://gotocare-original.jjioji.workers.dev/api'

interface LiveRequest {
  dispatch_id: number
  request_id: number
  care_type: string
  description: string
  zip_code: string
  city: string
  distance_miles: number
  pay_rate: number
  start_date: string
  start_time: string
  duration_hours: number
  dispatch_score: number
  round: number
  request_status: string
  expires_at: string
  expires_in_ms: number
  is_expired: boolean
  sent_at: string
}

interface CareRequest {
  id: number
  status: string
  careType?: string
  scheduledDate?: string
  scheduledTime?: string
  clientName?: string
  clientPhone?: string
  clientEmail?: string
  clientLocation?: string
  payRate?: number
  notes?: string
  is_unlocked?: boolean | number
}

interface HireOffer {
  id: number
  agreement_token: string
  client_email: string
  client_name: string
  client_signature: string
  client_signed_at: string
  caregiver_name: string
  caregiver_rate: number
  care_types: string
  start_date: string | null
  schedule_notes: string | null
  status: 'pending_caregiver' | 'pending_client' | 'active' | 'declined'
  created_at: string
}

interface CountdownInfo {
  text: string
  urgent: boolean
  expired: boolean
  pct: number
}

const CARE_QUOTES: Record<string, string> = {
  'Elder Care': '"My father needs someone calm and patient in the mornings."',
  'Dementia Care': '"She gets confused easily. We need someone gentle and experienced."',
  "Alzheimer's Support": '"He needs structured routines and a kind presence."',
  'Post-Surgery Recovery': '"Just home from surgery and needs help the first few weeks."',
  'Medication Management': '"Mom forgets her medications and needs daily reminders."',
  'Bathing & Grooming': '"Dad needs morning hygiene help but values his dignity."',
  'Meal Preparation': '"Needs healthy meals prepared with dietary restrictions."',
  'Companionship': '"Lives alone and needs company and conversation."',
  'Transportation': '"Needs rides to appointments weekly."',
  'Overnight Care': '"Needs someone present through the night for safety."',
}

function getQuote(careType: string) {
  return CARE_QUOTES[careType] || '"A family in your area needs care support."'
}

function dateLabel(date?: string | null) {
  if (!date) return 'Flexible'
  try {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return date
  }
}

function parseCareTypes(raw: string) {
  try {
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-base-100 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-base-content/45">
        <Icon size={13} />
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-bold text-base-content">{value}</p>
    </div>
  )
}

function EmptyState({ icon: Icon, title, body, tips }: { icon: any; title: string; body: string; tips: string[] }) {
  return (
    <div className="rounded-3xl bg-base-200 p-6 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon size={28} />
      </div>
      <p className="font-bold text-base-content">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-base-content/55">{body}</p>
      <div className="mt-5 grid gap-2 text-left">
        {tips.map(tip => (
          <div key={tip} className="flex items-center gap-2 rounded-xl bg-base-100 px-3 py-2 text-xs text-base-content/65">
            <CheckCircle2 size={14} className="text-success" />
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CountdownBadge({ countdown }: { countdown: CountdownInfo }) {
  if (countdown.expired) {
    return <span className="badge badge-ghost badge-sm">Expired</span>
  }
  return (
    <span className={`badge badge-sm border-0 ${countdown.urgent ? 'bg-error/15 text-error' : 'bg-warning/15 text-warning'}`}>
      {countdown.text}
    </span>
  )
}

function LiveRequestCard({
  req,
  countdown,
  accepting,
  declining,
  accepted,
  taken,
  onAccept,
  onDecline,
}: {
  req: LiveRequest
  countdown: CountdownInfo
  accepting: number | null
  declining: number | null
  accepted: boolean
  taken: boolean
  onAccept: (id: number) => void
  onDecline: (id: number) => void
}) {
  const expired = countdown.expired || req.is_expired
  const unavailable = taken || req.request_status === 'taken'
  const processing = accepting === req.request_id || declining === req.request_id
  const sessionPay = (req.pay_rate || 0) * (req.duration_hours || 0)

  if (accepted) {
    return (
      <div className="rounded-3xl border border-success/30 bg-success/10 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={24} className="mt-0.5 text-success" />
          <div>
            <p className="font-bold text-success">Booking accepted</p>
            <p className="text-sm text-base-content/60">Check Interviews for the client details and next step.</p>
          </div>
        </div>
      </div>
    )
  }

  if (unavailable) {
    return (
      <div className="rounded-3xl border border-base-300 bg-base-200 p-4 opacity-60">
        <div className="flex items-center gap-2">
          <Lock size={18} />
          <div>
            <p className="text-sm font-semibold text-base-content/55">Accepted by another caregiver</p>
            <p className="text-xs text-base-content/55">{req.care_type} in {req.city}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-3xl border p-4 ${expired ? 'border-base-300 bg-base-200/60 opacity-60' : countdown.urgent ? 'border-warning/40 bg-warning/5' : 'border-base-300 bg-base-200'}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="badge badge-sm border-0 bg-primary/15 text-primary">New</span>
            <span className="badge badge-sm badge-ghost">Round {req.round || 1}</span>
            <CountdownBadge countdown={countdown} />
          </div>
          <h3 className="text-lg font-bold leading-tight text-base-content">{req.care_type}</h3>
          <p className="mt-1 text-sm italic leading-relaxed text-base-content/55">{getQuote(req.care_type)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-success">${req.pay_rate}<span className="text-xs font-normal text-base-content/50">/hr</span></p>
          {sessionPay > 0 && <p className="text-xs font-semibold text-base-content/60">${sessionPay.toFixed(0)} est.</p>}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <StatTile icon={MapPin} label="Distance" value={`${req.distance_miles || 0} mi`} />
        <StatTile icon={Calendar} label="Date" value={dateLabel(req.start_date)} />
        <StatTile icon={Clock} label="Time" value={req.start_time || `${req.duration_hours || 0} hrs`} />
      </div>

      <div className="mb-3 flex items-center gap-2 border-t border-base-300 pt-3 text-xs text-base-content/55">
        <ShieldCheck size={14} className="text-success" />
        <span>Verified client</span>
        <span>-</span>
        <Lock size={14} />
        <span>Protected booking</span>
      </div>

      {!expired ? (
        <div className="flex gap-2">
          <button onClick={() => onAccept(req.request_id)} disabled={processing} className="btn btn-success btn-sm flex-1 rounded-xl font-bold text-white">
            {accepting === req.request_id ? <span className="loading loading-spinner loading-xs" /> : 'Accept booking'}
          </button>
          <button onClick={() => onDecline(req.request_id)} disabled={processing} className="btn btn-ghost btn-sm rounded-xl text-base-content/55">
            {declining === req.request_id ? <span className="loading loading-spinner loading-xs" /> : 'Pass'}
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-base-content/60">This request has expired.</p>
      )}
    </div>
  )
}

function InterviewRequestCard({
  req,
  unlocked,
  unlockLoading,
  justUnlocked,
  onUnlock,
}: {
  req: CareRequest
  unlocked: boolean
  unlockLoading: boolean
  justUnlocked?: boolean
  onUnlock: (req: CareRequest, plan: 'single' | 'unlimited') => void
}) {
  const statusLabel: Record<string, string> = {
    pending: 'Pending review',
    accepted: 'Accepted',
    declined: 'Declined',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  return (
    <div className={`rounded-3xl border p-4 ${justUnlocked ? 'border-success/30 bg-success/5' : 'border-base-300 bg-base-200'}`}>
      {justUnlocked && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm font-bold text-success">
          <Star size={16} />
          Contact info unlocked
        </div>
      )}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-base-content">{req.careType || 'Care Request'}</h3>
          <p className="text-sm text-base-content/60">{req.clientLocation || 'Location locked'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-base-content/55">{statusLabel[req.status] || req.status}</p>
          {req.payRate && <p className="font-bold text-success">${req.payRate}/hr</p>}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <StatTile icon={Calendar} label="Date" value={dateLabel(req.scheduledDate)} />
        <StatTile icon={Clock} label="Time" value={req.scheduledTime || 'TBD'} />
        <StatTile icon={DollarSign} label="Rate" value={req.payRate ? `$${req.payRate}/hr` : 'TBD'} />
      </div>

      <div className="mb-3 flex items-center gap-2 border-t border-base-300 pt-3 text-xs text-base-content/55">
        <ShieldCheck size={14} className="text-success" />
        <span>Verified client</span>
        <span>-</span>
        <Lock size={14} />
        <span>Secure contact unlock</span>
      </div>

      {unlocked ? (
        <div className="rounded-2xl border border-success/20 bg-success/10 p-3">
          <p className="mb-2 text-xs font-bold text-success">Contact unlocked</p>
          {req.clientName && <p className="text-sm font-semibold text-base-content">{req.clientName}</p>}
          {req.clientPhone && <a href={`tel:${req.clientPhone}`} className="block text-sm font-medium text-primary">{req.clientPhone}</a>}
          {req.clientEmail && <a href={`mailto:${req.clientEmail}`} className="block text-sm font-medium text-primary">{req.clientEmail}</a>}
          {!req.clientName && !req.clientPhone && !req.clientEmail && <p className="text-xs text-base-content/60">Reloading contact info...</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-2xl bg-base-100 p-3">
            <p className="mb-2 text-xs text-base-content/50">Client contact info is locked</p>
            <div className="mb-1 h-3 w-3/4 rounded bg-base-300" />
            <div className="h-3 w-1/2 rounded bg-base-300" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => onUnlock(req, 'single')} disabled={unlockLoading} className="btn btn-primary btn-sm flex-1 rounded-xl font-bold text-white">
              {unlockLoading ? <span className="loading loading-spinner loading-xs" /> : 'Unlock $4.99'}
            </button>
            <button onClick={() => onUnlock(req, 'unlimited')} disabled={unlockLoading} className="btn btn-outline btn-sm rounded-xl border-primary text-primary">
              $19.99/mo
            </button>
          </div>
          <p className="text-center text-xs text-base-content/50">Unlock once, or subscribe for unlimited contacts.</p>
        </div>
      )}
    </div>
  )
}

function HireOfferCard({ offer, onSign, onDecline }: { offer: HireOffer; onSign: (offer: HireOffer) => void; onDecline: (token: string) => void }) {
  const careTypes = parseCareTypes(offer.care_types)
  const firstName = offer.client_name ? offer.client_name.split(' ')[0] : 'Client'
  const status = {
    pending_caregiver: { label: 'Needs your signature', cls: 'bg-warning/15 text-warning' },
    pending_client: { label: 'Waiting for client', cls: 'bg-info/15 text-info' },
    active: { label: 'Agreement active', cls: 'bg-success/15 text-success' },
    declined: { label: 'Declined', cls: 'bg-error/15 text-error' },
  }[offer.status]

  return (
    <div className="rounded-3xl border border-base-300 bg-base-200 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <span className={`badge badge-sm border-0 ${status.cls}`}>{status.label}</span>
          <h3 className="mt-2 text-lg font-bold text-base-content">Hire offer from {firstName}</h3>
          <p className="text-sm text-base-content/55">Offer received {dateLabel(offer.created_at?.split('T')[0])}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-success">${offer.caregiver_rate}<span className="text-xs font-normal text-base-content/50">/hr</span></p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-success">Rate locked</p>
        </div>
      </div>

      {careTypes.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {careTypes.map((type: string) => (
            <span key={type} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{type}</span>
          ))}
        </div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2">
        <StatTile icon={Calendar} label="Start" value={dateLabel(offer.start_date)} />
        <StatTile icon={Signature} label="Step" value={offer.status === 'pending_caregiver' ? 'Review terms' : status.label} />
      </div>

      {offer.schedule_notes && (
        <p className="mb-3 rounded-2xl bg-base-100 p-3 text-sm text-base-content/65">{offer.schedule_notes}</p>
      )}

      {offer.status === 'pending_caregiver' && (
        <div className="flex gap-2">
          <button onClick={() => onSign(offer)} className="btn btn-primary btn-sm flex-1 rounded-xl text-white">Sign and accept</button>
          <button onClick={() => onDecline(offer.agreement_token)} className="btn btn-ghost btn-sm rounded-xl text-error">Decline</button>
        </div>
      )}
      {offer.status === 'pending_client' && (
        <div className="rounded-2xl bg-info/10 p-3 text-sm text-info">You signed. The client has been notified to countersign.</div>
      )}
      {offer.status === 'active' && (
        <div className="rounded-2xl bg-success/10 p-3 text-sm text-success">Both parties signed. You are on their care team.</div>
      )}
    </div>
  )
}

function SignAgreementModal({ offer, onSign, onClose, signing }: { offer: HireOffer; onSign: (sig: string) => void; onClose: () => void; signing: boolean }) {
  const [sig, setSig] = useState('')
  const careTypes = parseCareTypes(offer.care_types)

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/65">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-base-100 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary/70">Hire Agreement</p>
            <h2 className="text-xl font-bold text-base-content">Review and sign</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle"><X size={16} /></button>
        </div>

        <div className="mb-4 rounded-2xl bg-base-200 p-4">
          <div className="mb-2 flex justify-between">
            <span className="text-sm text-base-content/55">Client</span>
            <strong>{offer.client_name || 'Client'}</strong>
          </div>
          <div className="mb-2 flex justify-between">
            <span className="text-sm text-base-content/55">Rate</span>
            <strong className="text-success">${offer.caregiver_rate}/hr</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-base-content/55">Start</span>
            <strong>{dateLabel(offer.start_date)}</strong>
          </div>
          {careTypes.length > 0 && <p className="mt-3 text-sm text-base-content/65">{careTypes.join(', ')}</p>}
        </div>

        <div className="mb-4 rounded-2xl bg-base-200 p-4 text-sm text-base-content/65">
          <p className="mb-2 font-bold text-base-content">By signing, you agree to:</p>
          <p>Provide the listed care services, keep client information confidential, and follow the agreed schedule and rate.</p>
        </div>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-semibold text-base-content">Type your full legal name</span>
          <input className="input input-bordered w-full" value={sig} onChange={e => setSig(e.target.value)} placeholder={offer.caregiver_name || 'Your full name'} />
        </label>

        <button onClick={() => onSign(sig.trim())} disabled={signing || sig.trim().length < 3} className="btn btn-primary w-full rounded-2xl text-white">
          {signing ? 'Signing...' : 'Accept and sign agreement'}
        </button>
      </div>
    </div>
  )
}

export function RequestsTab({
  profile,
  returnedBookingId,
  returnedSubscription,
}: {
  profile?: any
  returnedBookingId?: string | null
  returnedSubscription?: boolean
  requests?: any[]
  loading?: boolean
  onAccept?: (id: number) => void
  onDecline?: (id: number) => void
}) {
  const [activeSection, setActiveSection] = useState<'live' | 'interviews' | 'offers'>(
    (returnedBookingId || returnedSubscription) ? 'interviews' : 'live'
  )
  const [liveRequests, setLiveRequests] = useState<LiveRequest[]>([])
  const [isLoadingLive, setIsLoadingLive] = useState(false)
  const [countdowns, setCountdowns] = useState<Record<number, CountdownInfo>>({})
  const [accepting, setAccepting] = useState<number | null>(null)
  const [declining, setDeclining] = useState<number | null>(null)
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(new Set())
  const [takenIds, setTakenIds] = useState<Set<number>>(new Set())
  const [liveError, setLiveError] = useState('')

  const [bookings, setBookings] = useState<CareRequest[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)
  const [unlockedIds, setUnlockedIds] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cgp_unlocked') || '[]')) } catch { return new Set() }
  })
  const [optimisticUnlocked, setOptimisticUnlocked] = useState<Set<number>>(() => {
    if (returnedBookingId) return new Set([Number(returnedBookingId)])
    return new Set()
  })
  const [unlockLoading, setUnlockLoading] = useState<number | null>(null)

  const [hireOffers, setHireOffers] = useState<HireOffer[]>([])
  const [isLoadingOffers, setIsLoadingOffers] = useState(false)
  const [signingOffer, setSigningOffer] = useState<HireOffer | null>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [signSuccess, setSignSuccess] = useState<string | null>(null)

  const fetchLiveRequests = useCallback(async () => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setIsLoadingLive(true)
    setLiveError('')
    try {
      const r = await fetch(`${API}/caregiver-live-requests?token=${token}`)
      const data = await r.json()
      if (data.requests) setLiveRequests(data.requests)
    } catch {
      setLiveError('Could not load live requests.')
    } finally {
      setIsLoadingLive(false)
    }
  }, [])

  useEffect(() => {
    fetchLiveRequests()
    const interval = setInterval(fetchLiveRequests, 30000)
    return () => clearInterval(interval)
  }, [fetchLiveRequests])

  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now()
      const updated: Record<number, CountdownInfo> = {}
      liveRequests.forEach(req => {
        const remaining = new Date(req.expires_at).getTime() - now
        const totalMs = Math.max(req.expires_in_ms || 120000, 1)
        updated[req.request_id] = {
          text: remaining <= 0 ? 'Expired' : `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`,
          urgent: remaining > 0 && remaining < 30000,
          expired: remaining <= 0,
          pct: Math.max(0, Math.min(100, (remaining / totalMs) * 100)),
        }
      })
      setCountdowns(updated)
    }, 1000)
    return () => clearInterval(tick)
  }, [liveRequests])

  const handleAccept = async (requestId: number) => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setAccepting(requestId)
    try {
      const r = await fetch(`${API}/dispatch-accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, request_id: requestId }),
      })
      const data = await r.json()
      if (data.success) {
        setAcceptedIds(prev => new Set([...prev, requestId]))
        setTimeout(fetchLiveRequests, 2000)
      } else if (data.taken) {
        setTakenIds(prev => new Set([...prev, requestId]))
      } else if (data.error) {
        alert(data.error)
      }
    } catch {
      alert('Failed to accept. Please try again.')
    } finally {
      setAccepting(null)
    }
  }

  const handleDecline = async (requestId: number) => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setDeclining(requestId)
    try {
      await fetch(`${API}/dispatch-decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, request_id: requestId }),
      })
      setLiveRequests(prev => prev.filter(r => r.request_id !== requestId))
    } finally {
      setDeclining(null)
    }
  }

  const fetchBookings = useCallback(async () => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setIsLoadingBookings(true)
    fetch(`${API}/caregiver-bookings?token=${token}`)
      .then(r => r.json())
      .then(data => {
        const raw: any[] = data.bookings || data.requests || []
        setBookings(raw.map((b: any) => ({
          id: b.id,
          status: b.status || 'pending',
          careType: b.care_type || b.careType || b.careNeeds,
          scheduledDate: b.scheduled_date || b.scheduledDate || b.preferredDate,
          scheduledTime: b.scheduled_time || b.scheduledTime || b.preferredTime,
          clientName: b.client_name || b.clientName,
          clientPhone: b.client_phone || b.clientPhone,
          clientEmail: b.client_email || b.clientEmail,
          clientLocation: b.client_location || b.zip_code,
          payRate: b.pay_rate || b.payRate,
          notes: b.notes,
          is_unlocked: b.is_unlocked || b.isUnlocked,
        })))
      })
      .catch(() => {})
      .finally(() => setIsLoadingBookings(false))
  }, [])

  useEffect(() => {
    if (activeSection !== 'interviews') return
    fetchBookings()
    const interval = setInterval(fetchBookings, 30000)
    return () => clearInterval(interval)
  }, [activeSection, fetchBookings])

  useEffect(() => {
    if (returnedBookingId || returnedSubscription) {
      setActiveSection('interviews')
      fetchBookings()
      if (returnedBookingId) {
        const newOptimistic = new Set([...optimisticUnlocked, Number(returnedBookingId)])
        const newPersisted = new Set([...unlockedIds, Number(returnedBookingId)])
        setOptimisticUnlocked(newOptimistic)
        setUnlockedIds(newPersisted)
        localStorage.setItem('cgp_unlocked', JSON.stringify([...newPersisted]))
      }
    }
  }, [returnedBookingId, returnedSubscription])

  const fetchHireOffers = useCallback(async () => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setIsLoadingOffers(true)
    try {
      const r = await fetch(`${API}/pending-hire-offers?token=${token}`)
      const data = await r.json()
      if (data.success) setHireOffers(data.offers || [])
    } catch {
    } finally {
      setIsLoadingOffers(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection === 'offers') fetchHireOffers()
  }, [activeSection, fetchHireOffers])

  useEffect(() => { fetchHireOffers() }, [fetchHireOffers])

  const handleSign = async (signature: string) => {
    if (!signingOffer || signature.length < 3) return
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setIsSigning(true)
    try {
      const r = await fetch(`${API}/sign-hire-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, agreementToken: signingOffer.agreement_token, caregiverSignature: signature }),
      })
      const data = await r.json()
      if (data.success) {
        setHireOffers(prev => prev.map(o => o.agreement_token === signingOffer.agreement_token ? { ...o, status: 'pending_client' as const } : o))
        setSignSuccess(signingOffer.client_name?.split(' ')[0] || 'client')
        setSigningOffer(null)
      } else {
        alert(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setIsSigning(false)
    }
  }

  const handleDeclineOffer = async (agreementToken: string) => {
    if (!confirm('Are you sure you want to decline this hire offer?')) return
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    try {
      await fetch(`${API}/decline-hire-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, agreementToken }),
      })
      setHireOffers(prev => prev.map(o => o.agreement_token === agreementToken ? { ...o, status: 'declined' as const } : o))
    } catch {
      alert('Could not decline. Please try again.')
    }
  }

  const isUnlocked = (req: CareRequest) =>
    !!req.is_unlocked || unlockedIds.has(req.id) || optimisticUnlocked.has(req.id) || returnedSubscription === true

  const handleUnlock = async (req: CareRequest, plan: 'single' | 'unlimited') => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setUnlockLoading(req.id)
    try {
      const caregiverId = profile?.id || (() => {
        try { return JSON.parse(localStorage.getItem('cgp_account') || '{}').id } catch { return undefined }
      })()
      const endpoint = plan === 'unlimited' ? `${API}/create-caregiver-subscription-checkout` : `${API}/unlock-booking`
      const payload = plan === 'unlimited' ? { token, caregiverId } : { token, bookingId: req.id, caregiverId }
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await r.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.success) {
        const next = new Set([...unlockedIds, req.id])
        setUnlockedIds(next)
        localStorage.setItem('cgp_unlocked', JSON.stringify([...next]))
      } else {
        alert(data.error || 'Could not start checkout. Please try again.')
      }
    } catch {
      alert('Error processing unlock. Please try again.')
    } finally {
      setUnlockLoading(null)
    }
  }

  const activeLiveCount = liveRequests.filter(r => !r.is_expired && r.request_status !== 'taken').length
  const pendingOffersCount = hireOffers.filter(o => o.status === 'pending_caregiver').length
  const activeBookingsCount = bookings.filter(b => b.status !== 'declined' && b.status !== 'cancelled').length

  const tabs = [
    { id: 'live' as const, label: 'Live Jobs', count: activeLiveCount, icon: Radio },
    { id: 'offers' as const, label: 'Offers', count: pendingOffersCount, icon: BriefcaseBusiness },
    { id: 'interviews' as const, label: 'Interviews', count: activeBookingsCount, icon: Users },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary/70">Opportunities</p>
        <h1 className="text-2xl font-bold text-base-content">Find the right care work</h1>
        <p className="mt-1 text-sm text-base-content/55">Review pay, schedule, distance, and next steps before you commit.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = activeSection === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)} className={`rounded-2xl p-3 text-left transition ${active ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content'}`}>
              <Icon size={16} className="mb-2" />
              <p className="text-xl font-bold">{tab.count}</p>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${active ? 'text-primary-content/70' : 'text-base-content/45'}`}>{tab.label}</p>
            </button>
          )
        })}
      </div>

      <div className="px-4 pb-0">
        <div className="flex gap-1 rounded-2xl bg-base-200 p-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)} className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${activeSection === tab.id ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-200 text-base-content/70'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-24">
        {activeSection === 'live' && (
          <>
            <div className="rounded-3xl bg-base-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-base-content">Live dispatch</p>
                  <p className="text-sm text-base-content/55">Fast requests near you. Accept only when pay, distance, and timing work.</p>
                </div>
                <Sparkles size={20} className="text-primary" />
              </div>
            </div>
            {liveError && (
              <div className="flex items-center gap-2 rounded-2xl border border-error/20 bg-error/10 p-3 text-sm text-error">
                <AlertTriangle size={16} />
                {liveError}
              </div>
            )}
            {isLoadingLive && liveRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <span className="loading loading-ring loading-lg text-primary" />
                <p className="text-sm text-base-content/65">Scanning for nearby care requests...</p>
              </div>
            )}
            {!isLoadingLive && liveRequests.length === 0 && (
              <EmptyState
                icon={Radio}
                title="No live jobs right now"
                body="Stay online and keep notifications enabled so you can respond quickly when a family requests care."
                tips={['Complete profile photo, bio, and skills', 'Stay online from the Today screen', 'Enable push notifications']}
              />
            )}
            {liveRequests.map(req => (
              <LiveRequestCard
                key={req.dispatch_id}
                req={req}
                countdown={countdowns[req.request_id] || { text: '...', urgent: false, expired: false, pct: 100 }}
                accepting={accepting}
                declining={declining}
                accepted={acceptedIds.has(req.request_id)}
                taken={takenIds.has(req.request_id)}
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            ))}
            {liveRequests.length > 0 && (
              <p className="pb-2 text-center text-xs text-base-content/55">
                Refreshes every 30 seconds. Last checked {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </>
        )}

        {activeSection === 'offers' && (
          <>
            {signSuccess && (
              <div className="rounded-3xl border border-success/30 bg-success/10 p-4">
                <p className="font-bold text-success">Agreement signed</p>
                <p className="text-sm text-base-content/60">You are now on {signSuccess}'s care team once the client countersigns.</p>
              </div>
            )}
            {isLoadingOffers && hireOffers.length === 0 && (
              <div className="flex items-center justify-center py-10">
                <span className="loading loading-ring loading-md text-primary" />
              </div>
            )}
            {!isLoadingOffers && hireOffers.length === 0 && (
              <EmptyState
                icon={BriefcaseBusiness}
                title="No hire offers yet"
                body="When a client directly hires you, the agreement will appear here for review and signature."
                tips={['Review rate and schedule before signing', 'Your rate locks after signature', 'Both parties receive a copy']}
              />
            )}
            {hireOffers.map(offer => (
              <HireOfferCard key={offer.id} offer={offer} onSign={setSigningOffer} onDecline={handleDeclineOffer} />
            ))}
            {signingOffer && (
              <SignAgreementModal offer={signingOffer} onSign={handleSign} onClose={() => setSigningOffer(null)} signing={isSigning} />
            )}
          </>
        )}

        {activeSection === 'interviews' && (
          <>
            {isLoadingBookings && (
              <div className="flex items-center justify-center py-10">
                <span className="loading loading-ring loading-md text-primary" />
              </div>
            )}
            {!isLoadingBookings && bookings.length === 0 && (
              <EmptyState
                icon={Users}
                title="No interview requests yet"
                body="When families book an interview with you, you will see the request and contact unlock options here."
                tips={['A family finds your profile', 'You receive an email alert', 'Unlock contact details when you are ready']}
              />
            )}
            {bookings.map(req => (
              <InterviewRequestCard
                key={req.id}
                req={req}
                unlocked={isUnlocked(req)}
                unlockLoading={unlockLoading === req.id}
                justUnlocked={returnedBookingId ? Number(returnedBookingId) === req.id : false}
                onUnlock={handleUnlock}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default RequestsTab
