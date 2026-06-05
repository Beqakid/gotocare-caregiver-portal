// @ts-nocheck
// utils/responseMetrics.ts
// Phase 15 — Carehia Response Speed Scaffolding (client-side)
//
// SCORING RULES (enforced here):
//   - internalScore (0–5) feeds Phase 12 matchingEngine.responseScoreComponent ONLY
//   - NEVER expose internalScore as a number to the caregiver
//   - "ignored" and "expired" do not penalize harshly — caregivers may be offline
//   - Caregiver-facing copy is ALWAYS positive (see positiveCopy field)
//   - Backend: caregiver_response_metrics D1 table (backend TODO when dispatch is live)
//
// DATA MODEL:
//   - Stored in localStorage under 'cgp_response_metrics'
//   - Max 100 recent records kept (older are trimmed)
//   - sentAt is approximated from viewedAt when backend dispatch time is unavailable

const STORAGE_KEY = 'cgp_response_metrics'
const TARGET_WINDOW_MINS = 15    // respond within 15 mins = "within target window"
const MAX_RECORDS = 100

export type ResponseType = 'accepted' | 'declined' | 'expired' | 'ignored'

export interface ResponseMetric {
  requestId: string;
  caregiverId?: number;
  sentAt: string;                   // ISO — when request became available to caregiver
  viewedAt?: string;                // ISO — when caregiver first opened/viewed
  respondedAt?: string;             // ISO — when caregiver accepted or declined
  responseType?: ResponseType;
  responseTimeSeconds?: number;     // computed from sentAt → respondedAt
  wasWithinTargetWindow?: boolean;  // true if responded within TARGET_WINDOW_MINS
}

export interface ResponseSummary {
  totalSeen: number;
  totalResponded: number;
  avgResponseTimeMins: number | null;
  withinWindowRate: number;         // 0.0–1.0
  acceptRate: number;               // 0.0–1.0
  // INTERNAL: feeds Phase 12 matchingEngine responseScoreComponent (0–5)
  // DO NOT show this number directly to the caregiver
  internalScore: number;
  // Positive caregiver-facing copy — safe to display
  positiveCopy: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function loadMetrics(): ResponseMetric[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveMetrics(metrics: ResponseMetric[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics.slice(0, MAX_RECORDS))) } catch {}
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Call when caregiver first views/opens a request card.
 * Safe to call multiple times — only sets viewedAt once.
 */
export function recordRequestViewed(requestId: string, caregiverId?: number): void {
  const all = loadMetrics()
  const existing = all.find(m => m.requestId === requestId)
  if (existing) {
    if (!existing.viewedAt) {
      existing.viewedAt = new Date().toISOString()
      saveMetrics(all)
    }
    return
  }
  // New record — sentAt approximated as now (improves over time when backend provides real sentAt)
  all.unshift({
    requestId,
    caregiverId,
    sentAt: new Date().toISOString(),
    viewedAt: new Date().toISOString(),
  })
  saveMetrics(all)
}

/**
 * Call when caregiver accepts or declines a request.
 * Sets respondedAt, responseType, and computes response time.
 */
export function recordRequestResponded(
  requestId: string,
  responseType: ResponseType,
  caregiverId?: number,
): void {
  const all = loadMetrics()
  let record = all.find(m => m.requestId === requestId)
  if (!record) {
    // Create record if not seen before (e.g. responded without opening card view)
    record = {
      requestId,
      caregiverId,
      sentAt: new Date().toISOString(),
      viewedAt: new Date().toISOString(),
    }
    all.unshift(record)
  }
  if (record.respondedAt) return  // already recorded — idempotent

  const now = new Date()
  record.respondedAt = now.toISOString()
  record.responseType = responseType

  if (record.sentAt) {
    const diffSecs = Math.max(0, Math.round((now.getTime() - new Date(record.sentAt).getTime()) / 1000))
    record.responseTimeSeconds = diffSecs
    record.wasWithinTargetWindow = diffSecs <= TARGET_WINDOW_MINS * 60
  }
  saveMetrics(all)
}

/**
 * Get response summary.
 * INTERNAL USE ONLY for matching. Surface only positiveCopy to caregivers.
 */
export function getResponseSummary(): ResponseSummary {
  const metrics = loadMetrics()
  const seen = metrics.filter(m => m.viewedAt)
  const responded = metrics.filter(
    m => m.respondedAt && m.responseType && m.responseType !== 'expired' && m.responseType !== 'ignored'
  )
  const accepted = responded.filter(m => m.responseType === 'accepted')

  const responseTimes = responded
    .filter(m => typeof m.responseTimeSeconds === 'number')
    .map(m => m.responseTimeSeconds!)

  const avgResponseTimeMins = responseTimes.length > 0
    ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) / 60 * 10) / 10
    : null

  const withinWindowRate = responded.length >= 2
    ? responded.filter(m => m.wasWithinTargetWindow).length / responded.length
    : 0.5  // neutral default when insufficient data

  const acceptRate = seen.length > 0 ? accepted.length / seen.length : 0.5

  // Internal score 0–5 (neutral default = 3, matches Phase 12 placeholder)
  // Only computed when there are at least 3 responses (avoid punishing new caregivers)
  let internalScore = 3  // neutral
  if (responded.length >= 3) {
    let s = 0
    s += Math.min(2, withinWindowRate * 2)  // 0–2: within-window rate
    if (avgResponseTimeMins !== null) {
      s += avgResponseTimeMins <= 10 ? 2 : avgResponseTimeMins <= 30 ? 1 : 0  // 0–2: avg speed
    } else {
      s += 1  // neutral
    }
    s += acceptRate > 0.1 ? 1 : 0  // 0–1: responds at all (accept/decline > ignore)
    internalScore = Math.min(5, Math.round(s * 10) / 10)
  }

  // Positive copy only
  let positiveCopy: string
  if (responded.length === 0) {
    positiveCopy = 'Stay online to receive new care requests.'
  } else if (withinWindowRate >= 0.8) {
    positiveCopy = 'You respond quickly — this helps you receive more opportunities!'
  } else if (withinWindowRate >= 0.5) {
    positiveCopy = 'Fast responses can help you receive more opportunities.'
  } else {
    positiveCopy = 'Every response helps families find the right care.'
  }

  return {
    totalSeen: seen.length,
    totalResponded: responded.length,
    avgResponseTimeMins,
    withinWindowRate,
    acceptRate,
    internalScore,
    positiveCopy,
  }
}

/**
 * Returns just the internal score (0–5) for use in Phase 12 matchingEngine.
 * NEVER surface this number directly in UI.
 */
export function getResponseScoreForMatching(): number {
  return getResponseSummary().internalScore
}
