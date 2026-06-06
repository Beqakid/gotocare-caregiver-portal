// @ts-nocheck
// Phase 8 — Full Modular Trust Passport Engine wired in
// Phase 11 — Work History Trust module live metrics (additive)
import React, { useEffect, useMemo, useState } from 'react'
import {
  Shield, ChevronLeft, CheckCircle2, Clock, Star,
  User, Phone, Camera, Heart, Users, Award, ShieldCheck, Briefcase, FileText,
  TrendingUp, Trophy,
} from 'lucide-react'
import { CaregiverDocument } from '../types'
import {
  getTrustPassportSummary,
  TrustPassportModule,
  ModuleType,
  WorkHistoryData,
  computeTrustedProEligibility,
} from '../utils/trustEngine'

const ADMIN_API = 'https://carehia-admin.jjioji.workers.dev'

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
  5: { pill: 'bg-warning/20 text-amber-700', bar: 'bg-amber-400', text: 'text-amber-700' },
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
  // Phase 11: fetch work history data
  const [workData, setWorkData] = useState<WorkHistoryData | null>(null)
  // Phase 16: inline module action messages (additive)
  const [moduleInfo, setModuleInfo] = useState<string | null>(null)
  useEffect(() => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    fetch(`${ADMIN_API}/work-history-trust?token=${encodeURIComponent(token)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setWorkData(d) })
      .catch(() => {})
  }, [])

  const summary = useMemo(
    () => getTrustPassportSummary(profile, documents, workData || undefined),
    [profile, documents, workData],
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


  // Phase 16: Route each module button to a meaningful action or friendly message
  const handleModuleAction = (mod: TrustPassportModule) => {
    const showMsg = (msg: string, closeAfter?: number) => {
      setModuleInfo(msg)
      if (closeAfter) setTimeout(() => { setModuleInfo(null); onClose() }, closeAfter)
      else setTimeout(() => setModuleInfo(null), 5000)
    }
    switch (mod.moduleType) {
      case 'manual_proof':
      case 'certifications':
        // Upload flow — handled by parent
        onOpenDocUpload?.()
        break
      case 'basic_profile':
      case 'selfie_intro':
        showMsg('Closing Trust Passport… Edit your photo, bio, and rate in the Profile tab.', 1600)
        break
      case 'contact_verification':
        showMsg('Email and phone verification happen during account setup. Additional options are coming soon.')
        break
      case 'care_experience':
        showMsg('Closing Trust Passport… Edit your care specialties in the Work tab.', 1600)
        break
      case 'work_history':
        showMsg('Your work record grows as you complete care visits through Carehia. Check the Work tab to track time and accept bookings.')
        break
      case 'background_permission':
        showMsg('Background check integration is coming soon. Carehia will never start this step without your permission.')
        break
      default:
        onOpenDocUpload?.()
    }
  }

  const lc = LEVEL_COLORS[trustLevel] || LEVEL_COLORS[1]

  // Modules ordered for display: core 9 first, manual_proof last
  const coreModules = modules.filter(m => m.moduleType !== 'manual_proof')
  const manualMod   = modules.find(m => m.moduleType === 'manual_proof')

  // Phase 11: Trusted Pro eligibility for progress display
  const trustedPro = workData ? computeTrustedProEligibility(workData) : null

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

      {/* Phase 16: Module action info banner */}
      {moduleInfo && (
        <div style={{
          position: 'sticky', top: 67, zIndex: 3,
          background: 'rgba(124,92,255,0.92)', backdropFilter: 'blur(8px)',
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 13, color: '#fff', flex: 1, lineHeight: 1.4 }}>{moduleInfo}</span>
          <button
            onClick={() => setModuleInfo(null)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >✕</button>
        </div>
      )}

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

        {/* ── Phase 11: Trusted Pro progress block ── */}
        {trustedPro && !trustedPro.eligible && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={16} className="text-amber-600" />
              <p className="text-sm font-bold text-amber-800">
                {trustedPro.nearly ? 'Almost Trusted Pro!' : 'Build Trusted Pro Status'}
              </p>
            </div>
            <p className="text-xs text-amber-700 leading-snug mb-3">{trustedPro.encouragementCopy}</p>

            {/* Requirements grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Completed visits', current: trustedPro.completedVisits, target: 10, met: trustedPro.completedVisits >= 10 },
                { label: 'Avg rating', current: trustedPro.avgRating != null ? `${trustedPro.avgRating}★` : 'None yet', target: '4.7★', met: trustedPro.avgRating != null && trustedPro.avgRating >= 4.7 },
                { label: 'Client reviews', current: trustedPro.reviewCount, target: 3, met: trustedPro.reviewCount >= 3 },
                { label: 'Repeat client / paid invoices', current: `${trustedPro.repeatClients}R · ${trustedPro.paidInvoices}inv`, target: '1R or 3inv', met: trustedPro.repeatClients >= 1 || trustedPro.paidInvoices >= 3 },
              ].map((req, i) => (
                <div key={i} className={`rounded-xl p-2.5 ${req.met ? 'bg-green-50 border border-green-100' : 'bg-white border border-amber-100'}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    {req.met
                      ? <CheckCircle2 size={11} className="text-green-500 shrink-0" />
                      : <div className="w-3 h-3 rounded-full border-2 border-amber-300 shrink-0" />
                    }
                    <p className={`text-[10px] font-bold ${req.met ? 'text-green-700' : 'text-amber-700'}`}>{req.label}</p>
                  </div>
                  <p className={`text-xs font-black ${req.met ? 'text-green-800' : 'text-amber-800'}`}>{req.current}</p>
                  {!req.met && <p className="text-[10px] text-amber-500">Goal: {req.target}</p>}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-amber-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${(trustedPro.metRequirements / trustedPro.totalRequirements) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-amber-700">{trustedPro.metRequirements}/{trustedPro.totalRequirements} met</span>
            </div>
          </div>
        )}

        {/* Trusted Pro earned banner */}
        {trustedPro?.eligible && (
          <div className="rounded-2xl border border-amber-300 p-4 mb-4" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/30 flex items-center justify-center">
                <Trophy size={22} className="text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-amber-800">Trusted Pro Earned!</p>
                <p className="text-xs text-amber-700 mt-0.5">Great work — your care history is strengthening your Trust Passport.</p>
              </div>
            </div>
          </div>
        )}

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
            const isWorkHistory = mod.moduleType === 'work_history'
            const isBetaModule = ['background_permission', 'references'].includes(mod.moduleType)
            const betaLabel = mod.moduleType === 'background_permission' ? '🔧 Provider Integration Pending' : '⚗️ Beta — Coming Soon'
            const betaNote = mod.moduleType === 'background_permission'
              ? 'Background check integration is coming soon. Carehia will not start this step without your permission.'
              : 'Reference checks are coming soon. Carehia may review references manually during beta.'
            const wMeta = isWorkHistory && mod.metadata ? mod.metadata : null

            return (
              <div key={mod.moduleType} className="rounded-2xl bg-base-100 border border-base-300/60 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-success/10' : isWorkHistory ? 'bg-amber-50' : 'bg-primary/10'}`}>
                    {isDone
                      ? <CheckCircle2 size={19} className="text-success" />
                      : isWorkHistory
                        ? <Briefcase size={19} className="text-amber-500" />
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
                    {isBetaModule && (
                      <div style={{ background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, padding: '6px 10px', marginTop: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#F59E0B', color: '#fff', borderRadius: 10, padding: '1px 7px', letterSpacing: '.4px', marginRight: 6 }}>BETA</span>
                        <span style={{ fontSize: 11, color: '#92400E' }}>{betaLabel}</span>
                        <p style={{ fontSize: 10, color: '#92400E', marginTop: 3, lineHeight: 1.4 }}>{betaNote}</p>
                      </div>
                    )}
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

                {/* ── Phase 11: Work History metrics panel ── */}
                {isWorkHistory && wMeta && (
                  <div className="mt-3 pt-3 border-t border-base-200">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-base-content/40 mb-2">Your Work Record</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-primary/5 p-2.5 text-center">
                        <p className="text-lg font-black text-primary leading-none">{wMeta.completedVisits ?? 0}</p>
                        <p className="text-[10px] text-base-content/50 mt-0.5">Visits</p>
                      </div>
                      <div className="rounded-xl bg-primary/5 p-2.5 text-center">
                        <p className="text-lg font-black text-primary leading-none">
                          {wMeta.avgRating != null ? `${wMeta.avgRating}★` : '—'}
                        </p>
                        <p className="text-[10px] text-base-content/50 mt-0.5">Avg Rating</p>
                      </div>
                      <div className="rounded-xl bg-primary/5 p-2.5 text-center">
                        <p className="text-lg font-black text-primary leading-none">{wMeta.reviewCount ?? 0}</p>
                        <p className="text-[10px] text-base-content/50 mt-0.5">Reviews</p>
                      </div>
                      <div className="rounded-xl bg-primary/5 p-2.5 text-center">
                        <p className="text-lg font-black text-primary leading-none">{wMeta.repeatClients ?? 0}</p>
                        <p className="text-[10px] text-base-content/50 mt-0.5">Repeat</p>
                      </div>
                      <div className="rounded-xl bg-primary/5 p-2.5 text-center">
                        <p className="text-lg font-black text-primary leading-none">{wMeta.paidInvoices ?? 0}</p>
                        <p className="text-[10px] text-base-content/50 mt-0.5">Paid inv.</p>
                      </div>
                      <div className="rounded-xl bg-primary/5 p-2.5 text-center">
                        <p className="text-lg font-black text-primary leading-none">{wMeta.activeCertifications ?? 0}</p>
                        <p className="text-[10px] text-base-content/50 mt-0.5">Certs</p>
                      </div>
                    </div>
                    {/* Encouragement copy */}
                    {wMeta.completedVisits === 0 ? (
                      <p className="text-[11px] text-base-content/50 text-center mt-2 leading-snug">
                        Complete care visits through Carehia to build your work record.
                      </p>
                    ) : !wMeta.isTrustedProEligible ? (
                      <p className="text-[11px] text-primary/60 text-center mt-2 leading-snug font-medium">
                        Keep certifications active to maintain your trust badges. Repeat clients help your profile stand out.
                      </p>
                    ) : (
                      <p className="text-[11px] text-success text-center mt-2 leading-snug font-bold">
                        All Trusted Pro requirements met!
                      </p>
                    )}
                  </div>
                )}

                {/* Work history — placeholder when no data yet */}
                {isWorkHistory && !wMeta && !workData && (
                  <div className="mt-3 pt-3 border-t border-base-200">
                    <p className="text-[11px] text-base-content/40 text-center leading-snug">
                      Your trust grows as you complete care work through Carehia. Track time or accept a booking to start building your record.
                    </p>
                  </div>
                )}

                {/* Action row */}
                {!isDone && (
                  <div className="mt-3">
                    {mod.comingSoon ? (
                      isWorkHistory && workData ? (
                        <p className="text-xs text-base-content/35 text-center font-medium py-1">{wMeta?.isTrustedProEligible ? 'Trusted Pro requirements met — pending admin activation' : 'Earned through completing care visits'}</p>
                      ) : (
                        <p className="text-xs text-base-content/35 text-center font-medium py-1">Coming soon</p>
                      )
                    ) : (
                      <button
                        onClick={() => handleModuleAction(mod)}
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
