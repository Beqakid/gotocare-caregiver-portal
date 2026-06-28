// @ts-nocheck
// Phase 24B: Kai Context Engine + Next Best Action
// Builds a rich caregiver context from profile, documents, localStorage, and storage utils.
// Exports deterministic NBA priority and context-based quick action reordering.

import { CaregiverProfile, CaregiverDocument } from '../types'
import { getTimeEntries, getInvoices, getPrivateClients, getActiveTimer, calculateCompleteness } from './storage'
import { getTrustPassportSummary } from './trustEngine'

// ── Context Type ─────────────────────────────────────────────────────────
export type CaregiverKaiContext = {
  caregiverId?: string | number
  firstName?: string
  onboardingComplete?: boolean
  setupComplete?: boolean
  profileCompletePercent?: number
  hasProfilePhoto?: boolean
  hasBio?: boolean
  hasCareServices?: boolean
  hasWorkPreferences?: boolean
  trustPassportPercent?: number
  trustPassportStarted?: boolean
  trustPassportComplete?: boolean
  phoneVerified?: boolean
  emailVerified?: boolean
  identityProofStatus?: 'not_started' | 'pending' | 'approved' | 'needs_fix' | 'unknown'
  availabilitySet?: boolean
  availableForWork?: boolean
  serviceAreaSet?: boolean
  city?: string
  zip?: string
  travelRadiusMiles?: number
  activeTimer?: boolean
  activeTimerClientName?: string
  uninvoicedHours?: number
  readyToInvoiceAmount?: number
  draftInvoiceCount?: number
  clientCount?: number
  publicProfileReady?: boolean
  safetyStatus?: string
  accountStatus?: string
  lastUpdated?: string
}

// ── Next Best Action Type ────────────────────────────────────────────────
export type KaiNextBestAction = {
  id: string
  title: string
  description: string
  reason: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  ctaLabel: string
  icon: string
  targetScreen: string
  fallbackMessage?: string
  action: () => void
}

// ── Quick Action Type ────────────────────────────────────────────────────
export interface KaiQuickAction {
  id: string
  label: string
  icon: string
  description: string
  buttonLabel: string
  action: () => void
}

// ── Safe helpers ─────────────────────────────────────────────────────────
function safeBool(val: any, fallback = false): boolean {
  if (val === true || val === 'true') return true
  if (val === false || val === 'false') return false
  return fallback
}

function safeNum(val: any, fallback = 0): number {
  const n = Number(val)
  return isNaN(n) ? fallback : n
}

function safeStr(val: any, fallback = ''): string {
  return typeof val === 'string' ? val : fallback
}

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

