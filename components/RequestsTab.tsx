import React, { useState, useEffect, useCallback } from 'react'

const API = 'https://gotocare-original.jjioji.workers.dev/api'

/** Safely parse a date string — handles SQLite "YYYY-MM-DD HH:MM:SS" and ISO formats.
 *  Returns formatted string like "May 15" or the fallback if date is invalid/missing. */
function safeFmtDate(raw: string | null | undefined, fallback = 'recently'): string {
  if (!raw) return fallback
  const normalized = raw.trim().replace(' ', 'T')
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return fallback
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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
        <span className="text-xs">Expired</span>
      </div>
    )
  }
  return (
    <div className={`flex items-center gap-1 ${countdown.urgent ? 'text-error' : 'text-warning'}`}>
      <span className="text-xs font-mono font-bold">{countdown.text}</span>
      {countdown.urgent && <span className="text-xs animate-pulse">!</span>}
    </div>
  )
}

function LiveRequestCard({
  req, countdown, onAccept, onDecline, accepting, declining, accepted, taken,
}: {
  req: LiveRequest; countdown: CountdownInfo; onAccept: (id: number) => void; onDecline: (id: number) => void
  accepting: number | null; declining: number | null; accepted: boolean; taken: boolean
}) {
  const isExpired = countdown.expired || req.is_expired
  const isTaken = taken || req.request_status === 'taken'
  const isProcessing = accepting === req.request_id || declining === req.request_id

  if (accepted) return (
    <div className="rounded-2xl p-5 bg-success/10 border border-success/30 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-bold text-success">Booking Accepted!</p>
          <p className="text-sm text-base-content/60">{req.care_type} &middot; {req.city} &middot; ${req.pay_rate}/hr</p>
        </div>
      </div>
      <p className="text-xs text-base-content/65">Check your Interview Requests tab for full details.</p>
    </div>
  )

  if (isTaken) return (
    <div className="rounded-2xl p-4 bg-base-200 border border-base-300 opacity-60">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔒</span>
        <div>
          <p className="font-semibold text-sm text-base-content/50">Accepted by Another Caregiver</p>
          <p className="text-xs text-base-content/60">{req.care_type} &middot; {req.city}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`rounded-2xl border transition-all ${
      isExpired ? 'bg-base-200/50 border-base-300 opacity-50'
        : countdown.urgent ? 'bg-warning/5 border-warning/40 shadow-sm'
        : 'bg-base-200 border-base-300 shadow-sm'
    }`}>
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
        <p className="text-sm text-base-content/60 italic mb-3 leading-relaxed">{getQuote(req.care_type)}</p>
        <div className="flex items-center gap-3 flex-wrap text-xs text-base-content/60 mb-3">
          <span>pin {req.city || req.zip_code} &middot; {req.distance_miles} mi away</span>
          {req.start_date && <span>cal {req.start_date}</span>}
          {req.start_time && <span>clock {req.start_time}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-base-content/50 mb-3 py-2 border-t border-base-300">
          <span>shield Client verified</span>
          <span>&middot;</span>
          <span>lock Booking protected</span>
          {!isExpired && <span>&middot;</span>}
          {!isExpired && <CountdownRing countdown={countdown} expiresAt={req.expires_at} />}
        </div>
      </div>
      {!isExpired ? (
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={() => onAccept(req.request_id)} disabled={isProcessing} className="flex-1 btn btn-success btn-sm font-bold text-white">
            {accepting === req.request_id ? <span className="loading loading-spinner loading-xs" /> : 'Accept Booking'}
          </button>
          <button onClick={() => onDecline(req.request_id)} disabled={isProcessing} className="btn btn-ghost btn-sm text-base-content/50">
            {declining === req.request_id ? <span className="loading loading-spinner loading-xs" /> : 'Pass'}
          </button>
        </div>
      ) : (
        <div className="px-4 pb-4"><p className="text-xs text-center text-base-content/60">This request has expired</p></div>
      )}
    </div>
  )
}

