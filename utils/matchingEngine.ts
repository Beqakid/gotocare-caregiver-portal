// @ts-nocheck
// utils/matchingEngine.ts
// Phase 12 — Carehia Trust-Based Matching and Visibility Engine
//
// Provides a reusable calculateCaregiverMatchScore() helper used by:
//   - Caregiver portal: HomeTab visibility guidance, RequestsTab match chips
//   - Admin worker: /caregiver-match-explain endpoint
//   - Client portal: FindCareTab caregiver ranking
//
// PRIVACY RULES (enforced here):
//   - publicSafeReasons → safe to show clients and caregivers
//   - adminOnlyReasons  → NEVER expose to clients, public API, or caregivers
//   - caregiverGuidance → positive only, safe to show caregiver
//   - No background report details, SSN, ITIN, DOB, address, or admin notes

// ── Types ──────────────────────────────────────────────────────────────

export type EligibilityStatus =
  | 'not_ready'       // Profile too incomplete / Level 1 — not visible to clients
  | 'internal_only'   // Admin-visible only, not client-facing / Level 2
  | 'can_apply'       // Can respond to basic requests / Level 3
  | 'client_visible'  // Appears in client-facing search / Level 4
  | 'priority_match'  // Trusted Pro — priority ranking / Level 5
  | 'blocked';        // Admin-flagged — suspended or blocked

export interface CareRequest {
  careTypes?: string[];       // e.g. ['Dementia Care', 'Meal Preparation']
  zipCode?: string;
  city?: string;
  state?: string;
  preferredDays?: string[];   // TODO: match against caregiver_availability
  preferredTime?: string;
}

export interface CaregiverMatchContext {
  // Admin flags — if present, can override eligibility to 'blocked'
  adminFlags?: string[];              // e.g. ['suspended', 'blocked']
  // Availability — TODO: replace with real caregiver_availability table data
  hasAvailability?: boolean;
  // Location (falls back to profile.location if not provided)
  caregiverZip?: string;
  caregiverCity?: string;
  caregiverState?: string;
  // Work history — from Phase 11 /work-history-trust endpoint
  avgRating?: number;
  reviewCount?: number;
  completedVisits?: number;
  paidInvoices?: number;
  repeatClients?: number;
  activeCerts?: number;
  // Response speed — TODO: add when caregiver_response_metrics table is active
  // avgResponseTimeMins?: number;
}

export interface MatchScoreResult {
  totalScore: number;                   // 0–100
  trustScoreComponent: number;          // 0–25  — Trust Passport level
  skillsScoreComponent: number;         // 0–20  — skills / care type match
  availabilityScoreComponent: number;   // 0–15  — availability match
  locationScoreComponent: number;       // 0–15  — location / distance match
  ratingScoreComponent: number;         // 0–10  — avg rating + reviews
  workHistoryScoreComponent: number;    // 0–10  — completed visits + invoices
  responseScoreComponent: number;       // 0–5   — response speed (pending data)
  eligibilityStatus: EligibilityStatus;
  rankingReasons: string[];             // combined public reasons
  publicSafeReasons: string[];          // safe to show clients/public
  adminOnlyReasons: string[];           // NEVER expose to clients
  caregiverGuidance: string[];          // positive guidance for caregiver
}

// ── Eligibility labels (caregiver-facing) ─────────────────────────────

export const ELIGIBILITY_LABELS: Record<EligibilityStatus, {
  label: string; color: string; emoji: string; shortLabel: string;
}> = {
  not_ready:      { label: 'Not visible yet',           shortLabel: 'Not visible',      color: '#94a3b8', emoji: '🔒' },
  internal_only:  { label: 'Visible to Carehia team',   shortLabel: 'Team review',       color: '#f59e0b', emoji: '👁️' },
  can_apply:      { label: 'Can apply to requests',     shortLabel: 'Can apply',         color: '#3b82f6', emoji: '✋' },
  client_visible: { label: 'Visible to families',       shortLabel: 'Family visible',    color: '#22c55e', emoji: '✅' },
  priority_match: { label: 'Priority visibility',       shortLabel: 'Trusted Pro',       color: '#7c5cff', emoji: '⭐' },
  blocked:        { label: 'Account under review',      shortLabel: 'Under review',      color: '#ef4444', emoji: '⚠️' },
}

// ── Scoring functions ─────────────────────────────────────────────────

/**
 * Trust Passport level → score (0–25)
 * Level 1: 0  — profile too new, not eligible
 * Level 2: 8  — identity confirmed, admin-visible
 * Level 3: 15 — care-ready, can apply to basic requests
 * Level 4: 22 — Carehia Verified, full client visibility
 * Level 5: 25 — Trusted Pro, priority ranking
 */
