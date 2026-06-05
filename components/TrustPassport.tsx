// @ts-nocheck
// Phase 8 — Full Modular Trust Passport Engine wired in
import React, { useMemo } from 'react'
import {
  Shield, ChevronLeft, CheckCircle2, Clock, Star,
  User, Phone, Camera, Heart, Users, Award, ShieldCheck, Briefcase, FileText,
  TrendingUp,
} from 'lucide-react'
import { CaregiverDocument } from '../types'
import {
  getTrustPassportSummary,
  TrustPassportModule,
  ModuleType,
} from '../utils/trustEngine'

// ─── Module icon map ──────────────────────────────────────────────────────
const MODULE_ICONS: Record<ModuleType, React.FC<any>> = {
  basic_profile:         User,
  contact_verification:  Phone,
  selfie_intro:          Camera,
  care_experience:       Heart,
  references:            Users,
  certifications:        Award,
  background_permission: ShieldCheck,
  carehia_review:        Star,
  work_history:          Briefcase,
  manual_proof:          FileText,
}

// ─── Status badge styles ──────────────────────────────────────────────────
const STATUS_CLASS: Record<string, string> = {
  'Verified':          'bg-success/10 text-success',
  'In Progress':       'bg-warning/10 text-warning',
  'Submitted':         'bg-primary/10 text-primary',
  'Needs a Quick Fix': 'bg-error/10 text-error',
  'Not Started':       'bg-base-300/60 text-base-content/45',
  'Expired':           'bg-error/10 text-error',
}

// ─── Level color map ──────────────────────────────────────────────────────
const LEVEL_COLORS: Record<number, { pill: string; bar: string; text: string }> = {
  1: { pill: 'bg-warning/10 text-warning',   bar: 'bg-warning',  text: 'text-warning'  },
  2: { pill: 'bg-success/10 text-success',   bar: 'bg-success',  text: 'text-success'  },
  3: { pill: 'bg-secondary/10 text-secondary', bar: 'bg-secondary', text: 'text-secondary' },
  4: { pill: 'bg-primary/10 text-primary',   bar: 'bg-primary',  text: 'text-primary'  },
  5: { pill: 'bg-primary/20 text-primary',   bar: 'bg-primary',  text: 'text-primary'  },
}

interface TrustPassportProps {
  profile: any
  documents: CaregiverDocument[]
  onClose: () => void
  onOpenDocUpload?: () => void
}

