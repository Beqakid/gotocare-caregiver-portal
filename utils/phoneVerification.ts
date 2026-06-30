// @ts-nocheck
// Phase 24D → 26C: Phone Verification Service
// DEV mode: client-side OTP simulation (localhost only)
// PRODUCTION: calls backend Twilio Verify endpoints
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = 'https://gotocare-original.jjioji.workers.dev/api'

// ── Configuration ────────────────────────────────────────────────────────────
const OTP_LENGTH = 6
const OTP_EXPIRY_MS = 5 * 60 * 1000        // 5 minutes
const RESEND_DELAY_MS = 30 * 1000           // 30 seconds
const MAX_ATTEMPTS = 5
const DEV_MODE = typeof window !== 'undefined'
  && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')

// ── Types ────────────────────────────────────────────────────────────────────
export type PhoneVerifSendResult = {
  success: boolean
  error?: string
  retryAfterMs?: number
  provider?: string
}

export type PhoneVerifVerifyResult = {
  success: boolean
  error?: string
  attemptsRemaining?: number
}

export type PhoneVerifStatus = {
  phone: string
  verified: boolean
  verifiedAt?: string
}

// ── Internal state (dev mode only — in-memory, never persisted as plain text)
let _otpHash: string | null = null
let _otpPhone: string | null = null
let _otpCreatedAt: number = 0
let _otpAttempts: number = 0
let _lastSendAt: number = 0
let _devOtpForTesting: string | null = null

// ── Simple hash (dev mode only) ─────────────────────────────────────────────
function simpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + input.length
}

// ── Generate OTP (dev mode only) ────────────────────────────────────────────
function generateOTP(): string {
  const digits: string[] = []
  for (let i = 0; i < OTP_LENGTH; i++) {
    digits.push(String(Math.floor(Math.random() * 10)))
  }
  return digits.join('')
}

// ── Auth token helper ───────────────────────────────────────────────────────
function getToken(): string | null {
  try { return localStorage.getItem('cgp_token') } catch { return null }
}

// ── Normalize phone ──────────────────────────────────────────────────────────
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
  return digits
}

// ── Validate phone format ────────────────────────────────────────────────────
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  return /^\+\d{10,15}$/.test(normalized)
}

