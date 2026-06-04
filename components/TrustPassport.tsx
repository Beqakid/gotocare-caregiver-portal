// @ts-nocheck
import React, { useMemo } from 'react'
import {
  Shield, ChevronLeft, CheckCircle2, Clock, Star,
  User, Phone, Camera, Heart, Users, Award, ShieldCheck, Briefcase, FileText,
} from 'lucide-react'
import { CaregiverDocument } from '../types'

type ModuleStatus = 'Verified' | 'In Progress' | 'Submitted' | 'Needs a Quick Fix' | 'Not Started' | 'Expired'

interface Module {
  id: string
  title: string
  description: string
  status: ModuleStatus
  estimatedTime: string
  unlock: string
  Icon: React.FC<any>
  action: string
  comingSoon?: boolean
}

interface TrustPassportProps {
  profile: any
  documents: CaregiverDocument[]
  onClose: () => void
  onOpenDocUpload?: () => void
}

function deriveModules(profile: any, documents: CaregiverDocument[]): Module[] {
  const docs = documents || []
  const now = new Date()

  const hasName = !!(profile?.firstName && profile?.lastName)
  const hasBio = !!(profile?.bio && String(profile.bio).length > 20)
  const hasPhoto = !!profile?.photoUrl
  const hasRate = !!profile?.hourlyRate
  const hasLocation = !!(profile?.location?.city || profile?.zipCode)
  const basicDone = hasName && hasBio && hasPhoto && hasRate && hasLocation

  const emailVerified = !!(profile?.emailVerified || profile?.email_verified)

  const hasSkills = !!(
    (Array.isArray(profile?.skills) && profile.skills.length > 0) ||
    (Array.isArray(profile?.careTypes) && profile.careTypes.length > 0) ||
    (typeof profile?.care_types === 'string' && profile.care_types.length > 0)
  )

  const certDocs = docs.filter(d => d.type === 'certification')
  const hasExpired = certDocs.some(d => d.expirationDate && new Date(d.expirationDate) < now)
  const certStatus: ModuleStatus = certDocs.length > 0 ? (hasExpired ? 'Expired' : 'Submitted') : 'Not Started'

  const manualDocs = docs.filter(d => d.type !== 'certification')
  const manualStatus: ModuleStatus = manualDocs.length > 0 ? 'Submitted' : 'Not Started'

  return [
    {
      id: 'basic_profile',
      title: 'Basic Profile',
      description: 'Name, photo, hourly rate, location, and a short bio.',
      status: basicDone ? 'Verified' : (hasBio || hasPhoto || hasRate) ? 'In Progress' : 'Not Started',
      estimatedTime: '5 min',
      unlock: 'Appear in caregiver search results',
      Icon: User,
      action: 'Complete Profile',
    },
    {
      id: 'contact_verification',
      title: 'Contact Verification',
      description: 'Confirm your email address so families know you are reachable.',
      status: emailVerified ? 'Verified' : 'In Progress',
      estimatedTime: '2 min',
      unlock: 'Builds client confidence in your contact info',
      Icon: Phone,
      action: 'Verify Email',
    },
    {
      id: 'selfie_intro',
      title: 'Selfie & Intro',
      description: 'A clear profile photo and a brief written greeting.',
      status: hasPhoto ? 'In Progress' : 'Not Started',
      estimatedTime: '3 min',
      unlock: '3x more profile views',
      Icon: Camera,
      action: 'Add Photo',
    },
    {
      id: 'care_experience',
      title: 'Care Experience',
      description: 'Care types, skills, and what you specialise in.',
      status: hasSkills ? 'Verified' : 'Not Started',
      estimatedTime: '5 min',
      unlock: 'Match with the right families',
      Icon: Heart,
      action: 'Add Skills',
    },
    {
      id: 'references',
      title: 'References',
      description: 'Professional or personal contacts who can vouch for your care work.',
      status: 'Not Started',
      estimatedTime: '5 min',
      unlock: 'Trusted Caregiver badge',
      Icon: Users,
      action: 'Add References',
      comingSoon: true,
    },
    {
      id: 'certifications',
      title: 'Certifications & Skills',
      description: 'CPR, First Aid, CNA, or other credentials.',
      status: certStatus,
      estimatedTime: '5 min',
      unlock: 'Certified badge on your profile',
      Icon: Award,
      action: 'Add Certifications',
    },
    {
      id: 'background_check',
      title: 'Background Check Permission',
      description: 'Authorise a basic background check to unlock full platform access.',
      status: 'Not Started',
      estimatedTime: '2 min',
      unlock: 'Background Checked badge + premium matches',
      Icon: ShieldCheck,
      action: 'Coming Soon',
      comingSoon: true,
    },
    {
      id: 'carehia_review',
      title: 'Carehia Review',
      description: 'Our team does a quick manual review of your profile.',
      status: 'Not Started',
      estimatedTime: '24–48 hrs',
      unlock: 'Carehia Verified badge',
      Icon: Star,
      action: 'Learn More',
      comingSoon: true,
    },
    {
      id: 'work_history',
      title: 'Work History Trust',
      description: 'Past employers or agencies that can confirm your experience.',
      status: 'Not Started',
      estimatedTime: '10 min',
      unlock: 'Experienced Caregiver badge',
      Icon: Briefcase,
      action: 'Add Work History',
      comingSoon: true,
    },
    {
      id: 'manual_proof',
      title: 'Manual Proof',
      description: 'Having trouble verifying a step? You can upload proof manually.',
      status: manualStatus,
      estimatedTime: '5 min',
      unlock: 'Bypass automated checks with manual team review',
      Icon: FileText,
      action: 'Upload Document',
    },
  ]
}

