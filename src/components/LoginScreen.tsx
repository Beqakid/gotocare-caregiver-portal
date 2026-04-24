// @ts-nocheck
import React, { useState } from 'react'
import { LogIn } from 'lucide-react'

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>
  error: string
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onLogin(email, password)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-base-100">
      <div className="card bg-base-200 w-full max-w-sm">
        <div className="card-body">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🏥</div>
            <h2 className="text-xl font-bold text-base-content">GoToCare</h2>
            <p className="text-base-content/60 text-sm">Caregiver Portal</p>
          </div>
          
          {error && (
            <div className="alert alert-error text-sm py-2">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label"><span className="label-text text-sm">Email</span></label>
              <input
                type="email"
                className="input input-bordered w-full input-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="caregiver@agency.com"
                required
              />
            </div>
            <div>
              <label className="label"><span className="label-text text-sm">Password</span></label>
              <input
                type="password"
                className="input input-bordered w-full input-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full btn-sm"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : <LogIn size={16} />}
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
