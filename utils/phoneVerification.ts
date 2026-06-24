// @ts-nocheck
// Phase 24D: Phone Verification Service
// Provider-ready interface with dev-mode OTP simulation.
// Security: hashed OTP storage, expiration, resend delay, attempt limits, generic errors.
// ─────────────────────────────────────────────────────────────────────────────

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

// ── Internal state (in-memory, never persisted as plain text) ────────────────
let _otpHash: string | null = null
let _otpPhone: string | null = null
let _otpCreatedAt: number = 0
let _otpAttempts: number = 0
let _lastSendAt: number = 0
let _devOtpForTesting: string | null = null  // Only used in dev mode for console hint

// ── Simple hash (not crypto-grade, but never stores plain OTP) ───────────────
function simpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + input.length
}

// ── Generate OTP ─────────────────────────────────────────────────────────────
function generateOTP(): string {
  const digits: string[] = []
  for (let i = 0; i < OTP_LENGTH; i++) {
    digits.push(String(Math.floor(Math.random() * 10)))
  }
  return digits.join('')
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

  // Resend delay
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

  // Generate and store OTP
  const otp = generateOTP()
  _otpHash = simpleHash(phone + ':' + otp)
  _otpPhone = phone
  _otpCreatedAt = now
  _otpAttempts = 0
  _lastSendAt = now

  if (DEV_MODE) {
    // In dev mode, log OTP to console for testing. Never expose in UI.
    _devOtpForTesting = otp
    console.info('[PhoneVerification DEV] OTP for', phone, '→', otp)

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800))
    return { success: true }
  }

  // ── PRODUCTION: Send via SMS provider ──────────────────────────────────
  // Replace this block with your SMS provider (Twilio, MessageBird, etc.)
  // Example:
  // const res = await fetch('/api/phone-verify/send', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ phone, otp }),
  // })
  // const data = await res.json()
  // if (!data.success) return { success: false, error: 'Unable to send code. Please try again.' }

  return { success: true }
}

// ── Verify OTP ───────────────────────────────────────────────────────────────
export async function verifyOTP(rawPhone: string, code: string): Promise<PhoneVerifVerifyResult> {
  const phone = normalizePhone(rawPhone)

  // Check if there's an active OTP session
  if (!_otpHash || !_otpPhone) {
    return { success: false, error: 'Please request a new verification code.' }
  }

  // Check phone matches
  if (_otpPhone !== phone) {
    return { success: false, error: 'Please request a new verification code.' }
  }

  // Check expiry
  if (Date.now() - _otpCreatedAt > OTP_EXPIRY_MS) {
    _otpHash = null
    _otpPhone = null
    return { success: false, error: 'Code expired. Please request a new one.' }
  }

  // Check attempts
  _otpAttempts++
  if (_otpAttempts > MAX_ATTEMPTS) {
    _otpHash = null
    _otpPhone = null
    return { success: false, error: 'Too many attempts. Please request a new code.' }
  }

  // Verify hash
  const candidateHash = simpleHash(phone + ':' + code.trim())

  if (DEV_MODE) {
    await new Promise(r => setTimeout(r, 600))
  }

  if (candidateHash === _otpHash) {
    // Success — clear OTP state
    _otpHash = null
    _otpPhone = null
    _devOtpForTesting = null

    // Persist verified status
    savePhoneVerified(phone)

    return { success: true }
  }

  const remaining = MAX_ATTEMPTS - _otpAttempts
  return {
    success: false,
    error: remaining > 0
      ? 'Incorrect code. Please try again.'
      : 'Too many attempts. Please request a new code.',
    attemptsRemaining: Math.max(0, remaining),
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
function savePhoneVerified(phone: string): void {
  try {
    const masked = phone.slice(0, -4).replace(/\d/g, '•') + phone.slice(-4)
    const status: PhoneVerifStatus = {
      phone: masked,
      verified: true,
      verifiedAt: new Date().toISOString(),
    }
    localStorage.setItem('cgp_phone_verified', 'true')
    localStorage.setItem('cgp_phone_verified_at', status.verifiedAt)
    localStorage.setItem('cgp_phone_masked', masked)

    // Also update cgp_account if present
    try {
      const acct = JSON.parse(localStorage.getItem('cgp_account') || 'null')
      if (acct) {
        acct.phoneVerified = true
        acct.phoneVerifiedAt = status.verifiedAt
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
