// @ts-nocheck
// Phase 24A: Kai Guided Assistant Panel
import React, { useState, useEffect, useMemo } from 'react'
import { CaregiverProfile, CaregiverDocument } from '../types'

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

// ── Next-Best-Action Priority Logic ──────────────────────────────────────
interface NextAction {
  title: string
  description: string
  buttonLabel: string
  action: () => void
  icon: string
}

function getNextBestAction(profile: CaregiverProfile | null, documents: CaregiverDocument[], handlers: {
  onNavigateToProfile: () => void
  onNavigateToTrust: () => void
  onNavigateToEarnings: () => void
  onNavigateToWork: () => void
  onNavigateToHome: () => void
  onNavigateToSection: (section: string, scrollTo: string) => void
}): NextAction {
  // 1. Onboarding incomplete
  try {
    const obComplete = localStorage.getItem('cgp_onboarding_complete') === 'true'
    if (!obComplete) {
      return {
        title: 'Continue onboarding',
        description: 'Let\'s finish setting up your Carehia office so families can find you.',
        buttonLabel: 'Continue Setup',
        action: handlers.onNavigateToHome,
        icon: '🚀',
      }
    }
  } catch {}

  // 2. Profile incomplete (< 70%)
  const completeness = profile?.completenessScore ?? null
  const missingFields = profile?.missingFields ?? []
  if (completeness !== null && completeness < 70) {
    const missingHint = missingFields.length > 0
      ? ` Consider adding: ${missingFields.slice(0, 3).join(', ')}.`
      : ''
    return {
      title: 'Complete your profile',
      description: `Your profile is ${completeness}% complete. Reaching 70% helps families find you in search.${missingHint}`,
      buttonLabel: 'Open Profile',
      action: handlers.onNavigateToProfile,
      icon: '📝',
    }
  }

  // 3. No profile photo
  if (!profile?.profilePhoto) {
    return {
      title: 'Add a profile photo',
      description: 'Caregivers with photos get up to 3× more care requests. A friendly headshot goes a long way!',
      buttonLabel: 'Open Profile',
      action: handlers.onNavigateToProfile,
      icon: '📸',
    }
  }

  // 4. No bio
  if (!profile?.bio) {
    return {
      title: 'Write a short bio',
      description: 'Tell families a little about yourself — your experience, personality, and what makes you a great caregiver.',
      buttonLabel: 'Open Profile',
      action: handlers.onNavigateToProfile,
      icon: '✍️',
    }
  }

  // 5. No hourly rate
  if (!profile?.hourlyRate) {
    return {
      title: 'Set your hourly rate',
      description: 'A clear rate helps families know what to expect and speeds up the booking process.',
      buttonLabel: 'Open Profile',
      action: () => handlers.onNavigateToSection('overview', 'section-rate'),
      icon: '💵',
    }
  }

  // 6. Trust Passport — check documents
  if (documents.length === 0) {
    return {
      title: 'Start your Trust Passport',
      description: 'Trust Passport helps you build trust step by step with verified information, proof, and profile strength.',
      buttonLabel: 'Open Trust Passport',
      action: handlers.onNavigateToTrust,
      icon: '🛡️',
    }
  }

  // 7. No location
  if (!profile?.location?.city) {
    return {
      title: 'Set your service area',
      description: 'Your service area helps Carehia show you local opportunities without revealing your exact address.',
      buttonLabel: 'Set Service Area',
      action: () => handlers.onNavigateToSection('overview', 'section-service-area'),
      icon: '📍',
    }
  }

  // 8. No skills
  if (!profile?.skills || profile.skills.length === 0) {
    return {
      title: 'Add your care skills',
      description: 'Let families know what types of care you can provide — personal care, companionship, medical support, and more.',
      buttonLabel: 'Open Profile',
      action: handlers.onNavigateToProfile,
      icon: '🩺',
    }
  }

  // 9. Check for uninvoiced hours
  try {
    const readyAmt = localStorage.getItem('cgp_ready_to_invoice_amount')
    if (readyAmt && parseFloat(readyAmt) > 0) {
      return {
        title: 'Create an invoice',
        description: `You have $${parseFloat(readyAmt).toFixed(2)} ready to invoice. Turn your tracked hours into a professional invoice.`,
        buttonLabel: 'Open Money',
        action: handlers.onNavigateToEarnings,
        icon: '💰',
      }
    }
  } catch {}

  // 10. Default
  return {
    title: 'Review your Today screen',
    description: 'You\'re in great shape! Check your Today screen for any new opportunities, scheduled visits, or updates.',
    buttonLabel: 'Open Today',
    action: handlers.onNavigateToHome,
    icon: '✨',
  }
}

// ── Quick Actions ────────────────────────────────────────────────────────
interface QuickAction {
  id: string
  label: string
  icon: string
  description: string
  buttonLabel: string
  action: () => void
}

function getQuickActions(profile: CaregiverProfile | null, handlers: {
  onNavigateToProfile: () => void
  onNavigateToTrust: () => void
  onNavigateToEarnings: () => void
  onNavigateToWork: () => void
  onNavigateToSchedule: () => void
  onNavigateToHome: () => void
  onNavigateToSection: (section: string, scrollTo: string) => void
  onClose: () => void
}): QuickAction[] {
  return [
    {
      id: 'profile',
      label: 'Complete my profile',
      icon: '📝',
      description: profile?.completenessScore
        ? `Your profile is ${profile.completenessScore}% complete. Add a photo, bio, services, and availability to improve your Carehia presence.`
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
    {
      id: 'support',
      label: 'Contact support',
      icon: '💬',
      description: 'Need help? Reach us at support@carehia.com — we\'re here for you.',
      buttonLabel: 'Email Support',
      action: () => { window.location.href = 'mailto:support@carehia.com' },
    },
  ]
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

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true))
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

  const nextAction = useMemo(
    () => getNextBestAction(profile, documents, navHandlers),
    [profile, documents]
  )

  const quickActions = useMemo(
    () => getQuickActions(profile, navHandlers),
    [profile]
  )

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
              {greeting}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
              Let's take this one step at a time. 💜
            </p>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>

          {/* ── Next Best Action ─────────────────────────────── */}
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
              Recommended next step
            </p>
            <div className="kai-next-action-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{nextAction.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    {nextAction.title}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569', lineHeight: '1.5' }}>
                    {nextAction.description}
                  </p>
                  <button
                    onClick={nextAction.action}
                    className="kai-action-btn"
                  >
                    {nextAction.buttonLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick Actions ─────────────────────────────── */}
          <div style={{ marginTop: 20 }}>
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
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Kai Tip ──────────────────────────────────── */}
          <div style={{
            marginTop: 24, padding: '14px 16px',
            background: 'rgba(124,92,255,0.04)',
            borderRadius: 14,
            border: '1px solid rgba(124,92,255,0.08)',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: '1.5' }}>
              💡 You don't have to finish everything today. I'll be here whenever you're ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
