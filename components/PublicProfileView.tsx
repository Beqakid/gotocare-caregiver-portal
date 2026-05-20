// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Star, DollarSign, Shield, Award, Heart, Share2, Copy, Check, ChevronRight } from 'lucide-react'

const API_BASE = 'https://gotocare-original.jjioji.workers.dev'

interface PublicProfileViewProps {
  caregiverId: string
  onBack?: () => void
}

const ALL_CARE_NEEDS = [
  'Elder Care', 'Dementia Care', "Alzheimer's Support", 'Wheelchair Assistance',
  'Post-Surgery Recovery', 'Medication Management', 'Bathing & Grooming', 'Meal Preparation',
  'Companionship', 'Transportation', 'Overnight Care', 'Physical Therapy Aid',
  'Wound Care', 'Hospice Support', 'Mental Health Support', 'Feeding Assistance',
  'Incontinence Care', 'Fall Prevention', 'Light Housekeeping', 'Errands & Shopping',
  'Respiratory Care', 'Stroke Recovery', 'Disability Support',
]

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({ caregiverId, onBack }) => {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const caregiverHomeUrl = typeof window !== 'undefined' ? window.location.origin : 'https://work.carehia.com'

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/public-profile?id=${encodeURIComponent(caregiverId)}`)
        const data = await res.json()
        if (data.success) setProfile(data.profile)
        else setError('Profile not found')
      } catch (e) {
        setError('Could not load profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [caregiverId])

  useEffect(() => {
    fetch(`${API_BASE}/api/caregiver-reviews?id=${encodeURIComponent(caregiverId)}`)
      .then(r => r.json())
      .then(d => setReviews(d.success ? (d.reviews || []) : []))
      .catch(() => setReviews([]))
  }, [caregiverId])

  const handleShare = async () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?caregiver=${caregiverId}`
      : `https://work.carehia.com?caregiver=${caregiverId}`
    try {
      await navigator.share({ title: profile?.name || 'Caregiver Profile', url })
    } catch {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
    }
  }

  const handleRequestCare = () => {
    window.location.href = `https://app.carehia.com/?book=${encodeURIComponent(caregiverId)}#findcare`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div style={{ width: 40, height: 40, border: '3px solid rgba(124,92,255,0.2)', borderTopColor: '#7C5CFF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-4xl mb-3">😔</div>
        <h2 className="text-lg font-bold text-base-content mb-2">Profile Not Found</h2>
        <p className="text-sm text-base-content/60 mb-6">{error || 'This caregiver profile is no longer available.'}</p>
        <a href={caregiverHomeUrl} className="btn btn-primary rounded-2xl">Browse Caregivers</a>
      </div>
    )
  }

  const firstName = profile.name?.split(' ')[0] || 'Caregiver'
  const initials = profile.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'
  const location = [profile.city, profile.state].filter(Boolean).join(', ') || profile.zip_code || 'Location TBD'
  let skills: string[] = []
  try { skills = Array.isArray(profile.skills) ? profile.skills : JSON.parse(profile.skills || '[]') } catch {}
  let certs: string[] = []
  try { certs = Array.isArray(profile.certifications) ? profile.certifications : JSON.parse(profile.certifications || '[]') } catch {}

  return (
    <div className="min-h-screen bg-base-100 flex flex-col" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div className="relative" style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #4A90E2 100%)', paddingBottom: 80 }}>
        {/* Back + Share */}
        <div className="flex items-center justify-between p-4 pt-8">
          {onBack ? (
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowLeft size={18} className="text-white" />
            </button>
          ) : (
            <a href="https://work.carehia.com" className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowLeft size={18} className="text-white" />
            </a>
          )}
          <button onClick={handleShare} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            {copied ? <Check size={18} className="text-white" /> : <Share2 size={18} className="text-white" />}
          </button>
        </div>

        {/* Hero text */}
        <div className="text-center px-4 mt-2">
          <p className="text-white/80 text-sm font-medium uppercase tracking-wide mb-1">Carehia Caregiver</p>
          <h1 className="text-3xl font-bold text-white">{profile.name || 'Caregiver'}</h1>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <MapPin size={13} className="text-white/70" />
            <span className="text-white/70 text-sm">{location}</span>
          </div>
          {profile.hourly_rate > 0 && (
            <div className="inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 mt-2">
              <DollarSign size={13} className="text-white" />
              <span className="text-white text-sm font-bold">${profile.hourly_rate}/hr</span>
            </div>
          )}
        </div>
      </div>

      {/* Profile photo (floating) */}
      <div className="flex justify-center" style={{ marginTop: -70 }}>
        {profile.photo_url ? (
          <img
            src={profile.photo_url}
            alt={profile.name}
            className="w-36 h-36 rounded-full object-cover border-4 border-base-100 shadow-xl"
          />
        ) : (
          <div className="w-36 h-36 rounded-full border-4 border-base-100 shadow-xl flex items-center justify-center text-4xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7C5CFF, #4A90E2)' }}>
            {initials}
          </div>
        )}
      </div>

      {/* Rating row */}
      <div className="flex items-center justify-center gap-4 mt-3 px-6">
        <div className="flex items-center gap-1">
          {(profile.rating && profile.total_reviews) ? (
            <>
              <Star size={14} className="text-warning fill-warning" />
              <span className="text-sm font-bold text-base-content">{profile.rating}</span>
              <span className="text-xs text-base-content/50">({profile.total_reviews} reviews)</span>
            </>
          ) : (
            <span className="text-xs font-medium text-base-content/50 bg-base-200 px-2.5 py-1 rounded-full">New Caregiver</span>
          )}
        </div>
        {certs.length > 0 && (
          <div className="flex items-center gap-1">
            <Shield size={14} className="text-success" />
            <span className="text-xs font-medium text-success">Certified</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-32 mt-4 space-y-5">

        {/* About */}
        {profile.bio && (
          <div className="bg-base-200 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-base-content mb-2">About {firstName}</h3>
            <p className="text-sm text-base-content/70 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-base-content mb-2.5">Care Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((s: string) => (
                <span key={s} className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {certs.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-base-content mb-2.5">Certifications</h3>
            <div className="space-y-2">
              {certs.map((c: string, i: number) => (
                <div key={i} className="flex items-center gap-2.5 bg-success/5 border border-success/20 rounded-xl px-3 py-2">
                  <Award size={15} className="text-success flex-shrink-0" />
                  <span className="text-sm text-base-content">{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-base-content mb-2.5">Client Reviews</h3>
            <div className="space-y-2">
              {reviews.slice(0, 4).map((review: any) => (
                <div key={review.id || `${review.created_at}-${review.rating}`} className="bg-base-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={13} className={n <= review.rating ? 'text-warning fill-warning' : 'text-base-content/20'} />
                      ))}
                    </div>
                    <span className="text-[11px] text-base-content/45">
                      {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  {review.review_text && <p className="text-sm text-base-content/70 leading-relaxed">"{review.review_text}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What to expect */}
        <div className="bg-base-200 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-base-content mb-3">What to Expect</h3>
          <div className="space-y-2.5">
            {[
              { icon: '✅', text: 'Background check eligible' },
              { icon: '💬', text: 'Responds quickly to requests' },
              { icon: '🤝', text: 'Interviewed & reviewed by Carehia' },
              { icon: '🔒', text: 'Contact info shared after booking' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-base">{item.icon}</span>
                <span className="text-sm text-base-content/70">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Join CTA */}
        <div className="text-center py-4 border-t border-base-300">
          <p className="text-xs text-base-content/50 mb-1">Are you a caregiver?</p>
          <a href={caregiverHomeUrl} className="text-sm font-semibold text-primary">
            Join Carehia Free →
          </a>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-base-100 border-t border-base-200" style={{ zIndex: 50 }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <button
            onClick={handleRequestCare}
            className="w-full py-4 rounded-2xl text-white font-bold text-base"
            style={{ background: 'linear-gradient(135deg, #7C5CFF, #4A90E2)', boxShadow: '0 4px 20px rgba(124,92,255,0.35)' }}
          >
            Request Care from {firstName}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PublicProfileView
