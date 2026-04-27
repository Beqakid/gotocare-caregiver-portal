// @ts-nocheck
import React, { useState } from 'react'
import { MapPin, Clock, DollarSign, Star, Lock, Unlock, Check, X, Heart, ChevronRight } from 'lucide-react'
import { CareRequest } from '../types'

const API = 'https://gotocare-original.jjioji.workers.dev/api'

interface RequestsTabProps {
  requests: CareRequest[]
  loading: boolean
  onAccept: (id: number) => void
  onDecline: (id: number) => void
}

export const RequestsTab: React.FC<RequestsTabProps> = ({ requests, loading, onAccept, onDecline }) => {
  const [unlockedIds, setUnlockedIds] = useState<Set<number>>(new Set())
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [unlockLoading, setUnlockLoading] = useState<number | null>(null)

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const acceptedRequests = requests.filter(r => r.status === 'accepted')

  const urgencyBadge = (urgency?: string) => {
    if (urgency === 'today') return { text: '🔴 Needs Today', cls: 'bg-error/15 text-error border border-error/30' }
    if (urgency === 'this_week') return { text: '🟡 This Week', cls: 'bg-warning/15 text-warning border border-warning/30' }
    return { text: '🟢 Flexible', cls: 'bg-success/15 text-success border border-success/30' }
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
        // Already unlocked or dev mode
        setUnlockedIds(prev => new Set([...prev, req.id]))
      } else {
        // Demo mode — unlock locally
        setUnlockedIds(prev => new Set([...prev, req.id]))
      }
    } catch (e) {
      // Demo fallback — unlock locally so UI still works
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
        <Heart size={56} className="mx-auto opacity-20 mb-4" />
        <h2 className="text-lg font-bold text-base-content">No Interview Requests Yet</h2>
        <p className="text-sm text-base-content/60 mt-2">Clients will send interview requests when they shortlist you.</p>
        <p className="text-xs text-base-content/40 mt-1">Make sure your profile is complete to get discovered!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-24 p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-base-content">Interview Requests</h1>
          <p className="text-sm text-base-content/60 mt-0.5">
            {pendingRequests.length} pending · {acceptedRequests.length} confirmed
          </p>
        </div>
        {/* Earnings hint */}
        {pendingRequests.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-base-content/50">Potential</div>
            <div className="text-base font-bold text-success">
              ${pendingRequests.reduce((s, r) => s + (r.hourlyRate || 28) * 4, 0)}/wk
            </div>
          </div>
        )}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
            Pending ({pendingRequests.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pendingRequests.map(req => {
              const unlocked = unlockedIds.has(req.id)
              const expanded = expandedId === req.id
              const ub = urgencyBadge(req.urgency)

              return (
                <div
                  key={req.id}
                  className="bg-base-200 rounded-2xl overflow-hidden shadow-sm border border-base-300/50"
                >
                  {/* Match score bar */}
                  {req.matchScore && (
                    <div className="earnings-card px-4 py-2.5 flex items-center justify-between">
                      <span className="text-white/90 text-sm font-semibold">🎯 Match Score</span>
                      <span className="text-white font-bold text-base">{req.matchScore}%</span>
                    </div>
                  )}

                  <div className="p-4">
                    {/* Top row: care type + urgency */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-base text-base-content">{req.careType}</p>
                        {/* Client name — blurred unless unlocked */}
                        <div className="flex items-center gap-2 mt-1">
                          {unlocked ? (
                            <p className="text-sm text-base-content/70">{req.clientName}</p>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Lock size={12} className="text-base-content/40" />
                              <p className="text-sm text-base-content/40 blur-sm select-none">
                                {req.clientName || 'Client Name'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ub.cls}`}>
                        {ub.text}
                      </span>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-base-300/40 rounded-xl p-2.5 flex items-center gap-2">
                        <MapPin size={14} className="text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-base-content/50">Location</p>
                          <p className="text-sm font-medium">{req.location}</p>
                        </div>
                      </div>
                      <div className="bg-base-300/40 rounded-xl p-2.5 flex items-center gap-2">
                        <DollarSign size={14} className="text-success shrink-0" />
                        <div>
                          <p className="text-xs text-base-content/50">Rate</p>
                          <p className="text-sm font-bold text-success">${req.hourlyRate}/hr</p>
                        </div>
                      </div>
                      {/* Schedule — blurred unless unlocked */}
                      <div className="bg-base-300/40 rounded-xl p-2.5 flex items-center gap-2 col-span-2">
                        <Clock size={14} className="text-primary shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-base-content/50">Interview Time</p>
                          {unlocked ? (
                            <p className="text-sm font-medium">{req.schedule}</p>
                          ) : (
                            <p className="text-sm font-medium blur-sm text-base-content/30 select-none">
                              {req.schedule || 'Monday 9-11 AM'}
                            </p>
                          )}
                        </div>
                        {!unlocked && <Lock size={12} className="text-base-content/30 shrink-0" />}
                      </div>
                    </div>

                    {/* Description (visible) */}
                    {req.description && expanded && (
                      <div className="bg-base-300/30 rounded-xl p-3 mb-3">
                        <p className="text-sm text-base-content/80 leading-relaxed">"{req.description}"</p>
                      </div>
                    )}

                    {/* ── LOCKED STATE ── */}
                    {!unlocked ? (
                      <div className="mt-3">
                        <div className="bg-primary/8 border border-primary/20 rounded-xl p-3 mb-3 flex items-center gap-3">
                          <div className="bg-primary/15 p-2 rounded-lg">
                            <Lock size={16} className="text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-base-content">Unlock full details</p>
                            <p className="text-xs text-base-content/60">See date, time & client info to respond</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleUnlock(req, 'single')}
                            disabled={unlockLoading === req.id}
                            className="btn btn-sm btn-outline btn-primary rounded-xl flex flex-col h-auto py-2.5 gap-0.5"
                          >
                            {unlockLoading === req.id ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <>
                                <span className="text-xs font-bold">Unlock Once</span>
                                <span className="text-xs opacity-70 font-normal">$4.99</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleUnlock(req, 'unlimited')}
                            disabled={unlockLoading === req.id}
                            className="btn btn-sm btn-primary rounded-xl flex flex-col h-auto py-2.5 gap-0.5"
                          >
                            <>
                              <span className="text-xs font-bold">Unlimited Plan</span>
                              <span className="text-xs opacity-80 font-normal">$19.99/mo</span>
                            </>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── UNLOCKED STATE ── */
                      <div className="mt-3">
                        <div className="bg-success/8 border border-success/25 rounded-xl p-2.5 mb-3 flex items-center gap-2">
                          <Unlock size={14} className="text-success" />
                          <p className="text-xs font-semibold text-success">Details unlocked — respond to this request</p>
                        </div>
                        {req.description && !expanded && (
                          <button
                            onClick={() => setExpandedId(expanded ? null : req.id)}
                            className="flex items-center gap-1 text-xs text-base-content/50 mb-3"
                          >
                            <ChevronRight size={12} /> View care details
                          </button>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => onDecline(req.id)}
                            className="btn btn-outline btn-sm flex-1 rounded-xl"
                          >
                            <X size={14} /> Pass
                          </button>
                          <button
                            onClick={() => onAccept(req.id)}
                            className="btn btn-primary btn-sm flex-1 rounded-xl"
                          >
                            <Check size={14} /> Confirm
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
          <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
            Confirmed ({acceptedRequests.length})
          </h2>
          <div className="flex flex-col gap-3">
            {acceptedRequests.map(req => (
              <div key={req.id} className="bg-success/8 border border-success/25 rounded-2xl p-4 flex items-center gap-3">
                <div className="bg-success/15 p-2.5 rounded-xl">
                  <Check size={18} className="text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base-content text-sm">{req.careType}</p>
                  <p className="text-xs text-base-content/60">{req.clientName} · {req.schedule}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-success">${req.hourlyRate}/hr</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
