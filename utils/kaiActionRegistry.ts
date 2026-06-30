// @ts-nocheck
// Phase 25B: Kai Foundation Core — Carehia Action Registry
// Catalogs all 21 Carehia Kai actions with risk classification.
// Plus 6 permanently blocked admin/safety actions.
// This file is read-only registry data — it does not execute actions or modify state.

import type {
  KaiActionDefinition,
  KaiRiskLevel,
  KaiActionCategory,
  KaiActionMode,
} from './kaiFoundationTypes'

// ── Low Risk Actions (8) — Safe navigation/view/guide ───────────────────
const lowRiskActions: KaiActionDefinition[] = [
  {
    id: 'open_today',
    label: 'Open Today',
    description: 'Navigate to the Today tab.',
    category: 'navigation',
    riskLevel: 'low',
    mode: 'navigate',
    targetTab: 'today',
    requiresConfirmation: false,
    publicSafe: true,
  },
  {
    id: 'open_profile',
    label: 'Open Profile',
    description: 'Navigate to the Profile tab.',
    category: 'navigation',
    riskLevel: 'low',
    mode: 'navigate',
    targetTab: 'profile',
    walkthroughId: 'profile',
    requiresConfirmation: false,
    publicSafe: true,
  },
  {
    id: 'open_trust_passport',
    label: 'Open Trust Passport',
    description: 'Navigate to the Trust Passport tab.',
    category: 'navigation',
    riskLevel: 'low',
    mode: 'navigate',
    targetTab: 'trust-passport',
    walkthroughId: 'trust-passport',
    requiresConfirmation: false,
    publicSafe: true,
  },
  {
    id: 'open_money',
    label: 'Open Money',
    description: 'Navigate to the Money tab.',
    category: 'navigation',
    riskLevel: 'low',
    mode: 'navigate',
    targetTab: 'money',
    walkthroughId: 'invoice-money',
    requiresConfirmation: false,
    publicSafe: true,
  },
  {
    id: 'open_work',
    label: 'Open Work',
    description: 'Navigate to the Work tab.',
    category: 'navigation',
    riskLevel: 'low',
    mode: 'navigate',
    targetTab: 'work',
    requiresConfirmation: false,
    publicSafe: true,
  },
  {
    id: 'open_time_tracker',
    label: 'Open Time Tracker',
    description: 'Navigate to the time tracking screen.',
    category: 'time_tracking',
    riskLevel: 'low',
    mode: 'navigate',
    targetTab: 'money',
    targetSubtab: 'time-tracking',
    walkthroughId: 'time-tracking',
    requiresConfirmation: false,
    publicSafe: true,
  },
  {
    id: 'contact_support',
    label: 'Contact Support',
    description: 'Open the support contact screen.',
    category: 'support',
    riskLevel: 'low',
    mode: 'navigate',
    targetTab: 'support',
    requiresConfirmation: false,
    publicSafe: true,
  },
  {
    id: 'start_guided_walkthrough',
    label: 'Start a Guide',
    description: 'Open a guided walkthrough for a Kai feature.',
    category: 'navigation',
    riskLevel: 'low',
    mode: 'guide',
    requiresConfirmation: false,
    publicSafe: true,
  },
  {
    id: 'view_match_readiness',
    label: 'View Match Readiness',
    description: 'Shows your match readiness factors and areas to improve.',
    category: 'navigation',
    riskLevel: 'low',
    mode: 'navigate',
    targetTab: 'kai-match-readiness',
    requiresConfirmation: false,
    publicSafe: true,
  },
  {
    id: 'open_availability',
    label: 'Open Availability',
    description: 'Navigate to update your availability settings.',
    category: 'navigation',
    riskLevel: 'low',
    mode: 'navigate',
    targetTab: 'profile',
    targetSubtab: 'availability',
    requiresConfirmation: false,
    publicSafe: true,
  },
  {
    id: 'open_service_area',
    label: 'Open Service Area',
    description: 'Navigate to update your service area settings.',
    category: 'navigation',
    riskLevel: 'low',
    mode: 'navigate',
    targetTab: 'profile',
    targetSubtab: 'service-area',
    requiresConfirmation: false,
    publicSafe: true,
  },
]

