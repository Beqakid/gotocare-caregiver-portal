// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { Shield, CheckCircle2, AlertTriangle, Clock, Star, Upload, X, ChevronRight, Award, Zap, RefreshCw, User, FileText, Eye } from 'lucide-react'

const API_BASE = 'https://gotocare-original.jjioji.workers.dev'

// Animated circular progress ring
const TrustRing = ({ score }: { score: number }) => {
  const r = 52, c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#4A90E2' : score >= 40 ? '#7C5CFF' : '#94a3b8'
  const label = score >= 90 ? 'Elite Caregiver' : score >= 70 ? 'Verified Pro' : score >= 40 ? 'Trusted' : 'Basic'
  const labelColor = score >= 90 ? 'text-success' : score >= 70 ? 'text-blue-500' : score >= 40 ? 'text-primary' : 'text-base-content/40'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={`${c}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-bold text-base-content">{score}</span>
          <span className="text-[10px] text-base-content/40 uppercase tracking-wider">Trust Score</span>
        </div>
      </div>
      <span className={`text-sm font-semibold ${labelColor}`}>{label}</span>
    </div>
  )
}

// Score breakdown row
const ScoreRow = ({ label, value, max, earned }: { label: string; value: number; max: number; earned: boolean }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-base-200 last:border-0">
    <div className="flex items-center gap-2">
      {earned
        ? <CheckCircle2 size={14} className="text-success flex-shrink-0" />
        : <div className="w-3.5 h-3.5 rounded-full border-2 border-base-300 flex-shrink-0" />}
      <span className={`text-sm ${earned ? 'text-base-content' : 'text-base-content/60'}`}>{label}</span>
    </div>
    <span className={`text-xs font-bold ${earned ? 'text-success' : 'text-base-content/55'}`}>+{value}</span>
  </div>
)

// Status badge
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    verified: { label: '✓ Verified', cls: 'bg-success/10 text-success' },
    pending: { label: '⏳ Under Review', cls: 'bg-warning/10 text-warning' },
    rejected: { label: '✗ Rejected', cls: 'bg-error/10 text-error' },
    not_started: { label: 'Not Started', cls: 'bg-base-200 text-base-content/40' },
    completed: { label: '✓ Completed', cls: 'bg-success/10 text-success' },
    expired: { label: '⚠ Expired', cls: 'bg-error/10 text-error' },
  }
  const { label, cls } = map[status] || map.not_started
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

interface TrustData {
  score: number
  breakdown: Record<string, boolean>
  idVerification: { status: string; doc_type?: string; submitted_at?: string } | null
  backgroundCheck: { status: string; initiated_at?: string; completed_at?: string; expires_at?: string } | null
  reviews: { id: number; rating: number; review_text: string; is_repeat_client: number; is_punctual: number; is_caring: number; is_professional: number; would_hire_again: number; created_at: string }[]
  avgRating: number
  reviewCount: number
  metrics: { avg_response_minutes: number; total_requests: number; accepted: number; completed_shifts: number; repeat_bookings: number } | null
  certifications: { name: string; status: string; expiry?: string }[]
}

const CERT_TYPES = [
  { value: 'cpr', label: 'CPR / First Aid' },
  { value: 'cna', label: 'CNA — Certified Nursing Assistant' },
  { value: 'hha', label: 'HHA — Home Health Aide' },
  { value: 'lvn', label: 'LVN / LPN — Licensed Nurse' },
  { value: 'rn', label: 'RN — Registered Nurse' },
  { value: 'dementia', label: 'Dementia Care Specialist' },
  { value: 'hospice', label: 'Hospice & Palliative Care' },
  { value: 'tb', label: 'TB Clearance' },
]

export const TrustCenter: React.FC<{ profile: any }> = ({ profile }) => {
  const [trust, setTrust] = useState<TrustData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [bgLoading, setBgLoading] = useState(false)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [idDocType, setIdDocType] = useState('drivers_license')
  const [idUploading, setIdUploading] = useState(false)
  const [certName, setCertName] = useState('cpr')
  const [certExpiry, setCertExpiry] = useState('')
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certUploading, setCertUploading] = useState(false)
  const idFileRef = useRef<HTMLInputElement>(null)
  const certFileRef = useRef<HTMLInputElement>(null)
  const token = typeof window !== 'undefined' ? (localStorage.getItem('cgp_token') || '') : ''

  useEffect(() => { loadTrustData() }, [])

  const loadTrustData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/trust-status?token=${token}`)
      const data = await res.json()
      if (data.success) setTrust(data)
    } catch (e) {}
    setLoading(false)
  }

  const handleInitiateBackground = async () => {
    setBgLoading(true)
    try {
      await fetch(`${API_BASE}/api/trust-background?token=${token}`, { method: 'POST' })
      await loadTrustData()
    } catch (e) {}
    setBgLoading(false)
    setActiveModule(null)
  }

  const handleIdUpload = async () => {
    if (!idFile) return
    setIdUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', idFile)
      formData.append('doc_type', idDocType)
      formData.append('name', CERT_TYPES.find(c => c.value === idDocType)?.label || idDocType)
      formData.append('token', token)
      await fetch(`${API_BASE}/api/trust-id-upload`, { method: 'POST', body: formData })
      await loadTrustData()
      setIdFile(null)
      setActiveModule(null)
    } catch (e) {}
    setIdUploading(false)
  }

  const handleCertUpload = async () => {
    setCertUploading(true)
    try {
      const formData = new FormData()
      if (certFile) formData.append('file', certFile)
      formData.append('cert_type', certName)
      formData.append('cert_label', CERT_TYPES.find(c => c.value === certName)?.label || certName)
      formData.append('expiry', certExpiry)
      formData.append('token', token)
      await fetch(`${API_BASE}/api/trust-certification`, { method: 'POST', body: formData })
      await loadTrustData()
      setCertFile(null)
      setCertExpiry('')
      setActiveModule(null)
    } catch (e) {}
    setCertUploading(false)
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-base-content/50">Loading your Trust Center...</p>
    </div>
  )

  const score = trust?.score ?? 0
  const bd = trust?.breakdown ?? {}
  const idV = trust?.idVerification
  const bgC = trust?.backgroundCheck
  const reviews = trust?.reviews ?? []
  const metrics = trust?.metrics

  return (
    <div className="px-4 pb-8 space-y-5">
      {/* ---- TRUST SCORE CARD ---- */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-base-content">Your Trust Score</h3>
            <p className="text-xs text-base-content/50 mt-0.5">Verified caregivers get 3× more bookings</p>
          </div>
          <button onClick={loadTrustData} className="btn btn-ghost btn-xs gap-1">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        <div className="flex items-center gap-6">
          <TrustRing score={score} />
          <div className="flex-1 space-y-0.5">
            <ScoreRow label="ID Verified" value={20} max={20} earned={bd.id_verified} />
            <ScoreRow label="Background Check" value={20} max={20} earned={bd.background_checked} />
            <ScoreRow label="CPR Certified" value={15} max={15} earned={bd.cpr_certified} />
            <ScoreRow label="CNA / HHA Verified" value={10} max={10} earned={bd.cna_verified} />
            <ScoreRow label="Profile Complete" value={10} max={10} earned={bd.profile_complete} />
            <ScoreRow label="5+ Completed Shifts" value={10} max={10} earned={bd.shifts_5plus} />
            <ScoreRow label="Fast Responder" value={5} max={5} earned={bd.fast_responder} />
            <ScoreRow label="Repeat Clients" value={5} max={5} earned={bd.repeat_clients} />
            <ScoreRow label="5-Star Average" value={5} max={5} earned={bd.five_star_avg} />
          </div>
        </div>
      </div>

      {/* ---- TRUST CHIPS ---- */}
      <div className="flex flex-wrap gap-2">
        {bd.id_verified && <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1"><Shield size={10} /> ID Verified</span>}
        {bd.background_checked && <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-success/10 text-success flex items-center gap-1"><CheckCircle2 size={10} /> Background Checked</span>}
        {bd.cpr_certified && <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-success/10 text-success flex items-center gap-1"><Award size={10} /> CPR Certified</span>}
        {bd.fast_responder && <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-warning/10 text-warning flex items-center gap-1"><Zap size={10} /> Fast Responder</span>}
        {!bd.id_verified && !bd.background_checked && !bd.cpr_certified && (
          <p className="text-xs text-base-content/40 italic">Complete verifications below to earn trust badges</p>
        )}
      </div>

      {/* ---- ID VERIFICATION ---- */}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4"
          onClick={() => setActiveModule(activeModule === 'id' ? null : 'id')}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bd.id_verified ? 'bg-success/10' : 'bg-blue-50'}`}>
              <User size={18} className={bd.id_verified ? 'text-success' : 'text-blue-500'} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Identity Verification</p>
              <p className="text-xs text-base-content/50">Driver License, State ID, or Passport</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={idV?.status || 'not_started'} />
            <ChevronRight size={16} className={`text-base-content/30 transition-transform ${activeModule === 'id' ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {activeModule === 'id' && (
          <div className="border-t border-base-200 p-4 bg-base-50 space-y-3">
            {idV?.status === 'verified' ? (
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle2 size={16} />
                <span>Your identity has been verified. ✓</span>
              </div>
            ) : idV?.status === 'pending' ? (
              <div className="bg-warning/10 rounded-xl p-3">
                <p className="text-sm text-warning font-medium">⏳ Under Review</p>
                <p className="text-xs text-base-content/60 mt-1">Your documents are being reviewed. This typically takes 1–2 business days.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-base-content/60">Upload a clear photo of your government-issued ID. Documents are private and never publicly shared.</p>
                <select
                  className="select select-bordered select-sm w-full"
                  value={idDocType}
                  onChange={e => setIdDocType(e.target.value)}
                >
                  <option value="drivers_license">Driver's License</option>
                  <option value="state_id">State ID</option>
                  <option value="passport">Passport</option>
                </select>
                <input ref={idFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setIdFile(e.target.files?.[0] || null)} />
                <button className="btn btn-outline btn-sm w-full gap-2" onClick={() => idFileRef.current?.click()}>
                  <Upload size={14} /> {idFile ? idFile.name : 'Choose Document'}
                </button>
                <p className="text-[11px] text-base-content/40">🔒 Stored securely · Never publicly shown · Admin review only</p>
                <button
                  className="btn btn-primary btn-sm w-full"
                  onClick={handleIdUpload}
                  disabled={!idFile || idUploading}
                >
                  {idUploading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</> : 'Submit for Verification'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ---- BACKGROUND CHECK ---- */}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4"
          onClick={() => setActiveModule(activeModule === 'bg' ? null : 'bg')}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bd.background_checked ? 'bg-success/10' : 'bg-slate-50'}`}>
              <Shield size={18} className={bd.background_checked ? 'text-success' : 'text-slate-400'} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Background Check</p>
              <p className="text-xs text-base-content/50">Required for full Verified Pro status</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={bgC?.status || 'not_started'} />
            <ChevronRight size={16} className={`text-base-content/30 transition-transform ${activeModule === 'bg' ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {activeModule === 'bg' && (
          <div className="border-t border-base-200 p-4 bg-base-50 space-y-3">
            {bgC?.status === 'verified' ? (
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle2 size={16} />
                <span>Background check complete. {bgC.expires_at ? `Valid until ${bgC.expires_at.split('T')[0]}` : ''}</span>
              </div>
            ) : bgC?.status === 'pending' ? (
              <div className="bg-warning/10 rounded-xl p-3">
                <p className="text-sm text-warning font-medium">⏳ Background Check In Progress</p>
                <p className="text-xs text-base-content/60 mt-1">Initiated on {bgC.initiated_at?.split('T')[0]}. Results typically arrive within 3–5 business days.</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 rounded-xl p-3 space-y-1">
                  <p className="text-sm font-semibold text-blue-700">Why get a background check?</p>
                  <p className="text-xs text-blue-600/80">Families trust verified caregivers more. Caregivers with background checks receive significantly more booking requests.</p>
                </div>
                <ul className="space-y-1">
                  {['National criminal database search', 'Sex offender registry check', 'County court records', 'Identity verification'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs text-base-content/70">
                      <CheckCircle2 size={12} className="text-success flex-shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-base-content/40">Powered by industry-standard screening. Results are private — only your verification status is shown publicly.</p>
                <button
                  className="btn btn-primary btn-sm w-full"
                  onClick={handleInitiateBackground}
                  disabled={bgLoading}
                >
                  {bgLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting...</> : '🛡️ Start Background Check'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ---- CERTIFICATIONS ---- */}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4"
          onClick={() => setActiveModule(activeModule === 'certs' ? null : 'certs')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Award size={18} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Certifications</p>
              <p className="text-xs text-base-content/50">CPR, CNA, HHA, RN, and more</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(trust?.certifications?.length ?? 0) > 0
              ? <span className="text-xs font-bold text-success">{trust?.certifications?.length} on file</span>
              : <span className="text-xs text-base-content/30">None added</span>}
            <ChevronRight size={16} className={`text-base-content/30 transition-transform ${activeModule === 'certs' ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {activeModule === 'certs' && (
          <div className="border-t border-base-200 p-4 bg-base-50 space-y-3">
            {/* Existing certs */}
            {(trust?.certifications ?? []).length > 0 && (
              <div className="space-y-2">
                {trust!.certifications.map((cert, i) => (
                  <div key={i} className="flex items-center justify-between bg-white rounded-xl p-3 border border-base-200">
                    <div>
                      <p className="text-sm font-medium">{cert.name}</p>
                      {cert.expiry && <p className="text-xs text-base-content/50">Expires {cert.expiry}</p>}
                    </div>
                    <StatusBadge status={cert.status} />
                  </div>
                ))}
              </div>
            )}

            {/* Add new cert */}
            <div className="bg-white rounded-xl p-3 border border-base-200 space-y-2">
              <p className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Add Certification</p>
              <select className="select select-bordered select-sm w-full" value={certName} onChange={e => setCertName(e.target.value)}>
                {CERT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input type="date" className="input input-bordered input-sm w-full" placeholder="Expiry date (optional)" value={certExpiry} onChange={e => setCertExpiry(e.target.value)} />
              <input ref={certFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setCertFile(e.target.files?.[0] || null)} />
              <button className="btn btn-outline btn-xs w-full gap-1" onClick={() => certFileRef.current?.click()}>
                <Upload size={12} /> {certFile ? certFile.name : 'Upload proof (optional)'}
              </button>
              <button className="btn btn-primary btn-sm w-full" onClick={handleCertUpload} disabled={certUploading}>
                {certUploading ? 'Adding...' : '+ Add Certification'}
              </button>
            </div>
            <p className="text-[11px] text-base-content/40">🔒 Certification details are private. Only your verified status is shown to families.</p>
          </div>
        )}
      </div>

      {/* ---- RESPONSE METRICS ---- */}
      {metrics && (
        <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 p-4">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Zap size={14} className="text-warning" /> Response & Reliability
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-base-content">
                {metrics.avg_response_minutes < 60
                  ? `${Math.round(metrics.avg_response_minutes)}m`
                  : `${Math.round(metrics.avg_response_minutes / 60)}h`}
              </p>
              <p className="text-[11px] text-base-content/50">Avg Response</p>
              {metrics.avg_response_minutes <= 5 && <span className="text-[10px] font-bold text-warning">Fast!</span>}
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-base-content">
                {metrics.total_requests > 0 ? Math.round((metrics.accepted / metrics.total_requests) * 100) : 0}%
              </p>
              <p className="text-[11px] text-base-content/50">Accept Rate</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-base-content">{metrics.repeat_bookings}</p>
              <p className="text-[11px] text-base-content/50">Repeat Clients</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-base-200 flex items-center justify-between">
            <p className="text-xs text-base-content/50">{metrics.completed_shifts} shifts completed</p>
            {metrics.avg_response_minutes <= 5 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning flex items-center gap-1">
                <Zap size={9} /> Fast Responder Badge
              </span>
            )}
            {metrics.repeat_bookings >= 3 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1">
                <CheckCircle2 size={9} /> Repeat Family Favorite
              </span>
            )}
          </div>
        </div>
      )}

      {/* ---- MY REVIEWS ---- */}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Star size={14} className="text-warning fill-warning" />
            Family Reviews
          </h4>
          {trust && trust.reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-base-content">{trust.avgRating.toFixed(1)}</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={10} className={s <= Math.round(trust.avgRating) ? 'text-warning fill-warning' : 'text-base-300'} />
                ))}
              </div>
              <span className="text-xs text-base-content/40">({trust.reviewCount})</span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-6">
            <Star size={28} className="text-base-300 mx-auto mb-2" />
            <p className="text-sm text-base-content/50 font-medium">No reviews yet</p>
            <p className="text-xs text-base-content/40 mt-1">Complete bookings to build your caregiver reputation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-base-50 rounded-xl p-3 border border-base-200">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={11} className={s <= r.rating ? 'text-warning fill-warning' : 'text-base-300'} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.is_repeat_client === 1 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success/10 text-success">Hired Again ✓</span>
                    )}
                    <span className="text-[11px] text-base-content/30">{r.created_at?.split('T')[0]}</span>
                  </div>
                </div>
                {r.review_text && <p className="text-sm text-base-content/70 italic">"{r.review_text}"</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.is_punctual === 1 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Punctual</span>}
                  {r.is_caring === 1 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">Caring</span>}
                  {r.is_professional === 1 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">Professional</span>}
                  {r.would_hire_again === 1 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success">Would Hire Again</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- HOW TO IMPROVE ---- */}
      {score < 70 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 border border-purple-100">
          <h4 className="font-semibold text-sm text-primary mb-2">📈 How to increase your score</h4>
          <ul className="space-y-1.5">
            {!bd.id_verified && <li className="text-xs text-base-content/70 flex items-start gap-2"><span className="text-primary mt-0.5">→</span> Submit your ID for verification (+20 pts)</li>}
            {!bd.background_checked && <li className="text-xs text-base-content/70 flex items-start gap-2"><span className="text-primary mt-0.5">→</span> Start a background check (+20 pts)</li>}
            {!bd.cpr_certified && <li className="text-xs text-base-content/70 flex items-start gap-2"><span className="text-primary mt-0.5">→</span> Add your CPR certification (+15 pts)</li>}
            {!bd.profile_complete && <li className="text-xs text-base-content/70 flex items-start gap-2"><span className="text-primary mt-0.5">→</span> Complete your profile (photo + bio + rate + skills) (+10 pts)</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

export default TrustCenter