// ── Build Context ────────────────────────────────────────────────────────
export function buildCaregiverContext(
  profile: CaregiverProfile | null,
  documents: CaregiverDocument[]
): CaregiverKaiContext {
  const docs = Array.isArray(documents) ? documents : []

  // localStorage reads
  const onboardingComplete = lsGet('cgp_onboarding_complete') === 'true'
  let accountData: any = null
  try { accountData = JSON.parse(lsGet('cgp_account') || 'null') } catch {}
  const onlineStatus = lsGet('cgp_online_status')

  // storage.ts reads
  const timeEntries = getTimeEntries()
  const invoices = getInvoices()
  const privateClients = getPrivateClients()
  const activeTimerEntry = getActiveTimer()
  const completenessResult = calculateCompleteness(profile, docs)

  // Trust engine
  const trustSummary = getTrustPassportSummary(profile, docs)

  // Derive fields safely
  const profileCompletePercent = profile?.completenessScore ?? completenessResult.score ?? 0
  const hasProfilePhoto = !!(profile?.profilePhoto)
  const hasBio = !!(profile?.bio && String(profile.bio).trim().length > 20)
  const hasCareServices = (profile?.skills?.length || 0) > 0
  const hasWorkPreferences = !!(profile?.hourlyRate && profile.hourlyRate > 0)

  // Trust passport
  const trustPassportPercent = trustSummary.completionPercentage ?? 0
  const trustPassportStarted = trustPassportPercent > 0
  const trustPassportComplete = trustPassportPercent >= 100

  // Verification
  const phoneVerified = !!(accountData?.phoneVerified || (profile as any)?.phoneVerified)
  const emailVerified = !!(accountData?.emailVerified || (profile as any)?.emailVerified || accountData?.email_verified || (profile as any)?.email_verified)

  // Identity proof — derive from trust modules
  const idModule = trustSummary.modules?.find(m => m.moduleType === 'selfie_intro')
  let identityProofStatus: CaregiverKaiContext['identityProofStatus'] = 'unknown'
  if (idModule) {
    if (idModule.status === 'Verified') identityProofStatus = 'approved'
    else if (idModule.status === 'Submitted') identityProofStatus = 'pending'
    else if (idModule.status === 'Needs a Quick Fix') identityProofStatus = 'needs_fix'
    else if (idModule.status === 'Not Started') identityProofStatus = 'not_started'
    else identityProofStatus = 'unknown'
  }

  // Availability
  const avail = profile?.availability
  const availabilitySet = !!(avail && Object.values(avail).some(slots => Array.isArray(slots) && slots.length > 0))
  const availableForWork = onlineStatus === 'true' || onlineStatus === 'online'

  // Service area
  const city = profile?.location?.city || accountData?.city || ''
  const zip = profile?.location?.zipCode || accountData?.zipCode || accountData?.zip_code || ''
  const serviceAreaSet = !!(city)
  const travelRadiusMiles = safeNum(profile?.travelRadiusMiles, 0)

  // Active timer
  const activeTimer = !!activeTimerEntry
  const activeTimerClientName = activeTimerEntry?.clientName || ''

  // Financial
  const completedEntries = timeEntries.filter(e => e.status === 'completed')
  const invoicedEntryIds = new Set<string>()
  invoices.forEach(inv => {
    (inv.timeEntryIds || []).forEach(id => invoicedEntryIds.add(id))
    ;(inv.cloudTimeEntryIds || []).forEach(id => invoicedEntryIds.add(id))
  })
  const uninvoicedEntries = completedEntries.filter(e => !invoicedEntryIds.has(e.id))
  const uninvoicedHours = uninvoicedEntries.reduce((sum, e) => sum + safeNum(e.duration, 0), 0) / 60
  const readyToInvoiceAmount = uninvoicedEntries.reduce((sum, e) => {
    const hrs = safeNum(e.duration, 0) / 60
    return sum + hrs * safeNum(e.hourlyRate, 0)
  }, 0)
  const draftInvoiceCount = invoices.filter(i => i.status === 'draft').length

  // Client count
  const clientCount = privateClients.length

  // Public profile readiness: photo + bio + skills + location + rate
  const publicProfileReady = hasProfilePhoto && hasBio && hasCareServices && serviceAreaSet && hasWorkPreferences

  // Account/safety status
  const accountStatus = safeStr(profile?.status || accountData?.status, 'active')
  const safetyStatus = accountStatus

  // Setup complete (from account data or profile presence)
  const setupComplete = onboardingComplete || !!(accountData?.setupComplete)

  return {
    caregiverId: profile?.id || accountData?.id,
    firstName: profile?.firstName || accountData?.firstName || accountData?.name?.split(' ')[0] || '',
    onboardingComplete,
    setupComplete,
    profileCompletePercent,
    hasProfilePhoto,
    hasBio,
    hasCareServices,
    hasWorkPreferences,
    trustPassportPercent,
    trustPassportStarted,
    trustPassportComplete,
    phoneVerified,
    emailVerified,
    identityProofStatus,
    availabilitySet,
    availableForWork,
    serviceAreaSet,
    city,
    zip,
    travelRadiusMiles,
    activeTimer,
    activeTimerClientName,
    uninvoicedHours: Math.round(uninvoicedHours * 100) / 100,
    readyToInvoiceAmount: Math.round(readyToInvoiceAmount * 100) / 100,
    draftInvoiceCount,
    clientCount,
    publicProfileReady,
    safetyStatus,
    accountStatus,
    lastUpdated: new Date().toISOString(),
  }
}