export const TrustPassport: React.FC<TrustPassportProps> = ({
  profile,
  documents,
  onClose,
  onOpenDocUpload,
}) => {
  const summary = useMemo(
    () => getTrustPassportSummary(profile, documents),
    [profile, documents],
  )

  const {
    trustLevel,
    trustLevelName,
    trustScore,
    completionPercentage,
    nextRecommendedStep,
    nextRecommendedModule,
    nextUnlock,
    nextActionExplanation,
    publicBadges,
    modules,
  } = summary

  const lc = LEVEL_COLORS[trustLevel] || LEVEL_COLORS[1]

  // Modules ordered for display: core 9 first, manual_proof last
  const coreModules = modules.filter(m => m.moduleType !== 'manual_proof')
  const manualMod   = modules.find(m => m.moduleType === 'manual_proof')

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
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(124,92,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} style={{ color: 'var(--color-primary, #7C5CFF)' }} />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '16px 16px 80px' }}>

        {/* ── Hero block ── */}
        <div
          className="rounded-2xl border border-primary/20 p-5 mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.07) 0%, rgba(74,144,226,0.07) 100%)' }}
        >
          {/* Level + score row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/12 flex items-center justify-center">
                <Shield size={26} className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary/60 mb-0.5">Trust Level</p>
                <p className={`text-base font-extrabold leading-tight ${lc.text}`}>
                  Level {trustLevel}: {trustLevelName}
                </p>
                <span className={`inline-block text-[10px] font-bold rounded-full px-2 py-0.5 mt-1 ${lc.pill}`}>
                  {trustLevelName}
                </span>
              </div>
            </div>
            {/* Trust score pill */}
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-base-content/40">Trust Score</p>
              <p className="text-2xl font-black text-primary leading-tight">{trustScore}</p>
              <p className="text-[10px] text-base-content/35">/ 100</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 rounded-full bg-base-200 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${lc.bar}`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-base-content">{completionPercentage}% complete</p>
            <p className="text-xs text-base-content/50">
              {modules.filter(m => ['Verified', 'Submitted'].includes(m.status)).length} of {modules.filter(m => m.moduleType !== 'manual_proof').length} steps
            </p>
          </div>

          {/* Level ladder */}
          <div className="flex items-center gap-0.5 mb-3">
            {[1,2,3,4,5].map(lvl => (
              <div
                key={lvl}
                className={`flex-1 h-1.5 rounded-full transition-all ${lvl <= trustLevel ? lc.bar : 'bg-base-200'}`}
              />
            ))}
          </div>

          <p className="text-xs text-base-content/55 leading-relaxed">
            Build trust one step at a time. Your Trust Passport helps families feel confident choosing you.
          </p>
        </div>

        {/* ── Next recommended step ── */}
        <div className="rounded-2xl bg-primary/5 border border-primary/12 p-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary/60 mb-1">Recommended Next Step</p>
          <p className="text-sm font-bold text-base-content">{nextRecommendedStep}</p>
          <p className="text-xs text-base-content/55 mt-0.5 leading-snug">{nextActionExplanation}</p>
          <div className="flex items-start gap-1.5 mt-2 p-2 rounded-xl bg-primary/5">
            <TrendingUp size={12} className="text-primary/60 mt-0.5 shrink-0" />
            <p className="text-[11px] text-primary/70 font-medium leading-snug">Unlock: {nextUnlock}</p>
          </div>
        </div>

        {/* ── Earned public badges ── */}
        {publicBadges.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-base-content/45 mb-2 px-0.5">Badges Earned</p>
            <div className="flex flex-wrap gap-2">
              {publicBadges.map(badge => (
                <div
                  key={badge}
                  className="flex items-center gap-1.5 bg-success/10 border border-success/20 rounded-full px-3 py-1.5"
                >
                  <CheckCircle2 size={12} className="text-success" />
                  <span className="text-xs font-bold text-success">{badge}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Trust Modules ── */}
        <p className="text-[10px] font-bold uppercase tracking-wide text-base-content/45 mb-2 px-0.5">Trust Modules</p>
        <div className="space-y-2.5">
          {coreModules.map(mod => {
            const Icon = MODULE_ICONS[mod.moduleType] || FileText
            const isDone = ['Verified', 'Submitted'].includes(mod.status)
            const statusClass = STATUS_CLASS[mod.status] || STATUS_CLASS['Not Started']

            return (
              <div key={mod.moduleType} className="rounded-2xl bg-base-100 border border-base-300/60 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-success/10' : 'bg-primary/10'}`}>
                    {isDone
                      ? <CheckCircle2 size={19} className="text-success" />
                      : <Icon size={19} className="text-primary/60" />
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
                      {mod.unlockMessage && (
                        <div className="flex items-center gap-1 min-w-0">
                          <Star size={10} className="text-primary/35 shrink-0" />
                          <span className="text-[11px] text-base-content/35 truncate">{mod.unlockMessage}</span>
                        </div>
                      )}
                    </div>
                    {/* Module progress bar (if in progress) */}
                    {mod.status === 'In Progress' && mod.completionPercentage > 0 && (
                      <div className="mt-2 h-1 rounded-full bg-base-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-warning transition-all"
                          style={{ width: `${mod.completionPercentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action row */}
                {!isDone && (
                  <div className="mt-3">
                    {mod.comingSoon ? (
                      <p className="text-xs text-base-content/35 text-center font-medium py-1">Coming soon</p>
                    ) : (
                      <button
                        onClick={mod.moduleType === 'manual_proof' ? onOpenDocUpload : undefined}
                        className="btn btn-outline btn-sm w-full rounded-2xl border-primary/20 text-primary hover:bg-primary/5"
                      >
                        {mod.nextAction}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Manual Proof fallback ── */}
        {manualMod && (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-base-content/45 mb-2 px-0.5">Manual Proof</p>
            <div className="rounded-2xl bg-base-100 border border-base-300/60 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${['Submitted','Verified'].includes(manualMod.status) ? 'bg-success/10' : 'bg-primary/10'}`}>
                  {['Submitted','Verified'].includes(manualMod.status)
                    ? <CheckCircle2 size={19} className="text-success" />
                    : <FileText size={19} className="text-primary/60" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-base-content">{manualMod.title}</p>
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 ${STATUS_CLASS[manualMod.status] || ''}`}>
                      {manualMod.status}
                    </span>
                  </div>
                  <p className="text-xs text-base-content/50 mt-0.5 leading-snug">{manualMod.description}</p>
                </div>
              </div>
              <div className="mt-3">
                <button
                  onClick={onOpenDocUpload}
                  className="btn btn-outline btn-sm w-full rounded-2xl border-primary/20 text-primary hover:bg-primary/5"
                >
                  Upload Document
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
