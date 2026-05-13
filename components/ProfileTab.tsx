// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { Camera, MapPin, DollarSign, Star, Shield, Globe, Award, Clock, ChevronRight, LogOut, Settings, Edit3, Phone, Mail, FolderOpen, Plus, Trash2, AlertTriangle, CheckCircle2, X, Link2, Copy, Check, Zap, Heart, ThumbsUp, Upload, Share2 } from 'lucide-react'
import { CaregiverProfile, CaregiverDocument } from '../types'
import { addDocument, deleteDocument, refreshDocumentStatuses, calculateCompleteness } from '../utils/storage'
import { TrustCenter } from './TrustCenter'

const API_BASE = 'https://gotocare-original.jjioji.workers.dev'

interface ProfileTabProps {
  profile: CaregiverProfile | null
  documents: CaregiverDocument[]
  onLogout: () => void
  onUpdateProfile: (data: any) => void
  onDocumentsChange: () => void
  deepLink?: string
  initialSection?: 'profile' | 'documents' | 'badges' | 'clients' | 'trust'
  returnedSubscription?: boolean
  onNavigateHome?: () => void
}

const ALL_CARE_NEEDS = [
  'Elder Care', 'Dementia Care', "Alzheimer's Support", 'Wheelchair Assistance',
  'Post-Surgery Recovery', 'Medication Management', 'Bathing & Grooming', 'Meal Preparation',
  'Companionship', 'Transportation', 'Overnight Care', 'Physical Therapy Aid',
  'Wound Care', 'Hospice Support', 'Mental Health Support', 'Feeding Assistance',
  'Incontinence Care', 'Fall Prevention', 'Light Housekeeping', 'Errands & Shopping',
  'Respiratory Care', 'Stroke Recovery', 'Disability Support',
]

const DOC_TYPES = [
  { value: 'certification', label: 'Certification (CNA, HHA, etc.)' },
  { value: 'license', label: 'License (LPN, RN, etc.)' },
  { value: 'training', label: 'Training Certificate' },
  { value: 'background_check', label: 'Background Check' },
  { value: 'health', label: 'Health Record (TB test, etc.)' },
  { value: 'insurance', label: 'Insurance / Bonding' },
  { value: 'other', label: 'Other' },
]