// ── Next Best Action — Deterministic Priority ────────────────────────────
export function getCaregiverNextBestAction(
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
): KaiNextBestAction {
  const status = (context.accountStatus || 'active').toLowerCase()

  // 1. Account/safety restriction
  if (['suspended', 'blocked', 'deactivated'].includes(status)) {
    return {
      id: 'account-attention',
      title: 'Account needs attention',
      description: 'Your account is currently restricted. Please contact our support team so we can help resolve this quickly.',
      reason: 'Your account status needs to be resolved before you can access all features.',
      priority: 'critical',
      ctaLabel: 'Contact Support',
      icon: '⚠️',
      targetScreen: 'support',
      action: () => { window.location.href = 'mailto:support@carehia.com' },
    }
  }

  // 2. Onboarding incomplete
  if (!context.onboardingComplete) {
    return {
      id: 'finish-onboarding',
      title: 'Finish setting up your Carehia office',
      description: 'Complete your initial setup so you can start building your caregiver profile and finding work.',
      reason: 'Setting up your office is the first step to getting discovered by families who need care.',
      priority: 'high',
      ctaLabel: 'Continue Onboarding',
      icon: '🚀',
      targetScreen: 'home',
      action: handlers.onNavigateToHome,
    }
  }

  // 3. Phone not verified
  if (!context.phoneVerified) {
    return {
      id: 'verify-phone',
      title: 'Verify your phone',
      description: 'Phone verification helps protect your account and lets families know your contact information is real.',
      reason: 'Verified contact information helps families and Carehia trust that your account is secure.',
      priority: 'high',
      ctaLabel: 'Learn More',
      icon: '📱',
      targetScreen: 'phone-verification',
      fallbackMessage: 'Phone verification is coming soon. We\'ll let you know when it\'s ready.',
      action: handlers.onClose,
    }
  }

  // 4. Email not verified
  if (!context.emailVerified) {
    return {
      id: 'verify-email',
      title: 'Verify your email',
      description: 'Confirm your email address so Carehia and families can reach you reliably.',
      reason: 'A verified email builds confidence that your account is authentic and reachable.',
      priority: 'high',
      ctaLabel: 'Verify Email',
      icon: '📧',
      targetScreen: 'profile',
      action: handlers.onNavigateToProfile,
    }
  }

  // 5. Profile incomplete (< 70%)
  if ((context.profileCompletePercent ?? 0) < 70) {
    const pct = context.profileCompletePercent ?? 0
    return {
      id: 'complete-profile',
      title: 'Complete your profile',
      description: `Your profile is ${pct}% complete. A more complete profile helps families feel confident when reviewing you.`,
      reason: 'A stronger profile helps clients feel more confident reviewing you.',
      priority: 'high',
      ctaLabel: 'Open Profile',
      icon: '📝',
      targetScreen: 'profile',
      action: handlers.onNavigateToProfile,
    }
  }

  // 6. Trust Passport not started/incomplete (< 50%)
  if ((context.trustPassportPercent ?? 0) < 50) {
    const pct = context.trustPassportPercent ?? 0
    return {
      id: 'start-trust-passport',
      title: 'Start your Trust Passport',
      description: `Your Trust Passport is ${pct}% complete. Building trust signals helps families make better decisions about their care.`,
      reason: 'Trust signals help families make better decisions.',
      priority: 'medium',
      ctaLabel: 'Open Trust Passport',
      icon: '🛡️',
      targetScreen: 'trust',
      action: handlers.onNavigateToTrust,
    }
  }

  // 7. Service area missing
  if (!context.serviceAreaSet) {
    return {
      id: 'set-service-area',
      title: 'Set your service area',
      description: 'Your service area helps Carehia show you local opportunities without revealing your exact address.',
      reason: 'Families search for caregivers nearby. Setting your area helps you appear in local results.',
      priority: 'medium',
      ctaLabel: 'Set Service Area',
      icon: '📍',
      targetScreen: 'profile',
      action: () => handlers.onNavigateToSection('overview', 'section-service-area'),
    }
  }

  // 8. Availability missing
  if (!context.availabilitySet) {
    return {
      id: 'set-availability',
      title: 'Set your availability',
      description: 'Let Carehia know when you\'re available so we can match you with the right opportunities.',
      reason: 'Availability helps families and Carehia understand when you are ready for work.',
      priority: 'medium',
      ctaLabel: 'Set Availability',
      icon: '📅',
      targetScreen: 'schedule',
      action: handlers.onNavigateToSchedule,
    }
  }

  // 9. Active timer running
  if (context.activeTimer) {
    const clientNote = context.activeTimerClientName ? ` for ${context.activeTimerClientName}` : ''
    return {
      id: 'active-timer',
      title: 'You have a shift in progress',
      description: `You\'re currently tracking time${clientNote}. Open the time tracker to view or manage your active shift.`,
      reason: 'Keeping track of your active shift ensures accurate hours and invoicing.',
      priority: 'medium',
      ctaLabel: 'Open Time Tracker',
      icon: '⏱️',
      targetScreen: 'work',
      action: handlers.onNavigateToWork,
    }
  }

  // 10. Invoice-ready hours
  if ((context.uninvoicedHours ?? 0) > 0) {
    const hrs = Math.round((context.uninvoicedHours ?? 0) * 10) / 10
    const amt = context.readyToInvoiceAmount ?? 0
    const amtStr = amt > 0 ? ` (~$${amt.toFixed(2)})` : ''
    return {
      id: 'create-invoice',
      title: 'Create an invoice from your tracked work',
      description: `You have ${hrs} hour${hrs !== 1 ? 's' : ''} of tracked time${amtStr} ready to be invoiced.`,
      reason: 'Turning tracked hours into invoices helps you get paid faster and keeps your records organized.',
      priority: 'medium',
      ctaLabel: 'Open Money',
      icon: '💰',
      targetScreen: 'earnings',
      action: handlers.onNavigateToEarnings,
    }
  }

  // 11. No clients
  if (context.clientCount === 0) {
    return {
      id: 'add-first-client',
      title: 'Add your first client',
      description: 'Add a private client to start tracking hours, creating invoices, and managing your care work.',
      reason: 'Having clients in Carehia makes it easier to track, invoice, and manage your care work in one place.',
      priority: 'low',
      ctaLabel: 'Add Client',
      icon: '👤',
      targetScreen: 'work',
      action: handlers.onNavigateToWork,
    }
  }

  // 12. Public profile not ready
  if (!context.publicProfileReady) {
    return {
      id: 'public-profile',
      title: 'Prepare your public caregiver profile',
      description: 'Add a photo, bio, skills, rate, and service area so families can find and contact you.',
      reason: 'A complete public profile makes you discoverable to families looking for care.',
      priority: 'low',
      ctaLabel: 'Open Profile',
      icon: '🌐',
      targetScreen: 'profile',
      action: handlers.onNavigateToProfile,
    }
  }

  // 13. Default
  return {
    id: 'review-today',
    title: 'Review your Carehia office',
    description: 'You\'re in great shape! Check your Today screen for any new opportunities, scheduled visits, or updates.',
    reason: 'Staying on top of your Carehia office helps you catch new opportunities early.',
    priority: 'low',
    ctaLabel: 'Open Today',
    icon: '✨',
    targetScreen: 'home',
    action: handlers.onNavigateToHome,
  }
}

