// @ts-nocheck
import React from 'react'
import { MapPin, Clock, DollarSign, Star, Check, X, AlertCircle, Heart } from 'lucide-react'
import { CareRequest } from '../types'

interface RequestsTabProps {
  requests: CareRequest[]
  loading: boolean
  onAccept: (id: number) => void
  onDecline: (id: number) => void
}

export const RequestsTab: React.FC<RequestsTabProps> = ({ requests, loading, onAccept, onDecline }) => {
  const pendingRequests = requests.filter(r => r.status === 'pending')
  const respondedRequests = requests.filter(r => r.status !== 'pending')

  const urgencyBadge = (urgency?: string) => {
    if (urgency === 'today') return { text: 'Needs Today', class: 'bg-error/10 text-error' }
    if (urgency === 'this_week') return { text: 'This Week', class: 'bg-warning/10 text-warning' }
    return { text: 'Flexible', class: 'bg-info/10 text-info' }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton-shimmer h-48 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-base-content">Care Requests</h1>
        <p className="text-sm text-base-content/60 mt-0.5">
          {pendingRequests.length} new request{pendingRequests.length !== 1 ? 's' : ''} waiting for you
        </p>
      </div>

      <div className="px-4 space-y-3 mt-2">
        {pendingRequests.length === 0 && respondedRequests.length === 0 ? (
          <div className="text-center py-12">
            <Heart size={40} className="mx-auto opacity-20 mb-3" />
            <p className="text-base-content/60 text-sm">No care requests yet</p>
            <p className="text-xs text-base-content/40 mt-1">New requests will appear here as clients find you</p>
          </div>
        ) : (
          <>
            {pendingRequests.map(req => {
              const ub = urgencyBadge(req.urgency)
              return (
                <div key={req.id} className="bg-base-200 rounded-2xl overflow-hidden request-card">
                  {/* Match score bar */}
                  {req.matchScore && (
                    <div className="earnings-card px-4 py-2 flex items-center justify-between">
                      <span className="text-white/90 text-xs font-medium">Match Score</span>
                      <span className="text-white font-bold text-sm">{req.matchScore}%</span>
                    </div>
                  )}
                  
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-base text-base-content">{req.clientName}</p>
                        <p className="text-xs text-base-content/60 mt-0.5">{req.careType}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${ub.class}`}>
                        {ub.text}
                      </span>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-base-content/80">
                        <MapPin size={14} className="text-primary" />
                        <span className="truncate">{req.location} {req.distance && `· ${req.distance}`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-base-content/80">
                        <Clock size={14} className="text-primary" />
                        <span className="truncate">{req.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-base-content/85">
                        <DollarSign size={14} className="text-success" />
                        <span className="font-semibold text-base-content">${req.hourlyRate}/hr</span>
                      </div>
                      {req.weeklyEarnings && (
                        <div className="flex items-center gap-2 text-sm text-base-content/80">
                          <Star size={14} className="text-warning" />
                          <span>${req.weeklyEarnings}/wk est.</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {req.description && (
                      <p className="text-xs text-base-content/75 mb-4 line-clamp-2 leading-relaxed">
                        "{req.description}"
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onDecline(req.id)}
                        className="btn btn-ghost btn-sm flex-1 border border-base-300"
                      >
                        <X size={16} /> Pass
                      </button>
                      <button
                        onClick={() => onAccept(req.id)}
                        className="btn btn-primary btn-sm flex-1"
                      >
                        <Check size={16} /> Accept
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Responded section */}
            {respondedRequests.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold text-base-content/70 uppercase tracking-wide mb-2">
                  Previously Responded
                </p>
                {respondedRequests.map(req => (
                  <div key={req.id} className="bg-base-200 rounded-2xl p-4 mb-2 opacity-60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-base-content">{req.clientName}</p>
                        <p className="text-xs text-base-content/50">{req.careType} · {req.location}</p>
                      </div>
                      <span className={`badge badge-sm ${req.status === 'accepted' ? 'badge-success' : 'badge-ghost'}`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