const BADGES = [
  { id: 'verified', icon: Shield, label: 'Verified', desc: 'Background check + ID verified', color: 'text-success', earn: (p: any, d: CaregiverDocument[]) => d.some(x => x.type === 'background_check') },
  { id: 'quick_responder', icon: Zap, label: 'Quick Responder', desc: 'Responds within 1 hour', color: 'text-warning', earn: (p: any) => (p?.totalJobs || 0) >= 5 },
  { id: 'top_rated', icon: Star, label: 'Top Rated', desc: '4.8+ rating with 10+ reviews', color: 'text-warning', earn: (p: any) => (p?.rating || 0) >= 4.8 && (p?.totalReviews || 0) >= 10 },
  { id: 'reliable', icon: ThumbsUp, label: 'Reliable', desc: '95%+ shift completion rate', color: 'text-primary', earn: (p: any) => (p?.totalJobs || 0) >= 20 },
  { id: 'experienced', icon: Award, label: 'Experienced', desc: '50+ jobs completed', color: 'text-primary', earn: (p: any) => (p?.totalJobs || 0) >= 50 },
  { id: 'caregiver_pro', icon: Heart, label: 'Caregiver Pro', desc: 'Fully certified & insured', color: 'text-error', earn: (p: any, d: CaregiverDocument[]) => d.filter(x => x.type === 'certification' || x.type === 'license').length >= 2 && d.some(x => x.type === 'insurance') },
]

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, documents, onLogout, onUpdateProfile, onDocumentsChange, deepLink, initialSection, returnedSubscription, onNavigateHome }) => {
  const [isAvailable, setIsAvailable] = useState(profile?.status === 'active')
  const [editing, setEditing] = useState(false)
  const [editBio, setEditBio] = useState(profile?.bio || '')
  const [editRate, setEditRate] = useState(String(profile?.hourlyRate || ''))
  const [editingSkills, setEditingSkills] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>(profile?.skills || [])
  const [editingContact, setEditingContact] = useState(false)
  const [editPhone, setEditPhone] = useState(profile?.phone || '')
  const [editCity, setEditCity] = useState(profile?.location?.city || '')
  const [editState, setEditState] = useState(profile?.location?.state || '')
  const [langInput, setLangInput] = useState('')
  const [showLangInput, setShowLangInput] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [section, setSection] = useState<'profile' | 'documents' | 'badges' | 'clients' | 'trust'>(initialSection || 'profile')
  const [myClients, setMyClients] = useState<any[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [cgSub, setCgSub] = useState<{subscribed: boolean, plan: string, expiresAt?: string, createdAt?: string} | null>(null)
  const [cgSubLoading, setCgSubLoading] = useState(true)
  const [subUpgrading, setSubUpgrading] = useState(false)
  const [showSubBanner, setShowSubBanner] = useState(!!returnedSubscription)

  useEffect(() => {
    if (initialSection) setSection(initialSection)
    if (deepLink) {
      setTimeout(() => {
        const el = document.getElementById(deepLink)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (deepLink === 'section-bio') setEditing(true)
        if (deepLink === 'section-skills') setEditingSkills(true)
        if (deepLink === 'section-contact') setEditingContact(true)
        if (deepLink === 'section-languages') setShowLangInput(true)
      }, 150)
    }
  }, [deepLink, initialSection])

  useEffect(() => {
    if (section !== 'clients') return
    const token = localStorage.getItem('cgp_token')
    if (!token || clientsLoading) return
    setClientsLoading(true)
    fetch(`${API_BASE}/api/my-clients?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => { if (d.success) setMyClients(d.clients || []) })
      .catch(() => {})
      .finally(() => setClientsLoading(false))
  }, [section])

  useEffect(() => {
    const token = localStorage.getItem('cgp_token')
    if (!token) { setCgSubLoading(false); return; }
    fetch(`${API_BASE}/api/caregiver-subscription?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => setCgSub(d))
      .catch(() => setCgSub(null))
      .finally(() => setCgSubLoading(false))
  }, [])

  const [showAddDoc, setShowAddDoc] = useState(false)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('certification')
  const [docExpiry, setDocExpiry] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [apiDocs, setApiDocs] = useState<any[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docFile, setDocFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cgToken = typeof window !== 'undefined' ? (localStorage.getItem('cgp_token') || '') : ''

  useEffect(() => {
    if (cgToken) loadApiDocs()
  }, [cgToken])

  const loadApiDocs = async () => {
    setDocsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/caregiver-documents?token=${cgToken}`)
      const data = await res.json()
      if (data.success) setApiDocs(data.documents || [])
    } catch (e) {}
    setDocsLoading(false)
  }

  const localDocs = refreshDocumentStatuses()
  const docs = apiDocs.length > 0 ? apiDocs : localDocs
  const { score: completeness, items: completenessItems } = calculateCompleteness(profile, docs)

  const handleToggleAvailability = () => {
    const newStatus = !isAvailable
    setIsAvailable(newStatus)
    onUpdateProfile({ status: newStatus ? 'active' : 'inactive' })
  }

  const handleSaveProfile = () => {
    onUpdateProfile({
      bio: editBio,
      hourlyRate: parseFloat(editRate) || profile?.hourlyRate,
    })
    setEditing(false)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 300
        let w = img.width, h = img.height
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX } }
        else       { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX } }
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, w, h)
        const compressed = canvas.toDataURL('image/jpeg', 0.75)
        onUpdateProfile({ profilePhoto: compressed })
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleSaveContact = () => {
    onUpdateProfile({
      phone: editPhone.trim(),
      location: (editCity.trim() || editState.trim()) ? { city: editCity.trim(), state: editState.trim() } : profile?.location,
    })
    setEditingContact(false)
  }

  const handleToggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  const handleSaveSkills = () => {
    onUpdateProfile({ skills: selectedSkills })
    setEditingSkills(false)
  }

  const handleAddDocument = async () => {
    if (!docName.trim()) return
    if (cgToken) {
      try {
        const fd = new FormData()
        fd.append('token', cgToken)
        fd.append('name', docName.trim())
        fd.append('doc_type', docType)
        if (docExpiry) fd.append('expiry_date', docExpiry)
        if (docFile) fd.append('file', docFile)
        const res = await fetch(`${API_BASE}/api/caregiver-documents`, { method: 'POST', body: fd })
        const data = await res.json()
        if (data.success) {
          await loadApiDocs()
          setShowAddDoc(false)
          setDocName(''); setDocType('certification'); setDocExpiry(''); setDocFile(null)
          onDocumentsChange()
          return
        }
      } catch (e) {}
    }
    addDocument({ name: docName.trim(), type: docType as CaregiverDocument['type'], expiryDate: docExpiry || undefined, notes: undefined })
    setShowAddDoc(false)
    setDocName(''); setDocType('certification'); setDocExpiry(''); setDocFile(null)
    onDocumentsChange()
  }

  const handleDeleteDocument = async (id: string) => {
    if (cgToken) {
      try {
        const res = await fetch(`${API_BASE}/api/caregiver-documents?id=${id}&token=${cgToken}`, { method: 'DELETE' })
        const data = await res.json()
        if (data.success) {
          await loadApiDocs()
          onDocumentsChange()
          return
        }
      } catch (e) {}
    }
    deleteDocument(id)
    onDocumentsChange()
  }

  const handleCgSubscribe = async () => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setSubUpgrading(true)
    try {
      const r = await fetch(`${API_BASE}/api/create-caregiver-subscription-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await r.json()
      if (d.url) window.location.href = d.url
    } catch (e) {}
    setSubUpgrading(false)
  }

  const profileUrl = `carehia.com/caregiver?id=${profile?.id}`

  const copyProfileLink = () => {
    navigator.clipboard?.writeText(`https://${profileUrl}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const earnedBadges = BADGES.filter(b => b.earn(profile, docs))
  const unearnedBadges = BADGES.filter(b => !b.earn(profile, docs))

  if (!profile) return null

  return (
    <div className="pb-4">
      {/* Deep-link back banner */}
      {deepLink && onNavigateHome && (
        <div
          onClick={onNavigateHome}
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'linear-gradient(135deg, #7C5CFF 0%, #4A90E2 100%)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(124,92,255,0.3)',
          }}
        >
          <span style={{ fontSize: '16px' }}>←</span>
          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Back to Profile Strength</span>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginLeft: 'auto' }}>Keep going →</span>
        </div>
      )}

      {/* Profile header */}
      <div id="section-photo" className="earnings-card px-4 pt-6 pb-8 text-center">
        <div className="relative inline-block mb-3">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center avatar-ring overflow-hidden">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">
                {profile.firstName?.[0]}{profile.lastName?.[0]}
              </span>
            )}
          </div>
          <button
            onClick={() => photoInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md"
          >
            <Camera size={14} className="text-primary" />
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <h2 className="text-xl font-bold text-white">{profile.firstName} {profile.lastName}</h2>
        <p className="text-white/90 text-sm mt-0.5">Professional Caregiver</p>
        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
          {earnedBadges.slice(0, 3).map(b => (
            <div key={b.id} className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5">
              <b.icon size={12} className={b.color === 'text-success' ? 'text-green-300' : b.color === 'text-warning' ? 'text-yellow-300' : 'text-white'} />
              <span className="text-xs font-medium text-white">{b.label}</span>
            </div>
          ))}
          {earnedBadges.length === 0 && (
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5">
              <Shield size={12} className="text-green-300" />
              <span className="text-xs font-medium text-white">Verified</span>
            </div>
          )}
        </div>
      </div>

      {/* Shareable profile link */}
      <div className="-mt-4 mx-4 bg-base-100 rounded-2xl p-3 shadow-sm border border-base-200 mb-3">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-primary flex-shrink-0" />
          <p className="text-xs text-base-content/70 flex-1 truncate">{profileUrl}</p>
          <button onClick={copyProfileLink} className="btn btn-ghost btn-xs gap-1">
            {linkCopied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            {linkCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Availability toggle */}
      <div className="mx-4 bg-base-100 rounded-2xl p-4 shadow-sm border border-base-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm text-base-content">Available for Work</p>
            <p className="text-xs text-base-content/70">Clients can find and book you</p>
          </div>
          <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={isAvailable} onChange={handleToggleAvailability} />
        </div>
      </div>

      {/* Section tabs */}
      <div className="px-4 mt-4 mb-3 flex gap-2">
        {[
          { key: 'profile' as const, label: 'Profile' },
          { key: 'documents' as const, label: `Documents (${docs.length})` },
          { key: 'badges' as const, label: `Badges (${earnedBadges.length})` },
          { key: 'clients' as const, label: `My Clients${myClients.length > 0 ? ' (' + myClients.length + ')' : ''}` },
          { key: 'trust' as const, label: '🛡️ Trust' },
        ].map(t => (
          <button key={t.key}
            className={`btn btn-sm rounded-full ${section === t.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSection(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ---- PROFILE SECTION ---- */}
      {section === 'profile' && (
        <div className="px-4 space-y-3">
          {completeness < 100 && (
            <div className="bg-base-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm text-base-content">Profile Strength</p>
                <span className={`text-sm font-bold ${completeness >= 80 ? 'text-success' : completeness >= 50 ? 'text-warning' : 'text-error'}`}>
                  {completeness}%
                </span>
              </div>
              <div className="w-full bg-base-300 rounded-full h-2 mb-3">
                <div className={`h-2 rounded-full transition-all ${completeness >= 80 ? 'bg-success' : completeness >= 50 ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${completeness}%` }} />
              </div>

            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-base-200 rounded-xl p-3 text-center">
              <DollarSign size={16} className="mx-auto text-primary mb-1" />
              <p className="text-base font-bold text-base-content">${profile.hourlyRate || 25}</p>
              <p className="text-[10px] text-base-content/50">Per Hour</p>
            </div>
            <div className="bg-base-200 rounded-xl p-3 text-center">
              <Award size={16} className="mx-auto text-warning mb-1" />
              <p className="text-base font-bold text-base-content">{profile.totalJobs || 0}</p>
              <p className="text-[10px] text-base-content/50">Jobs Done</p>
            </div>
            <div className="bg-base-200 rounded-xl p-3 text-center">
              <Star size={16} className="mx-auto text-success mb-1" />
              <p className="text-base font-bold text-base-content">{profile.rating || '—'}</p>
              <p className="text-[10px] text-base-content/50">Rating</p>
            </div>
          </div>

          {/* Bio */}
          <div id="section-bio" className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm text-base-content">About</p>
              <button onClick={() => setEditing(!editing)} className="btn btn-ghost btn-xs gap-1"><Edit3 size={12} /> Edit</button>
            </div>
            {editing ? (
              <div className="space-y-3">
                <textarea className="textarea textarea-bordered w-full text-sm" rows={3} value={editBio}
                  onChange={e => setEditBio(e.target.value)} placeholder="Tell clients about yourself..." />
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">Hourly Rate ($)</label>
                  <input type="number" className="input input-bordered input-sm w-full" value={editRate}
                    onChange={e => setEditRate(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm flex-1">Cancel</button>
                  <button onClick={handleSaveProfile} className="btn btn-primary btn-sm flex-1">Save</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-base-content/70 leading-relaxed">
                {profile.bio || 'No bio yet. Tap edit to tell clients about your experience and care philosophy.'}
              </p>
            )}
          </div>

          {/* Contact */}
          <div id="section-contact" className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-base-content">Contact</p>
              <button onClick={() => { setEditPhone(profile.phone || ''); setEditCity(profile.location?.city || ''); setEditState(profile.location?.state || ''); setEditingContact(!editingContact) }} className="btn btn-ghost btn-xs gap-1"><Edit3 size={12} /> Edit</button>
            </div>
            {editingContact ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-base-100 rounded-xl px-3 py-2">
                  <Mail size={14} className="text-primary flex-shrink-0" />
                  <span className="text-sm text-base-content/60">{profile.email}</span>
                </div>
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">Phone number</label>
                  <input type="tel" inputMode="tel" className="input input-bordered input-sm w-full"
                    placeholder="(555) 000-0000" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-base-content/60 mb-1 block">City</label>
                    <input type="text" className="input input-bordered input-sm w-full" placeholder="Atlanta"
                      value={editCity} onChange={e => setEditCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-base-content/60 mb-1 block">State</label>
                    <input type="text" className="input input-bordered input-sm w-full" placeholder="GA"
                      maxLength={2} value={editState} onChange={e => setEditState(e.target.value.toUpperCase())} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingContact(false)} className="btn btn-ghost btn-sm flex-1">Cancel</button>
                  <button onClick={handleSaveContact} className="btn btn-primary btn-sm flex-1">Save</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Mail size={14} className="text-primary" /></div>
                  <span className="text-sm text-base-content/70">{profile.email}</span>
                </div>
                {profile.phone ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Phone size={14} className="text-primary" /></div>
                    <span className="text-sm text-base-content/70">{profile.phone}</span>
                  </div>
                ) : (
                  <button onClick={() => setEditingContact(true)} className="flex items-center gap-3 w-full text-left hover:opacity-90">
                    <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center"><Phone size={14} className="text-base-content/60" /></div>
                    <span className="text-sm text-base-content/60">+ Add phone number</span>
                  </button>
                )}
                {profile.location?.city ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><MapPin size={14} className="text-primary" /></div>
                    <span className="text-sm text-base-content/70">{profile.location.city}{profile.location.state ? `, ${profile.location.state}` : ''}</span>
                  </div>
                ) : (
                  <button onClick={() => setEditingContact(true)} className="flex items-center gap-3 w-full text-left hover:opacity-90">
                    <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center"><MapPin size={14} className="text-base-content/60" /></div>
                    <span className="text-sm text-base-content/60">+ Add city / service area</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Share & QR — combined compact card */}
          <div id="section-share" className="bg-base-200 rounded-2xl p-4 border border-primary/15">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={15} className="text-primary" />
              <p className="font-bold text-sm text-base-content">Share Your Profile</p>
            </div>
            <div className="flex items-center gap-2 bg-base-100 rounded-xl px-3 py-2 mb-3">
              <span className="text-xs text-base-content/60 truncate flex-1">carehia.com/caregiver?id={profile?.id}</span>
              <button
                onClick={async () => {
                  const url = `https://carehia.com/caregiver?id=${profile?.id}`
                  try { await navigator.clipboard.writeText(url); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) } catch {}
                }}
                className="flex items-center gap-1 text-primary text-xs font-semibold flex-shrink-0"
              >
                {linkCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const url = `https://carehia.com/caregiver?id=${profile?.id}`
                  try { await navigator.share({ title: `${profile?.firstName} ${profile?.lastName} — Carehia`, url }) } catch {
                    try { await navigator.clipboard.writeText(url); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) } catch {}
                  }
                }}
                className="btn btn-primary btn-sm flex-1 gap-1.5 rounded-xl"
              >
                <Share2 size={14} /> Share
              </button>
              {profile?.id && (
                <button
                  onClick={() => setShowQR(true)}
                  className="btn btn-outline btn-sm flex-1 gap-1.5 rounded-xl border-primary/30 text-primary"
                >
                  📲 QR Code
                </button>
              )}
            </div>
          </div>

          {/* Skills */}
          <div id="section-skills" className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-base-content">Skills &amp; Specializations</p>
              <button onClick={() => { setEditingSkills(!editingSkills); setSelectedSkills(profile.skills || []) }} className="btn btn-ghost btn-xs gap-1">
                <Edit3 size={12} /> {editingSkills ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editingSkills ? (
              <div>
                <p className="text-xs text-base-content/50 mb-3">Tap to select the care services you offer.</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {ALL_CARE_NEEDS.map(need => {
                    const active = selectedSkills.includes(need)
                    return (
                      <button key={need} onClick={() => handleToggleSkill(need)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active ? 'bg-primary text-white border-primary' : 'bg-base-100 text-base-content/60 border-base-300'
                        }`}
                      >{need}</button>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingSkills(false)} className="btn btn-ghost btn-sm flex-1">Cancel</button>
                  <button onClick={handleSaveSkills} className="btn btn-primary btn-sm flex-1">Save ({selectedSkills.length})</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(profile.skills?.length || 0) > 0 ? profile.skills!.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">{skill}</span>
                )) : (
                  <p className="text-xs text-base-content/65">No skills added yet. Tap Edit to select care services you offer.</p>
                )}
              </div>
            )}
          </div>

          {/* Languages */}
          <div id="section-languages" className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-primary" />
                <p className="font-semibold text-sm text-base-content">Languages</p>
              </div>
              <button onClick={() => setShowLangInput(true)} className="btn btn-ghost btn-xs gap-1">
                <Plus size={12} /> Add
              </button>
            </div>
            {showLangInput && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text" className="input input-bordered input-sm flex-1"
                  placeholder="e.g. Spanish, French…" value={langInput}
                  onChange={e => setLangInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && langInput.trim()) {
                      const current = profile.languages || []
                      if (!current.includes(langInput.trim())) onUpdateProfile({ languages: [...current, langInput.trim()] })
                      setLangInput(''); setShowLangInput(false)
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (langInput.trim()) {
                      const current = profile.languages || []
                      if (!current.includes(langInput.trim())) onUpdateProfile({ languages: [...current, langInput.trim()] })
                      setLangInput('')
                    }
                    setShowLangInput(false)
                  }}
                  className="btn btn-primary btn-sm"
                >Add</button>
              </div>
            )}
            {profile.languages && profile.languages.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.languages.map((lang, i) => (
                  <span key={i} className="badge badge-sm badge-ghost py-2.5 gap-1">
                    {lang}
                    <button
                      onClick={() => onUpdateProfile({ languages: profile.languages.filter((_: string, idx: number) => idx !== i) })}
                      className="ml-0.5 opacity-50 hover:opacity-100"
                    >
                      <X size={9} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              !showLangInput && (
                <button onClick={() => setShowLangInput(true)}
                  className="w-full text-center text-xs text-primary/70 hover:text-primary py-2 border border-dashed border-primary/20 rounded-lg">
                  + Add languages you speak (boosts match rate)
                </button>
              )
            )}
          </div>

          {/* Settings row */}
          <div className="bg-base-200 rounded-2xl overflow-hidden">
            <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-3 p-4 hover:bg-base-300 transition-colors border-b border-base-300">
              <Settings size={18} className="text-base-content/60" />
              <span className="flex-1 text-left text-sm text-base-content">Settings</span>
              <ChevronRight size={16} className="opacity-30" />
            </button>
          </div>

          {/* Subscription success banner */}
          {showSubBanner && (
            <div
              style={{
                background: 'linear-gradient(135deg, #22C55E 0%, #16a34a 100%)',
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>🎉</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>You&apos;re on Unlimited!</p>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: 0 }}>All new bookings will be auto-unlocked.</p>
              </div>
              <button
                onClick={() => setShowSubBanner(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >&#x2715;</button>
            </div>
          )}

          {/* Subscription card */}
          <div className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-base-content">Subscription</p>
              {cgSub?.subscribed && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-success/10 text-success border border-success/20">Active</span>
              )}
            </div>
            {cgSubLoading ? (
              <p className="text-xs text-base-content/60">Loading...</p>
            ) : cgSub?.subscribed ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-base">♾️</div>
                  <div>
                    <p className="font-semibold text-sm text-base-content">Unlimited Plan</p>
                    <p className="text-xs text-base-content/60">$19.99/mo · All bookings auto-unlocked</p>
                  </div>
                </div>
                {cgSub.createdAt && (
                  <p className="text-xs text-base-content/50">Member since {new Date(cgSub.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center text-base">🆓</div>
                  <div>
                    <p className="font-semibold text-sm text-base-content">Pay-per-unlock</p>
                    <p className="text-xs text-base-content/60">$4.99 per booking reveal</p>
                  </div>
                </div>
                <div className="bg-primary/5 rounded-xl p-3 mb-3">
                  <p className="text-xs font-semibold text-primary mb-1">♾️ Unlimited Plan — $19.99/mo</p>
                  <p className="text-xs text-base-content/60">Auto-unlock all bookings. Pay once, never miss a lead.</p>
                </div>
                <button
                  onClick={handleCgSubscribe}
                  disabled={subUpgrading}
                  className="btn btn-primary btn-sm w-full rounded-xl gap-1"
                >
                  {subUpgrading ? 'Redirecting...' : '⚡ Upgrade to Unlimited'}
                </button>
              </div>
            )}
          </div>

          <button onClick={onLogout} className="btn btn-ghost w-full text-error gap-2 mt-2">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      )}

      {/* ---- DOCUMENTS SECTION ---- */}
      {section === 'documents' && (
        <div id="section-documents" className="px-4 space-y-4">
          <p className="text-xs text-base-content/60">
            Store your certifications, licenses, and training records. Get alerts before they expire so you never fall out of compliance.
            <p className="text-xs text-base-content/60 mt-1">🔒 Documents are private unless you choose to share them.</p>
          </p>

          <button onClick={() => setShowAddDoc(true)} className="btn btn-primary btn-sm w-full gap-1 rounded-2xl">
            <Plus size={16} /> Add Document
          </button>

          {showAddDoc && (
            <div className="bg-base-200 rounded-2xl p-4 border-2 border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">Add Document</p>
                <button onClick={() => setShowAddDoc(false)} className="btn btn-ghost btn-xs btn-circle"><X size={14} /></button>
              </div>
              <div className="space-y-2">
                <input type="text" className="input input-bordered input-sm w-full" placeholder="Document name *"
                  value={docName} onChange={e => setDocName(e.target.value)} autoFocus />
                <select className="select select-bordered select-sm w-full" value={docType} onChange={e => setDocType(e.target.value)}>
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <div>
                  <label className="text-xs text-base-content/60">Expiry date (optional)</label>
                  <input type="date" className="input input-bordered input-sm w-full" value={docExpiry}
                    onChange={e => setDocExpiry(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-base-content/60 mb-1 block">Upload file (optional)</label>
                  <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                    onChange={e => setDocFile(e.target.files?.[0] || null)} />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="btn btn-outline btn-sm w-full gap-1 border-dashed">
                    <Upload size={14} />
                    {docFile ? docFile.name : 'Choose file (PDF, JPG, PNG)'}
                  </button>
                </div>
                <button onClick={handleAddDocument} className="btn btn-primary btn-sm w-full">Add Document</button>
              </div>
            </div>
          )}

          {docs.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-success/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-success">{docs.filter(d => d.status === 'valid' || d.status === 'no_expiry').length}</p>
                <p className="text-[10px] text-base-content/60">Valid</p>
              </div>
              <div className="bg-warning/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-warning">{docs.filter(d => d.status === 'expiring_soon').length}</p>
                <p className="text-[10px] text-base-content/60">Expiring</p>
              </div>
              <div className="bg-error/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-error">{docs.filter(d => d.status === 'expired').length}</p>
                <p className="text-[10px] text-base-content/60">Expired</p>
              </div>
            </div>
          )}

          {docs.length === 0 && !showAddDoc ? (
            <div className="text-center py-10">
              <FolderOpen size={36} className="mx-auto opacity-20 mb-2" />
              <p className="text-sm text-base-content/60">No documents yet</p>
              <p className="text-xs text-base-content/60 mt-1">Add your certifications, licenses, and training records</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => (
                <div key={doc.id} className="bg-base-200 rounded-2xl p-4 press-card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        doc.status === 'expired' ? 'bg-error/10' : doc.status === 'expiring_soon' ? 'bg-warning/10' : 'bg-success/10'
                      }`}>
                        {doc.status === 'expired' ? <AlertTriangle size={18} className="text-error" /> :
                          doc.status === 'expiring_soon' ? <AlertTriangle size={18} className="text-warning" /> :
                          <CheckCircle2 size={18} className="text-success" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-base-content">{doc.name}</p>
                        <p className="text-xs text-base-content/60 mt-0.5">
                          {DOC_TYPES.find(t => t.value === doc.type)?.label || doc.type}
                        </p>
                        {doc.expiryDate && (
                          <p className={`text-xs mt-0.5 ${doc.status === 'expired' ? 'text-error font-medium' : doc.status === 'expiring_soon' ? 'text-warning font-medium' : 'text-base-content/50'}`}>
                            {doc.status === 'expired' ? 'Expired: ' : doc.status === 'expiring_soon' ? 'Expiring: ' : 'Expires: '}
                            {new Date(doc.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                        {!doc.expiryDate && !doc.expiry_date && <p className="text-xs text-base-content/60 mt-0.5">No expiry</p>}
                        {doc.r2_key && cgToken && (
                          <a href={`${API_BASE}/api/caregiver-documents/file?key=${encodeURIComponent(doc.r2_key)}&token=${cgToken}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary/70 mt-0.5 flex items-center gap-0.5 hover:text-primary">
                            <Upload size={10} /> View file
                          </a>
                        )}
                        {doc.file_name && !doc.r2_key && (
                          <p className="text-xs text-base-content/60 mt-0.5">{doc.file_name}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteDocument(doc.id)} className="btn btn-ghost btn-xs btn-circle opacity-60">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- CLIENTS SECTION ---- */}
      {section === 'clients' && (
        <div className="px-4 space-y-3 pb-4">
          <p className="text-xs text-base-content/60">
            Families who have added you to their care team. You can coordinate schedules and communicate through the platform.
          </p>
          {clientsLoading && (
            <div className="text-center py-8 text-base-content/60 text-sm">Loading your clients…</div>
          )}
          {!clientsLoading && myClients.length === 0 && (
            <div className="bg-base-200 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">👤</div>
              <p className="font-semibold text-sm text-base-content">No clients yet</p>
              <p className="text-xs text-base-content/60 mt-1">When a family adds you to their care team, they will appear here.</p>
            </div>
          )}
          {myClients.map((client, i) => {
            const initials = (client.name || client.clientEmail || '?').substring(0, 2).toUpperCase()
            const hiredDate = client.hiredAt ? new Date(client.hiredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
            return (
              <div key={i} className="bg-base-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-base-content">{client.name || 'Client'}</p>
                  <p className="text-xs text-base-content/65">{hiredDate ? `Added ${hiredDate}` : 'Hired via Carehia'}</p>
                </div>
                <div className="text-xs font-semibold px-2 py-1 rounded-full bg-success/10 text-success border border-success/20">
                  Active
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ---- BADGES SECTION ---- */}
      {section === 'trust' && (
        <TrustCenter profile={profile} />
      )}

      {section === 'badges' && (
        <div className="px-4 space-y-4">
          <p className="text-xs text-base-content/60">
            Earn badges to build trust with clients. Badges appear on your public profile and in search results.
          </p>

          {earnedBadges.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Earned</p>
              <div className="space-y-2">
                {earnedBadges.map(badge => (
                  <div key={badge.id} className="bg-base-200 rounded-2xl p-4 flex items-center gap-3 border border-success/20">
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                      <badge.icon size={24} className={badge.color} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-base-content">{badge.label}</p>
                      <p className="text-xs text-base-content/60">{badge.desc}</p>
                    </div>
                    <CheckCircle2 size={20} className="text-success" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {unearnedBadges.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Available to Earn</p>
              <div className="space-y-2">
                {unearnedBadges.map(badge => (
                  <div key={badge.id} className="bg-base-200 rounded-2xl p-4 flex items-center gap-3 opacity-60">
                    <div className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center">
                      <badge.icon size={24} className="text-base-content/60" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-base-content">{badge.label}</p>
                      <p className="text-xs text-base-content/60">{badge.desc}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-base-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SETTINGS PANEL — inside main div so no Fragment needed ─── */}
      {showSettings && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowSettings(false) }}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, #1a1035 0%, #0f172a 100%)',
              borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: 480, margin: '0 auto',
              padding: '0 0 env(safe-area-inset-bottom, 16px)',
              animation: 'slideUp 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Settings</span>
              <button onClick={() => setShowSettings(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '0 16px 8px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>ACCOUNT</p>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.70)', marginBottom: 2 }}>Signed in as</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{profile?.email || 'your account'}</p>
                </div>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>🔔</span>
                  <span style={{ fontSize: 14, color: '#fff', flex: 1 }}>Notifications</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>On</span>
                </div>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>🌐</span>
                  <span style={{ fontSize: 14, color: '#fff', flex: 1 }}>Language</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>English</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 16px 8px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>SUPPORT</p>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, overflow: 'hidden' }}>
                <a href="mailto:support@carehia.com" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.07)', color: '#fff' }}>
                  <span style={{ fontSize: 18 }}>💬</span>
                  <span style={{ fontSize: 14, flex: 1 }}>Contact Support</span>
                </a>
                <a href="https://carehia.com" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textDecoration: 'none', color: '#fff' }}>
                  <span style={{ fontSize: 18 }}>📖</span>
                  <span style={{ fontSize: 14, flex: 1 }}>About Carehia</span>
                </a>
              </div>
            </div>
            <div style={{ padding: '12px 16px 24px' }}>
              <button
                onClick={() => { setShowSettings(false); onLogout() }}
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, color: '#EF4444', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QR FULLSCREEN MODAL — inside main div ─── */}
      {showQR && profile?.id && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{background: 'rgba(0,0,0,0.92)'}}
          onClick={() => setShowQR(false)}
        >
          <div className="flex flex-col items-center gap-6 p-8" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <p className="text-white font-bold text-xl mb-1">📲 Scan to see my profile</p>
              <p className="text-white/60 text-sm">Point your camera at this QR code</p>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-2xl">
              <img
                src={'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=https://carehia.com/caregiver%3Fid%3D' + profile.id + '&color=7C5CFF&bgcolor=FFFFFF&qzone=2'}
                alt="Profile QR Code" width={280} height={280} className="rounded-2xl"
              />
            </div>
            <div className="text-center">
              <p className="text-white/80 text-sm font-semibold">{profile.firstName} {profile.lastName}</p>
              <p className="text-white/50 text-xs mt-0.5">carehia.com/caregiver?id={profile.id}</p>
            </div>
            <button onClick={() => setShowQR(false)} className="btn btn-ghost text-white/60 btn-sm rounded-xl">
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileTab
