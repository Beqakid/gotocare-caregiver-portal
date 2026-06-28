// @ts-nocheck
// Phase 25B: Kai Foundation Core — Shared Types
// Defines the type system for the Carehia Kai adapter and action registry.
// These types bridge existing Carehia Kai (24A–24D) with the future Foundation Core.
// No runtime behavior is changed by this file.

// ── App Identity ────────────────────────────────────────────────────────
export type KaiAppId = 'carehia-caregiver'

// ── Risk Classification ─────────────────────────────────────────────────
export type KaiRiskLevel = 'low' | 'medium' | 'high' | 'blocked'

// ── Action Categories ───────────────────────────────────────────────────
export type KaiActionCategory =
  | 'navigation'
  | 'profile'
  | 'trust'
  | 'verification'
  | 'security'
  | 'time_tracking'
  | 'money'
  | 'client'
  | 'support'
  | 'admin_blocked'

// ── Action Execution Modes ──────────────────────────────────────────────
export type KaiActionMode =
  | 'navigate'     // Safe navigation, no data change
  | 'guide'        // Opens a walkthrough or guide
  | 'prepare'      // Opens a screen for user to fill in / confirm
  | 'confirm_required'  // Requires explicit user confirmation before execution
  | 'blocked'      // Cannot be executed by Kai

// ── Action Definition ───────────────────────────────────────────────────
export type KaiActionDefinition = {
  id: string
  label: string
  description: string
  category: KaiActionCategory
  riskLevel: KaiRiskLevel
  mode: KaiActionMode
  targetTab?: string
  targetSubtab?: string
  walkthroughId?: string
  requiresConfirmation: boolean
  requiresPhoneVerified?: boolean
  requiresTrustedDevice?: boolean
  publicSafe: boolean
  blockedReason?: string
}

// ── Policy Decision ─────────────────────────────────────────────────────
export type KaiPolicyDecision = {
  allowed: boolean
  riskLevel: KaiRiskLevel
  requiresConfirmation: boolean
  reason: string
  safeFallback?: string
}

// ── Adapter Result Shape ────────────────────────────────────────────────
export type CarehiaKaiAdapterResult = {
  appId: KaiAppId
  actions: KaiActionDefinition[]
  getActionById: (actionId: string) => KaiActionDefinition | undefined
  evaluateAction: (actionId: string, context?: CarehiaKaiAdapterContext) => KaiPolicyDecision
}

// ── Adapter Context (minimal shape for policy evaluation) ───────────────
// Matches fields from CaregiverKaiContext in kaiContext.ts without importing it.
// This keeps the adapter layer decoupled in Phase 25B.
export type CarehiaKaiAdapterContext = {
  accountStatus?: string
  phoneVerified?: boolean
  emailVerified?: boolean
  onboardingComplete?: boolean
  setupComplete?: boolean
  trustPassportPercent?: number
}