function InterviewRequestCard({ req, onUnlock, unlocked, unlockLoading, justUnlocked }: {
  req: CareRequest; onUnlock: (req: CareRequest, plan: 'single' | 'unlimited') => void
  unlocked: boolean; unlockLoading: boolean; justUnlocked?: boolean
}) {
  const statusLabel: Record<string, string> = {
    pending: 'Pending Review', accepted: 'Accepted', declined: 'Declined', completed: 'Completed', cancelled: 'Cancelled',
  }
  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all ${justUnlocked ? 'bg-success/5 border-success/30 shadow-md' : 'bg-base-200 border-base-300'}`}>
      {justUnlocked && (
        <div className="flex items-center gap-2 pb-1">
          <span className="text-lg">⭐</span>
          <p className="text-sm font-bold text-success">Payment successful! Contact info unlocked.</p>
        </div>
      )}
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
        <p className="text-xs text-base-content/65">cal {req.scheduledDate} {req.scheduledTime && `· ${req.scheduledTime}`}</p>
      )}
      <div className="text-xs text-base-content/60 flex items-center gap-2 pt-1 border-t border-base-300">
        <span>shield Client verified</span><span>&middot;</span><span>lock Secure Contact Unlock</span>
      </div>
      {unlocked ? (
        <div className="rounded-xl bg-success/10 border border-success/20 p-3 space-y-1">
          <p className="text-xs font-bold text-success mb-2">Contact Unlocked</p>
          {req.clientName && <p className="text-sm font-semibold">{req.clientName}</p>}
          {req.clientPhone && <a href={`tel:${req.clientPhone}`} className="flex items-center gap-2 text-sm text-primary">📞 {req.clientPhone}</a>}
          {req.clientEmail && <a href={`mailto:${req.clientEmail}`} className="flex items-center gap-2 text-sm text-primary">✉️ {req.clientEmail}</a>}
          {!req.clientName && !req.clientPhone && !req.clientEmail && <p className="text-xs text-base-content/60">Reloading contact info...</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl bg-base-300/50 p-3">
            <p className="text-xs text-base-content/50 mb-2">lock Client contact info is locked</p>
            <div className="h-3 rounded bg-base-300 mb-1 w-3/4" />
            <div className="h-3 rounded bg-base-300 w-1/2" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => onUnlock(req, 'single')} disabled={unlockLoading} className="flex-1 btn btn-primary btn-sm text-white font-bold">
              {unlockLoading ? <span className="loading loading-spinner loading-xs" /> : 'Unlock $4.99'}
            </button>
            <button onClick={() => onUnlock(req, 'unlimited')} disabled={unlockLoading} className="btn btn-outline btn-sm border-primary text-primary">
              $19.99/mo
            </button>
          </div>
          <p className="text-xs text-center text-base-content/50">One-time unlock · Unlimited plan unlocks all future requests</p>
        </div>
      )}
    </div>
  )
}

function SignAgreementModal({ offer, onSign, onClose, signing }: {
  offer: HireOffer; onSign: (sig: string) => void; onClose: () => void; signing: boolean
}) {
  const [sig, setSig] = useState('')
  const firstName = offer.client_name ? offer.client_name.split(' ')[0] : 'Client'
  const lastInitial = offer.client_name && offer.client_name.split(' ').length > 1
    ? offer.client_name.split(' ').slice(-1)[0].charAt(0) + '.'
    : ''
  let careTypes: string[] = []
  try { careTypes = JSON.parse(offer.care_types || '[]') } catch { careTypes = [] }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a2e', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', padding: '0 0 40px', border: '1px solid rgba(124,92,255,0.3)' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#1a1a2e', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Sign Hire Agreement</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Review terms and sign below</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>x</button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ background: 'rgba(124,92,255,0.12)', border: '1px solid rgba(124,92,255,0.3)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 10 }}>Agreement Summary</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8 }}>
              <div><span style={{ color: 'rgba(255,255,255,0.45)' }}>Client: </span>{firstName} {lastInitial}</div>
              <div><span style={{ color: 'rgba(255,255,255,0.45)' }}>Rate: </span><strong style={{ color: '#22C55E' }}>${offer.caregiver_rate}/hr</strong> <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>(locked in)</span></div>
              {offer.start_date && <div><span style={{ color: 'rgba(255,255,255,0.45)' }}>Start: </span>{offer.start_date}</div>}
              {careTypes.length > 0 && <div><span style={{ color: 'rgba(255,255,255,0.45)' }}>Services: </span>{careTypes.join(', ')}</div>}
              {offer.schedule_notes && <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)', whiteSpace: 'pre-line' }}>{offer.schedule_notes}</div>}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>By Signing, You Agree To</div>
            {[
              'Rate of $' + offer.caregiver_rate + '/hr is locked — cannot change after signing',
              'Provide care services as listed in this agreement',
              '24-hour notice required if you need to cancel or reschedule',
              'Keep all client information strictly confidential',
              'Maintain professional conduct and safe working environment',
            ].map((t) => (
              <div key={t} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                <span style={{ color: '#22C55E', fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'block', marginBottom: 8 }}>Type your full legal name to sign</label>
            <input
              type="text"
              value={sig}
              onChange={e => setSig(e.target.value)}
              placeholder={offer.caregiver_name || 'Your Full Name'}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '2px solid rgba(124,92,255,0.5)', background: 'rgba(255,255,255,0.06)', fontSize: 16, fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#fff', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>Your typed name constitutes your digital signature and is legally binding.</div>
          </div>

          <button
            onClick={() => onSign(sig.trim())}
            disabled={signing || sig.trim().length < 3}
            style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: signing || sig.trim().length < 3 ? 'rgba(124,92,255,0.3)' : 'linear-gradient(135deg,#7C5CFF,#4A90E2)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: signing || sig.trim().length < 3 ? 'default' : 'pointer' }}
          >
            {signing ? 'Signing...' : 'Accept & Sign Agreement'}
          </button>
          <button onClick={onClose} style={{ width: '100%', marginTop: 10, padding: '12px', borderRadius: 12, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function HireOfferCard({ offer, onSign, onDecline }: {
  offer: HireOffer; onSign: (offer: HireOffer) => void; onDecline: (token: string) => void
}) {
  let careTypes: string[] = []
  try { careTypes = JSON.parse(offer.care_types || '[]') } catch { careTypes = [] }
  const firstName = offer.client_name ? offer.client_name.split(' ')[0] : 'A client'
  const lastInitial = offer.client_name && offer.client_name.split(' ').length > 1
    ? offer.client_name.split(' ').slice(-1)[0].charAt(0) + '.'
    : ''

  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending_caregiver: { label: 'Awaiting Your Signature', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
    pending_client: { label: 'Signed ✓ — Waiting for Client', color: '#4A90E2', bg: 'rgba(74,144,226,0.1)', border: 'rgba(74,144,226,0.3)' },
    active: { label: 'Agreement Active ✔', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
    declined: { label: 'Declined', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  }
  const s = statusConfig[offer.status] || statusConfig.pending_caregiver

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${s.border}`, borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ background: s.bg, padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.label}</span>
        {offer.status === 'pending_caregiver' && <span style={{ fontSize: 11, color: s.color }}>Expires in 72 hrs</span>}
        {offer.status === 'pending_client' && <span style={{ fontSize: 11, color: s.color }}>Waiting for client countersignature</span>}
        {offer.status === 'active' && <span style={{ fontSize: 11, color: s.color }}>Both parties signed</span>}
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
              Hire Offer from {firstName} {lastInitial}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              {safeFmtDate(offer.created_at)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#22C55E' }}>${offer.caregiver_rate}<span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>/hr</span></div>
            <div style={{ fontSize: 10, color: '#22C55E', fontWeight: 600 }}>RATE LOCKED</div>
          </div>
        </div>

        {careTypes.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {careTypes.map((t: string) => (
                <span key={t} style={{ background: 'rgba(124,92,255,0.2)', color: '#a78bfa', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {offer.start_date && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            Start date: {offer.start_date}
          </div>
        )}

        {offer.schedule_notes && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 10px', marginBottom: 10, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
            {offer.schedule_notes}
          </div>
        )}

        {offer.created_at && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 10 }}>
            Offer received {safeFmtDate(offer.created_at)}
          </div>
        )}

        {offer.status === 'pending_caregiver' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              onClick={() => onSign(offer)}
              style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7C5CFF,#4A90E2)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
            >
              Sign &amp; Accept
            </button>
            <button
              onClick={() => onDecline(offer.agreement_token)}
              style={{ padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.4)', background: 'transparent', color: 'rgba(239,68,68,0.75)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Decline
            </button>
          </div>
        )}

        {offer.status === 'pending_client' && (
          <div style={{ marginTop: 14, background: 'rgba(74,144,226,0.1)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(74,144,226,0.3)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4A90E2' }}>You signed! Waiting for client.</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.5 }}>The client has been notified by email. Once they countersign, the agreement activates and you both receive a copy.</div>
          </div>
        )}
        {offer.status === 'active' && (
          <div style={{ marginTop: 14, background: 'rgba(34,197,94,0.1)', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>Agreement Active</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Both parties have signed. You are on their care team.</div>
          </div>
        )}
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

  // Live Dispatch
  const [liveRequests, setLiveRequests] = useState<LiveRequest[]>([])
  const [isLoadingLive, setIsLoadingLive] = useState(false)
  const [countdowns, setCountdowns] = useState<Record<number, CountdownInfo>>({})
  const [accepting, setAccepting] = useState<number | null>(null)
  const [declining, setDeclining] = useState<number | null>(null)
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(new Set())
  const [takenIds, setTakenIds] = useState<Set<number>>(new Set())
  const [liveError, setLiveError] = useState('')

  // Interview Requests
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

  // Hire Offers
  const [hireOffers, setHireOffers] = useState<HireOffer[]>([])
  const [isLoadingOffers, setIsLoadingOffers] = useState(false)
  const [signingOffer, setSigningOffer] = useState<HireOffer | null>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [signSuccess, setSignSuccess] = useState<string | null>(null)

  // Fetch Live Requests
  const fetchLiveRequests = useCallback(async () => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setIsLoadingLive(true)
    setLiveError('')
    try {
      const r = await fetch(`${API}/caregiver-live-requests?token=${token}`)
      const data = await r.json()
      if (data.requests) setLiveRequests(data.requests)
    } catch { setLiveError('Could not load live requests.') }
    finally { setIsLoadingLive(false) }
  }, [])

  useEffect(() => {
    fetchLiveRequests()
    const interval = setInterval(fetchLiveRequests, 30000)
    return () => clearInterval(interval)
  }, [fetchLiveRequests])

  // Countdown Timer
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

  // Accept Dispatch
  const handleAccept = async (requestId: number) => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setAccepting(requestId)
    try {
      const r = await fetch(`${API}/dispatch-accept`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, request_id: requestId }),
      })
      const data = await r.json()
      if (data.success) { setAcceptedIds(prev => new Set([...prev, requestId])); setTimeout(fetchLiveRequests, 2000) }
      else if (data.taken) setTakenIds(prev => new Set([...prev, requestId]))
      else if (data.error) alert(data.error)
    } catch { alert('Failed to accept. Please try again.') }
    finally { setAccepting(null) }
  }

  // Decline Dispatch
  const handleDecline = async (requestId: number) => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setDeclining(requestId)
    try {
      await fetch(`${API}/dispatch-decline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, request_id: requestId }),
      })
      setLiveRequests(prev => prev.filter(r => r.request_id !== requestId))
    } finally { setDeclining(null) }
  }

  // Fetch Interview Bookings
  const fetchBookings = useCallback(async () => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setIsLoadingBookings(true)
    fetch(`${API}/caregiver-bookings?token=${token}`)
      .then(r => r.json())
      .then(data => {
        const raw: any[] = data.bookings || data.requests || []
        setBookings(raw.map((b: any) => ({
          id: b.id, status: b.status || 'pending',
          careType: b.care_type || b.careType || b.careNeeds,
          scheduledDate: b.scheduled_date || b.scheduledDate || b.preferredDate,
          scheduledTime: b.scheduled_time || b.scheduledTime || b.preferredTime,
          clientName: b.client_name || b.clientName,
          clientPhone: b.client_phone || b.clientPhone,
          clientEmail: b.client_email || b.clientEmail,
          clientLocation: b.client_location || b.zip_code,
          payRate: b.pay_rate || b.payRate,
          notes: b.notes, is_unlocked: b.is_unlocked || b.isUnlocked,
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
        const newSet = new Set([...optimisticUnlocked, Number(returnedBookingId)])
        setOptimisticUnlocked(newSet)
        const newPersisted = new Set([...unlockedIds, Number(returnedBookingId)])
        setUnlockedIds(newPersisted)
        localStorage.setItem('cgp_unlocked', JSON.stringify([...newPersisted]))
      }
    }
  }, [returnedBookingId, returnedSubscription])

  // Fetch Hire Offers
  const fetchHireOffers = useCallback(async () => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setIsLoadingOffers(true)
    try {
      const r = await fetch(`${API}/pending-hire-offers?token=${token}`)
      const data = await r.json()
      if (data.success) setHireOffers(data.offers || [])
    } catch { }
    finally { setIsLoadingOffers(false) }
  }, [])

  useEffect(() => {
    if (activeSection !== 'offers') return
    fetchHireOffers()
  }, [activeSection, fetchHireOffers])

  // Also fetch offers count on mount (for badge)
  useEffect(() => { fetchHireOffers() }, [fetchHireOffers])

  // Phase 3 fix: fetch bookings on mount so Interviews badge is always populated (not just when sub-tab is active)
  useEffect(() => { fetchBookings() }, [fetchBookings])

  // Handle caregiver signing
  const handleSign = async (signature: string) => {
    if (!signingOffer || signature.length < 3) return
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setIsSigning(true)
    try {
      const r = await fetch(`${API}/sign-hire-agreement`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, agreementToken: signingOffer.agreement_token, caregiverSignature: signature }),
      })
      const data = await r.json()
      if (data.success) {
        setHireOffers(prev => prev.map(o => o.agreement_token === signingOffer.agreement_token ? { ...o, status: 'pending_client' as const, caregiver_signature: signature } : o))
        setSignSuccess(signingOffer.client_name?.split(' ')[0] || 'client')
        setSigningOffer(null)
      } else {
        alert(data.error || 'Something went wrong. Please try again.')
      }
    } catch { alert('Network error. Please try again.') }
    finally { setIsSigning(false) }
  }

  // Handle caregiver declining
  const handleDeclineOffer = async (agreementToken: string) => {
    if (!confirm('Are you sure you want to decline this hire offer?')) return
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    try {
      await fetch(`${API}/decline-hire-agreement`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, agreementToken }),
      })
      setHireOffers(prev => prev.map(o => o.agreement_token === agreementToken ? { ...o, status: 'declined' as const } : o))
    } catch { alert('Could not decline. Please try again.') }
  }

  const isUnlocked = (req: CareRequest) =>
    !!req.is_unlocked || unlockedIds.has(req.id) || optimisticUnlocked.has(req.id) || (returnedSubscription === true)

  const handleUnlock = async (req: CareRequest, plan: 'single' | 'unlimited') => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setUnlockLoading(req.id)
    try {
      const caregiverId = profile?.id || (() => {
        try { return JSON.parse(localStorage.getItem('cgp_account') || '{}').id } catch { return undefined }
      })()
      let endpoint: string
      let payload: Record<string, any>
      if (plan === 'unlimited') {
        endpoint = `${API}/create-caregiver-subscription-checkout`
        payload = { token, caregiverId }
      } else {
        endpoint = `${API}/unlock-booking`
        payload = { token, bookingId: req.id, caregiverId }
      }
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await r.json()
      if (data.url) { window.location.href = data.url }
      else if (data.success) {
        const newUnlocked = new Set([...unlockedIds, req.id])
        setUnlockedIds(newUnlocked)
        localStorage.setItem('cgp_unlocked', JSON.stringify([...newUnlocked]))
      } else {
        alert(data.error || 'Could not start checkout. Please try again.')
      }
    } catch { alert('Error processing unlock. Please try again.') }
    finally { setUnlockLoading(null) }
  }

  const activeLiveCount = liveRequests.filter(r => !r.is_expired && r.request_status !== 'taken').length
  const pendingOffersCount = hireOffers.filter(o => o.status === 'pending_caregiver').length

  return (
    <div className="flex flex-col h-full">
      {/* Section Switcher */}
      <div className="px-4 pt-4 pb-0">
        <div className="flex rounded-2xl bg-base-200 p-1 gap-1">
          <button
            onClick={() => setActiveSection('live')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${activeSection === 'live' ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/50'}`}
          >
            <span>Live</span>
            {activeLiveCount > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeSection === 'live' ? 'bg-white/20 text-white' : 'bg-error text-white'}`}>{activeLiveCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveSection('offers')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${activeSection === 'offers' ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/50'}`}
          >
            <span>Hire Offers</span>
            {pendingOffersCount > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeSection === 'offers' ? 'bg-white/20 text-white' : 'bg-warning text-black'}`}>{pendingOffersCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveSection('interviews')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${activeSection === 'interviews' ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/50'}`}
          >
            <span>Interviews</span>
            {bookings.length > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeSection === 'interviews' ? 'bg-white/20 text-white' : 'bg-primary/80 text-white'}`}>{bookings.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">

        {/* LIVE DISPATCH */}
        {activeSection === 'live' && (
          <>
            {isLoadingLive && liveRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="loading loading-ring loading-lg text-primary" />
                <p className="text-sm text-base-content/65">Scanning for care requests near you...</p>
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
                  <p className="font-bold text-base-content/70 mb-1">Scanning your area...</p>
                  <p className="text-sm text-base-content/60">No live requests right now.</p>
                  <p className="text-sm text-base-content/60">Make sure you are online to get dispatched.</p>
                </div>
                <div className="rounded-2xl bg-base-200 border border-base-300 p-4 w-full space-y-2">
                  <p className="text-xs font-semibold text-base-content/60 mb-2">Tips to get more requests</p>
                  {[['Complete your profile', 'Add photo, bio, and skills'], ['Stay online', 'Toggle the Online switch on your Home tab'], ['Enable notifications', 'Never miss a request when it arrives']].map(([title, desc]) => (
                    <div key={title} className="flex items-start gap-2">
                      <span className="text-success text-sm mt-0.5">✓</span>
                      <div><p className="text-xs font-semibold text-base-content/70">{title}</p><p className="text-xs text-base-content/60">{desc}</p></div>
                    </div>
                  ))}
                </div>

                {/* Demo request preview */}
                <div className="relative w-full rounded-2xl overflow-hidden border border-primary/20">
                  {/* Overlay */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-base-100/85 backdrop-blur-sm rounded-2xl px-4">
                    <span className="text-2xl mb-1">📬</span>
                    <p className="font-bold text-sm text-base-content/80">This is what a request looks like</p>
                    <p className="text-xs text-base-content/50 text-center mt-1">Stay online — you'll get a push notification the moment a family requests you</p>
                  </div>
                  {/* Blurred sample behind */}
                  <div className="blur-sm pointer-events-none select-none p-4 bg-base-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="badge badge-primary badge-sm">Elder Care</span>
                        <p className="font-bold text-base-content mt-1">Family needs support</p>
                        <p className="text-xs text-base-content/60">2.4 mi away · Starts soon</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success text-lg">$28/hr</p>
                        <p className="text-xs text-base-content/60">4 hrs</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-error/10 rounded-xl py-2 text-center text-xs font-semibold text-error">Pass</div>
                      <div className="flex-1 bg-success/10 rounded-xl py-2 text-center text-xs font-semibold text-success">Accept $112</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {liveRequests.map(req => (
              <LiveRequestCard key={req.dispatch_id} req={req}
                countdown={countdowns[req.request_id] || { text: '...', urgent: false, expired: false, pct: 100 }}
                onAccept={handleAccept} onDecline={handleDecline}
                accepting={accepting} declining={declining}
                accepted={acceptedIds.has(req.request_id)} taken={takenIds.has(req.request_id)}
              />
            ))}
            {liveRequests.length > 0 && (
              <p className="text-xs text-center text-base-content/60 pb-2">
                Refreshes every 30 seconds &middot; {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </>
        )}

        {/* HIRE OFFERS */}
        {activeSection === 'offers' && (
          <>
            {signSuccess && (
              <div className="rounded-2xl bg-success/10 border border-success/30 p-4 flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="font-bold text-success">You signed the agreement!</p>
                  <p className="text-sm text-base-content/60">You are now on {signSuccess}&apos;s care team. Check My Clients for details.</p>
                </div>
              </div>
            )}

            {isLoadingOffers && hireOffers.length === 0 && (
              <div className="flex items-center justify-center py-10">
                <span className="loading loading-ring loading-md text-primary" />
              </div>
            )}

            {!isLoadingOffers && hireOffers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <span className="text-5xl">🤝</span>
                <p className="font-bold text-base-content/60">No Hire Offers Yet</p>
                <p className="text-sm text-base-content/60 px-4">When a client directly hires you, their signed agreement will appear here for your review and signature.</p>
                <div className="rounded-2xl bg-base-200 border border-base-300 p-4 w-full space-y-2 text-left mt-2">
                  <p className="text-xs font-semibold text-base-content/60 mb-2">How hire offers work</p>
                  {[
                    ['Client sends you a hire offer', 'They set the rate, hours, and schedule — you get notified'],
                    ['You sign first', 'Review all terms and sign — your rate is locked in at this point'],
                    ['Client countersigns', 'Client gets an email alert and countersigns to finalize'],
                    ['Both get email copies', 'Agreement is stored securely. You are officially on their care team.'],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex items-start gap-2">
                      <span className="text-primary text-sm mt-0.5">→</span>
                      <div><p className="text-xs font-semibold text-base-content/70">{title}</p><p className="text-xs text-base-content/60">{desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hireOffers.map(offer => (
              <HireOfferCard key={offer.id} offer={offer} onSign={setSigningOffer} onDecline={handleDeclineOffer} />
            ))}

            {signingOffer && (
              <SignAgreementModal offer={signingOffer} onSign={handleSign} onClose={() => setSigningOffer(null)} signing={isSigning} />
            )}
          </>
        )}

        {/* INTERVIEW REQUESTS */}
        {activeSection === 'interviews' && (
          <>
            {isLoadingBookings && (
              <div className="flex items-center justify-center py-10">
                <span className="loading loading-ring loading-md text-primary" />
              </div>
            )}
            {!isLoadingBookings && bookings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <span className="text-4xl">calendar</span>
                <p className="font-bold text-base-content/60">No Interview Requests Yet</p>
                <p className="text-sm text-base-content/60">When clients book an interview with you, it will appear here.</p>
                <div className="rounded-2xl bg-base-200 border border-base-300 p-4 w-full space-y-2 text-left mt-2">
                  <p className="text-xs font-semibold text-base-content/60 mb-2">How it works</p>
                  {[['Client books you', 'A family finds your profile and requests an interview'], ['You get notified', 'Email alert sent to you instantly'], ['Unlock to connect', 'Pay $4.99 to see their contact info, or $19.99/mo for unlimited']].map(([title, desc]) => (
                    <div key={title} className="flex items-start gap-2">
                      <span className="text-primary text-sm mt-0.5">→</span>
                      <div><p className="text-xs font-semibold text-base-content/70">{title}</p><p className="text-xs text-base-content/60">{desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {bookings.map(req => (
              <InterviewRequestCard key={req.id} req={req} onUnlock={handleUnlock}
                unlocked={isUnlocked(req)} unlockLoading={unlockLoading === req.id}
                justUnlocked={returnedBookingId ? Number(returnedBookingId) === req.id : false}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default RequestsTab
