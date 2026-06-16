// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'

const API_BASE = 'https://gotocare-original.jjioji.workers.dev'
const VERIFICATION_STEP_KEY = 'cgp_verification_step'

const DOC_TYPES = {
  government_id: { label: 'Government ID', icon: '🪪', desc: 'Passport, driver\'s license, or state ID. We verify your identity to protect families.', badge: 'ID Verified', allowsFile: true },
  background_consent: { label: 'Background Check Consent', icon: '🔍', desc: 'Consent for a background review. This is required to earn the "Background Reviewed" badge.', badge: 'Background Reviewed', allowsFile: false },
  cna_license: { label: 'CNA License', icon: '🏥', desc: 'Certified Nursing Assistant license. Upload a photo or scan of your valid CNA certificate.', badge: 'License Reviewed', allowsFile: true },
  cpr_certificate: { label: 'CPR Certificate', icon: '🫀', desc: 'Current CPR/First Aid certification. Highly valued by families.', badge: null, allowsFile: true },
}

const STATUS_CONFIG = {
  pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Under Review',  icon: '⏳' },
  approved: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   label: 'Approved',       icon: '✅' },
  rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Needs Revision', icon: '❌' },
}

function getSavedVerificationStep(): string | null {
  try {
    const saved = localStorage.getItem(VERIFICATION_STEP_KEY)
    return saved && DOC_TYPES[saved] ? saved : null
  } catch {}
  return null
}

interface VerificationTabProps {
  caregiverId: number
  onClose: () => void
}

