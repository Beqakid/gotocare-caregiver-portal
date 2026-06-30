// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react'
import { Clock, FileText, Shield, Heart, ArrowRight, Star } from 'lucide-react'

const API_BASE = 'https://gotocare-original.jjioji.workers.dev'
const GOOGLE_CLIENT_ID = typeof document !== 'undefined'
  ? document.querySelector('meta[name="google-client-id"]')?.getAttribute('content') || ''
  : ''
const GOOGLE_ENABLED = !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'CONFIGURE_ME'
const LOGIN_SCREEN_KEY = 'cgp_login_screen'
type LoginScreenMode = 'choose' | 'register' | 'signin' | 'agency' | 'verify-pending' | 'forgot' | 'reset-sent' | 'reset' | 'phone-enter' | 'phone-verify'

function getSavedLoginScreen(): LoginScreenMode {
  try {
    const saved = localStorage.getItem(LOGIN_SCREEN_KEY) as LoginScreenMode | null
    if (saved && ['choose', 'register', 'signin', 'agency', 'forgot', 'reset-sent', 'reset', 'phone-enter', 'phone-verify'].includes(saved)) return saved
  } catch {}
  return 'choose'
}

interface LoginScreenProps {
  onMarketplaceAuth: (token: string, account: any, authType?: string) => void
  onAgencyLogin: (email: string, password: string) => Promise<void>
  agencyError: string
  agencyLoading: boolean
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onMarketplaceAuth,
  onAgencyLogin,
  agencyError,
  agencyLoading,
}) => {
  const [screen, setScreen] = useState<LoginScreenMode>(getSavedLoginScreen)
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetDone, setResetDone] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviewCards, setReviewCards] = useState<any[]>([])
  // Phase 26D: Phone auth state
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [phoneMasked, setPhoneMasked] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [phoneResendTimer, setPhoneResendTimer] = useState(0)
  const phoneTimerRef = useRef<any>(null)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const navigateToScreen = (nextScreen: LoginScreenMode) => {
    setScreen(nextScreen)
    try { localStorage.setItem(LOGIN_SCREEN_KEY, nextScreen) } catch {}
  }

  // Check for ?reset=TOKEN URL param on mount (handles password reset link clicks)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rt = params.get('reset')
    if (rt) {
      setResetToken(rt)
      navigateToScreen('reset')
      // Clean URL without reload
      const url = new URL(window.location.href)
      url.searchParams.delete('reset')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/caregiver-review-cards?limit=6`)
      .then(r => r.json())
      .then(d => setReviewCards(d.success ? (d.reviews || []) : []))
      .catch(() => setReviewCards([]))
  }, [])

  // Render Google button
  useEffect(() => {
    if (!GOOGLE_ENABLED) return
    if (screen !== 'choose' && screen !== 'register' && screen !== 'signin') return
    const render = () => {
      const g = (window as any).google
      if (!g?.accounts?.id) return
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        ux_mode: 'popup',
        context: 'signup',
      })
      if (googleBtnRef.current) {
        g.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: googleBtnRef.current.offsetWidth || 320,
          text: screen === 'signin' ? 'signin_with' : 'signup_with',
          shape: 'pill',
          logo_alignment: 'left',
        })
      }
    }
    if ((window as any).google?.accounts?.id) {
      render()
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) { clearInterval(interval); render() }
      }, 200)
      return () => clearInterval(interval)
    }
  }, [screen])

  const handleGoogleCredential = async (response: any) => {
    if (!response.credential) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/caregiver-auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()
      if (data.success && data.token) onMarketplaceAuth(data.token, data.account)
      else setError(data.error || 'Google sign-in failed. Please try again.')
    } catch { setError('Connection error. Please try again.') }
    finally { setLoading(false) }
  }

  // Phase 26D: Phone auth handlers
  const startPhoneResendTimer = () => {
    setPhoneResendTimer(30)
    if (phoneTimerRef.current) clearInterval(phoneTimerRef.current)
    phoneTimerRef.current = setInterval(() => {
      setPhoneResendTimer(prev => {
        if (prev <= 1) { clearInterval(phoneTimerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handlePhoneSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!phoneNumber.trim()) { setPhoneError('Please enter your phone number.'); return }
    setPhoneLoading(true); setPhoneError('')
    try {
      const res = await fetch(`${API_BASE}/api/caregiver-auth/phone/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setPhoneMasked(data.maskedPhone || phoneNumber.trim())
        navigateToScreen('phone-verify')
        startPhoneResendTimer()
      } else {
        setPhoneError(data.error || 'Unable to send code. Please try again.')
      }
    } catch { setPhoneError('Connection error. Please try again.') }
    finally { setPhoneLoading(false) }
  }

  const handlePhoneVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!phoneCode.trim() || phoneCode.trim().length < 4) {
      setPhoneError('Please enter the code we sent you.'); return
    }
    setPhoneLoading(true); setPhoneError('')
    try {
      const res = await fetch(`${API_BASE}/api/caregiver-auth/phone/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim(), code: phoneCode.trim() }),
      })
      const data = await res.json()
      if (data.success && data.token) {
        // Clean up timer
        if (phoneTimerRef.current) clearInterval(phoneTimerRef.current)
        onMarketplaceAuth(data.token, data.account, 'phone')
      } else {
        setPhoneError(data.error || 'Verification failed. Please try again.')
      }
    } catch { setPhoneError('Connection error. Please try again.') }
    finally { setPhoneLoading(false) }
  }

  const handlePhoneResend = async () => {
    if (phoneResendTimer > 0) return
    setPhoneError('')
    setPhoneLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/caregiver-auth/phone/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        startPhoneResendTimer()
        setPhoneCode('')
      } else {
        setPhoneError(data.error || 'Unable to resend code.')
      }
    } catch { setPhoneError('Connection error.') }
    finally { setPhoneLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!email.trim()) { setError('Please enter your email'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/caregiver-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify((() => {
          const _body: any = { name: name.trim(), email: email.trim().toLowerCase(), password }
          try { const ic = localStorage.getItem('cgp_invite_code'); if (ic) _body.invite_code = ic } catch {}
          try { const rc = localStorage.getItem('cgp_ref_code'); if (rc) _body.ref_code = rc } catch {}
          try { const sc = localStorage.getItem('cgp_source'); if (sc) _body.source = sc } catch {}
          return _body
        })()),
      })
      const data = await res.json()
      if (data.success && data.token) {
        // Fix 1: Skip email verification wall — proceed immediately with token
        if (data.emailVerificationRequired) {
          localStorage.setItem('cgp_email_unverified', 'true')
        }
        onMarketplaceAuth(data.token, data.account || { email: email.trim().toLowerCase(), name: name.trim() })
      } else {
        setError(data.error || 'Registration failed. Please try again.')
      }
    } catch { setError('Connection error. Please try again.') }
    finally { setLoading(false) }
  }

  const handleResendVerification = async () => {
    if (resendLoading || resendDone) return
    setResendLoading(true)
    try {
      await fetch(`${API_BASE}/api/caregiver-resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      })
      setResendDone(true)
    } catch {}
    finally { setResendLoading(false) }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Email and password required'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/caregiver-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (data.success && data.token) onMarketplaceAuth(data.token, data.account)
      else setError(data.error || 'Invalid email or password.')
    } catch { setError('Connection error. Please try again.') }
    finally { setLoading(false) }
  }

  const handleAgencySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onAgencyLogin(email, password)
  }

  // Softer, warmer gradient — deep indigo-to-navy, less harsh than pure black
  const bgStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#F0F4FF',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '24px 20px', position: 'relative', overflow: 'hidden',
  }

  // Softer, lighter orbs
  const orb = (top: string, right?: string, left?: string, color: string = 'rgba(124,92,255,0.10)'): React.CSSProperties => ({
    position: 'absolute', top, right, left,
    width: '300px', height: '300px', borderRadius: '50%',
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    pointerEvents: 'none',
  })

  const glassCard: React.CSSProperties = {
    width: '100%', maxWidth: '400px',
    background: '#ffffff',
    border: '1px solid #E2E8F0',
    borderRadius: '28px',
    padding: '28px 24px',
    boxShadow: '0 4px 24px rgba(124,92,255,0.08)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: '14px',
    background: '#F8FAFC',
    border: '1px solid #CBD5E1',
    color: '#0F172A', fontSize: '15px', outline: 'none',
    marginBottom: '12px',
  }

  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '13px', borderRadius: '50px',
    background: 'linear-gradient(135deg, #7C5CFF, #4A90E2)',
    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    fontSize: '15px', fontWeight: 600, color: '#0F172A',
    marginBottom: '12px', boxShadow: '0 4px 16px rgba(124,92,255,0.35)',
    opacity: loading ? 0.7 : 1,
  }

  const btnOutline: React.CSSProperties = {
    width: '100%', padding: '13px', borderRadius: '50px',
    background: 'transparent', border: '1px solid #CBD5E1',
    cursor: 'pointer', fontSize: '15px', fontWeight: 500, color: '#475569',
    marginBottom: '12px',
  }

  const GoogleSVG = () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )

  // ── CHOOSE SCREEN ──────────────────────────────────────────
  if (screen === 'choose') return (
    <div style={bgStyle}>
      {/* Softer orbs */}
      <div style={orb('-60px', '-60px', undefined, 'rgba(124,92,255,0.10)')} />
      <div style={orb('60%', undefined, '-80px', 'rgba(74,144,226,0.08)')} />
      <div style={{ position: 'absolute', top: '40%', right: '10%', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img
          src="https://cdn.jsdelivr.net/gh/Beqakid/gotocare-caregiver-portal@main/assets/carehia-logo-full.png"
          alt="Carehia"
          style={{ height: '48px', width: 'auto', display: 'block', margin: '0 auto 14px' }}
        />
        <p style={{ fontSize: '14px', color: '#64748B', fontWeight: 400 }}>Your free professional caregiving office</p>
      </div>

      {/* Social proof */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(124,92,255,0.07)',
        border: '1px solid rgba(124,92,255,0.18)', borderRadius: '50px',
        padding: '6px 16px', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex' }}>
          {['rgba(124,92,255,0.7)','rgba(74,144,226,0.7)','rgba(34,197,94,0.7)'].map((c, i) => (
            <div key={i} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: '2px solid rgba(255,255,255,0.25)', marginLeft: i > 0 ? '-6px' : '0' }} />
          ))}
        </div>
        <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>Join trusted caregivers in your area</span>
      </div>

      {reviewCards.length > 0 && (
        <div style={{ width: '100%', maxWidth: '400px', marginBottom: '18px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
            {reviewCards.map((review, index) => (
              <a
                key={review.id || index}
                href={`?caregiver=${review.caregiverId}`}
                style={{
                  minWidth: '250px',
                  background: '#ffffff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '18px',
                  padding: '13px',
                  color: '#0F172A',
                  textDecoration: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {review.caregiverPhoto ? (
                      <img src={review.caregiverPhoto} alt="" style={{ width: '32px', height: '32px', borderRadius: '10px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(124,92,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>
                        {(review.caregiverName || 'C').slice(0, 1)}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(() => { const p = (review.caregiverName || "").trim().split(" "); return p.length >= 2 ? `${p[0]} ${p[1][0]}.` : (p[0] || "Caregiver"); })()}</div>
                      <div style={{ fontSize: '10px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{review.skill}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                    <Star size={12} fill="#F59E0B" color="#F59E0B" />
                    <span style={{ fontSize: '11px', fontWeight: 800 }}>{review.rating}</span>
                  </div>
                </div>
                <p style={{ fontSize: '12px', lineHeight: 1.45, color: '#475569', margin: 0 }}>
                  "{String(review.reviewText || '').slice(0, 115)}{String(review.reviewText || '').length > 115 ? '...' : ''}"
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Glass card */}
      <div style={glassCard}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', textAlign: 'center', marginBottom: '5px' }}>Create your free account</h2>
        <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', marginBottom: '22px' }}>No credit card. No agency fees. Your data stays private.</p>

        {/* Google button */}
        {GOOGLE_ENABLED ? (
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <div ref={googleBtnRef} style={{ width: '100%' }} />
          </div>
        ) : (
          <button style={{ width: '100%', padding: '13px', borderRadius: '50px', background: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px', fontWeight: 600, color: '#1a1a2e', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <GoogleSVG /> Continue with Google
          </button>
        )}

        {/* Phone login */}
        <button onClick={() => { setPhoneError(''); setPhoneCode(''); navigateToScreen('phone-enter') }} style={{ width: '100%', padding: '13px', borderRadius: '50px', background: '#ffffff', border: '1px solid #CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '12px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C5CFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          Continue with phone
        </button>

        {/* Apple (disabled) */}
        <button disabled style={{ width: '100%', padding: '13px', borderRadius: '50px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px', fontWeight: 600, color: '#CBD5E1', marginBottom: '20px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#CBD5E1"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          Continue with Apple
          <span style={{ background: 'rgba(255,255,255,0.10)', borderRadius: '50px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>Soon</span>
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
        </div>

        {/* Email buttons */}
        <button onClick={() => navigateToScreen('register')} style={btnPrimary}>
          Sign up with email <ArrowRight size={16} />
        </button>
        <button onClick={() => navigateToScreen('signin')} style={btnOutline}>
          Already have an account? Sign in
        </button>
      </div>

      {/* Feature pills — warmer, friendlier copy */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '22px', maxWidth: '360px' }}>
        {[
          { icon: <Clock size={11} />, label: 'Track hours & invoices' },
          { icon: <Shield size={11} />, label: 'Secure doc vault' },
          { icon: <Heart size={11} />, label: 'Find care opportunities' },
          { icon: <Star size={11} />, label: 'Build your reputation' },
        ].map(({ icon, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '50px', padding: '5px 12px', fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
            <span style={{ color: 'rgba(124,92,255,0.9)' }}>{icon}</span>{label}
          </div>
        ))}
      </div>

      <button onClick={() => navigateToScreen('agency')} style={{ marginTop: '20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '50px', cursor: 'pointer', fontSize: '12px', color: '#334155', padding: '8px 13px', fontWeight: 600 }}>
        Agency caregiver? Use agency login
      </button>
    </div>
  )

  // ── REGISTER SCREEN ────────────────────────────────────────
  if (screen === 'register') return (
    <div style={bgStyle}>
      <div style={orb('-80px', '-80px')} />
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <button onClick={() => navigateToScreen('choose')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Back
        </button>
        <div style={glassCard}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '5px' }}>Create your account</h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '22px' }}>Free forever. No credit card needed.</p>

          {GOOGLE_ENABLED && (
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <div ref={googleBtnRef} style={{ width: '100%' }} />
            </div>
          )}

          <form onSubmit={handleRegister}>
            <input style={inputStyle} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
            <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={{ ...inputStyle, marginBottom: '16px' }} type="password" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)} />
            {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '10px 14px', color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
            <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Creating account…' : 'Create free account'}</button>
            <p style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center', marginTop: '10px', lineHeight: 1.6 }}>
              By creating an account you agree to our{' '}
              <a href="https://carehia.com/terms" target="_blank" rel="noreferrer" style={{ color: 'rgba(124,92,255,0.8)', textDecoration: 'underline' }}>Terms of Service</a>{' '}and{' '}
              <a href="https://carehia.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'rgba(124,92,255,0.8)', textDecoration: 'underline' }}>Privacy Policy</a>
            </p>
          </form>
          <button onClick={() => navigateToScreen('signin')} style={{ ...btnOutline, marginBottom: 0 }}>Sign in instead</button>
        </div>
      </div>
    </div>
  )

  // ── SIGN IN SCREEN ─────────────────────────────────────────
  if (screen === 'signin') return (
    <div style={bgStyle}>
      <div style={orb('-80px', '-80px')} />
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <button onClick={() => navigateToScreen('choose')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Back
        </button>
        <div style={glassCard}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '5px' }}>Welcome back</h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '22px' }}>Sign in to your caregiver account</p>

          {GOOGLE_ENABLED && (
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <div ref={googleBtnRef} style={{ width: '100%' }} />
            </div>
          )}

          <form onSubmit={handleSignIn}>
            <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={{ ...inputStyle, marginBottom: '4px' }} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <div style={{ textAlign: 'right', marginBottom: '16px' }}>
              <button type="button" onClick={() => { setError(''); navigateToScreen('forgot') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(124,92,255,0.8)', fontSize: '13px', fontWeight: 500, padding: 0 }}>
                Forgot password?
              </button>
            </div>
            {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '10px 14px', color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
            <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <button onClick={() => navigateToScreen('register')} style={{ ...btnOutline, marginBottom: 0 }}>Create an account instead</button>
        </div>
      </div>
    </div>
  )


  // ── VERIFY PENDING SCREEN ──────────────────────────────────────────
  if (screen === 'verify-pending') return (
    <div style={bgStyle}>
      <div style={orb('-60px', '-60px', undefined, 'rgba(124,92,255,0.10)')} />
      <div style={orb('60%', undefined, '-80px', 'rgba(74,144,226,0.08)')} />
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={glassCard}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C5CFF22, #4A90E222)',
              border: '2px solid rgba(124,92,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: '32px',
            }}>✉️</div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>Check your email</h2>
            <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6 }}>
              We sent a verification link to<br />
              <span style={{ color: '#7C5CFF', fontWeight: 600 }}>{pendingEmail}</span>
            </p>
          </div>
          <div style={{ background: 'rgba(124,92,255,0.06)', border: '1px solid rgba(124,92,255,0.18)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              Click the link in the email to verify your account. Check your spam folder if you don't see it within a minute.
            </p>
          </div>
          {resendDone
            ? <p style={{ textAlign: 'center', color: '#22C55E', fontSize: '14px', marginBottom: '16px' }}>✓ Verification email resent!</p>
            : <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                style={{ ...btnOutline, opacity: resendLoading ? 0.5 : 1 }}
              >
                {resendLoading ? 'Sending…' : 'Resend verification email'}
              </button>
          }
          <button onClick={() => { navigateToScreen('signin') }} style={{ ...btnOutline, fontSize: '13px', color: '#94A3B8' }}>
            Already verified? Sign in
          </button>
        </div>
      </div>
    </div>
  )

  // ── FORGOT PASSWORD SCREEN ─────────────────────────────────
  if (screen === 'forgot') {
    const handleForgot = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!email.trim()) { setError('Please enter your email address'); return }
      setLoading(true); setError('')
      try {
        await fetch(`${API_BASE}/api/caregiver-forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        })
        // Always show success (backend doesn't reveal if email exists)
        navigateToScreen('reset-sent')
      } catch { setError('Connection error. Please try again.') }
      finally { setLoading(false) }
    }
    return (
      <div style={bgStyle}>
        <div style={orb('-80px', '-80px')} />
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <button onClick={() => { navigateToScreen('signin'); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ← Back
          </button>
          <div style={glassCard}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '5px' }}>Reset password</h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '22px' }}>Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleForgot}>
              <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
              {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '10px 14px', color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
              <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Sending…' : 'Send reset link'}</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── RESET SENT SCREEN ──────────────────────────────────────
  if (screen === 'reset-sent') return (
    <div style={bgStyle}>
      <div style={orb('-60px', '-60px', undefined, 'rgba(124,92,255,0.10)')} />
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={glassCard}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(124,92,255,0.15), rgba(74,144,226,0.15))', border: '2px solid rgba(124,92,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px' }}>✉️</div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>Check your email</h2>
            <p style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6 }}>
              If an account exists for <span style={{ color: '#7C5CFF', fontWeight: 600 }}>{email}</span>, you'll receive a reset link shortly.
            </p>
          </div>
          <div style={{ background: 'rgba(124,92,255,0.06)', border: '1px solid rgba(124,92,255,0.18)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              The link expires in 1 hour. Check your spam folder if you don't see it.
            </p>
          </div>
          <button onClick={() => navigateToScreen('signin')} style={{ ...btnOutline, marginBottom: 0 }}>Back to sign in</button>
        </div>
      </div>
    </div>
  )

  // ── RESET PASSWORD SCREEN ──────────────────────────────────
  if (screen === 'reset') {
    const handleReset = async (e: React.FormEvent) => {
      e.preventDefault()
      if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
      setLoading(true); setError('')
      try {
        const res = await fetch(`${API_BASE}/api/caregiver-reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, new_password: newPassword }),
        })
        const data = await res.json()
        if (data.success) {
          setResetDone(true)
          setTimeout(() => navigateToScreen('signin'), 2500)
        } else {
          setError(data.error || 'Reset failed. The link may have expired — please request a new one.')
        }
      } catch { setError('Connection error. Please try again.') }
      finally { setLoading(false) }
    }
    return (
      <div style={bgStyle}>
        <div style={orb('-80px', '-80px')} />
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={glassCard}>
            {resetDone ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>Password updated!</h2>
                <p style={{ color: '#64748B', fontSize: '14px' }}>Redirecting you to sign in…</p>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '5px' }}>Create new password</h2>
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '22px' }}>Must be at least 8 characters.</p>
                <form onSubmit={handleReset}>
                  <input style={inputStyle} type="password" placeholder="New password (8+ characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '10px 14px', color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
                  <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Updating…' : 'Set new password'}</button>
                </form>
                <button onClick={() => navigateToScreen('forgot')} style={{ ...btnOutline, fontSize: '13px', color: '#94A3B8', marginBottom: 0 }}>Request a new link</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── PHONE ENTER SCREEN ──────────────────────────────────────
  if (screen === 'phone-enter') return (
    <div style={bgStyle}>
      <div style={orb('-80px', '-80px')} />
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <button onClick={() => { setPhoneError(''); navigateToScreen('choose') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Back
        </button>
        <div style={glassCard}>
          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(124,92,255,0.15), rgba(74,144,226,0.15))', border: '2px solid rgba(124,92,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '26px' }}>📱</div>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '5px', textAlign: 'center' }}>Continue with phone</h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '22px', textAlign: 'center' }}>Enter your phone number and we'll send you a secure code.</p>

          <form onSubmit={handlePhoneSendCode}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ ...inputStyle, width: '72px', flex: 'none', textAlign: 'center', marginBottom: 0, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+1</div>
              <input
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                type="tel"
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                autoFocus
                maxLength={15}
              />
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '16px', textAlign: 'center' }}>Your phone number stays private. We'll never share it.</p>
            {phoneError && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '10px 14px', color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{phoneError}</div>}
            <button type="submit" disabled={phoneLoading} style={{ ...btnPrimary, opacity: phoneLoading ? 0.7 : 1 }}>{phoneLoading ? 'Sending code…' : 'Send code'}</button>
          </form>
          <button onClick={() => { setPhoneError(''); navigateToScreen('signin') }} style={{ ...btnOutline, marginBottom: 0, fontSize: '13px', color: '#64748B' }}>Use email instead</button>
        </div>
      </div>
    </div>
  )

  // ── PHONE VERIFY SCREEN ────────────────────────────────────
  if (screen === 'phone-verify') return (
    <div style={bgStyle}>
      <div style={orb('-80px', '-80px')} />
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <button onClick={() => { setPhoneError(''); setPhoneCode(''); navigateToScreen('phone-enter') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Change phone number
        </button>
        <div style={glassCard}>
          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(124,92,255,0.15), rgba(74,144,226,0.15))', border: '2px solid rgba(124,92,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '26px' }}>🔐</div>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '5px', textAlign: 'center' }}>Enter your code</h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '22px', textAlign: 'center' }}>We sent a 6-digit code to <span style={{ color: '#7C5CFF', fontWeight: 600 }}>{phoneMasked}</span></p>

          <form onSubmit={handlePhoneVerifyCode}>
            <input
              style={{ ...inputStyle, textAlign: 'center', fontSize: '22px', fontWeight: 700, letterSpacing: '6px' }}
              type="tel"
              placeholder="000000"
              value={phoneCode}
              onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setPhoneCode(v) }}
              autoFocus
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            {phoneError && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '10px 14px', color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{phoneError}</div>}
            <button type="submit" disabled={phoneLoading || phoneCode.length < 4} style={{ ...btnPrimary, opacity: (phoneLoading || phoneCode.length < 4) ? 0.6 : 1 }}>{phoneLoading ? 'Verifying…' : 'Continue'}</button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            {phoneResendTimer > 0 ? (
              <span style={{ fontSize: '13px', color: '#94A3B8' }}>Resend code in {phoneResendTimer}s</span>
            ) : (
              <button onClick={handlePhoneResend} disabled={phoneLoading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C5CFF', fontSize: '13px', fontWeight: 600, padding: 0 }}>Resend code</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // ── AGENCY SCREEN ──────────────────────────────────────────
  return (
    <div style={bgStyle}>
      <div style={orb('-80px', '-80px')} />
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <button onClick={() => navigateToScreen('choose')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>
          ← Back
        </button>
        <div style={glassCard}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '5px' }}>Agency Login</h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '22px' }}>Sign in with your agency credentials</p>
          <form onSubmit={handleAgencySubmit}>
            <input style={inputStyle} type="email" placeholder="Agency email" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={{ ...inputStyle, marginBottom: '16px' }} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            {(agencyError || error) && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '10px 14px', color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{agencyError || error}</div>}
            <button type="submit" disabled={agencyLoading} style={btnPrimary}>{agencyLoading ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
