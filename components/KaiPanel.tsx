// @ts-nocheck
// Phase 24C: Kai Guided Assistant Panel — Context Engine + Next Best Action + Guided Walkthroughs
import React, { useState, useEffect, useMemo } from 'react'
import { CaregiverProfile, CaregiverDocument } from '../types'
import { buildCaregiverContext, getCaregiverNextBestAction, getContextBasedQuickActions, getCaregiverNBACandidates, SAFE_FALLBACK_NBA } from '../utils/kaiContext'
import type { CaregiverKaiContext, KaiQuickAction, KaiNBACandidate } from '../utils/kaiContext'
import { walkthroughs, walkthroughMap, getWalkthrough } from '../utils/kaiWalkthroughs'
import type { KaiWalkthrough, KaiWalkthroughStep } from '../utils/kaiWalkthroughs'
import { PhoneVerificationPanel } from './PhoneVerificationPanel'
import { carehiaKaiAdapter } from '../utils/kaiFoundationAdapter'
import type { KaiPolicyDecision, CarehiaKaiAdapterContext } from '../utils/kaiFoundationTypes'

// ── Phase 25E: Confirmation Types ────────────────────────────────────────
type KaiConfirmationSource = 'nba' | 'quick_action' | 'walkthrough' | 'step_cta'

interface KaiPendingConfirmation {
  actionId: string
  foundationActionId: string
  label: string
  description?: string
  riskLevel: string
  policyDecision: KaiPolicyDecision
  source: KaiConfirmationSource
  originalHandler: () => void
  createdAt: number
}

interface KaiConfirmationReceipt {
  actionId: string
  label: string
  riskLevel: string
  source: KaiConfirmationSource
  confirmed: boolean
  timestamp: number
  policyReason?: string
  userId?: string
}

// In-memory confirmation receipt log (Phase 25E stub — not persisted)
const confirmationReceipts: KaiConfirmationReceipt[] = []

function logConfirmationReceipt(receipt: KaiConfirmationReceipt): void {
  confirmationReceipts.push(receipt)
  console.debug('[Kai Foundation 25E] Confirmation receipt:', receipt.confirmed ? 'CONFIRMED' : 'CANCELLED', receipt)
}

// Export for testing only
export function _getConfirmationReceipts(): KaiConfirmationReceipt[] {
  return confirmationReceipts
}

export function _clearConfirmationReceipts(): void {
  confirmationReceipts.length = 0
}

// ── Phase 25E: Confirmation Dialog ───────────────────────────────────────
function KaiConfirmationDialog({ pending, onContinue, onCancel }: {
  pending: KaiPendingConfirmation
  onContinue: () => void
  onCancel: () => void
}) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 20,
    }} onClick={(e) => { e.stopPropagation(); onCancel() }}>
      <div
        data-testid="kai-confirmation-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 18, padding: '24px 20px 20px',
          maxWidth: 340, width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
          <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            Confirm this action
          </h3>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#334155' }}>
            {pending.label}
          </p>
        </div>
        <p style={{
          margin: '0 0 12px', fontSize: 13, color: '#475569',
          lineHeight: '1.55', textAlign: 'center',
        }}>
          Kai can help you continue, but this action may affect your profile, work visibility, invoice, or account information. Please confirm before continuing.
        </p>
        {pending.policyDecision.reason && (
          <p style={{
            margin: '0 0 16px', fontSize: 12, color: '#64748b',
            fontStyle: 'italic', textAlign: 'center', lineHeight: '1.45',
          }}>
            {pending.policyDecision.reason}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            data-testid="kai-confirm-cancel"
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px 0', border: '1px solid #e2e8f0',
              borderRadius: 12, background: '#f8fafc', color: '#475569',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            data-testid="kai-confirm-continue"
            onClick={onContinue}
            style={{
              flex: 1, padding: '12px 0', border: 'none',
              borderRadius: 12, background: '#7C5CFF', color: '#FFFFFF',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Phase 25C: Foundation Core Wiring ────────────────────────────────────
// Maps KaiPanel action IDs (quick actions, NBA, walkthroughs) to Foundation registry IDs.
// This lets KaiPanel consult the Foundation policy evaluator before acting.
const PANEL_TO_FOUNDATION: Record<string, string> = {
  // Quick action IDs
  'profile': 'open_profile',
  'trust': 'open_trust_passport',
  'phone': 'verify_phone',
  'availability': 'set_availability',
  'service-area': 'set_service_area',
  'timer': 'open_time_tracker',
  'invoice': 'create_invoice_draft',
  'share': 'share_profile_link',
  'support': 'contact_support',
  // NBA IDs
  'account-attention': 'contact_support',
  'finish-onboarding': 'open_today',
  'verify-phone': 'verify_phone',
  'verify-email': 'open_profile',
  'complete-profile': 'open_profile',
  'start-trust-passport': 'open_trust_passport',
  'set-service-area': 'set_service_area',
  'set-availability': 'set_availability',
  'active-timer': 'open_time_tracker',
  'create-invoice': 'create_invoice_draft',
  'add-first-client': 'open_work',
  'public-profile': 'open_profile',
  'review-today': 'open_today',
  // Step CTA navigation IDs
  'earnings': 'open_money',
  'work': 'open_work',
  'home': 'open_today',
  // Walkthrough IDs (unique ones)
  'trust-passport': 'open_trust_passport',
  'phone-verification': 'verify_phone',
  'time-tracking': 'open_time_tracker',
  'invoice-money': 'create_invoice_draft',
}

/** Build a Foundation adapter context from the existing Carehia Kai context */
function buildFoundationContext(context: CaregiverKaiContext): CarehiaKaiAdapterContext {
  return {
    accountStatus: context.accountStatus,
    phoneVerified: context.phoneVerified,
    emailVerified: context.emailVerified,
    onboardingComplete: context.onboardingComplete,
    setupComplete: context.setupComplete,
    trustPassportPercent: context.trustPassportPercent,
  }
}

/** Evaluate a KaiPanel action through the Foundation policy evaluator */
function evaluatePanelAction(panelId: string, adapterCtx: CarehiaKaiAdapterContext): KaiPolicyDecision {
  const foundationId = PANEL_TO_FOUNDATION[panelId] || panelId
  return carehiaKaiAdapter.evaluateAction(foundationId, adapterCtx)
}

interface KaiPanelProps {
  profile: CaregiverProfile | null
  documents: CaregiverDocument[]
  onClose: () => void
  onNavigateToProfile: () => void
  onNavigateToTrust: () => void
  onNavigateToEarnings: () => void
  onNavigateToWork: () => void
  onNavigateToSchedule: () => void
  onNavigateToHome: () => void
  onNavigateToSection: (section: string, scrollTo: string) => void
}

// ── Mini Circular Progress ───────────────────────────────────────────────
function MiniProgress({ percent, size = 32, strokeWidth = 3, color = '#7C5CFF' }: {
  percent: number; size?: number; strokeWidth?: number; color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(Math.max(percent, 0), 100) / 100) * circumference
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="rgba(124,92,255,0.12)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
    </svg>
  )
}

// ── Status Summary Grid ─────────────────────────────────────────────────
function StatusSummary({ context }: { context: CaregiverKaiContext }) {
  const profilePct = context.profileCompletePercent ?? 0
  const trustPct = context.trustPassportPercent ?? 0
  const phoneOk = context.phoneVerified ?? false
  const uninvoicedHrs = context.uninvoicedHours ?? 0

  const outerStyle: React.CSSProperties = {
    background: 'rgba(124,92,255,0.04)',
    border: '1px solid rgba(124,92,255,0.08)',
    borderRadius: 14,
    padding: 10,
    margin: '0 0 4px',
  }

  const cellStyle: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 500,
    margin: 0,
    lineHeight: 1.3,
  }

  const valueStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.2,
  }

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={outerStyle}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', paddingLeft: 2 }}>
          Your status
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Profile */}
          <div style={cellStyle}>
            <MiniProgress percent={profilePct} size={34} color="#7C5CFF" />
            <div>
              <p style={{ ...valueStyle, color: '#0f172a' }}>{profilePct}%</p>
              <p style={labelStyle}>Profile</p>
            </div>
          </div>

          {/* Trust */}
          <div style={cellStyle}>
            <MiniProgress percent={trustPct} size={34} color="#7C5CFF" />
            <div>
              <p style={{ ...valueStyle, color: '#0f172a' }}>{trustPct}%</p>
              <p style={labelStyle}>Trust</p>
            </div>
          </div>

          {/* Phone */}
          <div style={cellStyle}>
            <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{phoneOk ? '✓' : '○'}</span>
            <div>
              <p style={{ ...valueStyle, color: phoneOk ? '#22C55E' : '#F59E0B' }}>
                {phoneOk ? 'Verified' : 'Not verified'}
              </p>
              <p style={labelStyle}>Phone</p>
            </div>
          </div>

          {/* Money */}
          <div style={cellStyle}>
            <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>
              {uninvoicedHrs > 0 ? '💰' : '✨'}
            </span>
            <div>
              <p style={{ ...valueStyle, color: uninvoicedHrs > 0 ? '#F59E0B' : '#22C55E' }}>
                {uninvoicedHrs > 0
                  ? `${Math.round(uninvoicedHrs * 10) / 10} hrs ready`
                  : 'All clear'}
              </p>
              <p style={labelStyle}>Money</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Priority Dot ─────────────────────────────────────────────────────────
function PriorityDot({ priority }: { priority: 'critical' | 'high' | 'medium' | 'low' }) {
  const colors: Record<string, string> = {
    critical: '#EF4444',
    high: '#F59E0B',
    medium: '#3B82F6',
    low: '#22C55E',
  }
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: colors[priority] || '#94a3b8',
      marginRight: 6,
      flexShrink: 0,
      verticalAlign: 'middle',
    }} />
  )
}

