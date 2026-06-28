// @ts-nocheck
// Phase 25B: Kai Foundation Core — Carehia Adapter
// Wraps existing Carehia Kai context, NBA, and walkthrough systems
// into a Foundation Core-compatible interface.
//
// This adapter does NOT replace any existing Kai behavior.
// It does NOT wire into KaiPanel or modify runtime routing.
// It provides a clean bridge for future Foundation Core integration (Phase 25C+).

import type {
  KaiAppId,
  KaiRiskLevel,
  KaiActionDefinition,
  KaiPolicyDecision,
  CarehiaKaiAdapterResult,
  CarehiaKaiAdapterContext,
} from './kaiFoundationTypes'

import {
  carehiaKaiActions,
  getCarehiaKaiActionById,
  getCarehiaKaiActionsByRisk,
  getRegistryStats,
} from './kaiActionRegistry'

// ── Restricted Account Statuses ─────────────────────────────────────────
// Matches the check in kaiContext.ts getCaregiverNextBestAction()
const RESTRICTED_STATUSES = ['suspended', 'blocked', 'deactivated']

// Actions that restricted accounts should not access
const RESTRICTED_BLOCKED_CATEGORIES = ['money', 'time_tracking', 'client']
const RESTRICTED_BLOCKED_IDS = [
  'open_work', 'open_money', 'open_time_tracker',
  'create_invoice_draft', 'send_invoice', 'share_profile_link',
  'set_availability',
]

// ── Policy Evaluation ───────────────────────────────────────────────────

function isAccountRestricted(context?: CarehiaKaiAdapterContext): boolean {
  if (!context?.accountStatus) return false
  return RESTRICTED_STATUSES.includes(context.accountStatus.toLowerCase())
}

function evaluateActionPolicy(
  action: KaiActionDefinition,
  context?: CarehiaKaiAdapterContext
): KaiPolicyDecision {
  // Blocked actions are never allowed
  if (action.riskLevel === 'blocked') {
    return {
      allowed: false,
      riskLevel: 'blocked',
      requiresConfirmation: false,
      reason: action.blockedReason || 'Kai cannot perform this action.',
      safeFallback: 'Contact support or use the appropriate Carehia screen.',
    }
  }

  // Restricted account check
  if (isAccountRestricted(context)) {
    // Allow support contact and basic navigation (today, profile, trust passport)
    const alwaysAllowedForRestricted = [
      'open_today', 'open_profile', 'open_trust_passport',
      'contact_support', 'start_guided_walkthrough', 'verify_phone',
    ]
    if (!alwaysAllowedForRestricted.includes(action.id)) {
      return {
        allowed: false,
        riskLevel: action.riskLevel,
        requiresConfirmation: false,
        reason: 'This action is not available while your account is restricted.',
        safeFallback: 'Please contact support to resolve your account status.',
      }
    }
  }

  // Low risk — always allowed, no confirmation
  if (action.riskLevel === 'low') {
    return {
      allowed: true,
      riskLevel: 'low',
      requiresConfirmation: false,
      reason: `${action.label} is a safe navigation action.`,
    }
  }

  // Medium risk — allowed as prepare/guide, confirmation per action flag
  if (action.riskLevel === 'medium') {
    return {
      allowed: true,
      riskLevel: 'medium',
      requiresConfirmation: action.requiresConfirmation,
      reason: `${action.label} may change settings or data.`,
    }
  }

  // High risk — allowed for navigation/prepare only, always requires confirmation
  if (action.riskLevel === 'high') {
    return {
      allowed: true,
      riskLevel: 'high',
      requiresConfirmation: true,
      reason: `${action.label} is a sensitive action requiring confirmation.`,
      safeFallback: 'Review carefully before proceeding.',
    }
  }

  // Fallback — should not reach here, but be safe
  return {
    allowed: false,
    riskLevel: 'blocked',
    requiresConfirmation: false,
    reason: 'Unknown risk level for this action.',
    safeFallback: 'Contact support.',
  }
}

// ── Adapter ─────────────────────────────────────────────────────────────

export const carehiaKaiAdapter: CarehiaKaiAdapterResult = {
  appId: 'carehia-caregiver' as KaiAppId,

  actions: carehiaKaiActions,

  getActionById(actionId: string): KaiActionDefinition | undefined {
    return getCarehiaKaiActionById(actionId)
  },

  evaluateAction(actionId: string, context?: CarehiaKaiAdapterContext): KaiPolicyDecision {
    const action = getCarehiaKaiActionById(actionId)

    if (!action) {
      return {
        allowed: false,
        riskLevel: 'blocked',
        requiresConfirmation: false,
        reason: 'This action is not registered in the Carehia Kai registry.',
        safeFallback: 'Open Kai and choose a supported action.',
      }
    }

    return evaluateActionPolicy(action, context)
  },
}

// ── Convenience Exports ─────────────────────────────────────────────────

/** Get all actions safe for the current context */
export function getAvailableActions(context?: CarehiaKaiAdapterContext): KaiActionDefinition[] {
  return carehiaKaiActions.filter(action => {
    const decision = evaluateActionPolicy(action, context)
    return decision.allowed
  })
}

/** Quick check if an action is allowed */
export function isActionAllowed(actionId: string, context?: CarehiaKaiAdapterContext): boolean {
  return carehiaKaiAdapter.evaluateAction(actionId, context).allowed
}

/** Get registry statistics */
export { getRegistryStats } from './kaiActionRegistry'

/** Re-export types for downstream consumers */
export type {
  KaiAppId,
  KaiRiskLevel,
  KaiActionDefinition,
  KaiPolicyDecision,
  CarehiaKaiAdapterResult,
  CarehiaKaiAdapterContext,
} from './kaiFoundationTypes'
