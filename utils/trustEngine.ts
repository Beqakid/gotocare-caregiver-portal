// @ts-nocheck
// utils/trustEngine.ts
// Phase 8 — Full Modular Carehia Trust Passport Engine
// ─────────────────────────────────────────────────────
// This is the single source of truth for:
//   - module definitions + status derivation
//   - weighted trust score (0–100)
//   - 5-level trust level calculation
//   - smart next-step recommendation
//   - public badge eligibility
//   - getTrustPassportSummary() — main entry point used by both
//     TrustPassport.tsx (full page) and HomeTab.tsx (card)

export type ModuleType =
  | 'basic_profile'
  | 'contact_verification'
  | 'selfie_intro'
  | 'care_experience'
  | 'references'
  | 'certifications'
  | 'background_permission'
  | 'carehia_review'
  | 'work_history'
  | 'manual_proof'

export type ModuleStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Submitted'
  | 'Needs a Quick Fix'
  | 'Verified'
  | 'Expired'

export interface TrustPassportModule {
  caregiverId?: string
  moduleType: ModuleType
  title: string
  description: string
  status: ModuleStatus
  completionPercentage: number
  estimatedTime: string
  nextAction: string
  unlockMessage: string
  publicBadgeEligibility: boolean
  lastUpdatedAt?: string
  expiresAt?: string
  needsFixReason?: string
  comingSoon?: boolean
  metadata?: Record<string, any>
}

export interface NextTrustStep {
  step: string
  explanation: string
  unlockMessage: string
  actionTarget: ModuleType | null
}

export interface TrustPassportSummary {
  caregiverId?: string
  trustLevel: number           // 1–5
  trustLevelName: string
  trustScore: number           // 0–100 weighted
  completionPercentage: number // 0–100 weighted
  nextRecommendedStep: string
  nextRecommendedModule: ModuleType | null
  nextUnlock: string
  nextActionExplanation: string
  publicBadges: string[]
  clientVisibilityStatus: 'visible' | 'limited' | 'hidden'
  jobEligibilityStatus: 'eligible' | 'limited' | 'not_eligible'
  updatedAt: string
  modules: TrustPassportModule[]
}

// ─── Module weights (must sum to 100 excluding manual_proof = 0) ──────────
const MODULE_WEIGHTS: Record<ModuleType, number> = {
  basic_profile:         15,
  contact_verification:  10,
  selfie_intro:          10,
  care_experience:       15,
  references:            10,
  certifications:        15,
  background_permission: 10,
  carehia_review:        10,
  work_history:           5,
  manual_proof:           0, // support module — doesn't contribute to score
}

function statusScore(status: ModuleStatus, weight: number): number {
  switch (status) {
    case 'Verified':           return weight
    case 'Submitted':          return weight * 0.8
    case 'In Progress':        return weight * 0.3
    case 'Needs a Quick Fix':  return weight * 0.5
    case 'Expired':            return weight * 0.1
    case 'Not Started':        return 0
  }
}

