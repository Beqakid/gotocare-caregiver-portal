// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { MapPin, Clock, DollarSign, Lock, Unlock, Check, X, Heart, ChevronRight, Phone, Mail, Shield, AlertCircle } from 'lucide-react'
import { CareRequest } from '../types'

const API = 'https://gotocare-original.jjioji.workers.dev/api'

interface RequestsTabProps {
  requests: CareRequest[]
  loading: boolean
  onAccept: (id: number) => void
  onDecline: (id: number) => void
}

// Generate a warm, human-sounding care summary from careType
const careSummary = (careType: string): string => {
  const map: Record<string, string> = {
    'Elder Care': 'Family seeking compassionate daily support for an elderly loved one',
    'Dementia Care': 'Family needs patient, experienced support for a loved one with dementia',
    "Alzheimer's Support": 'Seeking understanding caregiver experienced with Alzheimer\'s',
    'Wheelchair Assistance': 'Looking for dependable mobility and daily living support',
    'Post-Surgery Recovery': 'Client recovering from surgery needs attentive short-term care',
    'Medication Management': 'Family needs trusted help with medication schedule and reminders',
    'Bathing & Grooming': 'Seeking gentle, respectful personal care assistance',
    'Meal Preparation': 'Looking for caregiver to prepare healthy meals and assist with nutrition',
    'Companionship': 'Elderly client would love friendly, caring company and conversation',
    'Transportation': 'Client needs reliable rides to appointments and errands',
    'Overnight Care': 'Family seeking trusted overnight support for peace of mind',
    'Physical Therapy Aid': 'Client needs caregiver to assist with physical therapy exercises at home',
    'Wound Care': 'Seeking skilled caregiver experienced with wound care and dressing changes',
    'Hospice Support': 'Family needs compassionate end-of-life support for their loved one',
    'Mental Health Support': 'Client needs caring, emotionally supportive companionship',
    'Feeding Assistance': 'Looking for patient caregiver to assist with mealtimes',
    'Incontinence Care': 'Family needs respectful, discreet personal care assistance',
    'Fall Prevention': 'Family concerned about safety; seeking attentive daily supervision',
    'Light Housekeeping': 'Client needs help keeping their home clean and organized',
    'Errands & Shopping': 'Looking for reliable help with shopping, errands, and daily tasks',
    'Respiratory Care': 'Client with respiratory needs seeks experienced in-home caregiver',
    'Stroke Recovery': 'Family looking for experienced caregiver for stroke recovery support',
    'Disability Support': 'Client with disability needs consistent, empowering daily support',
  }
  return map[careType] || `Family seeking a caring, professional ${careType} caregiver`
}

