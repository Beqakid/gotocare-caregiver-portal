// @ts-nocheck
// Phase 24C: Kai Guided Assistant Panel — Context Engine + Next Best Action + Guided Walkthroughs
import React, { useState, useEffect, useMemo } from 'react'
import { CaregiverProfile, CaregiverDocument } from '../types'
import { buildCaregiverContext, getCaregiverNextBestAction, getContextBasedQuickActions } from '../utils/kaiContext'
import type { CaregiverKaiContext, KaiQuickAction } from '../utils/kaiContext'
import { walkthroughs, walkthroughMap, getWalkthrough } from '../utils/kaiWalkthroughs'
import type { KaiWalkthrough, KaiWalkthroughStep } from '../utils/kaiWalkthroughs'

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
      description: 'Phone verification is coming next. This will help protect your account and strengthen your Trust Passport.',
      buttonLabel: 'Got it',
      action: handlers.onClose,
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

  // Get NBA from context
  const nextAction = useMemo(
    () => getCaregiverNextBestAction(context, navHandlers),
    [context]
  )

  // Build quick actions and reorder based on context
  const quickActions = useMemo(() => {
    const baseActions = buildQuickActions(profile, context, navHandlers)
    return getContextBasedQuickActions(context, baseActions)
  }, [profile, context])

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

          {/* ── WALKTHROUGH MODE ──────────────────────────── */}
          {activeWalkthrough ? (
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
                <div className="kai-next-action-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{nextAction.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <PriorityDot priority={nextAction.priority} />
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                          {nextAction.title}
                        </p>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569', lineHeight: '1.5' }}>
                        {nextAction.description}
                      </p>
                      {nextAction.reason && (
                        <p className="kai-reason-text" style={{
                          margin: '8px 0 0',
                          fontSize: 12,
                          color: '#64748b',
                          fontStyle: 'italic',
                          lineHeight: '1.45',
                        }}>
                          Why this matters: {nextAction.reason}
                        </p>
                      )}
                      {nextAction.fallbackMessage && (
                        <p style={{
                          margin: '6px 0 0',
                          fontSize: 12,
                          color: '#94a3b8',
                          fontStyle: 'italic',
                        }}>
                          {nextAction.fallbackMessage}
                        </p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0 }}>
                        <button
                          onClick={nextAction.action}
                          className="kai-action-btn"
                        >
                          {nextAction.ctaLabel}
                        </button>
                        {walkthroughMap[nextAction.id] && !isRestricted && (
                          <button onClick={() => startWalkthrough(walkthroughMap[nextAction.id])} className="kai-guide-btn">
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
                  {quickActions.map((qa) => {
                    const isExpanded = expandedAction === qa.id
                    return (
                      <div key={qa.id} className="kai-quick-action">
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
                              onClick={qa.action}
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
      </div>
    </div>
  )
}