export const VerificationTab: React.FC<VerificationTabProps> = ({ caregiverId, onClose }) => {
  const [verifications, setVerifications] = useState<any[]>([])
  const [trust, setTrust] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState<string | null>(getSavedVerificationStep)
  const [uploading, setUploading] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const token = typeof window !== 'undefined' ? (localStorage.getItem('cgp_token') || '') : ''

  const navigateToStep = (step: string | null) => {
    setActiveStep(step)
    try {
      if (step) localStorage.setItem(VERIFICATION_STEP_KEY, step)
      else localStorage.removeItem(VERIFICATION_STEP_KEY)
    } catch {}
  }

  const loadStatus = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/verification-status?token=${encodeURIComponent(token)}`)
      const d = await r.json()
      if (d.success) {
        setVerifications(d.verifications || [])
        setTrust(d.trust || null)
      }
    } catch (e) {}
    setLoading(false)
  }

  useEffect(() => {
    loadStatus()
    // Phase 23G: clear stale saved step on fresh mount (prevents auto-expanding wrong section)
    return () => {
      try { localStorage.removeItem(VERIFICATION_STEP_KEY) } catch {}
    }
  }, [])

  const getVerif = (docType: string) => verifications.find(v => v.doc_type === docType)

  const handleSubmit = async (docType: string) => {
    setUploading(true)
    setUploadSuccess(null)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('token', token)
      fd.append('doc_type', docType)
      if (docType === 'background_consent') {
        fd.append('consent_given', 'true')
      } else if (selectedFile) {
        fd.append('file', selectedFile)
      }
      const r = await fetch(`${API_BASE}/api/verification-upload`, { method: 'POST', body: fd })
      const d = await r.json()
      if (d.success) {
        setUploadSuccess('Submitted! We\'ll review within 1–3 business days.')
        setSelectedFile(null)
        setConsentChecked(false)
        navigateToStep(null)
        await loadStatus()
      } else {
        setUploadError(d.error || 'Submission failed. Please try again.')
      }
    } catch (e: any) {
      setUploadError(e.message || 'Network error')
    }
    setUploading(false)
  }

  const trustLevel = trust?.level || 'Basic'
  const trustScore = trust?.score || 0
  const SCORE_MAX = 100
  const levelColor = trustScore >= 80 ? '#7C5CFF' : trustScore >= 60 ? '#22C55E' : trustScore >= 35 ? '#4A90E2' : '#94a3b8'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
        fontFamily: 'inherit',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg,#1a1035 0%,#0f172a 100%)',
          borderRadius: '24px 24px 0 0',
          width: '100%', maxWidth: 480, margin: '0 auto',
          maxHeight: '94vh', display: 'flex', flexDirection: 'column',
          overflowY: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 800 }}>Verification Center</h2>
              <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Build trust. Get more clients.</p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>

          {/* Trust score strip */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>Trust Score: {trustScore}/100</p>
                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>Level: {trustLevel}</p>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${levelColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: levelColor, fontWeight: 800, fontSize: 14 }}>{trustScore}</span>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${trustScore}%`, background: `linear-gradient(90deg, ${levelColor}, #7C5CFF)`, borderRadius: 999, transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Verified caregivers get 3x more bookings.</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading your verification status…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {uploadSuccess && (
                <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <p style={{ margin: 0, color: '#22C55E', fontSize: 13, fontWeight: 600 }}>{uploadSuccess}</p>
                </div>
              )}

              {(Object.entries(DOC_TYPES) as [string, typeof DOC_TYPES[keyof typeof DOC_TYPES]][]).map(([docType, config]) => {
                const verif = getVerif(docType)
                const status = verif?.status
                const statusCfg = status ? STATUS_CONFIG[status] : null
                const isOpen = activeStep === docType

                return (
                  <div key={docType} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', border: `1px solid ${statusCfg ? statusCfg.color + '40' : 'rgba(255,255,255,0.08)'}` }}>
                    {/* Card header */}
                    <button
                      onClick={() => navigateToStep(isOpen ? null : docType)}
                      style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{config.icon}</span>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14 }}>{config.label}</p>
                        {config.badge && (
                          <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Earns: {config.badge} badge</p>
                        )}
                      </div>
                      {statusCfg ? (
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusCfg.bg, color: statusCfg.color, flexShrink: 0 }}>
                          {statusCfg.icon} {statusCfg.label}
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, flexShrink: 0 }}>Not submitted</span>
                      )}
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginLeft: 4, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                    </button>

                    {/* Expanded panel */}
                    {isOpen && (
                      <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>{config.desc}</p>

                        {/* Rejected message */}
                        {verif?.status === 'rejected' && verif.rejection_reason && (
                          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                            <p style={{ margin: 0, color: '#EF4444', fontSize: 12, fontWeight: 600 }}>Rejection reason: {verif.rejection_reason}</p>
                          </div>
                        )}

                        {/* Approved message */}
                        {verif?.status === 'approved' && (
                          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                            <p style={{ margin: 0, color: '#22C55E', fontSize: 12, fontWeight: 600 }}>✅ Approved on {verif.approved_at ? new Date(verif.approved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                          </div>
                        )}

                        {/* Only show form if not approved (can resubmit if rejected) */}
                        {verif?.status !== 'approved' && (
                          <>
                            {docType === 'background_consent' ? (
                              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 14 }}>
                                <input
                                  type="checkbox"
                                  checked={consentChecked}
                                  onChange={e => setConsentChecked(e.target.checked)}
                                  style={{ marginTop: 2, width: 18, height: 18, accentColor: '#7C5CFF', flexShrink: 0 }}
                                />
                                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.5 }}>
                                  I consent to Carehia conducting a background review using publicly available records and third-party services to verify my eligibility as a caregiver.
                                </span>
                              </label>
                            ) : (
                              <div style={{ marginBottom: 14 }}>
                                <input
                                  ref={activeStep === docType ? fileInputRef : null}
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.heic"
                                  style={{ display: 'none' }}
                                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                />
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  style={{
                                    width: '100%', padding: '12px', borderRadius: 12,
                                    border: '1.5px dashed rgba(124,92,255,0.4)',
                                    background: selectedFile ? 'rgba(124,92,255,0.12)' : 'transparent',
                                    color: selectedFile ? '#7C5CFF' : 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                  }}
                                >
                                  <span>{selectedFile ? '📎' : '⬆️'}</span>
                                  <span>{selectedFile ? selectedFile.name : 'Choose file (PDF, JPG, PNG)'}</span>
                                </button>
                                {selectedFile && (
                                  <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', marginTop: 4 }}>Remove</button>
                                )}
                              </div>
                            )}

                            {uploadError && (
                              <p style={{ margin: '0 0 10px', color: '#EF4444', fontSize: 12 }}>{uploadError}</p>
                            )}

                            <button
                              onClick={() => handleSubmit(docType)}
                              disabled={uploading || (docType === 'background_consent' ? !consentChecked : !selectedFile)}
                              style={{
                                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                                background: uploading || (docType === 'background_consent' ? !consentChecked : !selectedFile)
                                  ? 'rgba(124,92,255,0.3)' : 'linear-gradient(135deg, #7C5CFF 0%, #4A90E2 100%)',
                                color: '#fff', fontSize: 14, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer',
                                opacity: uploading || (docType === 'background_consent' ? !consentChecked : !selectedFile) ? 0.6 : 1,
                              }}
                            >
                              {uploading ? 'Submitting…' : verif?.status === 'rejected' ? 'Resubmit' : 'Submit for Review'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* What happens next */}
              <div style={{ background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.2)', borderRadius: 16, padding: '16px' }}>
                <p style={{ margin: '0 0 10px', color: '#7C5CFF', fontWeight: 700, fontSize: 13 }}>📋 What happens after you submit?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['Our team reviews your submission within 1–3 business days.', 'Approved submissions unlock trust badges on your profile.', 'Verified caregivers rank higher in family searches.', 'You\'ll see the status update here.'].map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#7C5CFF', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{i + 1}.</span>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.5 }}>{t}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Badges earned strip */}
              {trust && (
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ margin: '0 0 10px', color: '#fff', fontWeight: 700, fontSize: 13 }}>🏅 Your Verified Badges</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { key: 'id_verified', label: 'ID Verified', icon: '🪪' },
                      { key: 'background_checked', label: 'Background Reviewed', icon: '🔍' },
                      { key: 'cna_verified', label: 'License Reviewed', icon: '🏥' },
                      { key: 'cpr_certified', label: 'CPR Certified', icon: '🫀' },
                    ].map(b => trust[b.key] ? (
                      <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
                        <span style={{ fontSize: 14 }}>{b.icon}</span>
                        <span style={{ color: '#22C55E', fontSize: 12, fontWeight: 700 }}>{b.label}</span>
                      </div>
                    ) : null)}
                    {!trust.id_verified && !trust.background_checked && !trust.cna_verified && !trust.cpr_certified && (
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>No badges yet. Submit verifications above to earn them.</p>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerificationTab
