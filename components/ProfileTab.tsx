// @ts-nocheck
import React, { useState } from 'react'
import { Camera, MapPin, DollarSign, Star, Shield, Globe, Award, Clock, ChevronRight, LogOut, Settings, Edit3, Phone, Mail, FolderOpen, Plus, Trash2, AlertTriangle, CheckCircle2, X, Link2, Copy, Check, Zap, Heart, ThumbsUp, Bell, Lock, HelpCircle, ChevronLeft, User } from 'lucide-react'
import { CaregiverProfile, CaregiverDocument } from '../types'
import { addDocument, deleteDocument, refreshDocumentStatuses, calculateCompleteness } from '../utils/storage'

interface ProfileTabProps {
  profile: CaregiverProfile | null
  documents: CaregiverDocument[]
  onLogout: () => void
  onUpdateProfile: (data: any) => void
  onDocumentsChange: () => void
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
  { id: 'verified', icon: Shield, label: 'Verified', desc: 'Background check + ID verified', earn: (p: any, d: CaregiverDocument[]) => d.some(x => x.type === 'background_check') },
  { id: 'quick_responder', icon: Zap, label: 'Quick Responder', desc: 'Responds within 1 hour', earn: (p: any) => (p?.totalJobs || 0) >= 5 },
  { id: 'top_rated', icon: Star, label: 'Top Rated', desc: '4.8+ rating with 10+ reviews', earn: (p: any) => (p?.rating || 0) >= 4.8 && (p?.totalReviews || 0) >= 10 },
  { id: 'reliable', icon: ThumbsUp, label: 'Reliable', desc: '95%+ shift completion rate', earn: (p: any) => (p?.totalJobs || 0) >= 20 },
  { id: 'experienced', icon: Award, label: 'Experienced', desc: '50+ jobs completed', earn: (p: any) => (p?.totalJobs || 0) >= 50 },
  { id: 'caregiver_pro', icon: Heart, label: 'Caregiver Pro', desc: 'Fully certified & insured', earn: (p: any, d: CaregiverDocument[]) => d.filter(x => x.type === 'certification' || x.type === 'license').length >= 2 && d.some(x => x.type === 'insurance') },
]

