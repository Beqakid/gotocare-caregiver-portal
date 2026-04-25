// @ts-nocheck
import React, { useState } from 'react'
import { Heart, Eye, EyeOff, ArrowRight } from 'lucide-react'

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>
  error: string
  loading: boolean
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error, loading }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) onLogin(email, password)
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      {/* Gradient header */}
      <div className="earnings-card px-6 pt-16 pb-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
          <Heart size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">GoToCare</h1>
        <p className="text-white/80 text-sm">Your caregiving career, in your pocket</p>
      </div>

      {/* Login form */}
      <div className="flex-1 -mt-6 bg-base-100 rounded-t-3xl px-6 pt-8 pb-6">
        <h2 className="text-xl font-bold text-base-content mb-1">Welcome back</h2>
        <p className="text-base-content/60 text-sm mb-6">Sign in to your caregiver account</p>

        {error && (
          <div className="alert alert-error mb-4 text-sm py-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-base-content/80 mb-1 block">Email</label>
            <input
              type="email"
              className="input input-bordered w-full h-12 text-base"
              placeholder="maria@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-base-content/80 mb-1 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input input-bordered w-full h-12 text-base pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} className="opacity-40" /> : <Eye size={20} className="opacity-40" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full h-12 text-base font-semibold gap-2"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <>Sign In <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="text-center mt-8">
          <p className="text-sm text-base-content/50">
            New caregiver?{' '}
            <span className="text-primary font-medium">Join GoToCare</span>
          </p>
        </div>
      </div>
    </div>
  )
}
