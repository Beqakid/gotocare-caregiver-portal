// @ts-nocheck
// Phase 24D: Phone Verification Panel
// 3-screen flow: Enter Phone → Enter OTP → Success
// Renders inside KaiPanel's scrollable content area.
import React, { useState, useEffect, useRef } from 'react'
import { sendOTP, verifyOTP, resendOTP, getResendCountdownMs, normalizePhone, isValidPhone, isPhoneVerified } from '../utils/phoneVerification'

interface PhoneVerificationPanelProps {
  profile: any
  onClose: () => void
  onVerified: () => void
}

type VerifScreen = 'input' | 'otp' | 'success'

export const PhoneVerificationPanel: React.FC<PhoneVerificationPanelProps> = ({
  profile,
  onClose,
  onVerified,
}) => {
  const [screen, setScreen] = useState<VerifScreen>(() =>
    isPhoneVerified() ? 'success' : 'input'
  )
  const [phone, setPhone] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start resend countdown timer
  const startCountdown = () => {
    const remaining = Math.ceil(getResendCountdownMs() / 1000)
    setResendCountdown(remaining)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      const r = Math.ceil(getResendCountdownMs() / 1000)
      setResendCountdown(r)
      if (r <= 0 && countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  // Pre-fill phone from profile if available
  useEffect(() => {
    if (!phone && profile?.phone) {
      setPhone(profile.phone)
    }
  }, [profile])

  // ── Send OTP handler ───────────────────────────────────────────────────
  const handleSendOTP = async () => {
    setError('')
    if (!isValidPhone(phone)) {
      setError('Please enter a valid phone number.')
      return
    }
    setSending(true)
    try {
      const result = await sendOTP(phone)
      if (result.success) {
        setScreen('otp')
        setOtpDigits(['', '', '', '', '', ''])
        startCountdown()
        setTimeout(() => otpRefs.current[0]?.focus(), 100)
      } else {
        setError(result.error || 'Unable to send code. Please try again.')
        if (result.retryAfterMs) startCountdown()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  // ── OTP digit input handler ────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...otpDigits]
    newDigits[index] = value.slice(-1)
    setOtpDigits(newDigits)
    setError('')

    // Auto-advance
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 filled
    if (value && index === 5) {
      const code = newDigits.join('')
      if (code.length === 6) {
        handleVerifyOTP(code)
      }
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  // ── Handle paste into OTP fields ───────────────────────────────────────
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 0) return
    const newDigits = [...otpDigits]
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i]
    }
    setOtpDigits(newDigits)
    setError('')
    if (pasted.length === 6) {
      handleVerifyOTP(pasted)
    } else {
      otpRefs.current[Math.min(pasted.length, 5)]?.focus()
    }
  }

  // ── Verify OTP handler ─────────────────────────────────────────────────
  const handleVerifyOTP = async (code?: string) => {
    const otp = code || otpDigits.join('')
    if (otp.length !== 6) {
      setError('Please enter the full 6-digit code.')
      return
    }
    setError('')
    setVerifying(true)
    try {
      const result = await verifyOTP(phone, otp)
      if (result.success) {
        setScreen('success')
        onVerified()
      } else {
        setError(result.error || 'Verification failed. Please try again.')
        if (result.attemptsRemaining === 0) {
          // Reset to input screen after lockout
          setTimeout(() => {
            setScreen('input')
            setOtpDigits(['', '', '', '', '', ''])
          }, 2000)
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  // ── Resend handler ─────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCountdown > 0) return
    setError('')
    setSending(true)
    try {
      const result = await resendOTP(phone)
      if (result.success) {
        setOtpDigits(['', '', '', '', '', ''])
        startCountdown()
        setTimeout(() => otpRefs.current[0]?.focus(), 100)
      } else {
        setError(result.error || 'Unable to resend. Please try again.')
        if (result.retryAfterMs) startCountdown()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  // ── Mask phone for display ─────────────────────────────────────────────
  const maskedPhone = (() => {
    const n = normalizePhone(phone)
    if (n.length < 6) return phone
    return n.slice(0, 3) + ' •••• ' + n.slice(-4)
  })()

  // ══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════

  // ── Success Screen ─────────────────────────────────────────────────────
  if (screen === 'success') {
    return (
      <div className="pvp-container">
        <div className="pvp-header">
          <h3 className="pvp-title">Phone Verified</h3>
          <button className="pvp-back-btn" onClick={onClose}>Done</button>
        </div>
        <div className="pvp-success-card">
          <div className="pvp-success-icon">✅</div>
          <h4 className="pvp-success-title">Phone verified!</h4>
          <p className="pvp-success-msg">
            Your phone number is confirmed. This strengthens your Trust Passport and helps keep your account secure.
          </p>
          <button className="pvp-primary-btn" onClick={onClose}>
            Back to Kai
          </button>
        </div>
      </div>
    )
  }

  // ── OTP Screen ─────────────────────────────────────────────────────────
  if (screen === 'otp') {
    return (
      <div className="pvp-container">
        <div className="pvp-header">
          <h3 className="pvp-title">📱 Enter Code</h3>
          <button className="pvp-back-btn" onClick={() => { setScreen('input'); setError('') }}>
            Back
          </button>
        </div>

        <div className="pvp-card">
          <p className="pvp-desc">
            We sent a 6-digit code to <strong>{maskedPhone}</strong>. Enter it below to verify your phone.
          </p>

          <div className="pvp-otp-row" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={el => { otpRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className={`pvp-otp-input${error ? ' pvp-otp-error' : ''}`}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                autoComplete="one-time-code"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {error && <p className="pvp-error">{error}</p>}

          <button
            className="pvp-primary-btn"
            onClick={() => handleVerifyOTP()}
            disabled={verifying || otpDigits.join('').length < 6}
          >
            {verifying ? 'Verifying…' : 'Verify'}
          </button>

          <div className="pvp-resend-row">
            {resendCountdown > 0 ? (
              <p className="pvp-resend-text">
                Resend code in {resendCountdown}s
              </p>
            ) : (
              <button
                className="pvp-resend-btn"
                onClick={handleResend}
                disabled={sending}
              >
                {sending ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </div>
        </div>

        <div className="pvp-hint">
          <p className="pvp-hint-text">
            💡 Didn't get a code? Check your messages app or try resending. Your number is never shared publicly.
          </p>
        </div>
      </div>
    )
  }

  // ── Phone Input Screen ─────────────────────────────────────────────────
  return (
    <div className="pvp-container">
      <div className="pvp-header">
        <h3 className="pvp-title">📱 Verify Phone</h3>
        <button className="pvp-back-btn" onClick={onClose}>Back</button>
      </div>

      <div className="pvp-card">
        <p className="pvp-desc">
          Enter your phone number to receive a verification code. This helps protect your account and strengthens your Trust Passport.
        </p>

        <label className="pvp-label">Phone number</label>
        <input
          type="tel"
          className={`pvp-phone-input${error ? ' pvp-input-error' : ''}`}
          placeholder="(555) 555-1234"
          value={phone}
          onChange={e => { setPhone(e.target.value); setError('') }}
          autoComplete="tel"
          inputMode="tel"
        />

        {error && <p className="pvp-error">{error}</p>}

        <button
          className="pvp-primary-btn"
          onClick={handleSendOTP}
          disabled={sending || !phone.trim()}
        >
          {sending ? 'Sending…' : 'Send Verification Code'}
        </button>
      </div>

      <div className="pvp-hint">
        <p className="pvp-hint-text">
          🔒 Your phone number is private and never displayed publicly. Standard message rates may apply.
        </p>
      </div>
    </div>
  )
}
