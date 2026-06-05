// @ts-nocheck
// utils/notificationEngine.ts
// Phase 15 — Carehia Notification Types, Priority Engine, and Routing Map
//
// PRIVACY RULES (enforced here):
//   - Notifications NEVER contain: client full name, address, phone, email, SSN, DOB
//   - Only care type + area + safe amounts + status are allowed
//   - Response score is INTERNAL ONLY — never shown publicly or punitively
//   - Caregiver-facing copy is ALWAYS positive
//   - No harsh labels ("slow responder", "poor score", "bad responder")

// ── Notification types ──────────────────────────────────────────────────

export type NotificationType =
  | 'new_care_request'
  | 'request_expiring'
  | 'interview_request'
  | 'hire_offer_received'
  | 'hire_offer_signed'
  | 'client_confirmed'
  | 'visit_upcoming'
  | 'timer_reminder'
  | 'invoice_ready'
  | 'payment_received'
  | 'trust_passport_action_needed'
  | 'certification_expiring'
  | 'review_received';

export type NotificationPriority = 'urgent' | 'important' | 'normal' | 'low';

// Where tapping "View" / action button routes the caregiver inside the app
export type NotificationAction =
  | 'work_requests'    // → Work tab → Requests sub-tab
  | 'work_schedule'    // → Work tab → Schedule sub-tab
  | 'money'            // → Money tab
  | 'trust_passport'   // → Trust Passport overlay
  | 'profile'          // → Profile tab
  | 'today';           // → Today tab

// ── Notification object ─────────────────────────────────────────────────

export interface CareNotification {
  id: string;
  type?: NotificationType;          // optional — old push notifications may not have it
  priority?: NotificationPriority;  // optional — old notifications default to 'normal'
  title: string;
  body: string;
  timestamp: string;                // ISO string
  read: boolean;
  action?: NotificationAction;      // optional — old notifications route to 'today'
  // Safe metadata only — NO PII
  meta?: {
    bookingId?: number;
    amount?: number;
    careType?: string;
    expiresInMins?: number;
    moduleName?: string;
    certName?: string;
  };
}

// ── Priority config ─────────────────────────────────────────────────────

export const NOTIFICATION_PRIORITY_CONFIG: Record<NotificationPriority, {
  accentColor: string;
  borderColor: string;
  label: string;
}> = {
  urgent:    { accentColor: '#EF4444', borderColor: 'rgba(239,68,68,0.50)',   label: 'Urgent'    },
  important: { accentColor: '#7C5CFF', borderColor: 'rgba(124,92,255,0.50)', label: 'Important' },
  normal:    { accentColor: '#4A90E2', borderColor: 'rgba(74,144,226,0.40)', label: ''          },
  low:       { accentColor: '#94a3b8', borderColor: 'rgba(148,163,184,0.30)', label: ''         },
}

// ── Type → emoji ────────────────────────────────────────────────────────

export const NOTIFICATION_EMOJI: Record<NotificationType, string> = {
  new_care_request:              '🔔',
  request_expiring:              '⏰',
  interview_request:             '📋',
  hire_offer_received:           '📄',
  hire_offer_signed:             '✅',
  client_confirmed:              '🎉',
  visit_upcoming:                '📅',
  timer_reminder:                '⏱️',
  invoice_ready:                 '💰',
  payment_received:              '🎉',
  trust_passport_action_needed:  '🛡️',
  certification_expiring:        '⚠️',
  review_received:               '⭐',
}

// ── Type → default priority ─────────────────────────────────────────────

export const NOTIFICATION_DEFAULT_PRIORITY: Record<NotificationType, NotificationPriority> = {
  new_care_request:              'important',
  request_expiring:              'urgent',
  interview_request:             'important',
  hire_offer_received:           'important',
  hire_offer_signed:             'important',
  client_confirmed:              'important',
  visit_upcoming:                'urgent',
  timer_reminder:                'urgent',
  invoice_ready:                 'important',
  payment_received:              'important',
  trust_passport_action_needed:  'normal',
  certification_expiring:        'urgent',
  review_received:               'normal',
}

// ── Type → default action ───────────────────────────────────────────────

export const NOTIFICATION_DEFAULT_ACTION: Record<NotificationType, NotificationAction> = {
  new_care_request:              'work_requests',
  request_expiring:              'work_requests',
  interview_request:             'work_requests',
  hire_offer_received:           'work_requests',
  hire_offer_signed:             'work_requests',
  client_confirmed:              'work_requests',
  visit_upcoming:                'work_schedule',
  timer_reminder:                'work_schedule',
  invoice_ready:                 'money',
  payment_received:              'money',
  trust_passport_action_needed:  'trust_passport',
  certification_expiring:        'profile',
  review_received:               'trust_passport',
}

// ── Action → button label ───────────────────────────────────────────────

export const ACTION_BUTTON_LABEL: Record<NotificationAction, string> = {
  work_requests:  'Review Now',
  work_schedule:  'View Schedule',
  money:          'View Money',
  trust_passport: 'View Trust Passport',
  profile:        'Update Profile',
  today:          'Go to Today',
}

// ── Factory: create a typed CareNotification ───────────────────────────

export function createNotification(
  type: NotificationType,
  overrides: Partial<CareNotification> & { title: string; body: string },
): CareNotification {
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  return {
    id,
    type,
    priority: NOTIFICATION_DEFAULT_PRIORITY[type],
    action:   NOTIFICATION_DEFAULT_ACTION[type],
    timestamp: new Date().toISOString(),
    read: false,
    ...overrides,
  }
}

// ── Positive caregiver copy for response situations ────────────────────
// IMPORTANT: These are the ONLY allowed response-related copy strings shown to caregivers.
// Never use: "slow", "poor score", "bad", "failed", "low response rate" etc.

export const RESPONSE_COPY = {
  fastResponse:    'You responded quickly — great job!',
  withinWindow:    'Fast responses can help you receive more opportunities.',
  stayOnline:      'Stay online to receive new care requests.',
  encouragement:   'Every response helps families find the right care.',
  newRequest:      'A new care request is waiting for your response.',
  expiringSoon:    'This request expires soon — respond to keep your momentum.',
} as const