// ── Settings Panel ────────────────────────────────────────────────
const SettingsPanel: React.FC<{ profile: CaregiverProfile; onClose: () => void; onUpdateProfile: (data: any) => void; onLogout: () => void }> = ({ profile, onClose, onUpdateProfile, onLogout }) => {
  const [editName, setEditName] = useState(profile.firstName + ' ' + (profile.lastName || ''))
  const [editPhone, setEditPhone] = useState(profile.phone || '')
  const [editRate, setEditRate] = useState(String(profile.hourlyRate || 25))
  const [editRadius, setEditRadius] = useState('10')
  const [notifyRequests, setNotifyRequests] = useState(true)
  const [notifyMessages, setNotifyMessages] = useState(true)
  const [notifyPromo, setNotifyPromo] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSave = () => {
    const parts = editName.trim().split(' ')
    onUpdateProfile({
      firstName: parts[0] || profile.firstName,
      lastName: parts.slice(1).join(' ') || profile.lastName,
      phone: editPhone,
      hourlyRate: parseFloat(editRate) || profile.hourlyRate,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #2d1b69 40%, #1e3a5f 100%)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-6 pb-4">
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h1 className="text-lg font-bold text-white flex-1">Settings</h1>
        <button onClick={handleSave} className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
          style={{ background: saved ? '#10b981' : 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: 'white' }}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-5">

        {/* Account section */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Account</p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Full Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Email</label>
              <div className="w-full px-3 py-2.5 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                <Lock size={14} />
                <span>{profile.email}</span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Email cannot be changed</p>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Phone Number</label>
              <input
                type="tel"
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </div>

        {/* Work Preferences */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Work Preferences</p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Hourly Rate (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>$</span>
                <input
                  type="number"
                  value={editRate}
                  onChange={e => setEditRate(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm font-medium outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
                  min="10" max="150"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Search Radius</label>
              <select
                value={editRadius}
                onChange={e => setEditRadius(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <option value="5">5 miles</option>
                <option value="10">10 miles</option>
                <option value="20">20 miles</option>
                <option value="30">30 miles</option>
                <option value="50">50 miles</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Notifications</p>
          </div>
          {[
            { label: 'New Care Requests', desc: 'Get notified when a client books you', value: notifyRequests, set: setNotifyRequests },
            { label: 'Messages', desc: 'Client messages and updates', value: notifyMessages, set: setNotifyMessages },
            { label: 'Tips & Promotions', desc: 'GoToCare news and feature updates', value: notifyPromo, set: setNotifyPromo },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between px-4 py-3.5 border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.desc}</p>
              </div>
              <button
                onClick={() => item.set(!item.value)}
                className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
                style={{ background: item.value ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : 'rgba(255,255,255,0.15)' }}
              >
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: item.value ? '22px' : '2px' }} />
              </button>
            </div>
          ))}
        </div>

        {/* Support */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { icon: HelpCircle, label: 'Help & Support', action: () => window.open('https://gotocare.com/help', '_blank') },
            { icon: Shield, label: 'Privacy Policy', action: () => window.open('https://gotocare.com/privacy', '_blank') },
          ].map((item, i, arr) => (
            <button key={item.label} onClick={item.action}
              className="w-full flex items-center gap-3 px-4 py-4 text-left transition-all border-b last:border-b-0"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <item.icon size={18} style={{ color: 'rgba(255,255,255,0.5)' }} />
              <span className="flex-1 text-sm text-white">{item.label}</span>
              <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.25)' }} />
            </button>
          ))}
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <button onClick={() => onLogout()}
            className="w-full flex items-center gap-3 px-4 py-4 border-b"
            style={{ borderColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            <LogOut size={18} />
            <span className="flex-1 text-left text-sm font-medium">Sign Out</span>
          </button>
          <button onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-4"
            style={{ color: '#ef4444' }}>
            <Trash2 size={18} />
            <span className="flex-1 text-left text-sm font-medium">Delete Account</span>
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)' }}>
            <p className="text-sm font-bold text-white">Delete your account?</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>This will permanently delete your profile, bookings, and all data. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-xl text-sm font-medium text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
              <button className="flex-1 py-2 rounded-xl text-sm font-bold" style={{ background: '#ef4444', color: 'white' }}>Delete Forever</button>
            </div>
          </div>
        )}

        <p className="text-center text-xs pb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>GoToCare v1.0 · Made with ♥ for caregivers</p>
      </div>
    </div>
  )
}

// ── Main ProfileTab ───────────────────────────────────────────────
export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, documents, onLogout, onUpdateProfile, onDocumentsChange }) => {
  const [isAvailable, setIsAvailable] = useState(profile?.status === 'active')
  const [editing, setEditing] = useState(false)
  const [editBio, setEditBio] = useState(profile?.bio || '')
  const [editRate, setEditRate] = useState(String(profile?.hourlyRate || ''))
  const [editingSkills, setEditingSkills] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>(profile?.skills || [])
  const [section, setSection] = useState<'profile' | 'documents' | 'badges'>('profile')
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('certification')
  const [docExpiry, setDocExpiry] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const docs = refreshDocumentStatuses()
  const { score: completeness, items: completenessItems } = calculateCompleteness(profile, docs)

  const handleToggleAvailability = () => {
    const newStatus = !isAvailable
    setIsAvailable(newStatus)
    onUpdateProfile({ status: newStatus ? 'active' : 'inactive' })
  }

  const handleSaveProfile = () => {
    onUpdateProfile({ bio: editBio, hourlyRate: parseFloat(editRate) || profile?.hourlyRate })
    setEditing(false)
  }

  const handleToggleSkill = (skill: string) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
  }

  const handleSaveSkills = () => {
    onUpdateProfile({ skills: selectedSkills })
    setEditingSkills(false)
  }

  const handleAddDocument = () => {
    if (!docName.trim()) return
    addDocument({ name: docName.trim(), type: docType as CaregiverDocument['type'], expiryDate: docExpiry || undefined, notes: undefined })
    setShowAddDoc(false)
    setDocName(''); setDocType('certification'); setDocExpiry('')
    onDocumentsChange()
  }

  const handleDeleteDocument = (id: string) => {
    deleteDocument(id)
    onDocumentsChange()
  }

  const profileUrl = `gotocare.com/caregiver/${profile?.firstName?.toLowerCase()}-${profile?.lastName?.toLowerCase()}-${profile?.id}`

  const copyProfileLink = () => {
    navigator.clipboard?.writeText(`https://${profileUrl}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const earnedBadges = BADGES.filter(b => b.earn(profile, docs))
  const unearnedBadges = BADGES.filter(b => !b.earn(profile, docs))

  if (!profile) return null

  return (
    <>
      {/* Settings full-screen panel */}
      {showSettings && (
        <SettingsPanel
          profile={profile}
          onClose={() => setShowSettings(false)}
          onUpdateProfile={(data) => { onUpdateProfile(data); setShowSettings(false) }}
          onLogout={onLogout}
        />
      )}

      <div className="pb-4">
        {/* Profile header */}
        <div className="earnings-card px-4 pt-6 pb-8 text-center">
          <div className="relative inline-block mb-3">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center avatar-ring">
              <span className="text-2xl font-bold text-white">
                {profile.firstName?.[0]}{profile.lastName?.[0]}
              </span>
            </div>
            <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md">
              <Camera size={14} className="text-primary" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-white">{profile.firstName} {profile.lastName}</h2>
          <p className="text-white/90 text-sm mt-0.5">Professional Caregiver</p>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            {earnedBadges.slice(0, 3).map(b => (
              <div key={b.id} className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5">
                <b.icon size={12} className="text-yellow-300" />
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

        {/* Shareable link */}
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
          ].map(t => (
            <button key={t.key}
              className={`btn btn-sm rounded-full ${section === t.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSection(t.key)}
            >{t.label}</button>
          ))}
        </div>

        {/* ── PROFILE ── */}
        {section === 'profile' && (
          <div className="px-4 space-y-3">
            {/* Profile completeness */}
            {completeness < 100 && (
              <div className="bg-base-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm text-base-content">Profile Strength</p>
                  <span className={`text-sm font-bold ${completeness >= 80 ? 'text-success' : completeness >= 50 ? 'text-warning' : 'text-error'}`}>{completeness}%</span>
                </div>
                <div className="w-full bg-base-300 rounded-full h-2 mb-3">
                  <div className={`h-2 rounded-full transition-all ${completeness >= 80 ? 'bg-success' : completeness >= 50 ? 'bg-warning' : 'bg-primary'}`}
                    style={{ width: `${completeness}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {completenessItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {item.done ? <CheckCircle2 size={12} className="text-success" /> : <div className="w-3 h-3 rounded-full border border-base-400" />}
                      <span className={`text-[11px] ${item.done ? 'text-base-content/50 line-through' : 'text-base-content/70'}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick stats */}
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
            <div className="bg-base-200 rounded-2xl p-4">
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
            <div className="bg-base-200 rounded-2xl p-4 space-y-3">
              <p className="font-semibold text-sm text-base-content">Contact</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Mail size={14} className="text-primary" /></div>
                <span className="text-sm text-base-content/70">{profile.email}</span>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Phone size={14} className="text-primary" /></div>
                  <span className="text-sm text-base-content/70">{profile.phone}</span>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><MapPin size={14} className="text-primary" /></div>
                  <span className="text-sm text-base-content/70">{typeof profile.location === 'string' ? profile.location : `${profile.location.city}, ${profile.location.state}`}</span>
                </div>
              )}
            </div>

            {/* Skills — FIXED contrast */}
            <div className="bg-base-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm text-base-content">Skills & Specializations</p>
                <button
                  onClick={() => { setEditingSkills(!editingSkills); setSelectedSkills(profile.skills || []) }}
                  className="btn btn-ghost btn-xs gap-1"
                >
                  <Edit3 size={12} /> {editingSkills ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {editingSkills ? (
                <div>
                  <p className="text-xs text-base-content/50 mb-3">Tap to select the care services you offer.</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {ALL_CARE_NEEDS.map(need => {
                      const active = selectedSkills.includes(need)
                      return (
                        <button
                          key={need}
                          onClick={() => handleToggleSkill(need)}
                          style={active ? {
                            background: '#ffffff',
                            color: '#1a1a2e',
                            border: '2px solid #7c3aed',
                            fontWeight: '700',
                          } : {
                            background: 'transparent',
                            color: 'rgba(0,0,0,0.55)',
                            border: '1.5px solid rgba(0,0,0,0.18)',
                            fontWeight: '500',
                          }}
                          className="px-3 py-1.5 rounded-full text-xs transition-all"
                        >
                          {active && <span className="mr-1">✓</span>}{need}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingSkills(false)} className="btn btn-ghost btn-sm flex-1">Cancel</button>
                    <button onClick={handleSaveSkills} className="btn btn-primary btn-sm flex-1">Save ({selectedSkills.length})</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(profile.skills?.length || 0) > 0 ? profile.skills!.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: '#7c3aed', color: '#ffffff', border: '1.5px solid #7c3aed' }}
                    >{skill}</span>
                  )) : (
                    <p className="text-xs text-base-content/50">No skills added yet. Tap Edit to select care services you offer.</p>
                  )}
                </div>
              )}
            </div>

            {/* Languages */}
            {profile.languages && profile.languages.length > 0 && (
              <div className="bg-base-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={14} className="text-primary" />
                  <p className="font-semibold text-sm text-base-content">Languages</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.languages.map((lang, i) => (
                    <span key={i} className="badge badge-sm badge-ghost py-2.5">{lang}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Settings button — FIXED: now has onClick */}
            <div className="bg-base-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center gap-3 p-4 hover:bg-base-300 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed22, #3b82f622)' }}>
                  <Settings size={16} className="text-primary" />
                </div>
                <span className="flex-1 text-left text-sm font-medium text-base-content">Settings</span>
                <ChevronRight size={16} className="opacity-40" />
              </button>
            </div>

            <button onClick={onLogout} className="btn btn-ghost w-full text-error gap-2 mt-2">
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {section === 'documents' && (
          <div className="px-4 space-y-4">
            <p className="text-xs text-base-content/60">
              Store your certifications, licenses, and training records. Get alerts before they expire.
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
                <p className="text-xs text-base-content/40 mt-1">Add your certifications, licenses, and training records</p>
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map(doc => (
                  <div key={doc.id} className="bg-base-200 rounded-2xl p-4 press-card">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.status === 'expired' ? 'bg-error/10' : doc.status === 'expiring_soon' ? 'bg-warning/10' : 'bg-success/10'}`}>
                          {doc.status === 'expired' ? <AlertTriangle size={18} className="text-error" /> :
                            doc.status === 'expiring_soon' ? <AlertTriangle size={18} className="text-warning" /> :
                            <CheckCircle2 size={18} className="text-success" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-base-content">{doc.name}</p>
                          <p className="text-xs text-base-content/60 mt-0.5">{DOC_TYPES.find(t => t.value === doc.type)?.label || doc.type}</p>
                          {doc.expiryDate && (
                            <p className={`text-xs mt-0.5 ${doc.status === 'expired' ? 'text-error font-medium' : doc.status === 'expiring_soon' ? 'text-warning font-medium' : 'text-base-content/50'}`}>
                              {doc.status === 'expired' ? 'Expired: ' : doc.status === 'expiring_soon' ? 'Expiring: ' : 'Expires: '}
                              {new Date(doc.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                          {!doc.expiryDate && <p className="text-xs text-base-content/40 mt-0.5">No expiry</p>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteDocument(doc.id)} className="btn btn-ghost btn-xs btn-circle opacity-40">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BADGES ── */}
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
                        <badge.icon size={24} className="text-success" />
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
                        <badge.icon size={24} className="text-base-content/40" />
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
      </div>
    </>
  )
}
