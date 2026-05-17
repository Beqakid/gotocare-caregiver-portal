// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Heart, Star } from 'lucide-react'

const API_BASE = 'https://gotocare-original.jjioji.workers.dev'

interface ReviewLinkViewProps {
  caregiverId: string
  onBack?: () => void
}

const traitOptions = [
  { key: 'isPunctual', label: 'On time' },
  { key: 'isCaring', label: 'Caring' },
  { key: 'isCommunicative', label: 'Clear updates' },
  { key: 'isProfessional', label: 'Professional' },
  { key: 'wouldHireAgain', label: 'Would hire again' },
]

export const ReviewLinkView: React.FC<ReviewLinkViewProps> = ({ caregiverId, onBack }) => {
  const [profile, setProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [traits, setTraits] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const caregiverHomeUrl = typeof window !== 'undefined' ? window.location.origin : 'https://work.carehia.com'

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/public-profile?id=${encodeURIComponent(caregiverId)}`)
        const data = await res.json()
        if (!cancelled) setProfile(data.success ? data.profile : null)
      } catch {
        if (!cancelled) setProfile(null)
      } finally {
        if (!cancelled) setLoadingProfile(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [caregiverId])

  const toggleTrait = (key: string) => setTraits(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!rating) {
      setError('Please choose a star rating.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/submit-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caregiverId,
          rating,
          reviewText,
          clientName,
          clientEmail,
          ...traits,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Review could not be submitted.')
      setSubmitted(true)
    } catch (err: any) {
      setError(err?.message || 'Review could not be submitted. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const initials = profile?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'
  const firstName = profile?.name?.split(' ')[0] || 'this caregiver'

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div style={{ width: 40, height: 40, border: '3px solid rgba(124,92,255,0.2)', borderTopColor: '#7C5CFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100 flex flex-col" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="relative px-5 pt-7 pb-8" style={{ background: 'linear-gradient(135deg, #223B6D 0%, #7C5CFF 100%)' }}>
        <div className="flex items-center justify-between mb-7">
          <button
            onClick={onBack || (() => { window.location.href = caregiverHomeUrl })}
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            <Heart size={13} /> Carehia review
          </div>
        </div>

        <div className="flex items-center gap-4">
          {profile?.photo_url ? (
            <img src={profile.photo_url} alt={profile.name} className="w-20 h-20 rounded-2xl object-cover border border-white/30" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-2xl font-black text-white">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white/75 text-xs font-bold uppercase">Leave a review</p>
            <h1 className="text-2xl font-black text-white leading-tight">{profile?.name || 'Caregiver'}</h1>
            <p className="text-white/70 text-sm mt-1">Your feedback helps families choose care with confidence.</p>
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="flex-1 px-5 py-10">
          <div className="bg-success/10 border border-success/25 rounded-2xl p-5 text-center">
            <CheckCircle2 size={42} className="text-success mx-auto mb-3" />
            <h2 className="text-xl font-black text-base-content">Thank you</h2>
            <p className="text-sm text-base-content/65 mt-2">Your review has been added to {firstName}'s Carehia profile.</p>
            <a href={`${caregiverHomeUrl}?caregiver=${caregiverId}`} className="btn btn-primary rounded-xl mt-5 w-full">
              View caregiver profile
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex-1 px-5 py-6 space-y-5">
          <div className="bg-base-200 rounded-2xl p-4">
            <label className="block text-sm font-bold text-base-content mb-3">How would you rate {firstName}?</label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map(value => {
                const active = value <= (hoverRating || rating)
                return (
                  <button
                    type="button"
                    key={value}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(value)}
                    className="w-11 h-11 rounded-xl bg-base-100 border border-base-300 flex items-center justify-center"
                    aria-label={`${value} star rating`}
                  >
                    <Star size={25} className={active ? 'text-warning fill-warning' : 'text-base-content/25'} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Your name"
              className="input input-bordered rounded-xl bg-base-100"
            />
            <input
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
              placeholder="Email optional"
              type="email"
              className="input input-bordered rounded-xl bg-base-100"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-base-content mb-2">Share a few words</label>
            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="What stood out about the care?"
              rows={5}
              maxLength={1000}
              className="textarea textarea-bordered rounded-2xl w-full bg-base-100"
            />
          </div>

          <div>
            <p className="text-sm font-bold text-base-content mb-2">Quick tags</p>
            <div className="flex flex-wrap gap-2">
              {traitOptions.map(option => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleTrait(option.key)}
                  className={`px-3 py-2 rounded-full text-xs font-bold border ${
                    traits[option.key] ? 'bg-primary text-white border-primary' : 'bg-base-100 text-base-content/65 border-base-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="rounded-xl bg-error/10 border border-error/20 text-error text-sm px-3 py-2">{error}</div>}

          <button disabled={submitting || !rating} type="submit" className="btn btn-primary rounded-2xl w-full">
            {submitting ? 'Submitting...' : 'Submit review'}
          </button>
        </form>
      )}
    </div>
  )
}

export default ReviewLinkView
