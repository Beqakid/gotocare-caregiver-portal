// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, ArrowRight, Check, Star, Clock, FileText, Shield } from 'lucide-react'

const API_BASE = 'https://gotocare-original.jjioji.workers.dev'

const GOOGLE_CLIENT_ID = typeof document !== 'undefined'
  ? document.querySelector('meta[name="google-client-id"]')?.getAttribute('content') || ''
  : ''
const GOOGLE_CONFIGURED = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'CONFIGURE_ME'

interface LoginScreenProps {
  onMarketplaceAuth: (token: string, account: any) => void
  onAgencyLogin: (email: string, password: string) => Promise<void>
  agencyError: string
  agencyLoading: boolean
}

type Mode = 'choose' | 'register' | 'signin' | 'agency'

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onMarketplaceAuth,
  onAgencyLogin,
  agencyError,
  agencyLoading,
}) => {
  const [mode, setMode] = useState<Mode>('choose')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const googleBtnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!GOOGLE_CONFIGURED) return
    if (mode !== 'choose' && mode !== 'register' && mode !== 'signin') return

    const tryInit = () => {
      const google = (window as any).google
      if (!google?.accounts?.id) return
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        ux_mode: 'popup',
        context: 'signup',
      })
      if (googleBtnRef.current) {
        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: googleBtnRef.current.offsetWidth || 320,
          text: mode === 'signin' ? 'signin_with' : 'signup_with',
          shape: 'pill',
          logo_alignment: 'left',
        })
      }
    }

    if ((window as any).google?.accounts?.id) {
      tryInit()
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(interval)
          tryInit()
        }
      }, 200)
      return () => clearInterval(interval)
    }
  }, [mode])

  const handleGoogleCallback = async (response: any) => {
    if (!response.credential) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/caregiver-auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()
      if (data.success && data.token) {
        onMarketplaceAuth(data.token, data.account)
      } else {
        setError(data.error || 'Google sign-in failed. Please try again.')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!email.trim()) { setError('Please enter your email'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/caregiver-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (data.success && data.token) {
        onMarketplaceAuth(data.token, data.account)
      } else {
        setError(data.error || 'Registration failed. Please try again.')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Email and password required'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/caregiver-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (data.success && data.token) {
        onMarketplaceAuth(data.token, data.account)
      } else {
        setError(data.error || 'Invalid email or password.')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAgencySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onAgencyLogin(email, password)
  }

  /* ── CHOOSE MODE ── */
  if (mode === 'choose') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1a1a2e 0%, #2d1b69 45%, #1e3a5f 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '250px', height: '250px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 40px rgba(124,58,237,0.5), 0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="white"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: '28px', fontWeight: '800', color: '#ffffff',
            letterSpacing: '-0.5px', marginBottom: '6px',
          }}>GoToCare</h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', fontWeight: '400' }}>
            Your free caregiving office
          </p>
        </div>

        {/* Social proof badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50px', padding: '6px 14px',
          marginBottom: '28px',
        }}>
          <div style={{ display: 'flex', gap: '-4px' }}>
            {['#f472b6','#a78bfa','#60a5fa'].map((c, i) => (
              <div key={i} style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: c, border: '2px solid rgba(255,255,255,0.3)',
                marginLeft: i > 0 ? '-6px' : '0',
              }} />
            ))}
          </div>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>
            Join 2,000+ caregivers earning more
          </span>
        </div>

        {/* Glass card */}
        <div style={{
          width: '100%', maxWidth: '400px',
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '24px',
          padding: '28px 24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{
            fontSize: '20px', fontWeight: '700', color: '#ffffff',
            textAlign: 'center', marginBottom: '6px',
          }}>Create your free account</h2>
          <p style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.5)',
            textAlign: 'center', marginBottom: '24px',
          }}>No credit card. No agency fees. Cancel anytime.</p>

          {/* Google button */}
          {GOOGLE_CONFIGURED ? (
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <div ref={googleBtnRef} style={{ width: '100%' }} />
            </div>
          ) : (
            <button style={{
              width: '100%', padding: '13px', borderRadius: '50px',
              background: '#ffffff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontSize: '15px', fontWeight: '600', color: '#1a1a2e',
              marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          )}

          {/* Apple button */}
          <button disabled style={{
            width: '100%', padding: '13px', borderRadius: '50px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'not-allowed', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '10px',
            fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.35)',
            marginBottom: '20px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Continue with Apple
            <span style={{
              background: 'rgba(255,255,255,0.15)', borderRadius: '50px',
              padding: '2px 8px', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)',
            }}>Soon</span>
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Email signup */}
          <button
            onClick={() => setMode('register')}
            style={{
              width: '100%', padding: '13px', borderRadius: '50px',
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontSize: '15px', fontWeight: '600', color: '#ffffff',
              marginBottom: '12px',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            }}
          >
            Sign up with email
            <ArrowRight size={16} />
          </button>

          <button
            onClick={() => setMode('signin')}
            style={{
              width: '100%', padding: '13px', borderRadius: '50px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
              fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.8)',
            }}
          >
            Already have an account? Sign in
          </button>
        </div>

        {/* Feature pills */}
        <div style={{
          display: 'flex', gap: '10px', flexWrap: 'wrap',
          justifyContent: 'center', marginTop: '24px', maxWidth: '360px',
        }}>
          {[
            { icon: <Clock size={12} />, label: 'Time Tracker' },
            { icon: <FileText size={12} />, label: 'Invoicing' },
            { icon: <Shield size={12} />, label: 'Doc Vault' },
            { icon: <Star size={12} />, label: 'Get Matched' },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50px', padding: '5px 12px',
              fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontWeight: '500',
            }}>
              <span style={{ color: 'rgba(124,58,237,0.9)' }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>

        {/* Agency link */}
        <button
          onClick={() => setMode('agency')}
          style={{
            marginTop: '20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', color: 'rgba(255,255,255,0.3)', textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          Agency caregiver? Use agency login →
        </button>
      </div>
    )
  }

  /* ── REGISTER MODE ── */
  if (mode === 'register') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1a1a2e 0%, #2d1b69 45%, #1e3a5f 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Back */}
          <button
            onClick={() => { setMode('choose'); setError('') }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', fontSize: '14px',
              marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px',
              padding: '0',
            }}
          >
            ← Back
          </button>

          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 0 24px rgba(124,58,237,0.4)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="white"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
              Create account
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
              Free forever. No credit card needed.
            </p>
          </div>

          {/* Google button inline */}
          {GOOGLE_CONFIGURED && (
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <div ref={googleBtnRef} style={{ width: '100%' }} />
            </div>
          )}

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>or with email</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleRegister}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text" placeholder="Full name" value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
              />
              <input
                type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password (min. 6 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '48px' }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: '12px',
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  fontSize: '13px', color: '#fca5a5',
                }}>{error}</div>
              )}

              <button type="submit" disabled={loading} style={primaryBtnStyle}>
                {loading ? 'Creating account…' : 'Create free account'}
              </button>
            </div>
          </form>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            Already have an account?{' '}
            <button onClick={() => { setMode('signin'); setError('') }} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#a78bfa', fontWeight: '600', fontSize: '13px',
            }}>Sign in</button>
          </p>
        </div>
      </div>
    )
  }

  /* ── SIGN IN MODE ── */
  if (mode === 'signin') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1a1a2e 0%, #2d1b69 45%, #1e3a5f 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <button
            onClick={() => { setMode('choose'); setError('') }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', fontSize: '14px',
              marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0',
            }}
          >
            ← Back
          </button>

          <div style={{ marginBottom: '28px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px', boxShadow: '0 0 24px rgba(124,58,237,0.4)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="white"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
              Sign in to your caregiver account
            </p>
          </div>

          {/* Google button */}
          {GOOGLE_CONFIGURED && (
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <div ref={googleBtnRef} style={{ width: '100%' }} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>or with email</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <form onSubmit={handleSignIn}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '48px' }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: '12px',
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  fontSize: '13px', color: '#fca5a5',
                }}>{error}</div>
              )}

              <button type="submit" disabled={loading} style={primaryBtnStyle}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            Don't have an account?{' '}
            <button onClick={() => { setMode('register'); setError('') }} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#a78bfa', fontWeight: '600', fontSize: '13px',
            }}>Sign up free</button>
          </p>
        </div>
      </div>
    )
  }

  /* ── AGENCY MODE ── */
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #1a1a2e 0%, #2d1b69 45%, #1e3a5f 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <button
          onClick={() => { setMode('choose'); setError('') }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', fontSize: '14px',
            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0',
          }}
        >
          ← Back
        </button>

        <div style={{ marginBottom: '28px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <Shield size={24} color="rgba(255,255,255,0.7)" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
            Agency Login
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
            Sign in with your agency credentials
          </p>
        </div>

        <form onSubmit={handleAgencySubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="email" placeholder="Agency email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: '48px' }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)',
              }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {(error || agencyError) && (
              <div style={{
                padding: '10px 14px', borderRadius: '12px',
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                fontSize: '13px', color: '#fca5a5',
              }}>{error || agencyError}</div>
            )}

            <button type="submit" disabled={agencyLoading} style={{
              ...primaryBtnStyle,
              background: 'rgba(255,255,255,0.1)',
              boxShadow: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              {agencyLoading ? 'Signing in…' : 'Sign in to Agency Portal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Shared styles ── */
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '13px 16px', borderRadius: '14px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  fontSize: '15px', color: '#ffffff',
  outline: 'none', boxSizing: 'border-box',
  WebkitAppearance: 'none',
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: '50px',
  background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
  border: 'none', cursor: 'pointer',
  fontSize: '15px', fontWeight: '700', color: '#ffffff',
  boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
  letterSpacing: '0.2px',
}