// ── Phase 25D: NBA Candidate Model ────────────────────────────────────────
// Generates ALL applicable NBAs as a priority-ranked candidate list
// so Foundation policy can evaluate each before one is displayed.

export type KaiNBACandidate = {
  id: string
  title: string
  description: string
  reason: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  priorityRank: number // 0=critical, 1=high, 2=medium, 3=low — for sorting
  ctaLabel: string
  icon: string
  targetScreen: string
  fallbackMessage?: string
  foundationActionId: string // Maps to kaiActionRegistry ID
  action: () => void
}

/** Priority string → numeric rank for sorting (lower = higher priority) */
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

/**
 * Phase 25D: Generate all applicable NBA candidates in priority order.
 * Unlike getCaregiverNextBestAction (which returns the first match),
 * this returns ALL candidates whose conditions are met, so Foundation
 * can evaluate and filter before display.
 */
export function getCaregiverNBACandidates(
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
): KaiNBACandidate[] {
  const candidates: KaiNBACandidate[] = []
  const status = (context.accountStatus || 'active').toLowerCase()

  // 1. Account/safety restriction (critical)
  if (['suspended', 'blocked', 'deactivated'].includes(status)) {
    candidates.push({
      id: 'account-attention',
      title: 'Account needs attention',
      description: 'Your account is currently restricted. Please contact our support team so we can help resolve this quickly.',
      reason: 'Your account status needs to be resolved before you can access all features.',
      priority: 'critical',
      priorityRank: 0,
      ctaLabel: 'Contact Support',
      icon: '⚠️',
      targetScreen: 'support',
      foundationActionId: 'contact_support',
      action: () => { window.location.href = 'mailto:support@carehia.com' },
    })
  }

  // 2. Onboarding incomplete (high)
  if (!context.onboardingComplete) {
    candidates.push({
      id: 'finish-onboarding',
      title: 'Finish setting up your Carehia office',
      description: 'Complete your initial setup so you can start building your caregiver profile and finding work.',
      reason: 'Setting up your office is the first step to getting discovered by families who need care.',
      priority: 'high',
      priorityRank: 1,
      ctaLabel: 'Continue Onboarding',
      icon: '🚀',
      targetScreen: 'home',
      foundationActionId: 'open_today',
      action: handlers.onNavigateToHome,
    })
  }

  // 3. Phone not verified (high)
  if (!context.phoneVerified) {
    candidates.push({
      id: 'verify-phone',
      title: 'Verify your phone',
      description: 'Phone verification helps protect your account and lets families know your contact information is real.',
      reason: 'Verified contact information helps families and Carehia trust that your account is secure.',
      priority: 'high',
      priorityRank: 1,
      ctaLabel: 'Learn More',
      icon: '📱',
      targetScreen: 'phone-verification',
      fallbackMessage: 'Phone verification is coming soon. We\'ll let you know when it\'s ready.',
      foundationActionId: 'verify_phone',
      action: handlers.onClose,
    })
  }

  // 4. Email not verified (high)
  if (!context.emailVerified) {
    candidates.push({
      id: 'verify-email',
      title: 'Verify your email',
      description: 'Confirm your email address so Carehia and families can reach you reliably.',
      reason: 'A verified email builds confidence that your account is authentic and reachable.',
      priority: 'high',
      priorityRank: 1,
      ctaLabel: 'Verify Email',
      icon: '📧',
      targetScreen: 'profile',
      foundationActionId: 'open_profile',
      action: handlers.onNavigateToProfile,
    })
  }

  // 5. Profile incomplete < 70% (high)
  if ((context.profileCompletePercent ?? 0) < 70) {
    const pct = context.profileCompletePercent ?? 0
    candidates.push({
      id: 'complete-profile',
      title: 'Complete your profile',
      description: `Your profile is ${pct}% complete. A more complete profile helps families feel confident when reviewing you.`,
      reason: 'A stronger profile helps clients feel more confident reviewing you.',
      priority: 'high',
      priorityRank: 1,
      ctaLabel: 'Open Profile',
      icon: '📝',
      targetScreen: 'profile',
      foundationActionId: 'open_profile',
      action: handlers.onNavigateToProfile,
    })
  }

  // 6. Trust Passport < 50% (medium)
  if ((context.trustPassportPercent ?? 0) < 50) {
    const pct = context.trustPassportPercent ?? 0
    candidates.push({
      id: 'start-trust-passport',
      title: 'Start your Trust Passport',
      description: `Your Trust Passport is ${pct}% complete. Building trust signals helps families make better decisions about their care.`,
      reason: 'Trust signals help families make better decisions.',
      priority: 'medium',
      priorityRank: 2,
      ctaLabel: 'Open Trust Passport',
      icon: '🛡️',
      targetScreen: 'trust',
      foundationActionId: 'open_trust_passport',
      action: handlers.onNavigateToTrust,
    })
  }

  // 7. Service area missing (medium)
  if (!context.serviceAreaSet) {
    candidates.push({
      id: 'set-service-area',
      title: 'Set your service area',
      description: 'Your service area helps Carehia show you local opportunities without revealing your exact address.',
      reason: 'Families search for caregivers nearby. Setting your area helps you appear in local results.',
      priority: 'medium',
      priorityRank: 2,
      ctaLabel: 'Set Service Area',
      icon: '📍',
      targetScreen: 'profile',
      foundationActionId: 'set_service_area',
      action: () => handlers.onNavigateToSection('overview', 'section-service-area'),
    })
  }

  // 8. Availability missing (medium)
  if (!context.availabilitySet) {
    candidates.push({
      id: 'set-availability',
      title: 'Set your availability',
      description: 'Let Carehia know when you\'re available so we can match you with the right opportunities.',
      reason: 'Availability helps families and Carehia understand when you are ready for work.',
      priority: 'medium',
      priorityRank: 2,
      ctaLabel: 'Set Availability',
      icon: '📅',
      targetScreen: 'schedule',
      foundationActionId: 'set_availability',
      action: handlers.onNavigateToSchedule,
    })
  }

  // 9. Active timer (medium)
  if (context.activeTimer) {
    const clientNote = context.activeTimerClientName ? ` for ${context.activeTimerClientName}` : ''
    candidates.push({
      id: 'active-timer',
      title: 'You have a shift in progress',
      description: `You're currently tracking time${clientNote}. Open the time tracker to view or manage your active shift.`,
      reason: 'Keeping track of your active shift ensures accurate hours and invoicing.',
      priority: 'medium',
      priorityRank: 2,
      ctaLabel: 'Open Time Tracker',
      icon: '⏱️',
      targetScreen: 'work',
      foundationActionId: 'open_time_tracker',
      action: handlers.onNavigateToWork,
    })
  }

  // 10. Invoice-ready hours (medium)
  if ((context.uninvoicedHours ?? 0) > 0) {
    const hrs = Math.round((context.uninvoicedHours ?? 0) * 10) / 10
    const amt = context.readyToInvoiceAmount ?? 0
    const amtStr = amt > 0 ? ` (~$${amt.toFixed(2)})` : ''
    candidates.push({
      id: 'create-invoice',
      title: 'Create an invoice from your tracked work',
      description: `You have ${hrs} hour${hrs !== 1 ? 's' : ''} of tracked time${amtStr} ready to be invoiced.`,
      reason: 'Turning tracked hours into invoices helps you get paid faster and keeps your records organized.',
      priority: 'medium',
      priorityRank: 2,
      ctaLabel: 'Open Money',
      icon: '💰',
      targetScreen: 'earnings',
      foundationActionId: 'create_invoice_draft',
      action: handlers.onNavigateToEarnings,
    })
  }

  // 11. No clients (low)
  if (context.clientCount === 0) {
    candidates.push({
      id: 'add-first-client',
      title: 'Add your first client',
      description: 'Add a private client to start tracking hours, creating invoices, and managing your care work.',
      reason: 'Having clients in Carehia makes it easier to track, invoice, and manage your care work in one place.',
      priority: 'low',
      priorityRank: 3,
      ctaLabel: 'Add Client',
      icon: '👤',
      targetScreen: 'work',
      foundationActionId: 'open_work',
      action: handlers.onNavigateToWork,
    })
  }

  // 12. Public profile not ready (low)
  if (!context.publicProfileReady) {
    candidates.push({
      id: 'public-profile',
      title: 'Prepare your public caregiver profile',
      description: 'Add a photo, bio, skills, rate, and service area so families can find and contact you.',
      reason: 'A complete public profile makes you discoverable to families looking for care.',
      priority: 'low',
      priorityRank: 3,
      ctaLabel: 'Open Profile',
      icon: '🌐',
      targetScreen: 'profile',
      foundationActionId: 'open_profile',
      action: handlers.onNavigateToProfile,
    })
  }

  // 13. Default fallback (always included as lowest priority)
  candidates.push({
    id: 'review-today',
    title: 'Review your Carehia office',
    description: 'You\'re in great shape! Check your Today screen for any new opportunities, scheduled visits, or updates.',
    reason: 'Staying on top of your Carehia office helps you catch new opportunities early.',
    priority: 'low',
    priorityRank: 3,
    ctaLabel: 'Open Today',
    icon: '✨',
    targetScreen: 'home',
    foundationActionId: 'open_today',
    action: handlers.onNavigateToHome,
  })

  return candidates
}