export function trustLevelToScore(level: number): number {
  const map: Record<number, number> = { 1: 0, 2: 8, 3: 15, 4: 22, 5: 25 }
  return map[level] ?? 0
}

/**
 * Trust level → eligibility status
 * Used by HomeTab, TrustPassport, and admin explain endpoint
 */
export function trustLevelToEligibility(level: number): EligibilityStatus {
  if (level <= 1) return 'not_ready'
  if (level === 2) return 'internal_only'
  if (level === 3) return 'can_apply'
  if (level === 4) return 'client_visible'
  return 'priority_match'
}

/**
 * Shortcut: get eligibility from trust level alone
 * Used when full profile is not needed (e.g. HomeTab Trust Passport card)
 */
export function getEligibilityFromTrustLevel(level: number): EligibilityStatus {
  return trustLevelToEligibility(level)
}

// Skills match score (0–20)
// TODO: enhance with full 23-skill taxonomy matching when care request has multiple types
function _skillsMatchScore(caregiverSkills: string[], requestCareTypes: string[]): number {
  if (!requestCareTypes?.length) return 10 // no specific request = neutral
  if (!caregiverSkills?.length) return 0
  const normSkills = caregiverSkills.map(s => s.toLowerCase().trim())
  const matched = requestCareTypes.filter(rt => {
    const normRT = rt.toLowerCase()
    return normSkills.some(s => s.includes(normRT) || normRT.includes(s))
  })
  return Math.round((matched.length / requestCareTypes.length) * 20)
}

// Location score (0–15)
// TODO: replace with real distance calculation using zip code distance API
// or caregiver_availability.location when that table has precise geo data
function _locationScore(
  cgZip?: string, cgCity?: string, cgState?: string,
  reqZip?: string, reqCity?: string, reqState?: string,
): number {
  if (!reqZip && !reqCity && !reqState) return 10 // no location preference = neutral
  if (cgZip && reqZip && cgZip.trim() === reqZip.trim()) return 15
  if (cgCity && reqCity && cgCity.toLowerCase() === reqCity.toLowerCase()) return 12
  if (cgState && reqState && cgState.toLowerCase() === reqState.toLowerCase()) return 8
  return 3
}

// Availability score (0–15)
// TODO: match specific requested days/times against caregiver_availability table
function _availabilityScore(hasAvailability?: boolean): number {
  if (hasAvailability === true)  return 12  // has availability set
  if (hasAvailability === false) return 0   // explicitly no availability
  return 7                                   // unknown = partial credit
}

// Rating score (0–10)
function _ratingScore(avgRating?: number, reviewCount?: number): number {
  if (!avgRating || !reviewCount) return 5  // no reviews = neutral
  if (reviewCount < 2) return 4
  if (avgRating >= 4.9) return 10
  if (avgRating >= 4.7) return 9
  if (avgRating >= 4.5) return 8
  if (avgRating >= 4.2) return 7
  if (avgRating >= 4.0) return 6
  return 3
}

// Work history score (0–10)
function _workHistoryScore(completedVisits?: number, paidInvoices?: number): number {
  const v = completedVisits ?? 0
  const i = paidInvoices ?? 0
  if (v >= 20 || i >= 10) return 10
  if (v >= 10 || i >= 5)  return 8
  if (v >= 5  || i >= 3)  return 6
  if (v >= 1  || i >= 1)  return 4
  return 0
}

// Response speed score (0–5)
// TODO: use caregiver_response_metrics.avg_response_time_minutes when available
// Data dependency: response tracking not yet live in dispatch flow
function _responseSpeedScore(): number {
  return 3  // default neutral until response metrics table is populated
}

// ── Reason builders ───────────────────────────────────────────────────

function _parseSkills(skills: any): string[] {
  if (Array.isArray(skills)) return skills
  if (typeof skills === 'string') {
    try { return JSON.parse(skills) } catch { return skills.split(',').map(s => s.trim()).filter(Boolean) }
  }
  return []
}

function _parseCertifications(certs: any): string[] {
  if (!certs) return []
  const arr = Array.isArray(certs) ? certs
    : typeof certs === 'string' ? (() => { try { return JSON.parse(certs) } catch { return [] } })()
    : []
  return arr.map(c => (typeof c === 'object' ? (c.name || '') : String(c))).filter(Boolean)
}