// ── Quick Actions (same list as Phase 24A) ───────────────────────────────
function buildQuickActions(
  profile: CaregiverProfile | null,
  context: CaregiverKaiContext,
  handlers: {
    onNavigateToProfile: () => void
    onNavigateToTrust: () => void
    onNavigateToEarnings: () => void
    onNavigateToWork: () => void
    onNavigateToSchedule: () => void
    onNavigateToHome: () => void
    onNavigateToSection: (section: string, scrollTo: string) => void
    onClose: () => void
  }
): KaiQuickAction[] {
  const accountRestricted = ['suspended', 'blocked', 'deactivated'].includes(
    (context.accountStatus || 'active').toLowerCase()
  )

  const actions: KaiQuickAction[] = [
    {
      id: 'profile',
      label: 'Complete my profile',
      icon: '📝',
      description: (context.profileCompletePercent != null)
        ? `Your profile is ${context.profileCompletePercent}% complete. Add a photo, bio, services, and availability to improve your Carehia presence.`
        : 'Add a photo, bio, services, and availability to help families find you.',
      buttonLabel: 'Open Profile',
      action: handlers.onNavigateToProfile,
    },
    {
      id: 'trust',
      label: 'Start Trust Passport',
      icon: '🛡️',
      description: 'Trust Passport helps you build trust step by step with proof, profile strength, and verified information.',
      buttonLabel: 'Open Trust Passport',
      action: handlers.onNavigateToTrust,
    },
    {
      id: 'phone',
      label: 'Verify my phone',
      icon: '📱',
      description: 'Verify your phone number to protect your account and strengthen your Trust Passport.',
      buttonLabel: 'Verify Now',
      action: () => {}, // Overridden by KaiPanel to open PhoneVerificationPanel
    },
    {
      id: 'availability',
      label: 'Set availability',
      icon: '📅',
      description: 'Availability helps Carehia understand when you are ready for work.',
      buttonLabel: 'Set Availability',
      action: handlers.onNavigateToSchedule,
    },
    {
      id: 'service-area',
      label: 'Set service area',
      icon: '📍',
      description: 'Your service area helps Carehia prepare local opportunities without showing your exact address publicly.',
      buttonLabel: 'Set Service Area',
      action: () => handlers.onNavigateToSection('overview', 'section-service-area'),
    },
  ]

  // Only show work/invoice actions if account is not restricted
  if (!accountRestricted) {
    actions.push(
      {
        id: 'timer',
        label: 'Clock in / Track hours',
        icon: '⏱️',
        description: 'Track your hours as you work so your timesheets and invoices are easier to manage.',
        buttonLabel: 'Open Time Tracker',
        action: handlers.onNavigateToWork,
      },
      {
        id: 'invoice',
        label: 'Create invoice',
        icon: '💰',
        description: 'Carehia can help you turn tracked hours into timesheets or invoices.',
        buttonLabel: 'Open Money',
        action: handlers.onNavigateToEarnings,
      },
      {
        id: 'share',
        label: 'Share my profile',
        icon: '🔗',
        description: 'Your public caregiver profile helps interested families or clients understand your skills, trust, and experience.',
        buttonLabel: 'Open Profile',
        action: handlers.onNavigateToProfile,
      },
    )
  }

  actions.push({
    id: 'support',
    label: 'Contact support',
    icon: '💬',
    description: 'Need help? Reach us at support@carehia.com — we\'re here for you.',
    buttonLabel: 'Email Support',
    action: () => { window.location.href = 'mailto:support@carehia.com' },
  })

  return actions
}

