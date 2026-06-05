// Phase 25 — Check-In / Check-Out Location Modal
// Handles: GPS request, geofence result, manual exception, submission.
// Only requests location at check-in / check-out — not continuously.

import React, { useCallback, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Shield,
  X,
} from 'lucide-react'
import { getCurrentPosition, getCheckInEligibility } from '../utils/geoUtils'
import type { CareLocation, CheckInEligibility, Coordinates } from '../utils/geoUtils'

// ── Public types ─────────────────────────────────────────────────────────────

export type CheckInStatus =
  | 'confirmed_location'
  | 'manual_pending_review'
  | 'outside_geofence_review'
  | 'gps_unavailable'
  | 'no_location_data'

export interface CheckInResult {
  mode: 'checkin' | 'checkout'
  status: CheckInStatus
  location?: Coordinates
  distanceMeters?: number
  manualReason?: string
  manualNote?: string
}

interface CheckInModalProps {
  mode: 'checkin' | 'checkout'
  shiftId?: number
  clientName?: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
  careLocation?: CareLocation | null
  onConfirm: (result: CheckInResult) => void
  onCancel: () => void
}

// ── State machine ────────────────────────────────────────────────────────────

type ModalState =
  | 'privacy'
  | 'locating'
  | 'confirmed'
  | 'outside'
  | 'gps_unavailable'
  | 'gps_weak'
  | 'too_early'
  | 'no_location'
  | 'manual_form'
  | 'submitting'
  | 'success'

const CHECK_IN_REASONS = [
  'GPS not working',
  'Address pin is incorrect',
  'Apartment or building access issue',
  'Client asked me to start remotely',
  'Emergency situation',
  'Transportation or errands visit',
  'Other',
]

const CHECK_OUT_REASONS = [
  'Client asked me to leave',
  'Completed transportation or errands',
  'Forgot to check out before leaving',
  'Emergency situation',
  'GPS issue',
  'Other',
]

// ── Shared styles ────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(15,23,42,0.55)',
  backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  padding: '0 0 env(safe-area-inset-bottom, 0)',
}

const sheet: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '20px 20px 0 0',
  padding: '24px 20px 32px',
  width: '100%',
  maxWidth: 520,
  maxHeight: '92vh',
  overflowY: 'auto',
}

const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
  background: '#7C5CFF', color: '#fff', fontWeight: 800, fontSize: 15,
  cursor: 'pointer', marginTop: 12,
}

const btnSecondary: React.CSSProperties = {
  width: '100%', padding: '13px', borderRadius: 12,
  border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569',
  fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 8,
}

const btnDanger: React.CSSProperties = {
  ...btnSecondary, color: '#DC2626', borderColor: '#FECACA',
}

// ── Component ────────────────────────────────────────────────────────────────

