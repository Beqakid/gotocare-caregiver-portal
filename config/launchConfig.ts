// ─────────────────────────────────────────────────────────────────────────────
// Carehia Launch Policy — Caregiver Free First Year
// ─────────────────────────────────────────────────────────────────────────────
// Set CAREGIVER_FREE_LAUNCH_ACCESS = false to re-enable caregiver subscription
// requirements after the free first-year launch period ends.
//
// This flag is the single source of truth for caregiver access gating.
// It bypasses subscription checks only for caregiver users — client
// subscriptions and safety/auth restrictions are never bypassed.
// ─────────────────────────────────────────────────────────────────────────────

export const CAREGIVER_FREE_LAUNCH_ACCESS = true

// Number of free months from launch date
export const CAREGIVER_FREE_ACCESS_MONTHS = 12

// Launch date (update when known — used for display only)
export const CAREHIA_LAUNCH_DATE = '2025-06-14'

// Internal access reason logged for audit purposes
export const CAREGIVER_ACCESS_REASON = 'free_first_year_launch'