// ── Medium Risk Actions (7) — Setup/verification changes ────────────────
const mediumRiskActions: KaiActionDefinition[] = [
  {
    id: 'verify_phone',
    label: 'Verify Phone',
    description: 'Start the phone verification flow.',
    category: 'verification',
    riskLevel: 'medium',
    mode: 'prepare',
    walkthroughId: 'phone-verification',
    requiresConfirmation: false, // Opens the panel; user confirms OTP
    publicSafe: true,
  },
  {
    id: 'trust_device',
    label: 'Trust This Device',
    description: 'Mark the current device as trusted.',
    category: 'security',
    riskLevel: 'medium',
    mode: 'confirm_required',
    requiresConfirmation: true,
    requiresPhoneVerified: true,
    publicSafe: false,
  },
  {
    id: 'set_service_area',
    label: 'Set Service Area',
    description: 'Configure the caregiver service area.',
    category: 'profile',
    riskLevel: 'medium',
    mode: 'prepare',
    targetTab: 'profile',
    targetSubtab: 'service-area',
    walkthroughId: 'service-area',
    requiresConfirmation: false, // Opens editor; user saves
    publicSafe: true,
  },
  {
    id: 'set_availability',
    label: 'Set Availability',
    description: 'Update availability and schedule preferences.',
    category: 'profile',
    riskLevel: 'medium',
    mode: 'prepare',
    targetTab: 'profile',
    targetSubtab: 'availability',
    requiresConfirmation: false, // Opens editor; user saves
    publicSafe: true,
  },
  {
    id: 'save_profile_changes',
    label: 'Save Profile Changes',
    description: 'Save modifications to the caregiver profile.',
    category: 'profile',
    riskLevel: 'medium',
    mode: 'confirm_required',
    targetTab: 'profile',
    requiresConfirmation: true,
    publicSafe: true,
  },
  {
    id: 'create_invoice_draft',
    label: 'Create Invoice Draft',
    description: 'Create a new draft invoice for a client.',
    category: 'money',
    riskLevel: 'medium',
    mode: 'prepare',
    targetTab: 'money',
    targetSubtab: 'invoices',
    walkthroughId: 'invoice-money',
    requiresConfirmation: false, // Opens draft; user reviews and sends
    publicSafe: true,
  },
  {
    id: 'share_profile_link',
    label: 'Share Profile Link',
    description: 'Generate and share a public profile link.',
    category: 'profile',
    riskLevel: 'medium',
    mode: 'confirm_required',
    targetTab: 'profile',
    requiresConfirmation: true,
    publicSafe: true,
  },
]

// ── High Risk Actions (6) — Require future step-up verification ─────────
const highRiskActions: KaiActionDefinition[] = [
  {
    id: 'send_invoice',
    label: 'Send Invoice',
    description: 'Send a finalized invoice to a client.',
    category: 'money',
    riskLevel: 'high',
    mode: 'confirm_required',
    targetTab: 'money',
    targetSubtab: 'invoices',
    requiresConfirmation: true,
    publicSafe: false,
  },
  {
    id: 'upload_identity_proof',
    label: 'Upload Identity Proof',
    description: 'Upload an identity document for Trust Passport verification.',
    category: 'trust',
    riskLevel: 'high',
    mode: 'confirm_required',
    targetTab: 'trust-passport',
    requiresConfirmation: true,
    publicSafe: false,
  },
  {
    id: 'change_phone',
    label: 'Change Phone Number',
    description: 'Change the phone number on the account.',
    category: 'security',
    riskLevel: 'high',
    mode: 'confirm_required',
    requiresConfirmation: true,
    requiresPhoneVerified: true,
    publicSafe: false,
  },
  {
    id: 'change_email',
    label: 'Change Email',
    description: 'Change the email address on the account.',
    category: 'security',
    riskLevel: 'high',
    mode: 'confirm_required',
    requiresConfirmation: true,
    publicSafe: false,
  },
  {
    id: 'change_password',
    label: 'Change Password',
    description: 'Change the account password.',
    category: 'security',
    riskLevel: 'high',
    mode: 'confirm_required',
    requiresConfirmation: true,
    publicSafe: false,
  },
  {
    id: 'delete_account',
    label: 'Delete Account',
    description: 'Permanently delete the caregiver account.',
    category: 'security',
    riskLevel: 'high',
    mode: 'confirm_required',
    requiresConfirmation: true,
    requiresPhoneVerified: true,
    requiresTrustedDevice: true,
    publicSafe: false,
  },
]

