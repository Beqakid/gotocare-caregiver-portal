// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { Camera, MapPin, DollarSign, Star, Shield, Globe, Award, Clock, ChevronRight, LogOut, Settings, Edit3, Phone, Mail, FolderOpen, Plus, Trash2, AlertTriangle, CheckCircle2, X, Link2, Copy, Check, Zap, Heart, ThumbsUp, Upload } from 'lucide-react'
import { CaregiverProfile, CaregiverDocument } from '../types'
import { addDocument, deleteDocument, refreshDocumentStatuses, calculateCompleteness } from '../utils/storage'

const API_BASE = 'https://gotocare-original.jjioji.workers.dev'

interface ProfileTabProps {
  profile: CaregiverProfile | null
  documents: CaregiverDocument[]
  onLogout: () => void
  onUpdateProfile: (data: any) => void
  onDocumentsChange: () => void
}

const ALL_CARE_NEEDS = [
  'Elder Care', 'Dementia Care', 'Alzheimer\'s Support', 'Wheelchair Assistance',
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

// Badge definitions
const BADGES = [
  { id: 'verified', icon: Shield, label: 'Verified', desc: 'Background check + ID verified', color: 'text-success', earn: (p: any, d: CaregiverDocument[]) => d.some(x => x.type === 'background_check') },
  { id: 'quick_responder', icon: Zap, label: 'Quick Responder', desc: 'Responds within 1 hour', color: 'text-warning', earn: (p: any) => (p?.totalJobs || 0) >= 5 },
  { id: 'top_rated', icon: Star, label: 'Top Rated', desc: '4.8+ rating with 10+ reviews', color: 'text-warning', earn: (p: any) => (p?.rating || 0) >= 4.8 && (p?.totalReviews || 0) >= 10 },
  { id: 'reliable', icon: ThumbsUp, label: 'Reliable', desc: '95%+ shift completion rate', color: 'text-primary', earn: (p: any) => (p?.totalJobs || 0) >= 20 },
  { id: 'experienced', icon: Award, label: 'Experienced', desc: '50+ jobs completed', color: 'text-primary', earn: (p: any) => (p?.totalJobs || 0) >= 50 },
  { id: 'caregiver_pro', icon: Heart, label: 'Caregiver Pro', desc: 'Fully certified & insured', color: 'text-error', earn: (p: any, d: CaregiverDocument[]) => d.filter(x => x.type === 'certification' || x.type === 'license').length >= 2 && d.some(x => x.type === 'insurance') },
]

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
      // API upload
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
    // Fallback: localStorage
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
    // Fallback: localStorage
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
          {/* Profile completeness */}
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
                <span className="text-sm text-base-content/70">{profile.location.city}, {profile.location.state}</span>
              </div>
            )}
          </div>

          {/* Skills */}
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

          {/* Settings & Logout */}
          <div className="bg-base-200 rounded-2xl overflow-hidden">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-base-300 transition-colors border-b border-base-300">
              <Settings size={18} className="text-base-content/60" />
              <span className="flex-1 text-left text-sm text-base-content">Settings</span>
              <ChevronRight size={16} className="opacity-30" />
            </button>
          </div>

          <button onClick={onLogout} className="btn btn-ghost w-full text-error gap-2 mt-2">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      )}

      {/* ---- DOCUMENTS SECTION ---- */}
      {section === 'documents' && (
        <div className="px-4 space-y-4">
          <p className="text-xs text-base-content/60">
            Store your certifications, licenses, and training records. Get alerts before they expire so you never fall out of compliance.
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

          {/* Expiry summary */}
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

          {/* Document list */}
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
                        {!doc.expiryDate && !doc.expiry_date && <p className="text-xs text-base-content/40 mt-0.5">No expiry</p>}
                        {doc.r2_key && cgToken && (
                          <a href={`${API_BASE}/api/caregiver-documents/file?key=${encodeURIComponent(doc.r2_key)}&token=${cgToken}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary/70 mt-0.5 flex items-center gap-0.5 hover:text-primary">
                            <Upload size={10} /> View file
                          </a>
                        )}
                        {doc.file_name && !doc.r2_key && (
                          <p className="text-xs text-base-content/30 mt-0.5">{doc.file_name}</p>
                        )}
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

      {/* ---- BADGES SECTION ---- */}
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
  )
}