function _buildPublicSafeReasons(
  profile: any,
  trustLevel: number,
  skillsSc: number,
  locationSc: number,
  ratingSc: number,
  workSc: number,
  hasAvailability?: boolean,
): string[] {
  const reasons: string[] = []

  // Trust status
  if (trustLevel >= 5)      reasons.push('Trusted Pro')
  else if (trustLevel >= 4) reasons.push('Carehia Verified')

  // Skills
  if (skillsSc >= 16)      reasons.push('Strong care type match')
  else if (skillsSc >= 10) reasons.push('Care experience match')

  // Certifications (safe names only — no document details)
  const certs = _parseCertifications(profile?.certifications)
  if (certs.some(c => /cpr/i.test(c)))              reasons.push('CPR Certified')
  if (certs.some(c => /first.?aid/i.test(c)))        reasons.push('First Aid Certified')
  if (certs.some(c => /cna|nursing.?aide/i.test(c))) reasons.push('Certified Nursing Aide')

  // Care specialties from skills (public names only)
  const skills = _parseSkills(profile?.skills)
  if (skills.some(s => /dementia|alzheimer/i.test(s)))     reasons.push('Dementia care experience')
  if (skills.some(s => /senior|elder|aging/i.test(s)))     reasons.push('Senior care experience')
  if (skills.some(s => /pediatric|child|infant/i.test(s))) reasons.push('Child care experience')
  if (skills.some(s => /mobility|transfer|hoyer/i.test(s))) reasons.push('Mobility assistance')

  // Location
  if (locationSc >= 12) reasons.push('Near your area')

  // Availability
  if (hasAvailability) reasons.push('Available for care')

  // Rating/reviews
  if (ratingSc >= 9) reasons.push('Highly rated')

  // Work history (safe public label)
  if (workSc >= 8)      reasons.push('Completed Carehia visits')
  else if (workSc >= 4) reasons.push('Growing care record')

  return reasons.slice(0, 5)  // max 5 public reasons
}

// NEVER expose adminOnlyReasons to clients, caregivers, or public endpoints
function _buildAdminOnlyReasons(
  trustLevel: number,
  completenessScore: number,
  context: CaregiverMatchContext,
  totalScore: number,
): string[] {
  const reasons: string[] = []
  if (trustLevel <= 1) reasons.push(`Trust Passport level ${trustLevel}: profile incomplete`)
  if (completenessScore < 50) reasons.push(`Profile completeness: ${completenessScore}% (below 50% threshold)`)
  if (completenessScore >= 50 && completenessScore < 70) reasons.push(`Profile completeness: ${completenessScore}% (below 70% search threshold)`)
  if (!context.hasAvailability) reasons.push('No availability schedule set')
  if (!context.avgRating) reasons.push('No client reviews yet')
  if ((context.completedVisits ?? 0) === 0) reasons.push('No completed visits recorded')
  if ((context.activeCerts ?? 0) === 0) reasons.push('No active certifications')
  if (totalScore < 30) reasons.push('Low match score — suggest Trust Passport completion')
  if (context.adminFlags?.length) reasons.push(`Admin flags: ${context.adminFlags.join(', ')}`)
  return reasons
}

// Positive guidance for caregivers only — never harsh
function _buildCaregiverGuidance(
  trustLevel: number,
  completenessScore: number,
  hasAvailability?: boolean,
  hasSkills?: boolean,
  hasCerts?: boolean,
): string[] {
  const guidance: string[] = []
  if (trustLevel <= 2) {
    guidance.push('Complete your Trust Passport to improve visibility to families.')
  }
  if (!hasAvailability) {
    guidance.push('Add your availability so families in your area can find you.')
  }
  if (!hasSkills) {
    guidance.push('Add your care specialties so families can find the right fit.')
  }
  if (!hasCerts) {
    guidance.push('Add a certification like CPR to qualify for more care requests.')
  }
  if (trustLevel === 3) {
    guidance.push('Complete Carehia Verification to appear directly in family searches.')
  }
  if (trustLevel === 4 && completenessScore >= 70) {
    guidance.push('Great work — you are fully visible to families in your area.')
  }
  if (trustLevel >= 5) {
    guidance.push('Trusted Pro status — you have priority visibility in family searches.')
  }
  return guidance.slice(0, 3)
}