// ── Send OTP ─────────────────────────────────────────────────────────────────
export async function sendOTP(rawPhone: string): Promise<PhoneVerifSendResult> {
  const phone = normalizePhone(rawPhone)

  if (!isValidPhone(phone)) {
    return { success: false, error: 'Please enter a valid phone number.' }
  }

  // Resend delay (client-side enforcement for UX)
  const now = Date.now()
  const timeSinceLast = now - _lastSendAt
  if (_lastSendAt > 0 && timeSinceLast < RESEND_DELAY_MS) {
    const retryAfterMs = RESEND_DELAY_MS - timeSinceLast
    return {
      success: false,
      error: 'Please wait before requesting a new code.',
      retryAfterMs,
    }
  }

  if (DEV_MODE) {
    // Dev mode: client-side OTP simulation
    const otp = generateOTP()
    _otpHash = simpleHash(phone + ':' + otp)
    _otpPhone = phone
    _otpCreatedAt = now
    _otpAttempts = 0
    _lastSendAt = now
    _devOtpForTesting = otp
    console.info('[PhoneVerification DEV] OTP for', phone, '→', otp)
    await new Promise(r => setTimeout(r, 800))
    return { success: true, provider: 'dev_mode' }
  }

  // ── PRODUCTION: Call backend Twilio Verify ──────────────────────────────
  const token = getToken()
  if (!token) {
    return { success: false, error: 'Please sign in to verify your phone.' }
  }

  try {
    const res = await fetch(`${API_BASE}/caregiver-phone-verify/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ phoneNumber: phone }),
    })
    const data = await res.json()
    _lastSendAt = Date.now()
    _otpPhone = phone

    if (data.success) {
      return { success: true, provider: data.provider || 'twilio_verify' }
    }

    if (data.provider === 'unconfigured') {
      return { success: false, error: 'Phone verification is being set up. Please try again later.' }
    }

    return { success: false, error: data.error || 'Unable to send code. Please try again.' }
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

// ── Verify OTP ───────────────────────────────────────────────────────────────
export async function verifyOTP(rawPhone: string, code: string): Promise<PhoneVerifVerifyResult> {
  const phone = normalizePhone(rawPhone)

  if (DEV_MODE) {
    // Dev mode: client-side verification
    if (!_otpHash || !_otpPhone) {
      return { success: false, error: 'Please request a new verification code.' }
    }
    if (_otpPhone !== phone) {
      return { success: false, error: 'Please request a new verification code.' }
    }
    if (Date.now() - _otpCreatedAt > OTP_EXPIRY_MS) {
      _otpHash = null; _otpPhone = null
      return { success: false, error: 'Code expired. Please request a new one.' }
    }
    _otpAttempts++
    if (_otpAttempts > MAX_ATTEMPTS) {
      _otpHash = null; _otpPhone = null
      return { success: false, error: 'Too many attempts. Please request a new code.' }
    }
    const candidateHash = simpleHash(phone + ':' + code.trim())
    await new Promise(r => setTimeout(r, 600))
    if (candidateHash === _otpHash) {
      _otpHash = null; _otpPhone = null; _devOtpForTesting = null
      savePhoneVerified(phone)
      return { success: true }
    }
    const remaining = MAX_ATTEMPTS - _otpAttempts
    return {
      success: false,
      error: remaining > 0 ? 'Incorrect code. Please try again.' : 'Too many attempts. Please request a new code.',
      attemptsRemaining: Math.max(0, remaining),
    }
  }

  // ── PRODUCTION: Call backend Twilio Verify check ────────────────────────
  const token = getToken()
  if (!token) {
    return { success: false, error: 'Please sign in to verify your phone.' }
  }

  try {
    const res = await fetch(`${API_BASE}/caregiver-phone-verify/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ phoneNumber: phone, code: code.trim() }),
    })
    const data = await res.json()

    if (data.success && data.phoneVerified) {
      // Persist locally for instant UI update
      savePhoneVerified(phone, data.phoneVerifiedAt)
      return { success: true }
    }

    return {
      success: false,
      error: data.error || 'We could not verify that code. Please try again.',
    }
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

// ── Resend OTP (convenience wrapper) ─────────────────────────────────────────
export async function resendOTP(rawPhone: string): Promise<PhoneVerifSendResult> {
  return sendOTP(rawPhone)
}

// ── Get resend countdown ─────────────────────────────────────────────────────
export function getResendCountdownMs(): number {
  if (_lastSendAt === 0) return 0
  const elapsed = Date.now() - _lastSendAt
  return Math.max(0, RESEND_DELAY_MS - elapsed)
}

// ── Persistence: phone verified status ───────────────────────────────────────
function savePhoneVerified(phone: string, verifiedAt?: string): void {
  try {
    const masked = phone.slice(0, -4).replace(/\d/g, '•') + phone.slice(-4)
    const ts = verifiedAt || new Date().toISOString()
    localStorage.setItem('cgp_phone_verified', 'true')
    localStorage.setItem('cgp_phone_verified_at', ts)
    localStorage.setItem('cgp_phone_masked', masked)

    // Also update cgp_account if present
    try {
      const acct = JSON.parse(localStorage.getItem('cgp_account') || 'null')
      if (acct) {
        acct.phoneVerified = true
        acct.phoneVerifiedAt = ts
        localStorage.setItem('cgp_account', JSON.stringify(acct))
      }
    } catch {}
  } catch {}
}

// ── Read verification status ─────────────────────────────────────────────────
export function getPhoneVerificationStatus(): PhoneVerifStatus | null {
  try {
    const verified = localStorage.getItem('cgp_phone_verified') === 'true'
    if (!verified) return null
    return {
      phone: localStorage.getItem('cgp_phone_masked') || '',
      verified: true,
      verifiedAt: localStorage.getItem('cgp_phone_verified_at') || undefined,
    }
  } catch {
    return null
  }
}

export function isPhoneVerified(): boolean {
  try {
    return localStorage.getItem('cgp_phone_verified') === 'true'
  } catch {
    return false
  }
}
