import React, { useState, useEffect, useCallback } from 'react'

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

interface CountdownInfo {
  text: string
  urgent: boolean
  expired: boolean
  pct: number
}

const CARE_QUOTES: Record<string, string> = {
  'Elder Care': '"My father needs someone calm and patient in the mornings."',
  'Dementia Care': '"She gets confused easily — we need someone gentle and experienced."',
  "Alzheimer's Support": '"He needs structured routines and a kind presence."',
  'Post-Surgery Recovery': '"Just home from hip surgery — needs help the first few weeks."',
  'Medication Management': '"Mom forgets her medications — needs daily reminders and tracking."',
  'Bathing & Grooming': '"Dad needs morning hygiene help but values his dignity."',
  'Meal Preparation': '"Needs healthy meals prepared — has dietary restrictions."',
  'Companionship': '"Lives alone and gets lonely — just needs company and conversation."',
  'Transportation': '"Can\'t drive anymore — needs rides to appointments weekly."',
  'Overnight Care': '"Needs someone present through the night for safety."',
  'Physical Therapy Aid': '"Just finished PT — needs home exercises supervised."',
  'Light Housekeeping': '"Needs help keeping the home safe and clean."',
  'Disability Support': '"Has mobility limitations — needs daily living assistance."',
  'Stroke Recovery': '"Recovering from stroke — needs patient, consistent support."',
}

function getQuote(careType: string): string {
  return CARE_QUOTES[careType] || '"A family in your area needs care support."'
}

function RoundBadge({ round }: { round: number }) {
  const labels = ['', 'Round 1 · 5mi', 'Round 2 · 10mi', 'Round 3 · 15mi', 'Round 4 · 25mi']
  const colors = ['', 'badge-primary', 'badge-secondary', 'badge-warning', 'badge-error']
  return <span className={`badge badge-sm ${colors[round] || 'badge-primary'}`}>{labels[round] || `Round ${round}`}</span>
}

function CountdownRing({ countdown, expiresAt }: { countdown: CountdownInfo; expiresAt: string }) {
  if (countdown.expired) {
    return (
      <div className="flex items-center gap-1 text-base-content/60">
        <span className="text-xs">⏱ Expired</span>
      </div>
    )
  }
  return (
    <div className={`flex items-center gap-1 ${countdown.urgent ? 'text-error' : 'text-warning'}`}>
      <span className="text-xs font-mono font-bold">{countdown.text}</span>
      {countdown.urgent && <span className="text-xs animate-pulse">⚡</span>}
    </div>
  )
}