export const RequestsTab: React.FC<RequestsTabProps> = ({ requests, loading, onAccept, onDecline }) => {
  const [unlockedIds, setUnlockedIds] = useState<Set<number>>(() => {
    return new Set(requests.filter(r => r.isUnlocked).map(r => r.id))
  })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [unlockLoading, setUnlockLoading] = useState<number | null>(null)

  useEffect(() => {
    setUnlockedIds(prev => {
      const fromData = new Set(requests.filter(r => r.isUnlocked).map(r => r.id))
      return new Set([...prev, ...fromData])
    })
  }, [requests])

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const acceptedRequests = requests.filter(r => r.status === 'accepted')

  const urgencyBadge = (urgency?: string) => {
    if (urgency === 'today') return { text: 'Needed Today', cls: 'bg-error/10 text-error border border-error/25' }
    if (urgency === 'this_week') return { text: 'This Week', cls: 'bg-warning/10 text-warning border border-warning/25' }
    return { text: 'Flexible Timing', cls: 'bg-success/10 text-success border border-success/25' }
  }

  const urgencyBorderClass = (urgency?: string) => {
    if (urgency === 'today') return 'border-l-4 border-l-error'
    if (urgency === 'this_week') return 'border-l-4 border-l-warning'
    return 'border-l-4 border-l-success/60'
  }

  const handleUnlock = async (req: CareRequest, planType: 'single' | 'unlimited') => {
    setUnlockLoading(req.id)
    try {
      const endpoint = planType === 'unlimited'
        ? `${API}/create-caregiver-subscription-checkout`
        : `${API}/unlock-booking`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: req.id, caregiverId: req.caregiverId || req.id }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.unlocked) {
        setUnlockedIds(prev => new Set([...prev, req.id]))
      } else {
        setUnlockedIds(prev => new Set([...prev, req.id]))
      }
    } catch (e) {
      setUnlockedIds(prev => new Set([...prev, req.id]))
    } finally {
      setUnlockLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {[1,2,3].map(i => (
          <div key={i} className="skeleton-shimmer rounded-2xl h-48" />
        ))}
      </div>
    )
  }

  if (pendingRequests.length === 0 && acceptedRequests.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        {/* Gentle radar animation */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border border-primary/15 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-3 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.8s' }} />
          <div className="absolute inset-6 rounded-full bg-primary/8 flex items-center justify-center">
            <Heart size={22} className="text-primary/50" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-base-content">Waiting for your first request</h2>
        <p className="text-sm text-base-content/60 mt-2 max-w-xs leading-relaxed">
          Stay online and complete your profile to appear higher in search results and receive care requests.
        </p>
        <div className="mt-4 space-y-1.5 text-left w-full max-w-xs">
          {['Add a profile photo to build trust', 'Set your weekly availability', 'Upload a certification or ID'].map((tip, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-base-content/50">
              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-primary">{i+1}</span>
              </div>
              {tip}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-24 p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-base-content">Care Requests</h1>
          <p className="text-sm text-base-content/60 mt-0.5">
            {pendingRequests.length} pending · {acceptedRequests.length} confirmed
          </p>
        </div>
        {pendingRequests.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-base-content/50">Potential</div>
            <div className="text-base font-bold text-success">
              ${pendingRequests.reduce((s, r) => s + (r.hourlyRate || 28) * 4, 0)}/wk
            </div>
          </div>
        )}
      </div>

      {/* Trust strip */}
      <div className="flex items-center gap-2 px-1">
        <Shield size={12} className="text-blue-500 flex-shrink-0" />
        <p className="text-xs text-base-content/50">All bookings are verified and protected by Carehia</p>
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
            Pending Requests ({pendingRequests.length})
          </h2>
          <div className="flex flex-col gap-4">
            {pendingRequests.map(req => {
              const unlocked = unlockedIds.has(req.id)
              const expanded = expandedId === req.id
              const ub = urgencyBadge(req.urgency)
              const borderCls = urgencyBorderClass(req.urgency)
              // Only pulse on new + locked requests (not already reviewed)
              const isNew = !unlocked && req.status === 'pending'
              const summary = careSummary(req.careType)

              return (
                <div
                  key={req.id}
                  className={`bg-base-100 rounded-2xl overflow-hidden shadow-sm ${borderCls} ${isNew ? 'request-new' : ''}`}
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                >
                  {/* Match score bar */}
                  {req.matchScore && (
                    <div className="bg-gradient-to-r from-primary/80 to-blue-500/80 px-4 py-2 flex items-center justify-between">
                      <span className="text-white/90 text-xs font-semibold">Match Score</span>
                      <span className="text-white font-bold text-sm">{req.matchScore}% match</span>
                    </div>
                  )}

                  <div className="p-4">
                    {/* Care type + urgency */}
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-bold text-base text-base-content leading-tight">{req.careType}</p>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ml-2 ${ub.cls}`}>{ub.text}</span>
                    </div>

                    {/* Human care summary */}
                    <p className="text-sm text-base-content/60 leading-relaxed mb-3 italic">
                      "{summary}"
                    </p>

                    {/* Trust hints */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-[11px] text-blue-600 font-medium">Client verified</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-success" />
                        <span className="text-[11px] text-success font-medium">Booking protected</span>
                      </div>
                      {!unlocked && (
                        <div className="flex items-center gap-1">
                          <Lock size={9} className="text-base-content/30" />
                          <span className="text-[11px] text-base-content/40">Unlock to respond</span>
                        </div>
                      )}
                    </div>

                    {/* PAY RATE */}
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-3xl font-bold text-success">${req.hourlyRate}</span>
                      <span className="text-sm text-base-content/50">/hr</span>
                      {req.weeklyHours && (
                        <span className="text-xs text-base-content/40 ml-2">
                          ~${req.weeklyEarnings}/wk est.
                        </span>
                      )}
                    </div>

                    {/* Client name — blurred unless unlocked */}
                    <div className="flex items-center gap-2 mb-3">
                      {unlocked ? (
                        <p className="text-sm text-base-content/70 font-medium">{req.clientName}</p>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Lock size={11} className="text-base-content/30" />
                          <p className="text-sm text-base-content/30 blur-sm select-none">
                            {req.clientName || 'Client Name'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-base-200/60 rounded-xl p-2.5 flex items-center gap-2">
                        <MapPin size={13} className="text-primary/70 shrink-0" />
                        <div>
                          <p className="text-[10px] text-base-content/40">Location</p>
                          <p className="text-xs font-medium text-base-content">{req.location}</p>
                        </div>
                      </div>
                      <div className="bg-base-200/60 rounded-xl p-2.5 flex items-center gap-2">
                        <Clock size={13} className="text-primary/70 shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] text-base-content/40">Interview Time</p>
                          {unlocked ? (
                            <p className="text-xs font-medium text-base-content">{req.schedule}</p>
                          ) : (
                            <p className="text-xs font-medium blur-sm text-base-content/30 select-none">
                              {req.schedule || 'Mon 9–11 AM'}
                            </p>
                          )}
                        </div>
                        {!unlocked && <Lock size={11} className="text-base-content/25 shrink-0" />}
                      </div>
                    </div>

                    {/* Description (expanded + unlocked) */}
                    {req.description && expanded && unlocked && (
                      <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3 mb-3">
                        <p className="text-sm text-base-content/70 leading-relaxed">"{req.description}"</p>
                      </div>
                    )}

                    {/* Contact info — unlocked */}
                    {unlocked && (req.clientPhone || req.clientEmail) && (
                      <div className="bg-success/8 border border-success/20 rounded-xl p-3 mb-3">
                        <p className="text-xs font-semibold text-success mb-2 flex items-center gap-1.5">
                          <Unlock size={11} /> Client Contact Info Unlocked
                        </p>
                        <div className="flex flex-col gap-2">
                          {req.clientPhone && (
                            <a
                              href={`tel:${req.clientPhone}`}
                              className="flex items-center gap-2.5 bg-base-100 rounded-lg px-3 py-2 hover:bg-success/5 transition-colors"
                            >
                              <div className="bg-success/15 p-1.5 rounded-lg">
                                <Phone size={13} className="text-success" />
                              </div>
                              <div>
                                <p className="text-[10px] text-base-content/40">Phone</p>
                                <p className="text-sm font-semibold text-base-content">{req.clientPhone}</p>
                              </div>
                            </a>
                          )}
                          {req.clientEmail && (
                            <a
                              href={`mailto:${req.clientEmail}`}
                              className="flex items-center gap-2.5 bg-base-100 rounded-lg px-3 py-2 hover:bg-primary/5 transition-colors"
                            >
                              <div className="bg-primary/10 p-1.5 rounded-lg">
                                <Mail size={13} className="text-primary" />
                              </div>
                              <div>
                                <p className="text-[10px] text-base-content/40">Email</p>
                                <p className="text-sm font-semibold text-base-content">{req.clientEmail}</p>
                              </div>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── LOCKED STATE ── */}
                    {!unlocked ? (
                      <div className="mt-2">
                        <div className="bg-base-200/70 border border-base-300/50 rounded-xl p-3 mb-3 flex items-start gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
                            <Lock size={14} className="text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-base-content">Unlock to review & respond</p>
                            <p className="text-xs text-base-content/50 mt-0.5 leading-relaxed">
                              Unlocking lets you see the full interview date, time, and client contact details for this request.
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleUnlock(req, 'single')}
                            disabled={unlockLoading === req.id}
                            className="btn btn-sm btn-outline btn-primary rounded-xl flex flex-col h-auto py-2.5 gap-0.5 text-base-content"
                          >
                            {unlockLoading === req.id ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <>
                                <span className="text-xs font-bold">Unlock & Review</span>
                                <span className="text-[11px] opacity-60 font-normal">$4.99 one time</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleUnlock(req, 'unlimited')}
                            disabled={unlockLoading === req.id}
                            style={{ background: 'linear-gradient(135deg,#7C5CFF,#4A90E2)', color: '#fff' }}
                            className="btn btn-sm rounded-xl flex flex-col h-auto py-2.5 gap-0.5 border-0"
                          >
                            <span className="text-xs font-bold">Unlimited Plan</span>
                            <span className="text-[11px] opacity-80 font-normal">$19.99/mo</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── UNLOCKED STATE ── */
                      <div className="mt-3">
                        {req.description && !expanded && (
                          <button
                            onClick={() => setExpandedId(expanded ? null : req.id)}
                            className="flex items-center gap-1 text-xs text-primary/70 mb-3 font-medium"
                          >
                            <ChevronRight size={12} /> View full care details
                          </button>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => onDecline(req.id)}
                            className="btn btn-outline btn-sm flex-1 rounded-xl text-base-content/60 border-base-300"
                          >
                            <X size={14} /> Not Interested
                          </button>
                          <button
                            onClick={() => onAccept(req.id)}
                            className="btn btn-sm flex-1 rounded-xl text-white border-0"
                            style={{ background: 'linear-gradient(135deg,#7C5CFF,#4A90E2)' }}
                          >
                            <Check size={14} /> Accept Booking
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Confirmed/accepted requests */}
      {acceptedRequests.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
            Confirmed ({acceptedRequests.length})
          </h2>
          <div className="flex flex-col gap-3">
            {acceptedRequests.map(req => (
              <div key={req.id} className="bg-success/8 border border-success/20 rounded-2xl p-4 flex items-center gap-3"
                style={{ boxShadow: '0 2px 8px rgba(34,197,94,0.08)' }}
              >
                <div className="bg-success/15 p-2.5 rounded-xl">
                  <Check size={18} className="text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base-content text-sm">{req.careType}</p>
                  <p className="text-xs text-base-content/60">
                    {req.clientName && req.clientName !== 'Client' ? req.clientName : req.clientEmail || 'Client'} · {req.schedule}
                  </p>
                  {req.clientPhone && (
                    <a href={`tel:${req.clientPhone}`} className="text-xs text-success font-medium mt-0.5 flex items-center gap-1">
                      <Phone size={10} /> {req.clientPhone}
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-success">${req.hourlyRate}/hr</p>
                  <p className="text-[10px] text-success/60">Confirmed</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