export function CheckInModal({
  mode,
  clientName,
  scheduledStart,
  careLocation,
  onConfirm,
  onCancel,
}: CheckInModalProps) {
  const [step, setStep] = useState<ModalState>('privacy')
  const [eligibility, setEligibility] = useState<CheckInEligibility | null>(null)
  const [coords, setCoords] = useState<Coordinates | null>(null)
  const [manualReason, setManualReason] = useState('')
  const [manualNote, setManualNote] = useState('')

  const isOut = mode === 'checkout'
  const verb = isOut ? 'Check-out' : 'Check-in'

  // ── GPS → geofence logic ──────────────────────────────────────────────────
  const requestLocation = useCallback(async () => {
    setStep('locating')
    const pos = await getCurrentPosition()
    setCoords(pos)

    const locMode = careLocation?.mode ?? 'fixed_location'
    const el = getCheckInEligibility({
      currentLocation: pos,
      careLocation: careLocation ?? null,
      scheduledStart: scheduledStart ?? null,
      locationMode: locMode,
    })
    setEligibility(el)

    if (el.reason === 'remote_allowed' || el.reason === 'confirmed_location') {
      setStep('confirmed')
    } else if (el.reason === 'too_early') {
      setStep('too_early')
    } else if (el.reason === 'gps_unavailable') {
      setStep('gps_unavailable')
    } else if (el.reason === 'gps_weak') {
      setStep('gps_weak')
    } else if (el.reason === 'no_location_data' || el.reason === 'manual_required') {
      setStep('no_location')
    } else {
      // outside_geofence
      setStep('outside')
    }
  }, [careLocation, scheduledStart])

  // ── Confirm location-verified ─────────────────────────────────────────────
  const confirmVerified = useCallback(() => {
    onConfirm({
      mode,
      status: 'confirmed_location',
      location: coords ?? undefined,
      distanceMeters: eligibility?.distanceMeters,
    })
  }, [mode, coords, eligibility, onConfirm])

  // ── Submit manual ─────────────────────────────────────────────────────────
  const submitManual = useCallback(() => {
    if (!manualReason) return
    setStep('submitting')
    const status: CheckInStatus = isOut ? 'outside_geofence_review' : 'manual_pending_review'
    // Brief pause so user sees submitting state
    setTimeout(() => {
      onConfirm({
        mode,
        status,
        location: coords ?? undefined,
        distanceMeters: eligibility?.distanceMeters,
        manualReason,
        manualNote: manualNote || undefined,
      })
    }, 600)
  }, [mode, coords, eligibility, manualReason, manualNote, isOut, onConfirm])

  // ── Render states ─────────────────────────────────────────────────────────

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={sheet}>

        {/* Handle bar */}
        <div style={{ width: 40, height: 4, borderRadius: 4, background: '#E2E8F0', margin: '0 auto 20px' }} />

        {/* ── PRIVACY ── */}
        {step === 'privacy' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0EDFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={22} color="#7C5CFF" />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 17, color: '#0F172A' }}>Location {verb}</div>
                {clientName && <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{clientName}</div>}
              </div>
              <button onClick={onCancel} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color="#94A3B8" />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Shield size={16} color="#7C5CFF" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                  Carehia uses your location <strong>only to confirm check-in and check-out</strong> for scheduled care visits. We do not track your location all day.
                </p>
              </div>
            </div>

            <button style={btnPrimary} onClick={requestLocation}>
              Continue — Get My Location
            </button>
            <button style={btnSecondary} onClick={() => setStep('manual_form')}>
              Skip — Manual {verb}
            </button>
            <button style={{ ...btnSecondary, marginTop: 6, fontSize: 13, color: '#94A3B8', border: 'none' }} onClick={onCancel}>
              Not now
            </button>
          </div>
        )}

        {/* ── LOCATING ── */}
        {step === 'locating' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Loader2 size={40} color="#7C5CFF" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ fontWeight: 800, fontSize: 17, color: '#0F172A', marginBottom: 6 }}>Getting your location…</div>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>This takes just a moment.</p>
          </div>
        )}

        {/* ── CONFIRMED ── */}
        {step === 'confirmed' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <CheckCircle2 size={30} color="#22C55E" />
              </div>
              <div style={{ fontWeight: 900, fontSize: 19, color: '#0F172A', marginBottom: 6 }}>
                {isOut ? 'Check-out confirmed' : 'Check-in confirmed'}
              </div>
              <p style={{ fontSize: 14, color: '#22C55E', fontWeight: 700, margin: '0 0 4px' }}>
                Location confirmed
              </p>
              <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                {isOut
                  ? 'Your visit has been completed.'
                  : 'Your visit timer is starting now.'}
              </p>
              {eligibility?.distanceMeters != null && (
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
                  {eligibility.distanceMeters}m from care location
                </p>
              )}
            </div>
            <button style={btnPrimary} onClick={confirmVerified}>
              {isOut ? 'Complete Visit' : 'Start Visit'}
            </button>
          </div>
        )}

        {/* ── OUTSIDE GEOFENCE ── */}
        {step === 'outside' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <MapPin size={26} color="#F97316" />
              </div>
              <div style={{ fontWeight: 900, fontSize: 17, color: '#0F172A', marginBottom: 6 }}>
                {isOut ? 'You appear to be away from the care location' : 'You are not near the care location'}
              </div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                {isOut
                  ? 'Please choose a reason so Carehia can keep the visit record accurate.'
                  : 'Please check in when you arrive, or request manual check-in if the address pin or GPS is incorrect.'}
              </p>
              {eligibility?.distanceMeters != null && (
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
                  Approx. {eligibility.distanceMeters}m from care location
                </p>
              )}
            </div>
            <button style={btnPrimary} onClick={requestLocation}>Try Again</button>
            <button style={btnDanger} onClick={() => setStep('manual_form')}>
              Request Manual {verb}
            </button>
            <button style={btnSecondary} onClick={onCancel}>Cancel</button>
          </div>
        )}

        {/* ── GPS UNAVAILABLE ── */}
        {(step === 'gps_unavailable') && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <AlertTriangle size={26} color="#94A3B8" />
              </div>
              <div style={{ fontWeight: 900, fontSize: 17, color: '#0F172A', marginBottom: 6 }}>Location unavailable</div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                We could not confirm your location. You can try again or request manual check-in.
              </p>
            </div>
            <button style={btnPrimary} onClick={requestLocation}>Try Again</button>
            <button style={btnSecondary} onClick={() => setStep('manual_form')}>
              Request Manual {verb}
            </button>
            <button style={btnSecondary} onClick={onCancel}>Cancel</button>
          </div>
        )}

        {/* ── GPS WEAK ── */}
        {step === 'gps_weak' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <AlertTriangle size={26} color="#F59E0B" />
              </div>
              <div style={{ fontWeight: 900, fontSize: 17, color: '#0F172A', marginBottom: 6 }}>Location signal is weak</div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Try moving near a window or stepping outside, then try again.
              </p>
            </div>
            <button style={btnPrimary} onClick={requestLocation}>Try Again</button>
            <button style={btnSecondary} onClick={() => setStep('manual_form')}>
              Request Manual {verb}
            </button>
            <button style={btnSecondary} onClick={onCancel}>Cancel</button>
          </div>
        )}

        {/* ── TOO EARLY ── */}
        {step === 'too_early' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Clock size={26} color="#3B82F6" />
              </div>
              <div style={{ fontWeight: 900, fontSize: 17, color: '#0F172A', marginBottom: 6 }}>Check-in not available yet</div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                You can check in 15 minutes before your visit starts
                {eligibility?.minutesUntilStart != null && ` (in about ${eligibility.minutesUntilStart} minutes)`}.
              </p>
            </div>
            <button style={btnSecondary} onClick={onCancel}>View Schedule</button>
          </div>
        )}

        {/* ── NO CARE LOCATION DATA ── */}
        {step === 'no_location' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <MapPin size={26} color="#94A3B8" />
              </div>
              <div style={{ fontWeight: 900, fontSize: 17, color: '#0F172A', marginBottom: 6 }}>Location verification not set up</div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                The care location for this visit has not been mapped yet. You can proceed with a manual {verb.toLowerCase()} for now.
              </p>
            </div>
            <button style={btnPrimary} onClick={() => setStep('manual_form')}>
              Continue with Manual {verb}
            </button>
            <button style={btnSecondary} onClick={onCancel}>Cancel</button>
          </div>
        )}

        {/* ── MANUAL FORM ── */}
        {step === 'manual_form' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F0EDFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={18} color="#7C5CFF" />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#0F172A' }}>Manual {verb}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Select a reason to continue</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {(isOut ? CHECK_OUT_REASONS : CHECK_IN_REASONS).map((r) => (
                <button
                  key={r}
                  onClick={() => setManualReason(r)}
                  style={{
                    padding: '12px 14px', borderRadius: 10, textAlign: 'left',
                    border: manualReason === r ? '2px solid #7C5CFF' : '1.5px solid #E2E8F0',
                    background: manualReason === r ? '#F0EDFF' : '#FFFFFF',
                    color: manualReason === r ? '#7C5CFF' : '#334155',
                    fontWeight: manualReason === r ? 700 : 500, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Optional note (e.g., high-rise building, moved address)"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A',
                resize: 'none', fontFamily: 'inherit', marginBottom: 4,
                boxSizing: 'border-box',
              }}
            />

            <div style={{ background: '#FFF7ED', borderRadius: 10, padding: '10px 14px', marginBottom: 4 }}>
              <p style={{ fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
                Your visit timer will start and Carehia may review this later.
              </p>
            </div>

            <button
              style={{ ...btnPrimary, opacity: manualReason ? 1 : 0.45 }}
              disabled={!manualReason}
              onClick={submitManual}
            >
              Submit Manual {verb}
            </button>
            <button style={btnSecondary} onClick={() => setStep('privacy')}>Back</button>
          </div>
        )}

        {/* ── SUBMITTING ── */}
        {step === 'submitting' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Loader2 size={36} color="#7C5CFF" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 14px' }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: '#475569' }}>Submitting…</div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