// ── Permanently Blocked Actions (6) — Never auto-executed by Kai ────────
const blockedActions: KaiActionDefinition[] = [
  {
    id: 'approve_verification',
    label: 'Approve Verification',
    description: 'Approve a caregiver verification document.',
    category: 'admin_blocked',
    riskLevel: 'blocked',
    mode: 'blocked',
    requiresConfirmation: false,
    publicSafe: false,
    blockedReason: 'Only administrators can approve verifications.',
  },
  {
    id: 'reject_verification',
    label: 'Reject Verification',
    description: 'Reject a caregiver verification document.',
    category: 'admin_blocked',
    riskLevel: 'blocked',
    mode: 'blocked',
    requiresConfirmation: false,
    publicSafe: false,
    blockedReason: 'Only administrators can reject verifications.',
  },
  {
    id: 'change_safety_status',
    label: 'Change Safety Status',
    description: 'Change the account safety or restriction status.',
    category: 'admin_blocked',
    riskLevel: 'blocked',
    mode: 'blocked',
    requiresConfirmation: false,
    publicSafe: false,
    blockedReason: 'Only administrators can change safety status.',
  },
  {
    id: 'contact_client_automatically',
    label: 'Contact Client Automatically',
    description: 'Send a message to a client without caregiver initiation.',
    category: 'admin_blocked',
    riskLevel: 'blocked',
    mode: 'blocked',
    requiresConfirmation: false,
    publicSafe: false,
    blockedReason: 'Kai cannot contact clients on behalf of the caregiver.',
  },
  {
    id: 'accept_reject_work_automatically',
    label: 'Accept or Reject Work Automatically',
    description: 'Accept or reject a care request without caregiver review.',
    category: 'admin_blocked',
    riskLevel: 'blocked',
    mode: 'blocked',
    requiresConfirmation: false,
    publicSafe: false,
    blockedReason: 'Kai cannot accept or reject work on behalf of the caregiver.',
  },
  {
    id: 'view_private_admin_notes',
    label: 'View Private Admin Notes',
    description: 'Access admin-only notes or internal reasons.',
    category: 'admin_blocked',
    riskLevel: 'blocked',
    mode: 'blocked',
    requiresConfirmation: false,
    publicSafe: false,
    blockedReason: 'Admin notes are not accessible to caregivers or Kai.',
  },
]

// ── Combined Registry ───────────────────────────────────────────────────
export const carehiaKaiActions: KaiActionDefinition[] = [
  ...lowRiskActions,
  ...mediumRiskActions,
  ...highRiskActions,
  ...blockedActions,
]

// ── Lookup Helpers ──────────────────────────────────────────────────────
export function getCarehiaKaiActionById(actionId: string): KaiActionDefinition | undefined {
  return carehiaKaiActions.find(a => a.id === actionId)
}

export function getCarehiaKaiActionsByRisk(riskLevel: KaiRiskLevel): KaiActionDefinition[] {
  return carehiaKaiActions.filter(a => a.riskLevel === riskLevel)
}

export function getCarehiaKaiActionsByCategory(category: KaiActionCategory): KaiActionDefinition[] {
  return carehiaKaiActions.filter(a => a.category === category)
}

// ── Registry Stats (for audit/logging) ──────────────────────────────────
export function getRegistryStats(): { total: number; low: number; medium: number; high: number; blocked: number } {
  return {
    total: carehiaKaiActions.length,
    low: lowRiskActions.length,
    medium: mediumRiskActions.length,
    high: highRiskActions.length,
    blocked: blockedActions.length,
  }
}