// Apply admin flags — can demote to 'blocked' regardless of trust level
function _applyAdminFlags(base: EligibilityStatus, flags?: string[]): EligibilityStatus {
  if (!flags?.length) return base
  if (flags.some(f => ['blocked', 'suspended', 'deactivated'].includes(f.toLowerCase()))) return 'blocked'
  return base
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────

/**
 * calculateCaregiverMatchScore
 *
 * Core matching engine. Pass a caregiver profile + optional care request + context.
 * Returns a full match score with component breakdown + eligibility + reason sets.
 *
 * Usage:
 *   const result = calculateCaregiverMatchScore(profile, trustLevel, completeness, careRequest, context)
 *
 * @param profile           caregiver_accounts row (or CaregiverProfile object)
 * @param trustLevel        1–5 from trustEngine.computeTrustLevel()
 * @param completenessScore 0–100 from calculateCompleteness()
 * @param careRequest       optional — care request details for skill/location matching
 * @param context           optional — extra signals (availability, ratings, work history)
 */
export function calculateCaregiverMatchScore(
  profile: any,
  trustLevel: number,
  completenessScore: number,
  careRequest: CareRequest = {},
  context: CaregiverMatchContext = {},
): MatchScoreResult {
  const skills = _parseSkills(profile?.skills)
  const certs  = _parseCertifications(profile?.certifications)

  // ── Component scores ──────────────────────────────────────────────
  const trustSc    = trustLevelToScore(trustLevel)
  const skillsSc   = _skillsMatchScore(skills, careRequest.careTypes ?? [])
  const locSc      = _locationScore(
    context.caregiverZip  ?? profile?.location?.zipCode ?? profile?.zip_code,
    context.caregiverCity ?? profile?.location?.city    ?? profile?.city,
    context.caregiverState ?? profile?.location?.state  ?? profile?.state,
    careRequest.zipCode, careRequest.city, careRequest.state,
  )
  const availSc    = _availabilityScore(
    context.hasAvailability ?? (profile?.availability
      ? Object.values(profile.availability).some((day: any) => day?.length > 0)
      : undefined)
  )
  const ratingSc   = _ratingScore(context.avgRating, context.reviewCount)
  const workSc     = _workHistoryScore(context.completedVisits, context.paidInvoices)
  const responseSc = _responseSpeedScore()

  const totalScore = trustSc + skillsSc + locSc + availSc + ratingSc + workSc + responseSc

  // ── Eligibility ───────────────────────────────────────────────────
  const baseEligibility  = trustLevelToEligibility(trustLevel)
  const eligibilityStatus = _applyAdminFlags(baseEligibility, context.adminFlags)

  // ── Reasons ───────────────────────────────────────────────────────
  const hasAvailability = context.hasAvailability ??
    (profile?.availability ? Object.values(profile.availability).some((d: any) => d?.length > 0) : undefined)

  const publicSafeReasons = _buildPublicSafeReasons(profile, trustLevel, skillsSc, locSc, ratingSc, workSc, hasAvailability)
  const adminOnlyReasons  = _buildAdminOnlyReasons(trustLevel, completenessScore, context, totalScore)
  const caregiverGuidance = _buildCaregiverGuidance(
    trustLevel, completenessScore,
    hasAvailability,
    skills.length > 0,
    certs.length > 0,
  )
  const rankingReasons = [...publicSafeReasons]

  return {
    totalScore,
    trustScoreComponent:        trustSc,
    skillsScoreComponent:       skillsSc,
    availabilityScoreComponent: availSc,
    locationScoreComponent:     locSc,
    ratingScoreComponent:       ratingSc,
    workHistoryScoreComponent:  workSc,
    responseScoreComponent:     responseSc,
    eligibilityStatus,
    rankingReasons,
    publicSafeReasons,
    adminOnlyReasons,
    caregiverGuidance,
  }
}

/**
 * getVisibilityScoreForClient
 *
 * Simplified version for client-portal ranking.
 * Returns a 0–100 score from public data only — no private reasons exposed.
 * Used by FindCareTab to sort caregivers.
 *
 * @param trustBadgeCount  number of public trust badges from /public-trust-badges
 * @param rating           public avg rating
 * @param reviewCount      public review count
 * @param skillMatchCount  how many of the client's selected needs match caregiver skills
 * @param totalNeeds       total needs the client selected
 */
export function getVisibilityScoreForClient(
  trustBadgeCount: number,
  rating: number,
  reviewCount: number,
  skillMatchCount: number,
  totalNeeds: number,
): number {
  const trustBonus    = Math.min(trustBadgeCount * 6, 24)  // 0–24 (4 badges max)
  const ratingBonus   = rating >= 4.9 ? 20 : rating >= 4.7 ? 18 : rating >= 4.5 ? 15 : rating >= 4.0 ? 12 : 8
  const reviewBonus   = Math.min(reviewCount * 2, 16)      // 0–16
  const needRatio     = totalNeeds > 0 ? skillMatchCount / totalNeeds : 0.5
  const needsBonus    = Math.round(needRatio * 30)         // 0–30
  const base          = 10                                  // minimum baseline
  return Math.min(100, base + trustBonus + ratingBonus + reviewBonus + needsBonus)
}