function getTrustLevel(progress: number): { level: number; name: string; colorClass: string } {
  if (progress >= 80) return { level: 4, name: 'Verified Pro', colorClass: 'text-success' }
  if (progress >= 60) return { level: 3, name: 'Established', colorClass: 'text-primary' }
  if (progress >= 30) return { level: 2, name: 'Building Trust', colorClass: 'text-warning' }
  return { level: 1, name: 'Getting Started', colorClass: 'text-base-content/55' }
}

const STATUS_CLASS: Record<ModuleStatus, string> = {
  'Verified':          'bg-success/10 text-success',
  'In Progress':       'bg-warning/10 text-warning',
  'Submitted':         'bg-primary/10 text-primary',
  'Needs a Quick Fix': 'bg-error/10 text-error',
  'Not Started':       'bg-base-300/60 text-base-content/45',
  'Expired':           'bg-error/10 text-error',
}

export const TrustPassport: React.FC<TrustPassportProps> = ({ profile, documents, onClose, onOpenDocUpload }) => {
  const modules = useMemo(() => deriveModules(profile, documents), [profile, documents])

  const doneCount = modules.filter(m => m.status === 'Verified' || m.status === 'Submitted').length
  const progress  = Math.round((doneCount / modules.length) * 100)
  const { level, name: levelName, colorClass } = getTrustLevel(progress)
  const nextModule  = modules.find(m => m.status !== 'Verified' && m.status !== 'Submitted')
  const earnedBadges = modules.filter(m => m.status === 'Verified')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      background: 'var(--color-base-100, #F0F4FF)',
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 2,
        background: 'var(--color-base-100, #F0F4FF)',
        borderBottom: '1px solid rgba(124,92,255,0.12)',
        padding: '14px 16px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 512, margin: '0 auto' }}>
          <button
            onClick={onClose}
            aria-label="Back"
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(124,92,255,0.08)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} style={{ color: 'var(--color-primary, #7C5CFF)' }} />
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-primary, #7C5CFF)', marginBottom: 1 }}>Carehia</p>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary, #0F172A)', margin: 0, lineHeight: 1.2 }}>Trust Passport</h1>
          </div>
          {/* Shield icon top-right */}
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(124,92,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} style={{ color: 'var(--color-primary, #7C5CFF)' }} />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '16px 16px 80px' }}>

        {/* Hero block */}
        <div className="rounded-2xl border border-primary/20 p-5 mb-4" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.07) 0%, rgba(74,144,226,0.07) 100%)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/12 flex items-center justify-center">
              <Shield size={26} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary/60">Trust Level</p>
              <p className={`text-base font-extrabold leading-tight ${colorClass}`}>Level {level}: {levelName}</p>
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-base-200 overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-base-content">{progress}% complete</p>
            <p className="text-xs text-base-content/50">{doneCount} of {modules.length} steps</p>
          </div>
          <p className="text-xs text-base-content/55 leading-relaxed">
            Build trust one step at a time. Your Trust Passport helps families feel confident choosing you. You do not need to finish everything today.
          </p>
        </div>

        {/* Next recommended step */}
        {nextModule && (
          <div className="rounded-2xl bg-primary/5 border border-primary/12 p-4 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary/60 mb-1">Recommended Next Step</p>
            <p className="text-sm font-bold text-base-content">{nextModule.title}</p>
            <p className="text-xs text-base-content/50 mt-0.5">Unlock: {nextModule.unlock}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock size={11} className="text-base-content/35" />
              <span className="text-[11px] text-base-content/40">~{nextModule.estimatedTime}</span>
            </div>
          </div>
        )}

        {/* Earned badges */}
        {earnedBadges.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-base-content/45 mb-2 px-0.5">Badges Earned</p>
            <div className="flex flex-wrap gap-2">
              {earnedBadges.map(b => (
                <div key={b.id} className="flex items-center gap-1.5 bg-success/10 border border-success/20 rounded-full px-3 py-1.5">
                  <CheckCircle2 size={12} className="text-success" />
                  <span className="text-xs font-bold text-success">{b.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module cards */}
        <p className="text-[10px] font-bold uppercase tracking-wide text-base-content/45 mb-2 px-0.5">Trust Modules</p>
        <div className="space-y-2.5">
          {modules.map(mod => {
            const { Icon } = mod
            const isDone = mod.status === 'Verified' || mod.status === 'Submitted'
            const statusClass = STATUS_CLASS[mod.status]

            return (
              <div key={mod.id} className="rounded-2xl bg-base-100 border border-base-300/60 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-success/10' : 'bg-primary/8'}`}>
                    {isDone
                      ? <CheckCircle2 size={19} className="text-success" />
                      : <Icon size={19} className="text-primary/65" />
                    }
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-base-content leading-snug">{mod.title}</p>
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap ${statusClass}`}>
                        {mod.status}
                      </span>
                    </div>
                    <p className="text-xs text-base-content/50 mt-0.5 leading-snug">{mod.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-base-content/30" />
                        <span className="text-[11px] text-base-content/35">{mod.estimatedTime}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <Star size={10} className="text-primary/35 shrink-0" />
                        <span className="text-[11px] text-base-content/35 truncate">{mod.unlock}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action row */}
                {!isDone && (
                  <div className="mt-3">
                    {mod.comingSoon ? (
                      <p className="text-xs text-base-content/35 text-center font-medium py-1">Coming soon</p>
                    ) : (
                      <button
                        onClick={mod.id === 'manual_proof' ? onOpenDocUpload : undefined}
                        className="btn btn-outline btn-sm w-full rounded-2xl border-primary/20 text-primary hover:bg-primary/5"
                      >
                        {mod.action}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Manual Proof callout (standalone) */}
        <div className="rounded-2xl bg-base-200 border border-base-300/60 p-4 mt-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText size={19} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-base-content">Manual Proof</p>
              <p className="text-xs text-base-content/50 mt-1 leading-relaxed">
                Having trouble verifying a step? You can upload proof manually and our team will review it within 24–48 hours.
              </p>
              <button
                onClick={onOpenDocUpload}
                className="btn btn-outline btn-sm rounded-2xl border-primary/20 text-primary mt-3 hover:bg-primary/5"
              >
                Upload Proof
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