// ── Phase 26E: Match Readiness Card Component ───────────────────────────
function MatchReadinessCard({ 
  profile, 
  onNavigate 
}: { 
  profile: CaregiverProfile | null;
  onNavigate: (tab: string) => void;
}) {
  // Compute readiness factors from profile
  const profileComplete = profile ? (typeof (profile as any).profilePercent === 'number' ? (profile as any).profilePercent : 60) : 0;
  const hasServices = profile?.services && (Array.isArray(profile.services) ? profile.services.length > 0 : !!profile.services);
  const servicesScore = hasServices ? 80 : 20;
  const hasAvailability = !!(profile as any)?.availability;
  const availabilityScore = hasAvailability ? 85 : 25;
  const hasServiceArea = !!(profile as any)?.serviceArea || !!(profile as any)?.city;
  const serviceAreaScore = hasServiceArea ? 80 : 30;
  const trustScore = profile ? (typeof (profile as any).trustPassportPercent === 'number' ? (profile as any).trustPassportPercent : 40) : 0;

  const factors = [
    { label: 'Profile', score: profileComplete, tab: 'profile', tip: profileComplete < 70 ? 'Add a photo, bio, and experience details' : 'Looking good!' },
    { label: 'Services', score: servicesScore, tab: 'profile', tip: servicesScore < 60 ? 'List the care services you offer' : 'Well defined' },
    { label: 'Availability', score: availabilityScore, tab: 'profile', tip: availabilityScore < 60 ? 'Set your weekly availability' : 'Clearly set' },
    { label: 'Service Area', score: serviceAreaScore, tab: 'profile', tip: serviceAreaScore < 60 ? 'Define your service area or city' : 'Defined' },
    { label: 'Trust Passport', score: trustScore, tab: 'trust-passport', tip: trustScore < 60 ? 'Upload verifications to build trust' : 'Building trust' },
  ];

  const overallReadiness = Math.round(factors.reduce((sum, f) => sum + f.score, 0) / factors.length);
  const strongest = factors.filter(f => f.score >= 70).sort((a, b) => b.score - a.score);
  const weakest = factors.filter(f => f.score < 70).sort((a, b) => a.score - b.score);

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A' }}>Match Readiness</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>How prepared your profile is for care requests</div>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: overallReadiness >= 70 ? '#EAFBF2' : '#FFF7ED', color: overallReadiness >= 70 ? '#087A3D' : '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 950 }}>{overallReadiness}%</div>
      </div>

      {factors.map(f => {
        const barColor = f.score >= 80 ? '#22C55E' : f.score >= 60 ? '#F59E0B' : '#CBD5E1';
        return (
          <div key={f.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>{f.label}</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>{f.score}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden', marginBottom: 3 }}>
              <div style={{ width: `${Math.min(f.score, 100)}%`, height: '100%', borderRadius: 999, background: barColor }} />
            </div>
            <div style={{ fontSize: 11, color: f.score < 60 ? '#B45309' : '#64748B', fontWeight: 700 }}>{f.tip}</div>
          </div>
        );
      })}

      {strongest.length > 0 && (
        <div style={{ background: '#EAFBF2', borderRadius: 8, padding: 10, marginTop: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#087A3D', marginBottom: 4 }}>Your strongest areas</div>
          {strongest.slice(0, 2).map(s => (
            <div key={s.label} style={{ fontSize: 12, color: '#334155' }}>✓ {s.label}: {s.tip}</div>
          ))}
        </div>
      )}

      {weakest.length > 0 && (
        <div style={{ background: '#FFF7ED', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#B45309', marginBottom: 4 }}>Areas to improve</div>
          {weakest.slice(0, 2).map(w => (
            <div key={w.label} style={{ fontSize: 12, color: '#334155' }}>→ {w.tip}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {weakest.slice(0, 3).map(w => (
          <button key={w.label} onClick={() => onNavigate(w.tab)} style={{ padding: '8px 14px', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8, color: '#5B2FD6', fontSize: 12, fontWeight: 850, cursor: 'pointer' }}>
            Update {w.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 10, lineHeight: 1.4 }}>
        Improving these areas helps you appear in more care requests. Results vary based on requests in your area.
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────
export const KaiPanel: React.FC<KaiPanelProps> = ({
  profile,
  documents,
  onClose,
  onNavigateToProfile,
  onNavigateToTrust,
  onNavigateToEarnings,
  onNavigateToWork,
  onNavigateToSchedule,
  onNavigateToHome,
  onNavigateToSection,
}) => {
  const [expandedAction, setExpandedAction] = useState<string | null>(null)
  const [animateIn, setAnimateIn] = useState(false)

  // Phase 24C: Walkthrough state
  const [activeWalkthrough, setActiveWalkthrough] = useState<KaiWalkthrough | null>(null)
  const [walkthroughStep, setWalkthroughStep] = useState(0)
  const [walkthroughCompleted, setWalkthroughCompleted] = useState(false)
  const [savedWalkthroughId, setSavedWalkthroughId] = useState<string | null>(null)

  // Phase 24D: Phone Verification panel state
  const [showPhoneVerification, setShowPhoneVerification] = useState(false)

  // Phase 25E: Pending confirmation state
  const [pendingConfirmation, setPendingConfirmation] = useState<KaiPendingConfirmation | null>(null)

  // Phase 26E: Match Readiness state
  const [showMatchReadiness, setShowMatchReadiness] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true))

    // Resume walkthrough from sessionStorage
    try {
      const savedId = sessionStorage.getItem('carehia_kai_active_walkthrough')
      const savedStep = sessionStorage.getItem('carehia_kai_walkthrough_step')
      if (savedId) {
        const wt = getWalkthrough(savedId)
        if (wt) {
          setSavedWalkthroughId(savedId)
          // Don't auto-resume — show resume card instead
        }
      }
    } catch {}
  }, [])

  const handleClose = () => {
    setAnimateIn(false)
    setTimeout(onClose, 280)
  }

  const firstName = profile?.firstName || ''
  const greeting = firstName
    ? `Hi ${firstName}, I'm Kai. I can help you finish setup, build trust, track work, and get paid.`
    : `Hi, I'm Kai. I can help you manage your caregiver office.`

  const navHandlers = {
    onNavigateToProfile: () => { handleClose(); setTimeout(onNavigateToProfile, 300) },
    onNavigateToTrust: () => { handleClose(); setTimeout(onNavigateToTrust, 300) },
    onNavigateToEarnings: () => { handleClose(); setTimeout(onNavigateToEarnings, 300) },
    onNavigateToWork: () => { handleClose(); setTimeout(onNavigateToWork, 300) },
    onNavigateToSchedule: () => { handleClose(); setTimeout(onNavigateToSchedule, 300) },
    onNavigateToHome: () => { handleClose(); setTimeout(onNavigateToHome, 300) },
    onNavigateToSection: (s: string, t: string) => { handleClose(); setTimeout(() => onNavigateToSection(s, t), 300) },
    onClose: handleClose,
  }

  // Build context from profile + documents + localStorage + storage utils
  const context = useMemo(
    () => buildCaregiverContext(profile, documents),
    [profile, documents]
  )

  // Phase 25C: Foundation adapter context for policy evaluation
  const adapterContext = useMemo(
    () => buildFoundationContext(context),
    [context]
  )

  // Phase 25E: Confirmation gate — intercepts action if medium-risk + requiresConfirmation
  const gateAction = (
    panelId: string,
    label: string,
    handler: () => void,
    source: KaiConfirmationSource,
    description?: string,
  ): (() => void) => {
    const foundationId = PANEL_TO_FOUNDATION[panelId] || panelId
    const decision = evaluatePanelAction(panelId, adapterContext)

    // Only gate medium-risk actions that require confirmation AND are allowed
    if (decision.allowed && decision.requiresConfirmation && decision.riskLevel === 'medium') {
      return () => {
        console.debug('[Kai Foundation 25E] Confirmation required:', panelId, source)
        setPendingConfirmation({
          actionId: panelId,
          foundationActionId: foundationId,
          label,
          description,
          riskLevel: decision.riskLevel,
          policyDecision: decision,
          source,
          originalHandler: handler,
          createdAt: Date.now(),
        })
      }
    }

    // All other allowed actions pass through directly
    return handler
  }

  const handleConfirmContinue = () => {
    if (!pendingConfirmation) return
    const receipt: KaiConfirmationReceipt = {
      actionId: pendingConfirmation.actionId,
      label: pendingConfirmation.label,
      riskLevel: pendingConfirmation.riskLevel,
      source: pendingConfirmation.source,
      confirmed: true,
      timestamp: Date.now(),
      policyReason: pendingConfirmation.policyDecision.reason,
      userId: profile?.id || profile?.email || undefined,
    }
    logConfirmationReceipt(receipt)
    const handler = pendingConfirmation.originalHandler
    setPendingConfirmation(null)
    handler()
  }

  const handleConfirmCancel = () => {
    if (!pendingConfirmation) return
    const receipt: KaiConfirmationReceipt = {
      actionId: pendingConfirmation.actionId,
      label: pendingConfirmation.label,
      riskLevel: pendingConfirmation.riskLevel,
      source: pendingConfirmation.source,
      confirmed: false,
      timestamp: Date.now(),
      policyReason: pendingConfirmation.policyDecision.reason,
      userId: profile?.id || profile?.email || undefined,
    }
    logConfirmationReceipt(receipt)
    setPendingConfirmation(null)
  }

  // Phase 25D: Generate NBA candidates and evaluate through Foundation policy
  // Instead of choosing one NBA then guarding it, we prepare all candidates,
  // filter through Foundation, and select the best allowed/confirmable one.
  const adjustedNextAction = useMemo(() => {
    const candidates = getCaregiverNBACandidates(context, navHandlers)
    console.debug('[Kai Foundation 25D] NBA candidates generated:', candidates.length, candidates.map(c => c.id))

    // Evaluate each candidate through Foundation policy
    let selectedCandidate: KaiNBACandidate | null = null
    for (const candidate of candidates) {
      const decision = evaluatePanelAction(candidate.id, adapterContext)

      // Skip blocked, unsupported, high-risk candidates
      if (!decision.allowed) {
        console.debug('[Kai Foundation 25D] NBA candidate removed:', candidate.id, '→', decision.reason)
        continue
      }
      if (decision.riskLevel === 'high') {
        console.debug('[Kai Foundation 25D] NBA candidate removed (high-risk):', candidate.id)
        continue
      }

      // Medium-risk: allow but mark requiresConfirmation
      if (decision.requiresConfirmation) {
        console.debug('[Kai Foundation 25D] NBA candidate marked requiresConfirmation:', candidate.id, decision.riskLevel)
      }

      // First allowed candidate wins (candidates are already in priority order)
      selectedCandidate = candidate
      console.debug('[Kai Foundation 25D] NBA selected:', candidate.id, '→', decision.riskLevel, decision.allowed ? 'ALLOWED' : 'BLOCKED')
      break
    }

    // Fallback if no allowed candidate
    if (!selectedCandidate) {
      console.debug('[Kai Foundation 25D] All NBA candidates blocked — using safe fallback')
      selectedCandidate = { ...SAFE_FALLBACK_NBA }
    }

    // Phase 24D: Override verify-phone to open PhoneVerificationPanel
    if (selectedCandidate.id === 'verify-phone') {
      selectedCandidate = {
        ...selectedCandidate,
        ctaLabel: 'Verify Now',
        fallbackMessage: undefined,
        action: () => setShowPhoneVerification(true),
      }
    }

    return selectedCandidate
  }, [context, adapterContext])

  // Build quick actions and reorder based on context
  const quickActions = useMemo(() => {
    const baseActions = buildQuickActions(profile, context, navHandlers)
    return getContextBasedQuickActions(context, baseActions)
  }, [profile, context])

  // Phase 24D: Override phone quick action to open PhoneVerificationPanel
  // Phase 25C: Foundation policy filter on quick actions
  const adjustedQuickActions = useMemo(() => {
    return quickActions.filter(qa => {
      const decision = evaluatePanelAction(qa.id, adapterContext)
      if (!decision.allowed) {
        console.debug('[Kai Foundation] Quick action blocked:', qa.id, decision.reason)
        return false
      }
      return true
    }).map(qa => {
      if (qa.id === 'phone') {
        return { ...qa, action: () => setShowPhoneVerification(true) }
      }
      // Phase 25C: Log actions requiring confirmation for future 25D/25E workflow
      const decision = evaluatePanelAction(qa.id, adapterContext)
      if (decision.requiresConfirmation) {
        console.debug('[Kai Foundation] Action requires confirmation:', qa.id, decision.riskLevel)
      }
      return qa
    })
  }, [quickActions, adapterContext])

  // Safety: check if account is restricted
  const isRestricted = ['suspended', 'blocked', 'deactivated'].includes(
    (context.accountStatus || 'active').toLowerCase()
  )

  // ── Phase 24C: Walkthrough Handlers ──────────────────────────────────

  const startWalkthrough = (walkthroughId: string) => {
    const wt = getWalkthrough(walkthroughId)
    if (!wt) return
    // Safety: don't allow restricted accounts to start work/money walkthroughs
    if (isRestricted && wt.restrictedAccountBlock) return
    // Phase 25C: Foundation policy check on walkthrough target action
    const decision = evaluatePanelAction(walkthroughId, adapterContext)
    if (!decision.allowed) {
      console.debug('[Kai Foundation] Walkthrough blocked by policy:', walkthroughId, decision.reason)
      return
    }
    // Phase 25E: Gate walkthrough start if medium-risk + requiresConfirmation
    if (decision.requiresConfirmation && decision.riskLevel === 'medium') {
      const foundationId = PANEL_TO_FOUNDATION[walkthroughId] || walkthroughId
      console.debug('[Kai Foundation 25E] Walkthrough confirmation required:', walkthroughId)
      setPendingConfirmation({
        actionId: walkthroughId,
        foundationActionId: foundationId,
        label: wt.title,
        description: wt.intro,
        riskLevel: decision.riskLevel,
        policyDecision: decision,
        source: 'walkthrough',
        originalHandler: () => {
          setActiveWalkthrough(wt)
          setWalkthroughStep(0)
          setWalkthroughCompleted(false)
          setExpandedAction(null)
          setSavedWalkthroughId(null)
          try {
            sessionStorage.setItem('carehia_kai_active_walkthrough', walkthroughId)
            sessionStorage.setItem('carehia_kai_walkthrough_step', '0')
          } catch {}
        },
        createdAt: Date.now(),
      })
      return
    }
    setActiveWalkthrough(wt)
    setWalkthroughStep(0)
    setWalkthroughCompleted(false)
    setExpandedAction(null)
    setSavedWalkthroughId(null)
    // Save to sessionStorage
    try {
      sessionStorage.setItem('carehia_kai_active_walkthrough', walkthroughId)
      sessionStorage.setItem('carehia_kai_walkthrough_step', '0')
    } catch {}
  }

  const exitWalkthrough = () => {
    setActiveWalkthrough(null)
    setWalkthroughStep(0)
    setWalkthroughCompleted(false)
    try {
      sessionStorage.removeItem('carehia_kai_active_walkthrough')
      sessionStorage.removeItem('carehia_kai_walkthrough_step')
    } catch {}
  }

  const nextWalkthroughStep = () => {
    if (!activeWalkthrough) return
    const next = walkthroughStep + 1
    if (next >= activeWalkthrough.steps.length) {
      setWalkthroughCompleted(true)
      try { sessionStorage.removeItem('carehia_kai_active_walkthrough') } catch {}
    } else {
      setWalkthroughStep(next)
      try { sessionStorage.setItem('carehia_kai_walkthrough_step', String(next)) } catch {}
    }
  }

  const prevWalkthroughStep = () => {
    if (walkthroughStep > 0) {
      const prev = walkthroughStep - 1
      setWalkthroughStep(prev)
      try { sessionStorage.setItem('carehia_kai_walkthrough_step', String(prev)) } catch {}
    }
  }

  // Execute a step's CTA action (navigate)
  const executeStepAction = (step: KaiWalkthroughStep) => {
    if (!step.ctaAction) return
    // Phase 25C: Foundation policy check on step CTA
    const stepActionId = PANEL_TO_FOUNDATION[step.ctaAction] || step.ctaAction
    if (stepActionId !== step.ctaAction) {
      const decision = carehiaKaiAdapter.evaluateAction(stepActionId, adapterContext)
      if (!decision.allowed) {
        console.debug('[Kai Foundation] Step CTA blocked:', step.ctaAction, decision.reason)
        return
      }
      // Phase 25E: Gate step CTA if medium-risk + requiresConfirmation
      if (decision.requiresConfirmation && decision.riskLevel === 'medium') {
        console.debug('[Kai Foundation 25E] Step CTA confirmation required:', step.ctaAction)
        const executeStep = () => {
          if (step.ctaAction === 'profile') navHandlers.onNavigateToProfile()
          else if (step.ctaAction === 'trust') navHandlers.onNavigateToTrust()
          else if (step.ctaAction === 'earnings') navHandlers.onNavigateToEarnings()
          else if (step.ctaAction === 'work') navHandlers.onNavigateToWork()
          else if (step.ctaAction === 'schedule') navHandlers.onNavigateToSchedule()
          else if (step.ctaAction === 'home') navHandlers.onNavigateToHome()
          else if (step.ctaAction === 'close') handleClose()
          else if (step.ctaAction.startsWith('section:')) {
            const parts = step.ctaAction.split(':')
            navHandlers.onNavigateToSection(parts[1], parts[2])
          }
        }
        setPendingConfirmation({
          actionId: step.ctaAction,
          foundationActionId: stepActionId,
          label: step.ctaLabel || step.title,
          description: step.description,
          riskLevel: decision.riskLevel,
          policyDecision: decision,
          source: 'step_cta',
          originalHandler: executeStep,
          createdAt: Date.now(),
        })
        return
      }
    }
    if (step.ctaAction === 'profile') navHandlers.onNavigateToProfile()
    else if (step.ctaAction === 'trust') navHandlers.onNavigateToTrust()
    else if (step.ctaAction === 'earnings') navHandlers.onNavigateToEarnings()
    else if (step.ctaAction === 'work') navHandlers.onNavigateToWork()
    else if (step.ctaAction === 'schedule') navHandlers.onNavigateToSchedule()
    else if (step.ctaAction === 'home') navHandlers.onNavigateToHome()
    else if (step.ctaAction === 'close') handleClose()
    else if (step.ctaAction.startsWith('section:')) {
      const parts = step.ctaAction.split(':')
      navHandlers.onNavigateToSection(parts[1], parts[2])
    }
  }

  const resumeWalkthrough = () => {
    if (!savedWalkthroughId) return
    const wt = getWalkthrough(savedWalkthroughId)
    if (!wt) return
    if (isRestricted && wt.restrictedAccountBlock) return
    let step = 0
    try {
      const savedStep = sessionStorage.getItem('carehia_kai_walkthrough_step')
      if (savedStep) step = parseInt(savedStep, 10) || 0
    } catch {}
    setActiveWalkthrough(wt)
    setWalkthroughStep(Math.min(step, wt.steps.length - 1))
    setWalkthroughCompleted(false)
    setSavedWalkthroughId(null)
  }

  // ── Walkthrough Panel Render ─────────────────────────────────────────

  const renderWalkthroughPanel = () => {
    if (!activeWalkthrough) return null

    // Completion screen
    if (walkthroughCompleted) {
      return (
        <div className="kai-wt-container">
          <div className="kai-wt-header">
            <h3 className="kai-wt-title">{activeWalkthrough.title}</h3>
            <button className="kai-wt-exit" onClick={exitWalkthrough}>Done</button>
          </div>
          <div className="kai-wt-completion">
            <div className="kai-wt-completion-icon">🎉</div>
            <h4 className="kai-wt-completion-title">All done!</h4>
            <p className="kai-wt-completion-msg">{activeWalkthrough.completionMessage}</p>
            <button className="kai-wt-step-cta" onClick={exitWalkthrough}>
              Back to Kai
            </button>
          </div>
        </div>
      )
    }

    const currentStep = activeWalkthrough.steps[walkthroughStep]
    const totalSteps = activeWalkthrough.steps.length
    const progressPercent = ((walkthroughStep + 1) / totalSteps) * 100

    return (
      <div className="kai-wt-container">
        {/* Header */}
        <div className="kai-wt-header">
          <h3 className="kai-wt-title">{activeWalkthrough.icon} {activeWalkthrough.title}</h3>
          <button className="kai-wt-exit" onClick={exitWalkthrough}>Exit guide</button>
        </div>

        {/* Progress */}
        <p className="kai-wt-progress">Step {walkthroughStep + 1} of {totalSteps}</p>
        <div className="kai-wt-progress-bar">
          <div className="kai-wt-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Step Card */}
        <div className="kai-wt-step-card">
          <h4 className="kai-wt-step-title">{currentStep.title}</h4>
          <p className="kai-wt-step-desc">{currentStep.description}</p>

          {currentStep.fallbackText && (
            <p className="kai-wt-step-fallback">{currentStep.fallbackText}</p>
          )}

          {currentStep.ctaLabel && currentStep.ctaAction && (
            <button
              className="kai-wt-step-cta"
              onClick={() => executeStepAction(currentStep)}
            >
              {currentStep.ctaLabel}
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="kai-wt-nav">
          <button
            className="kai-wt-nav-btn kai-wt-nav-back"
            onClick={prevWalkthroughStep}
            disabled={walkthroughStep === 0}
          >
            Back
          </button>
          <button
            className="kai-wt-nav-btn kai-wt-nav-next"
            onClick={nextWalkthroughStep}
          >
            {walkthroughStep === totalSteps - 1 ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="kai-panel-overlay"
      style={{ opacity: animateIn ? 1 : 0 }}
      onClick={handleClose}
    >
      <div
        className="kai-panel"
        style={{ transform: animateIn ? 'translateY(0)' : 'translateY(100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d1d5db' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="kai-header-orb">✨</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Kai</h2>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>Your Carehia guide</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close Kai assistant"
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: '50%',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 16, color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        {/* Greeting */}
        <div style={{ padding: '16px 20px 8px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,92,255,0.08), rgba(74,144,226,0.06))',
            borderRadius: 16, padding: '14px 16px',
            border: '1px solid rgba(124,92,255,0.12)',
          }}>
            <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: '1.55' }}>
              {activeWalkthrough ? activeWalkthrough.intro : greeting}
            </p>
            {!activeWalkthrough && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                Let's take this one step at a time. 💜
              </p>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 100px' }}>

          {/* ── PHONE VERIFICATION MODE (Phase 24D) ─────── */}
          {showPhoneVerification ? (
            <PhoneVerificationPanel
              profile={profile}
              onClose={() => setShowPhoneVerification(false)}
              onVerified={() => {
                // Context will re-compute on next render via buildCaregiverContext
              }}
            />
          ) : activeWalkthrough ? (
            renderWalkthroughPanel()
          ) : (
            <>
              {/* ── Status Summary Grid ─────────────────────────── */}
              <div style={{ marginTop: 4 }}>
                <StatusSummary context={context} />
              </div>

              {/* ── Account Restricted Warning ───────────────────── */}
              {isRestricted && (
                <div style={{ padding: '0 20px', marginTop: 12 }}>
                  <div style={{
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: 14,
                    padding: '14px 16px',
                  }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#EF4444' }}>
                      ⚠️ Account needs attention
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                      Your account is currently restricted. Please contact our support team so we can help resolve this quickly.
                    </p>
                    <button
                      onClick={() => { window.location.href = 'mailto:support@carehia.com' }}
                      className="kai-action-btn"
                      style={{ marginTop: 10, background: '#EF4444' }}
                    >
                      Contact Support
                    </button>
                  </div>
                </div>
              )}

              {/* ── Resume Guide Card ────────────────────────────── */}
              {savedWalkthroughId && !isRestricted && (() => {
                const savedWt = getWalkthrough(savedWalkthroughId)
                if (!savedWt) return null
                if (isRestricted && savedWt.restrictedAccountBlock) return null
                return (
                  <div style={{ padding: '0 20px', marginTop: 12 }}>
                    <div className="kai-wt-resume-card">
                      <p className="kai-wt-resume-text">
                        {savedWt.icon} Resume: {savedWt.title}
                      </p>
                      <button className="kai-wt-resume-btn" onClick={resumeWalkthrough}>
                        Resume guide
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* ── Next Best Action ─────────────────────────────── */}
              <div style={{ marginTop: 12, padding: '0 20px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                  Recommended next step
                </p>
                <div className="kai-next-action-card" data-kai-risk={evaluatePanelAction(adjustedNextAction.id, adapterContext).riskLevel}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{adjustedNextAction.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <PriorityDot priority={adjustedNextAction.priority} />
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                          {adjustedNextAction.title}
                        </p>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569', lineHeight: '1.5' }}>
                        {adjustedNextAction.description}
                      </p>
                      {adjustedNextAction.reason && (
                        <p className="kai-reason-text" style={{
                          margin: '8px 0 0',
                          fontSize: 12,
                          color: '#64748b',
                          fontStyle: 'italic',
                          lineHeight: '1.45',
                        }}>
                          Why this matters: {adjustedNextAction.reason}
                        </p>
                      )}
                      {adjustedNextAction.fallbackMessage && (
                        <p style={{
                          margin: '6px 0 0',
                          fontSize: 12,
                          color: '#94a3b8',
                          fontStyle: 'italic',
                        }}>
                          {adjustedNextAction.fallbackMessage}
                        </p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0 }}>
                        <button
                          onClick={gateAction(
                            adjustedNextAction.id,
                            adjustedNextAction.title,
                            adjustedNextAction.action,
                            'nba',
                            adjustedNextAction.description,
                          )}
                          className="kai-action-btn"
                        >
                          {adjustedNextAction.ctaLabel}
                        </button>
                        {walkthroughMap[adjustedNextAction.id] && !isRestricted && (
                          <button onClick={() => startWalkthrough(walkthroughMap[adjustedNextAction.id])} className="kai-guide-btn">
                            ✨ Guide me
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Quick Actions ─────────────────────────────── */}
              <div style={{ marginTop: 20, padding: '0 20px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                  Quick actions
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {adjustedQuickActions.map((qa) => {
                    const isExpanded = expandedAction === qa.id
                    return (
                      <div key={qa.id} className="kai-quick-action" data-kai-risk={evaluatePanelAction(qa.id, adapterContext).riskLevel}>
                        <button
                          onClick={() => setExpandedAction(isExpanded ? null : qa.id)}
                          style={{
                            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 14px', textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{qa.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', flex: 1 }}>{qa.label}</span>
                          <span style={{
                            fontSize: 12, color: '#94a3b8', transition: 'transform 0.2s',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}>▼</span>
                        </button>
                        {isExpanded && (
                          <div style={{ padding: '0 14px 14px 42px' }}>
                            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#475569', lineHeight: '1.5' }}>
                              {qa.description}
                            </p>
                            <button
                              onClick={gateAction(
                                qa.id,
                                qa.label,
                                qa.action,
                                'quick_action',
                                qa.description,
                              )}
                              className="kai-action-btn"
                            >
                              {qa.buttonLabel}
                            </button>
                            {walkthroughMap[qa.id] && !isRestricted && (
                              <button onClick={() => startWalkthrough(walkthroughMap[qa.id])} className="kai-guide-btn-sm">
                                ✨ Guide me
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Phase 26E: Improve My Matches ───────────── */}
              <div style={{ marginTop: 16, padding: '0 20px' }}>
                <button
                  onClick={() => setShowMatchReadiness(!showMatchReadiness)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: showMatchReadiness ? 'linear-gradient(135deg, #F5F3FF, #EEF4FF)' : '#FFFFFF',
                    border: showMatchReadiness ? '1.5px solid #DDD6FE' : '1px solid #E2E8F0',
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🎯</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#5B2FD6', flex: 1 }}>Improve My Matches</span>
                  <span style={{
                    fontSize: 12, color: '#94a3b8', transition: 'transform 0.2s',
                    transform: showMatchReadiness ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>▼</span>
                </button>
                {showMatchReadiness && (
                  <div style={{ marginTop: 12 }}>
                    <MatchReadinessCard
                      profile={profile}
                      onNavigate={(tab: string) => {
                        handleClose();
                        setTimeout(() => {
                          if (tab === 'profile') onNavigateToProfile();
                          else if (tab === 'trust-passport') onNavigateToTrust();
                          else if (tab === 'work') onNavigateToWork();
                          else if (tab === 'money') onNavigateToEarnings();
                        }, 300);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* ── Kai Tip ──────────────────────────────────── */}
              <div style={{
                margin: '24px 20px 0',
                padding: '14px 16px',
                background: 'rgba(124,92,255,0.04)',
                borderRadius: 14,
                border: '1px solid rgba(124,92,255,0.08)',
                textAlign: 'center',
              }}>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: '1.5' }}>
                  💡 You don't have to finish everything today. I'll be here whenever you're ready.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Phase 25E: Confirmation Dialog */}
        {pendingConfirmation && (
          <KaiConfirmationDialog
            pending={pendingConfirmation}
            onContinue={handleConfirmContinue}
            onCancel={handleConfirmCancel}
          />
        )}
      </div>
    </div>
  )
}
