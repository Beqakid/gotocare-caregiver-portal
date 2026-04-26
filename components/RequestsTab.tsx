// @ts-nocheck
import React, { useState, useRef } from 'react'
import { MapPin, Clock, DollarSign, Star, Check, X, Heart, RotateCcw } from 'lucide-react'
import { CareRequest } from '../types'

interface RequestsTabProps {
  requests: CareRequest[]
  loading: boolean
  onAccept: (id: number) => void
  onDecline: (id: number) => void
}

export const RequestsTab: React.FC<RequestsTabProps> = ({ requests, loading, onAccept, onDecline }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const [swipeDir, setSwipeDir] = useState(0)
  const [history, setHistory] = useState<{ id: number; action: 'accept' | 'decline' }[]>([])
  const startX = useRef(0)
  const startY = useRef(0)

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const currentRequest = pendingRequests[currentIndex]

  const triggerHaptic = (pattern: 'light' | 'medium' | 'heavy') => {
    if (navigator.vibrate) {
      const patterns = {
        light: 20,
        medium: 50,
        heavy: 100
      }
      navigator.vibrate(patterns[pattern])
    }
  }

  const urgencyBadge = (urgency?: string) => {
    if (urgency === 'today') return { text: 'Needs Today', class: 'bg-error/10 text-error' }
    if (urgency === 'this_week') return { text: 'This Week', class: 'bg-warning/10 text-warning' }
    return { text: 'Flexible', class: 'bg-info/10 text-info' }
  }

  const handleSwipeStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }

  const handleSwipeMove = (e: React.TouchEvent) => {
    if (!currentRequest) return
    const currentX = e.touches[0].clientX
    const diff = currentX - startX.current
    
    // Only register as swipe if horizontal > vertical
    const verticalDiff = Math.abs(e.touches[0].clientY - startY.current)
    if (Math.abs(diff) > verticalDiff && Math.abs(diff) > 10) {
      setSwiping(true)
      setSwipeDir(diff)
    }
  }

  const handleSwipeEnd = () => {
    const threshold = 80
    
    if (Math.abs(swipeDir) > threshold) {
      triggerHaptic('heavy')
      const action = swipeDir > 0 ? 'accept' : 'decline'
      
      setHistory([...history, { id: currentRequest.id, action }])
      
      if (action === 'accept') {
        onAccept(currentRequest.id)
      } else {
        onDecline(currentRequest.id)
      }
      
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1)
        setSwiping(false)
        setSwipeDir(0)
      }, 300)
    } else {
      setSwiping(false)
      setSwipeDir(0)
    }
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const lastAction = history[history.length - 1]
    setHistory(history.slice(0, -1))
    setCurrentIndex(prev => prev - 1)
    triggerHaptic('light')
  }

  const handleQuickAction = (action: 'accept' | 'decline') => {
    triggerHaptic('medium')
    setHistory([...history, { id: currentRequest.id, action }])
    
    if (action === 'accept') {
      onAccept(currentRequest.id)
    } else {
      onDecline(currentRequest.id)
    }
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
    }, 300)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <div className="skeleton-shimmer w-full h-96 rounded-3xl" />
      </div>
    )
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <Heart size={56} className="mx-auto opacity-20 mb-4" />
        <h2 className="text-lg font-bold text-base-content">No Care Requests Yet</h2>
        <p className="text-sm text-base-content/60 mt-2">Check back soon!</p>
        <p className="text-xs text-base-content/40 mt-1">New requests will appear as clients find you</p>
      </div>
    )
  }

  if (currentIndex >= pendingRequests.length) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <Check size={56} className="mx-auto text-success mb-4" />
        <h2 className="text-lg font-bold text-base-content">All Reviewed!</h2>
        <p className="text-sm text-base-content/60 mt-2">You've reviewed all pending requests</p>
        <button
          onClick={() => {
            setCurrentIndex(0)
            setHistory([])
          }}
          className="btn btn-primary btn-sm mt-4"
        >
          Start Over
        </button>
      </div>
    )
  }

  const ub = urgencyBadge(currentRequest.urgency)
  const cardStyle = {
    transform: swiping ? `translateX(${swipeDir * 0.3}px) rotate(${swipeDir * 0.05}deg)` : 'translateX(0) rotate(0)',
    opacity: swiping ? 1 - Math.abs(swipeDir) / 300 : 1,
    transition: swiping ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
  }

  return (
    <div className="flex flex-col h-full pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-base-content">Care Requests</h1>
          <p className="text-sm text-base-content/60 mt-0.5">
            {currentIndex + 1} of {pendingRequests.length}
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleUndo}
            className="btn btn-ghost btn-sm"
            title="Undo last action"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {/* Swipeable card stack */}
      <div className="flex-1 px-4 mt-4 flex items-center justify-center">
        <div
          className="w-full max-w-sm cursor-grab active:cursor-grabbing"
          onTouchStart={handleSwipeStart}
          onTouchMove={handleSwipeMove}
          onTouchEnd={handleSwipeEnd}
          style={cardStyle}
        >
          {/* Card */}
          <div className="bg-base-200 rounded-3xl overflow-hidden shadow-xl">
            {/* Match score bar */}
            {currentRequest.matchScore && (
              <div className="earnings-card px-4 py-3 flex items-center justify-between">
                <span className="text-white/90 text-sm font-medium">Perfect Match</span>
                <span className="text-white font-bold text-lg">{currentRequest.matchScore}%</span>
              </div>
            )}

            <div className="p-5">
              {/* Header with urgency */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="font-bold text-xl text-base-content">{currentRequest.clientName}</p>
                  <p className="text-sm text-base-content/60 mt-0.5">{currentRequest.careType}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${ub.class}`}>
                  {ub.text}
                </span>
              </div>

              {/* Details grid - larger */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 text-base text-base-content/80">
                  <div className="bg-primary/10 p-2.5 rounded-lg">
                    <MapPin size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60">Location</p>
                    <p className="font-medium">{currentRequest.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-base text-base-content/80">
                  <div className="bg-primary/10 p-2.5 rounded-lg">
                    <Clock size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60">Schedule</p>
                    <p className="font-medium">{currentRequest.schedule}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-base text-base-content/80">
                  <div className="bg-success/10 p-2.5 rounded-lg">
                    <DollarSign size={18} className="text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60">Hourly Rate</p>
                    <p className="font-medium text-lg">${currentRequest.hourlyRate}/hr</p>
                  </div>
                </div>

                {currentRequest.weeklyEarnings && (
                  <div className="flex items-center gap-3 text-base text-base-content/80">
                    <div className="bg-warning/10 p-2.5 rounded-lg">
                      <Star size={18} className="text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-base-content/60">Potential Earnings</p>
                      <p className="font-medium">${currentRequest.weeklyEarnings}/week</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {currentRequest.description && (
                <div className="bg-base-300/30 rounded-xl p-3 mb-4">
                  <p className="text-sm text-base-content/80 leading-relaxed">
                    "{currentRequest.description}"
                  </p>
                </div>
              )}

              {/* Swipe hint */}
              <div className="text-center text-xs text-base-content/40 mb-4">
                ← Swipe → or use buttons below
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons - fixed at bottom */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-base-100 to-transparent pt-6">
        <div className="flex gap-3 max-w-sm mx-auto">
          <button
            onClick={() => handleQuickAction('decline')}
            className="btn btn-outline btn-lg flex-1 rounded-2xl text-lg"
          >
            <X size={20} /> Pass
          </button>
          <button
            onClick={() => handleQuickAction('accept')}
            className="btn btn-primary btn-lg flex-1 rounded-2xl text-lg"
          >
            <Check size={20} /> Accept
          </button>
        </div>
      </div>
    </div>
  )
}