function LiveRequestCard({
  req,
  countdown,
  onAccept,
  onDecline,
  accepting,
  declining,
  accepted,
  taken,
}: {
  req: LiveRequest
  countdown: CountdownInfo
  onAccept: (id: number) => void
  onDecline: (id: number) => void
  accepting: number | null
  declining: number | null
  accepted: boolean
  taken: boolean
}) {
  const isExpired = countdown.expired || req.is_expired
  const isTaken = taken || req.request_status === 'taken'
  const isProcessing = accepting === req.request_id || declining === req.request_id

  if (accepted) {
    return (
      <div className="rounded-2xl p-5 bg-success/10 border border-success/30 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold text-success">Booking Accepted!</p>
            <p className="text-sm text-base-content/60">{req.care_type} · {req.city} · ${req.pay_rate}/hr</p>
          </div>
        </div>
        <p className="text-xs text-base-content/65">Check your Interview Requests tab for full details.</p>
      </div>
    )
  }

  if (isTaken) {
    return (
      <div className="rounded-2xl p-4 bg-base-200 border border-base-300 opacity-60">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔒</span>
          <div>
            <p className="font-semibold text-sm text-base-content/50">Accepted by Another Caregiver</p>
            <p className="text-xs text-base-content/60">{req.care_type} · {req.city}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border transition-all ${
      isExpired
        ? 'bg-base-200/50 border-base-300 opacity-50'
        : countdown.urgent
        ? 'bg-warning/5 border-warning/40 shadow-sm'
        : 'bg-base-200 border-base-300 shadow-sm'
    }`}>
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="badge badge-sm bg-primary/15 text-primary border-0 font-semibold">NEW</span>
              <RoundBadge round={req.round} />
            </div>
            <h3 className="font-bold text-base-content">{req.care_type}</h3>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-black text-success">${req.pay_rate}<span className="text-xs font-normal text-base-content/50">/hr</span></p>
            {req.duration_hours && <p className="text-xs text-base-content/65">{req.duration_hours}h session</p>}
          </div>
        </div>

        {/* Care quote */}
        <p className="text-sm text-base-content/60 italic mb-3 leading-relaxed">
          {getQuote(req.care_type)}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-base-content/60 mb-3">
          <span className="flex items-center gap-1">📍 {req.city || req.zip_code} · {req.distance_miles} mi away</span>
          {req.start_date && <span>📅 {req.start_date}</span>}
          {req.start_time && <span>⏰ {req.start_time}</span>}
        </div>

        {/* Trust strip */}
        <div className="flex items-center gap-2 text-xs text-base-content/50 mb-3 py-2 border-t border-base-300">
          <span>🛡️ Client verified</span>
          <span>·</span>
          <span>🔒 Booking protected</span>
          {!isExpired && <span>·</span>}
          {!isExpired && <CountdownRing countdown={countdown} expiresAt={req.expires_at} />}
        </div>
      </div>

      {/* Actions */}
      {!isExpired ? (
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => onAccept(req.request_id)}
            disabled={isProcessing}
            className="flex-1 btn btn-success btn-sm font-bold text-white"
          >
            {accepting === req.request_id ? (
              <span className="loading loading-spinner loading-xs" />
            ) : '✅ Accept Booking'}
          </button>
          <button
            onClick={() => onDecline(req.request_id)}
            disabled={isProcessing}
            className="btn btn-ghost btn-sm text-base-content/50"
          >
            {declining === req.request_id ? (
              <span className="loading loading-spinner loading-xs" />
            ) : 'Pass'}
          </button>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <p className="text-xs text-center text-base-content/60">⏱ This request has expired</p>
        </div>
      )}
    </div>
  )
}

function InterviewRequestCard({
  req,
  onUnlock,
  unlocked,
  unlockLoading,
}: {
  req: CareRequest
  onUnlock: (req: CareRequest, plan: 'single' | 'unlimited') => void
  unlocked: boolean
  unlockLoading: boolean
}) {
  const statusLabel: Record<string, string> = {
    pending: '📋 Pending Review',
    accepted: '✅ Accepted',
    declined: '❌ Declined',
    completed: '🏁 Completed',
    cancelled: '🚫 Cancelled',
  }

  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-bold text-base-content">{req.careType || 'Care Request'}</p>
          <p className="text-sm text-base-content/60">{req.clientLocation || 'Location locked'}</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-base-content/65">{statusLabel[req.status] || req.status}</span>
          {req.payRate && <p className="text-sm font-bold text-success">${req.payRate}/hr</p>}
        </div>
      </div>

      {req.scheduledDate && (
        <p className="text-xs text-base-content/65">📅 {req.scheduledDate} {req.scheduledTime && `· ${req.scheduledTime}`}</p>
      )}

      {/* Trust strip */}
      <div className="text-xs text-base-content/60 flex items-center gap-2 pt-1 border-t border-base-300">
        <span>🛡️ Client verified</span><span>·</span><span>🔒 Secure Contact Unlock</span>
      </div>

      {/* Unlock / contact section */}
      {unlocked ? (
        <div className="rounded-xl bg-success/10 border border-success/20 p-3 space-y-1">
          <p className="text-xs font-bold text-success mb-2">✅ Contact Unlocked</p>
          {req.clientName && <p className="text-sm font-semibold">{req.clientName}</p>}
          {req.clientPhone && (
            <a href={`tel:${req.clientPhone}`} className="flex items-center gap-2 text-sm text-primary">
              📞 {req.clientPhone}
            </a>
          )}
          {req.clientEmail && (
            <a href={`mailto:${req.clientEmail}`} className="flex items-center gap-2 text-sm text-primary">
              ✉️ {req.clientEmail}
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl bg-base-300/50 p-3">
            <p className="text-xs text-base-content/50 mb-2">🔒 Client contact info is locked</p>
            <div className="h-3 rounded bg-base-300 mb-1 w-3/4" />
            <div className="h-3 rounded bg-base-300 w-1/2" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onUnlock(req, 'single')}
              disabled={unlockLoading}
              className="flex-1 btn btn-primary btn-sm text-white font-bold"
            >
              {unlockLoading ? <span className="loading loading-spinner loading-xs" /> : '🔓 Unlock · $4.99'}
            </button>
            <button
              onClick={() => onUnlock(req, 'unlimited')}
              disabled={unlockLoading}
              className="btn btn-outline btn-sm border-primary text-primary"
            >
              ♾️ $19.99/mo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function RequestsTab({ profile }: { profile?: any }) {
  const [activeSection, setActiveSection] = useState<'live' | 'interviews'>('live')

  // ── Live Dispatch State ────────────────────────────────
  const [liveRequests, setLiveRequests] = useState<LiveRequest[]>([])
  const [isLoadingLive, setIsLoadingLive] = useState(false)
  const [countdowns, setCountdowns] = useState<Record<number, CountdownInfo>>({})
  const [accepting, setAccepting] = useState<number | null>(null)
  const [declining, setDeclining] = useState<number | null>(null)
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(new Set())
  const [takenIds, setTakenIds] = useState<Set<number>>(new Set())
  const [liveError, setLiveError] = useState('')

  // ── Interview Requests State ───────────────────────────
  const [bookings, setBookings] = useState<CareRequest[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)
  const [unlockedIds, setUnlockedIds] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cgp_unlocked') || '[]')) } catch { return new Set() }
  })
  const [unlockLoading, setUnlockLoading] = useState<number | null>(null)

  // ── Fetch Live Requests ────────────────────────────────
  const fetchLiveRequests = useCallback(async () => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setIsLoadingLive(true)
    setLiveError('')
    try {
      const r = await fetch(`${API}/caregiver-live-requests?token=${token}`)
      const data = await r.json()
      if (data.requests) setLiveRequests(data.requests)
    } catch (e: any) {
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

  // ── Countdown Timer ────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now()
      const updated: Record<number, CountdownInfo> = {}
      liveRequests.forEach((req) => {
        const remaining = new Date(req.expires_at).getTime() - now
        const totalMs = 120000
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

  // ── Accept Dispatch ────────────────────────────────────
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
        setAcceptedIds((prev) => new Set([...prev, requestId]))
        setTimeout(fetchLiveRequests, 2000)
      } else if (data.taken) {
        setTakenIds((prev) => new Set([...prev, requestId]))
      } else if (data.error) {
        alert(data.error)
      }
    } catch (e: any) {
      alert('Failed to accept. Please try again.')
    } finally {
      setAccepting(null)
    }
  }

  // ── Decline Dispatch ───────────────────────────────────
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
      setLiveRequests((prev) => prev.filter((r) => r.request_id !== requestId))
    } finally {
      setDeclining(null)
    }
  }

  // ── Fetch Interview Bookings ───────────────────────────
  const fetchBookings = useCallback(async () => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setIsLoadingBookings(true)
    fetch(`${API}/caregiver-bookings?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
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

  // ── Unlock Handler ─────────────────────────────────────
  // Fix: send camelCase bookingId (not booking_id), call right endpoint per plan,
  // and check data.url (not data.checkout_url) for the Stripe redirect.
  const handleUnlock = async (req: CareRequest, plan: 'single' | 'unlimited') => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setUnlockLoading(req.id)
    try {
      let endpoint: string
      let payload: Record<string, any>

      if (plan === 'unlimited') {
        // Subscription plan — separate endpoint
        endpoint = `${API}/create-caregiver-subscription-checkout`
        payload = { token, caregiverId: profile?.id }
      } else {
        // One-time $4.99 unlock
        endpoint = `${API}/unlock-booking`
        payload = { token, bookingId: req.id, caregiverId: profile?.id }
      }

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await r.json()

      // Backend returns { url } — redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else if (data.success) {
        // Free override or already unlocked
        const newUnlocked = new Set([...unlockedIds, req.id])
        setUnlockedIds(newUnlocked)
        localStorage.setItem('cgp_unlocked', JSON.stringify([...newUnlocked]))
      } else {
        console.error('Unlock error:', data)
        alert(data.error || 'Could not start checkout. Please try again.')
      }
    } catch (e: any) {
      alert('Error processing unlock. Please try again.')
    } finally {
      setUnlockLoading(null)
    }
  }

  // ── Live count badge ───────────────────────────────────
  const activeLiveCount = liveRequests.filter((r) => !r.is_expired && r.request_status !== 'taken').length

  return (
    <div className="flex flex-col h-full">
      {/* Section Switcher */}
      <div className="px-4 pt-4 pb-0">
        <div className="flex rounded-2xl bg-base-200 p-1 gap-1">
          <button
            onClick={() => setActiveSection('live')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSection === 'live'
                ? 'bg-primary text-primary-content shadow-sm'
                : 'text-base-content/50'
            }`}
          >
            <span>⚡</span>
            <span>Live</span>
            {activeLiveCount > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeSection === 'live' ? 'bg-white/20 text-white' : 'bg-error text-white'}`}>
                {activeLiveCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSection('interviews')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSection === 'interviews'
                ? 'bg-primary text-primary-content shadow-sm'
                : 'text-base-content/50'
            }`}
          >
            <span>📅</span>
            <span>Interviews</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">

        {/* ── LIVE DISPATCH SECTION ── */}
        {activeSection === 'live' && (
          <>
            {isLoadingLive && liveRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="loading loading-ring loading-lg text-primary" />
                <p className="text-sm text-base-content/65">Scanning for care requests near you…</p>
              </div>
            )}

            {!isLoadingLive && liveRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-2 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '2.5s' }} />
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">📡</div>
                </div>
                <div>
                  <p className="font-bold text-base-content/70 mb-1">Scanning your area…</p>
                  <p className="text-sm text-base-content/60">No live requests right now.</p>
                  <p className="text-sm text-base-content/60">Make sure you're online to get dispatched.</p>
                </div>
                <div className="rounded-2xl bg-base-200 border border-base-300 p-4 w-full space-y-2">
                  <p className="text-xs font-semibold text-base-content/60 mb-2">💡 Tips to get more requests</p>
                  {[
                    ['Complete your profile', 'Add photo, bio, and skills'],
                    ['Stay online', 'Toggle the Online switch on your Home tab'],
                    ['Enable notifications', 'Never miss a request when it arrives'],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex items-start gap-2">
                      <span className="text-success text-sm mt-0.5">✓</span>
                      <div>
                        <p className="text-xs font-semibold text-base-content/70">{title}</p>
                        <p className="text-xs text-base-content/60">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {liveRequests.map((req) => (
              <LiveRequestCard
                key={req.dispatch_id}
                req={req}
                countdown={countdowns[req.request_id] || { text: '...', urgent: false, expired: false, pct: 100 }}
                onAccept={handleAccept}
                onDecline={handleDecline}
                accepting={accepting}
                declining={declining}
                accepted={acceptedIds.has(req.request_id)}
                taken={takenIds.has(req.request_id)}
              />
            ))}

            {liveRequests.length > 0 && (
              <p className="text-xs text-center text-base-content/60 pb-2">
                Refreshes every 30 seconds · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </>
        )}

        {/* ── INTERVIEW REQUESTS SECTION ── */}
        {activeSection === 'interviews' && (
          <>
            {isLoadingBookings && (
              <div className="flex items-center justify-center py-10">
                <span className="loading loading-ring loading-md text-primary" />
              </div>
            )}

            {!isLoadingBookings && bookings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <span className="text-4xl">📅</span>
                <p className="font-bold text-base-content/60">No Interview Requests Yet</p>
                <p className="text-sm text-base-content/60">When clients book an interview with you, it will appear here.</p>
              </div>
            )}

            {bookings.map((req) => (
              <InterviewRequestCard
                key={req.id}
                req={req}
                onUnlock={handleUnlock}
                unlocked={unlockedIds.has(req.id) || !!req.is_unlocked}
                unlockLoading={unlockLoading === req.id}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default RequestsTab
