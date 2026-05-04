// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { Heart, Eye, EyeOff, ArrowRight, User } from 'lucide-react'

const API_BASE = 'https://gotocare-original.jjioji.workers.dev'

// Google Client ID — set this once user provides it
// To configure: update the content attribute of <meta name="google-client-id"> in index.html
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

  // Initialize Google Sign-In
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
        })
      }
    }

    // Wait for GIS library to load
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
        setError(data.error || 'Invalid email or password')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      {/* Gradient header */}
      <div className="earnings-card px-6 pt-16 pb-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
          <Heart size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">GoToCare</h1>
        <p className="text-white/80 text-sm">Your free caregiving office — earn more, stress less</p>
      </div>

      {/* Content */}
      <div className="flex-1 -mt-6 bg-base-100 rounded-t-3xl px-6 pt-8 pb-10 overflow-y-auto">

        {/* ── CHOOSE mode (default) ── */}
        {mode === 'choose' && (
          <>
            <h2 className="text-xl font-bold text-base-content mb-1">Join free today</h2>
            <p className="text-base-content/60 text-sm mb-6">No credit card. No agency fees. Tools that actually help.</p>

            {error && <div className="alert alert-error mb-4 text-sm py-2"><span>{error}</span></div>}

            {/* Google Sign-In */}
            {GOOGLE_CONFIGURED ? (
              <div className="mb-3">
                <div ref={googleBtnRef} className="w-full flex justify-center" style={{ minHeight: 44 }} />
              </div>
            ) : (
              <div className="mb-3 tooltip tooltip-bottom w-full" data-tip="Google login coming soon — enter your Google Client ID in index.html">
                <button disabled className="btn w-full h-12 bg-white border border-base-300 text-base-content gap-3 opacity-70 cursor-not-allowed">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            )}

            {/* Apple Sign-In */}
            <div className="mb-4 relative">
              <button
                disabled
                className="btn w-full h-12 bg-base-content text-base-100 gap-3 opacity-40 cursor-not-allowed"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continue with Apple
                <span className="badge badge-sm bg-base-100/20 text-base-100 border-0 text-xs">Soon</span>
              </button>
            </div>

            <div className="divider text-base-content/40 text-xs my-4">or</div>

            <button
              onClick={() => { setMode('register'); setError('') }}
              className="btn btn-primary w-full h-12 font-semibold gap-2 mb-3"
            >
              <User size={18} /> Sign up with email
            </button>

            <button
              onClick={() => { setMode('signin'); setError('') }}
              className="btn btn-outline w-full h-12 font-semibold"
            >
              Already have an account? Sign in
            </button>

            <div className="text-center mt-6">
              <button
                onClick={() => { setMode('agency'); setError('') }}
                className="text-xs text-base-content/40 underline underline-offset-2"
              >
                Agency caregiver? Use agency login →
              </button>
            </div>
          </>
        )}

        {/* ── REGISTER mode ── */}
        {mode === 'register' && (
          <>
            <button onClick={() => { setMode('choose'); setError('') }} className="btn btn-ghost btn-sm gap-1 mb-4 -ml-2 text-base-content/50">
              ← Back
            </button>
            <h2 className="text-xl font-bold text-base-content mb-1">Create your account</h2>
            <p className="text-base-content/60 text-sm mb-5">Free forever. Your caregiving office starts now.</p>

            {GOOGLE_CONFIGURED && (
              <>
                <div className="mb-3">
                  <div ref={googleBtnRef} className="w-full flex justify-center" style={{ minHeight: 44 }} />
                </div>
                <div className="divider text-base-content/40 text-xs my-4">or sign up with email</div>
              </>
            )}

            {error && <div className="alert alert-error mb-4 text-sm py-2"><span>{error}</span></div>}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-base-content/80 mb-1 block">Full Name</label>
                <input type="text" className="input input-bordered w-full h-12" placeholder="Maria Santos"
                  value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
              </div>
              <div>
                <label className="text-sm font-medium text-base-content/80 mb-1 block">Email</label>
                <input type="email" className="input input-bordered w-full h-12" placeholder="maria@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
              </div>
              <div>
                <label className="text-sm font-medium text-base-content/80 mb-1 block">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input input-bordered w-full h-12 pr-12"
                    placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password" required minLength={6} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={20} className="opacity-40" /> : <Eye size={20} className="opacity-40" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="btn btn-primary w-full h-12 text-base font-semibold gap-2">
                {loading ? <span className="loading loading-spinner loading-sm" /> : <>Create Account <ArrowRight size={18} /></>}
              </button>
            </form>

            <p className="text-center text-sm text-base-content/50 mt-5">
              Already registered?{' '}
              <button onClick={() => { setMode('signin'); setError('') }} className="text-primary font-medium">Sign in</button>
            </p>
          </>
        )}

        {/* ── SIGN IN mode ── */}
        {mode === 'signin' && (
          <>
            <button onClick={() => { setMode('choose'); setError('') }} className="btn btn-ghost btn-sm gap-1 mb-4 -ml-2 text-base-content/50">
              ← Back
            </button>
            <h2 className="text-xl font-bold text-base-content mb-1">Welcome back</h2>
            <p className="text-base-content/60 text-sm mb-5">Sign in to your caregiver account</p>

            {GOOGLE_CONFIGURED && (
              <>
                <div className="mb-3">
                  <div ref={googleBtnRef} className="w-full flex justify-center" style={{ minHeight: 44 }} />
                </div>
                <div className="divider text-base-content/40 text-xs my-4">or sign in with email</div>
              </>
            )}

            {error && <div className="alert alert-error mb-4 text-sm py-2"><span>{error}</span></div>}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-base-content/80 mb-1 block">Email</label>
                <input type="email" className="input input-bordered w-full h-12" placeholder="maria@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
              </div>
              <div>
                <label className="text-sm font-medium text-base-content/80 mb-1 block">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input input-bordered w-full h-12 pr-12"
                    placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password" required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={20} className="opacity-40" /> : <Eye size={20} className="opacity-40" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="btn btn-primary w-full h-12 text-base font-semibold gap-2">
                {loading ? <span className="loading loading-spinner loading-sm" /> : <>Sign In <ArrowRight size={18} /></>}
              </button>
            </form>

            <p className="text-center text-sm text-base-content/50 mt-5">
              New here?{' '}
              <button onClick={() => { setMode('register'); setError('') }} className="text-primary font-medium">Create free account</button>
            </p>
          </>
        )}

        {/* ── AGENCY LOGIN mode ── */}
        {mode === 'agency' && (
          <>
            <button onClick={() => { setMode('choose'); setError('') }} className="btn btn-ghost btn-sm gap-1 mb-4 -ml-2 text-base-content/50">
              ← Back
            </button>
            <h2 className="text-xl font-bold text-base-content mb-1">Agency caregiver login</h2>
            <p className="text-base-content/60 text-sm mb-5">Sign in with your agency-provided credentials</p>

            {agencyError && <div className="alert alert-error mb-4 text-sm py-2"><span>{agencyError}</span></div>}

            <form onSubmit={e => { e.preventDefault(); onAgencyLogin(email, password) }} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-base-content/80 mb-1 block">Email</label>
                <input type="email" className="input input-bordered w-full h-12" placeholder="you@agency.com"
                  value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
              </div>
              <div>
                <label className="text-sm font-medium text-base-content/80 mb-1 block">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input input-bordered w-full h-12 pr-12"
                    placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password" required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={20} className="opacity-40" /> : <Eye size={20} className="opacity-40" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={agencyLoading}
                className="btn btn-outline btn-primary w-full h-12 text-base font-semibold gap-2">
                {agencyLoading ? <span className="loading loading-spinner loading-sm" /> : <>Sign In <ArrowRight size={18} /></>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