// ─── Safe JSON parse helper ───────────────────────────────────────────────
function tryParseArray(val: any): any[] {
  if (Array.isArray(val)) return val
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

// ─── Build module list from caregiver profile + documents ─────────────────
export function buildTrustModules(profile: any, documents: any[]): TrustPassportModule[] {
  const docs = Array.isArray(documents) ? documents : []
  const now = new Date()

  // ── Basic Profile ──
  const hasName = !!(
    profile?.name ||
    (profile?.firstName && profile?.lastName) ||
    (profile?.first_name && profile?.last_name)
  )
  const hasBio = !!(profile?.bio && String(profile.bio).trim().length > 20)
  const hasPhoto = !!(profile?.photo_url || profile?.photoUrl || profile?.profilePhoto)
  const hasRate = !!(profile?.hourly_rate || profile?.hourlyRate)
  const hasLocation = !!(
    profile?.city || profile?.state ||
    profile?.zip_code || profile?.zipCode
  )
  const basicFields = [hasName, hasBio, hasPhoto, hasRate, hasLocation]
  const basicCount = basicFields.filter(Boolean).length
  const basicPct = Math.round((basicCount / 5) * 100)
  const basicStatus: ModuleStatus =
    basicCount === 5 ? 'Verified' :
    basicCount >= 2 ? 'In Progress' :
    'Not Started'

  // ── Contact Verification ──
  const emailVerified = !!(profile?.email_verified || profile?.emailVerified)
  const contactStatus: ModuleStatus = emailVerified ? 'Verified' : 'In Progress'

  // ── Selfie & Intro ──
  const selfieOk = hasPhoto && hasBio
  const selfieStatus: ModuleStatus =
    selfieOk ? 'Verified' :
    hasPhoto ? 'In Progress' :
    'Not Started'

  // ── Care Experience ──
  const skills      = tryParseArray(profile?.skills)
  const careTypes   = tryParseArray(profile?.care_types)
  const hasSkills   = skills.length + careTypes.length > 0
  const careExpStatus: ModuleStatus = hasSkills ? 'Verified' : 'Not Started'

  // ── References — coming soon (no D1 table yet) ──
  const refsStatus: ModuleStatus = 'Not Started'

  // ── Certifications ──
  const certDocs     = docs.filter(d => d.type === 'certification')
  const hasCertExpired = certDocs.some(d => {
    const exp = d.expiration_date || d.expirationDate
    return exp && new Date(exp) < now
  })
  const certStatus: ModuleStatus =
    certDocs.length === 0 ? 'Not Started' :
    hasCertExpired ? 'Expired' : 'Submitted'

  // ── Background Check Permission ──
  const bgDoc = docs.find(d => d.type === 'background_check')
  const bgStatus: ModuleStatus = bgDoc ? 'Submitted' : 'Not Started'

  // ── Carehia Review — set by admin only ──
  const reviewStatus: ModuleStatus = 'Not Started'

  // ── Work History Trust — earned over time ──
  const workStatus: ModuleStatus = 'Not Started'

  // ── Manual Proof ──
  const manualDocs = docs.filter(d =>
    !['certification', 'background_check'].includes(d.type)
  )
  const manualStatus: ModuleStatus = manualDocs.length > 0 ? 'Submitted' : 'Not Started'

  return [
    {
      moduleType: 'basic_profile',
      title: 'Basic Profile',
      description: 'Name, photo, hourly rate, location, and a short bio so families can get to know you.',
      status: basicStatus,
      completionPercentage: basicPct,
      estimatedTime: '5 min',
      nextAction: 'Complete Profile',
      unlockMessage: 'Appear in caregiver search results and get discovered by families.',
      publicBadgeEligibility: false,
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      moduleType: 'contact_verification',
      title: 'Contact Verification',
      description: 'Confirm your email so Carehia and families know you are reachable.',
      status: contactStatus,
      completionPercentage: emailVerified ? 100 : 50,
      estimatedTime: '2 min',
      nextAction: emailVerified ? 'Verified' : 'Verify Email',
      unlockMessage: 'Builds client confidence that your contact info is real.',
      publicBadgeEligibility: true,
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      moduleType: 'selfie_intro',
      title: 'Selfie & Intro',
      description: 'A clear profile photo and a brief written greeting for families.',
      status: selfieStatus,
      completionPercentage: selfieOk ? 100 : hasPhoto ? 50 : 0,
      estimatedTime: '3 min',
      nextAction: 'Add Photo & Bio',
      unlockMessage: '3\u00d7 more profile views from families browsing caregivers.',
      publicBadgeEligibility: false,
    },
    {
      moduleType: 'care_experience',
      title: 'Care Experience',
      description: 'Your care specialties, skills, and what types of care you provide.',
      status: careExpStatus,
      completionPercentage: hasSkills ? 100 : 0,
      estimatedTime: '5 min',
      nextAction: 'Add Skills',
      unlockMessage: 'Match with families looking for your specific care expertise.',
      publicBadgeEligibility: false,
    },
    {
      moduleType: 'references',
      title: 'References',
      description: 'Professional or personal contacts who can vouch for your care work.',
      status: refsStatus,
      completionPercentage: 0,
      estimatedTime: '5 min',
      nextAction: 'Add References',
      unlockMessage: 'Trusted Caregiver badge \u2014 one of the most trust-building signals.',
      publicBadgeEligibility: true,
      comingSoon: true,
    },
    {
      moduleType: 'certifications',
      title: 'Certifications & Skills',
      description: 'CPR, First Aid, CNA, or any other credentials you hold.',
      status: certStatus,
      completionPercentage: certDocs.length === 0 ? 0 : hasCertExpired ? 30 : 80,
      estimatedTime: '5 min',
      nextAction: hasCertExpired ? 'Renew Certification' : certDocs.length > 0 ? 'View Certs' : 'Add Certifications',
      unlockMessage: 'Certification Verified badge visible on your public profile.',
      publicBadgeEligibility: true,
    },
    {
      moduleType: 'background_permission',
      title: 'Background Check Permission',
      description: 'Authorise a basic background check to unlock full platform access.',
      status: bgStatus,
      completionPercentage: bgDoc ? 60 : 0,
      estimatedTime: '2 min',
      nextAction: bgDoc ? 'Submitted' : 'Give Permission',
      unlockMessage: 'Background Checked badge + priority placement in search results.',
      publicBadgeEligibility: true,
      comingSoon: !bgDoc,
    },
    {
      moduleType: 'carehia_review',
      title: 'Carehia Review',
      description: 'Our team does a quick manual review of your profile once you complete the steps above.',
      status: reviewStatus,
      completionPercentage: 0,
      estimatedTime: '24\u201348 hrs',
      nextAction: 'Learn More',
      unlockMessage: 'Carehia Verified badge \u2014 the highest trust signal for families.',
      publicBadgeEligibility: true,
      comingSoon: true,
    },
    {
      moduleType: 'work_history',
      title: 'Work History Trust',
      description: 'Completed care visits, ratings, and repeat clients build your ongoing trust score.',
      status: workStatus,
      completionPercentage: 0,
      estimatedTime: 'Earned over time',
      nextAction: 'Start Working',
      unlockMessage: 'Experienced Caregiver badge + Trusted Pro status.',
      publicBadgeEligibility: true,
      comingSoon: true,
    },
    {
      moduleType: 'manual_proof',
      title: 'Manual Proof',
      description: 'Having trouble verifying a step? Upload proof manually and our team will review it.',
      status: manualStatus,
      completionPercentage: manualDocs.length > 0 ? 60 : 0,
      estimatedTime: '5 min',
      nextAction: 'Upload Document',
      unlockMessage: 'Skip automated checks with direct team review.',
      publicBadgeEligibility: false,
    },
  ]
}

// ─── Weighted trust score 0–100 ───────────────────────────────────────────
export function computeTrustScore(modules: TrustPassportModule[]): number {
  let score = 0
  for (const mod of modules) {
    const w = MODULE_WEIGHTS[mod.moduleType] ?? 0
    score += statusScore(mod.status, w)
  }
  return Math.min(100, Math.round(score))
}

// ─── Weighted completion % (same formula, for display) ────────────────────
export function computeCompletionPercentage(modules: TrustPassportModule[]): number {
  let earned = 0
  let total  = 0
  for (const mod of modules) {
    const w = MODULE_WEIGHTS[mod.moduleType] ?? 0
    if (w === 0) continue
    total  += w
    earned += statusScore(mod.status, w)
  }
  if (total === 0) return 0
  return Math.min(100, Math.round((earned / total) * 100))
}

// ─── 5-Level trust level ─────────────────────────────────────────────────
// Level 1 — Getting Started
// Level 2 — Identity Ready
// Level 3 — Care Ready
// Level 4 — Carehia Verified
// Level 5 — Trusted Pro (reserved — no work history data yet)
export function computeTrustLevel(modules: TrustPassportModule[]): { level: number; name: string; color: string } {
  const s = Object.fromEntries(modules.map(m => [m.moduleType, m.status])) as Record<ModuleType, ModuleStatus>
  const verified   = (t: ModuleType) => s[t] === 'Verified'
  const submitted  = (t: ModuleType) => ['Verified', 'Submitted'].includes(s[t] || '')
  const started    = (t: ModuleType) => ['In Progress', 'Submitted', 'Verified', 'Needs a Quick Fix'].includes(s[t] || '')

  // Level 4 — Carehia Verified
  if (
    verified('basic_profile') &&
    verified('contact_verification') &&
    submitted('certifications') &&
    submitted('background_permission') &&
    submitted('carehia_review')
  ) return { level: 4, name: 'Carehia Verified', color: '#7C5CFF' }

  // Level 3 — Care Ready
  if (
    verified('basic_profile') &&
    verified('contact_verification') &&
    submitted('care_experience') &&
    (submitted('certifications') || submitted('references'))
  ) return { level: 3, name: 'Care Ready', color: '#4A90E2' }

  // Level 2 — Identity Ready
  if (
    verified('basic_profile') &&
    submitted('contact_verification') &&
    started('selfie_intro')
  ) return { level: 2, name: 'Identity Ready', color: '#22C55E' }

  // Level 1 — Getting Started (any activity)
  if (started('basic_profile') || started('contact_verification'))
    return { level: 1, name: 'Getting Started', color: '#F59E0B' }

  return { level: 1, name: 'Getting Started', color: '#F59E0B' }
}

// ─── Smart next-step recommendation ─────────────────────────────────────
export function getNextTrustStep(modules: TrustPassportModule[]): NextTrustStep {
  const s = Object.fromEntries(modules.map(m => [m.moduleType, m.status])) as Record<ModuleType, ModuleStatus>
  const incomplete = (t: ModuleType) => !['Verified', 'Submitted'].includes(s[t] || '')

  if (incomplete('basic_profile')) return {
    step: 'Complete your basic profile',
    explanation: 'Add your name, photo, bio, rate, and location.',
    unlockMessage: 'Appear in caregiver search results.',
    actionTarget: 'basic_profile',
  }
  if (incomplete('contact_verification')) return {
    step: 'Verify your contact info',
    explanation: 'Confirm your email so families and Carehia can reach you.',
    unlockMessage: 'Builds client confidence in your contact info.',
    actionTarget: 'contact_verification',
  }
  if (incomplete('selfie_intro')) return {
    step: 'Add a selfie & intro',
    explanation: 'A clear photo and short bio help families trust you instantly.',
    unlockMessage: '3\u00d7 more profile views from browsing families.',
    actionTarget: 'selfie_intro',
  }
  if (incomplete('care_experience')) return {
    step: 'Add your care experience',
    explanation: 'Select the care types and skills you specialise in.',
    unlockMessage: 'Match with families looking for your expertise.',
    actionTarget: 'care_experience',
  }
  if (incomplete('certifications')) return {
    step: 'Add certifications or skills',
    explanation: 'Upload CPR, CNA, First Aid, or any other credentials.',
    unlockMessage: 'Certification Verified badge on your profile.',
    actionTarget: 'certifications',
  }
  if (incomplete('references')) return {
    step: 'Add a reference',
    explanation: 'One strong reference goes a long way with families.',
    unlockMessage: 'Trusted Caregiver badge.',
    actionTarget: 'references',
  }
  if (incomplete('background_permission')) return {
    step: 'Give background check permission',
    explanation: 'Authorise a basic background check for full platform access.',
    unlockMessage: 'Background Checked badge + premium family matches.',
    actionTarget: 'background_permission',
  }
  if (incomplete('carehia_review')) return {
    step: 'Submit for Carehia Review',
    explanation: 'Our team will do a quick review — usually done in 24\u201348 hrs.',
    unlockMessage: 'Carehia Verified badge \u2014 the highest trust signal.',
    actionTarget: 'carehia_review',
  }
  return {
    step: 'Keep your Trust Passport current',
    explanation: 'Renew certifications and keep your profile up to date.',
    unlockMessage: 'Stay visible and trusted as a Carehia professional.',
    actionTarget: null,
  }
}

// ─── Public badges earned ────────────────────────────────────────────────
export function getPublicBadges(modules: TrustPassportModule[]): string[] {
  const s = Object.fromEntries(modules.map(m => [m.moduleType, m.status])) as Record<ModuleType, ModuleStatus>
  const badges: string[] = []
  if (s['contact_verification'] === 'Verified') badges.push('Email Verified')
  if (
    s['basic_profile'] === 'Verified' &&
    ['Verified', 'Submitted'].includes(s['contact_verification'] || '')
  ) badges.push('Identity Ready')
  if (['Verified', 'Submitted'].includes(s['certifications'] || '')) badges.push('Certification Verified')
  if (['Verified', 'Submitted'].includes(s['background_permission'] || '')) badges.push('Background Check Completed')
  if (s['carehia_review'] === 'Verified') badges.push('Carehia Verified')
  if (s['references'] === 'Verified') badges.push('References Verified')
  return badges
}

// ─── Main entry point ─────────────────────────────────────────────────────
export function getTrustPassportSummary(profile: any, documents: any[]): TrustPassportSummary {
  const modules              = buildTrustModules(profile, documents)
  const trustScore           = computeTrustScore(modules)
  const completionPercentage = computeCompletionPercentage(modules)
  const { level, name: trustLevelName } = computeTrustLevel(modules)
  const nextStep             = getNextTrustStep(modules)
  const publicBadges         = getPublicBadges(modules)

  const clientVisibilityStatus: 'visible' | 'limited' | 'hidden' =
    completionPercentage >= 70 ? 'visible' :
    completionPercentage >= 30 ? 'limited' : 'hidden'

  const jobEligibilityStatus: 'eligible' | 'limited' | 'not_eligible' =
    level >= 3 ? 'eligible' :
    level >= 2 ? 'limited' : 'not_eligible'

  return {
    trustLevel:             level,
    trustLevelName,
    trustScore,
    completionPercentage,
    nextRecommendedStep:    nextStep.step,
    nextRecommendedModule:  nextStep.actionTarget,
    nextUnlock:             nextStep.unlockMessage,
    nextActionExplanation:  nextStep.explanation,
    publicBadges,
    clientVisibilityStatus,
    jobEligibilityStatus,
    updatedAt:              new Date().toISOString(),
    modules,
  }
}