/** Phase 25D: Safe fallback NBA when all candidates are blocked */
export const SAFE_FALLBACK_NBA: KaiNBACandidate = {
  id: 'contact-support-fallback',
  title: 'We\'re here to help',
  description: 'It looks like we need to figure out your next step together. Reach out to our team and we\'ll get you sorted.',
  reason: 'Our support team can help you with whatever you need.',
  priority: 'low',
  priorityRank: 3,
  ctaLabel: 'Contact Support',
  icon: '💬',
  targetScreen: 'support',
  foundationActionId: 'contact_support',
  action: () => { window.location.href = 'mailto:support@carehia.com' },
}

// ── Context-Based Quick Actions Reordering ───────────────────────────────
export function getContextBasedQuickActions(
  context: CaregiverKaiContext,
  quickActions: KaiQuickAction[]
): KaiQuickAction[] {
  const actions = [...quickActions]
  const boostIds: string[] = []

  // Order of boost priority (first = top)
  if (!context.phoneVerified) boostIds.push('phone')
  if (context.activeTimer) boostIds.push('timer')
  if ((context.uninvoicedHours ?? 0) > 0) boostIds.push('invoice')
  if ((context.trustPassportPercent ?? 0) < 50) boostIds.push('trust')
  if ((context.profileCompletePercent ?? 0) < 70) boostIds.push('profile')

  // Support always at bottom
  const supportIdx = actions.findIndex(a => a.id === 'support')
  let supportAction: KaiQuickAction | null = null
  if (supportIdx !== -1) {
    supportAction = actions.splice(supportIdx, 1)[0]
  }

  // Move boosted items to the front in reverse order (last push = top)
  for (let i = boostIds.length - 1; i >= 0; i--) {
    const idx = actions.findIndex(a => a.id === boostIds[i])
    if (idx > 0) {
      const [item] = actions.splice(idx, 1)
      actions.unshift(item)
    }
  }

  // Re-add support at the end
  if (supportAction) {
    actions.push(supportAction)
  }

  return actions
}
