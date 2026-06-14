// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { Camera, MapPin, DollarSign, Star, Shield, Globe, Award, Clock, ChevronRight, LogOut, Settings, Edit3, Phone, Mail, FolderOpen, Plus, Trash2, AlertTriangle, CheckCircle2, X, Link2, Copy, Check, Zap, Heart, ThumbsUp, Upload, Share2, Bell, User, Users, FileCheck2, BadgeCheck, Lock } from 'lucide-react'
import { CaregiverProfile, CaregiverDocument } from '../types'
import { addDocument, deleteDocument, refreshDocumentStatuses, calculateCompleteness } from '../utils/storage'

const API_BASE = 'https://gotocare-original.jjioji.workers.dev'
const PROFILE_SECTION_KEY = 'cgp_profile_section'
type ProfileSection = 'profile' | 'trust-passport' | 'work-preferences' | 'account'

const SECTION_MAP: Record<string, ProfileSection> = {
  overview: 'profile', profile: 'profile', clients: 'profile',
  verification: 'trust-passport', certifications: 'trust-passport',
  documents: 'trust-passport', badges: 'trust-passport', trust: 'trust-passport',
  'trust-passport': 'trust-passport',
  'work-preferences': 'work-preferences',
  settings: 'account', account: 'account',
}

function normalizeProfileSection(input: string): ProfileSection {
  return SECTION_MAP[input] || 'profile'
}

// Maps old deep link strings to the new anchor IDs inside the 4-tab layout.
function getProfileAnchorForDeepLink(deepLink: string): string | null {
  const MAP: Record<string, string | null> = {
    'section-verification':   'trust-verification',
    'section-certifications': 'trust-certifications',
    'section-documents':      'trust-manual-proof',
    'section-badges':         'trust-badges',
    'section-settings':       null,
    'section-clients':        null,
    'section-skills':         'section-skills-work',
    'section-bio':            'section-bio',
    'section-contact':        'section-contact',
    'section-photo':          'section-photo',
    'section-share':          'section-share',
    'section-languages':      'section-languages',
    'trust-summary':          'trust-summary',
    'trust-verification':     'trust-verification',
    'trust-certifications':   'trust-certifications',
    'trust-manual-proof':     'trust-manual-proof',
    'trust-badges':           'trust-badges',
    'trust-review':           'trust-review',
    'trust-work-history':     'trust-work-history',
  }
  return Object.prototype.hasOwnProperty.call(MAP, deepLink) ? MAP[deepLink] : deepLink
}

function getSavedProfileSection(initialSection?: string): ProfileSection {
  if (initialSection && SECTION_MAP[initialSection]) return SECTION_MAP[initialSection]
  try {
    const saved = localStorage.getItem(PROFILE_SECTION_KEY)
    if (saved && SECTION_MAP[saved]) return SECTION_MAP[saved]
  } catch {}
  return 'profile'
}

interface ProfileTabProps {
  profile: CaregiverProfile | null
  documents: CaregiverDocument[]
  onLogout: () => void
  onUpdateProfile: (data: any) => void
  onDocumentsChange: () => void
  deepLink?: string
  initialSection?: string
  returnedSubscription?: boolean
  onNavigateHome?: () => void
  onOpenTrustPassport?: () => void
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
  { id: 'profile_complete', icon: Shield, label: 'Profile Complete', desc: 'Profile is 80%+ complete', color: 'text-success', earn: (p: any, d: CaregiverDocument[]) => calculateCompleteness(p, d).score >= 80 },
  { id: 'quick_responder', icon: Zap, label: 'Quick Responder', desc: 'Responds within 1 hour', color: 'text-warning', earn: (p: any) => (p?.totalJobs || 0) >= 5 },
  { id: 'top_rated', icon: Star, label: 'Top Rated', desc: '4.8+ rating with 10+ reviews', color: 'text-warning', earn: (p: any) => (p?.rating || 0) >= 4.8 && (p?.totalReviews || 0) >= 10 },
  { id: 'reliable', icon: ThumbsUp, label: 'Reliable', desc: '95%+ shift completion rate', color: 'text-primary', earn: (p: any) => (p?.totalJobs || 0) >= 20 },
  { id: 'experienced', icon: Award, label: 'Experienced', desc: '50+ jobs completed', color: 'text-primary', earn: (p: any) => (p?.totalJobs || 0) >= 50 },
  { id: 'early_adopter', icon: Heart, label: 'Early Adopter', desc: 'Building trust on Carehia', color: 'text-error', earn: (p: any) => !!p?.createdAt },
]

const CERTIFICATION_TYPES = ['CPR', 'First Aid', 'CNA', 'HHA', 'LVN', 'RN', 'Dementia Care', 'Hospice Care', 'TB Clearance', 'Other']

function docText(doc: any): string {
  return `${doc?.name || ''} ${doc?.type || ''}`.toLowerCase()
}

function hasDoc(docs: CaregiverDocument[], test: (doc: CaregiverDocument) => boolean): boolean {
  return docs.some(test)
}

function getCertificationDocs(docs: CaregiverDocument[]) {
  return docs.filter(d => ['certification', 'license', 'training', 'health'].includes(d.type))
}

function getDocReviewStatus(doc?: CaregiverDocument) {
  if (!doc) return { label: 'Not Started', tone: 'bg-base-300 text-base-content/60', state: 'missing' }
  if (doc.status === 'expired') return { label: 'Expired', tone: 'bg-error/10 text-error', state: 'expired' }
  if (doc.status === 'expiring_soon') return { label: 'Expiring Soon', tone: 'bg-warning/15 text-warning', state: 'expiring' }
  return { label: 'Submitted', tone: 'bg-warning/15 text-warning', state: 'pending' }
}

function getVerificationDocType(docType: string, docName: string): string | null {
  const value = `${docType || ''} ${docName || ''}`.toLowerCase()
  if (docType === 'license' || /driver|license|state id|passport|identity|id document/.test(value)) {
    if (/passport/.test(value)) return 'passport'
    if (/state id/.test(value)) return 'state_id'
    return 'drivers_license'
  }
  if (docType === 'background_check' || /background/.test(value)) return 'background_check'
  if (docType === 'certification' || docType === 'training' || docType === 'health') {
    if (/first aid|first-aid/.test(value)) return 'first_aid'
    if (/\bcpr\b/.test(value)) return 'cpr'
    if (/\bcna\b/.test(value)) return 'cna'
    if (/\bhha\b|home health/.test(value)) return 'hha'
    if (/\blvn\b|\blpn\b/.test(value)) return 'lvn'
    if (/\brn\b|registered nurse/.test(value)) return 'rn'
    if (/dementia/.test(value)) return 'dementia'
    if (/hospice/.test(value)) return 'hospice'
    if (/\btb\b|tuberculosis/.test(value)) return 'tb'
    return 'other_certification'
  }
  return null
}

async function submitVerificationCopy(token: string, docType: string, docName: string, expiry: string, file: File | null) {
  const verificationDocType = getVerificationDocType(docType, docName)
  if (!verificationDocType) return
  const fd = new FormData()
  fd.append('token', token)
  fd.append('doc_type', verificationDocType)
  fd.append('consent_given', 'true')
  if (expiry) fd.append('expiry', expiry)
  if (file) fd.append('file', file)
  await fetch(`${API_BASE}/api/verification-upload`, { method: 'POST', body: fd })
}

function getVerificationModel(profile: any, docs: CaregiverDocument[], trust: any, completeness: number) {
  const idDoc = docs.find(d => d.type === 'license' || /driver|state id|passport|identity|id\b/i.test(d.name || ''))
  const bgDoc = docs.find(d => d.type === 'background_check')
  const certDocs = getCertificationDocs(docs)
  const cprDoc = docs.find(d => /cpr/i.test(docText(d)))
  const firstAidDoc = docs.find(d => /first aid|first-aid/i.test(docText(d)))
  const idVerified = !!trust?.id_verified
  const backgroundVerified = !!trust?.background_checked
  const cprVerified = !!trust?.cpr_certified
  const certificationUploaded = certDocs.length > 0
  const trustScore =
    (completeness >= 70 ? 20 : Math.round(completeness * 0.2)) +
    (idVerified ? 20 : idDoc ? 10 : 0) +
    (certificationUploaded ? 15 : 0) +
    ((cprDoc || firstAidDoc) ? 15 : 0) +
    (backgroundVerified ? 20 : bgDoc ? 5 : 0) +
    ((profile?.rating || 0) > 0 || (profile?.totalJobs || 0) > 0 ? 10 : 0)
  const nextStep =
    !profile?.profilePhoto ? 'Add a profile photo' :
    !profile?.bio || profile.bio.trim().length < 40 ? 'Complete your bio' :
    (profile?.skills?.length || 0) < 3 ? 'Add care specialties' :
    !idDoc && !idVerified ? 'Upload ID' :
    !certificationUploaded ? 'Upload a certification' :
    !cprDoc && !firstAidDoc && !cprVerified ? 'Upload CPR or First Aid' :
    !backgroundVerified ? 'Background check not started' :
    'Keep documents current'
  const progressItems = [
    { key: 'photo', label: 'Add photo', status: profile?.profilePhoto ? 'Complete' : 'Missing', done: !!profile?.profilePhoto },
    { key: 'bio', label: 'Complete bio', status: profile?.bio && profile.bio.trim().length >= 40 ? 'Complete' : 'Missing', done: !!profile?.bio && profile.bio.trim().length >= 40 },
    { key: 'skills', label: 'Add care specialties', status: (profile?.skills?.length || 0) >= 3 ? 'Complete' : 'Missing', done: (profile?.skills?.length || 0) >= 3 },
    { key: 'availability', label: 'Set availability', status: profile?.status === 'active' ? 'Complete' : 'Missing', done: profile?.status === 'active' },
    { key: 'id', label: 'Upload ID', status: idVerified ? 'Complete' : idDoc ? getDocReviewStatus(idDoc).label : 'Missing', done: idVerified || !!idDoc },
    { key: 'cert', label: 'Add certification', status: certificationUploaded ? 'Pending' : 'Missing', done: certificationUploaded },
    { key: 'cpr', label: 'Add CPR/First Aid', status: cprVerified ? 'Complete' : (cprDoc || firstAidDoc) ? getDocReviewStatus(cprDoc || firstAidDoc).label : 'Missing', done: cprVerified || !!cprDoc || !!firstAidDoc },
    { key: 'bg', label: 'Background check', status: backgroundVerified ? 'Complete' : bgDoc ? 'Pending' : 'Not Started', done: backgroundVerified || !!bgDoc },
  ]
  const statusAlerts = docs
    .filter(d => d.status === 'expired' || d.status === 'expiring_soon')
    .slice(0, 3)
    .map(d => ({ label: d.status === 'expired' ? `${d.name} expired` : `${d.name} expires soon`, tone: d.status === 'expired' ? 'text-error' : 'text-warning' }))
  if (!backgroundVerified) statusAlerts.push({ label: 'Background check not started', tone: 'text-info' })
  if (idDoc && !idVerified) statusAlerts.push({ label: 'ID pending review', tone: 'text-warning' })
  return {
    idDoc,
    bgDoc,
    certDocs,
    cprDoc,
    firstAidDoc,
    idVerified,
    backgroundVerified,
    cprVerified,
    certificationUploaded,
    trustScore: Math.min(100, Math.max(0, Math.round(trustScore))),
    verificationProgress: Math.round((progressItems.filter(i => i.done).length / progressItems.length) * 100),
    nextStep,
    progressItems,
    statusAlerts,
  }
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, documents, onLogout, onUpdateProfile, onDocumentsChange, deepLink, initialSection, returnedSubscription, onNavigateHome, onOpenTrustPassport }) => {
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
  const [section, setSection] = useState<ProfileSection>(() => getSavedProfileSection(initialSection))
  const [myClients, setMyClients] = useState<any[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientsError, setClientsError] = useState(false)
  const [cgSub, setCgSub] = useState<{subscribed: boolean, plan: string, expiresAt?: string, createdAt?: string} | null>(null)
  const [cgSubLoading, setCgSubLoading] = useState(true)
  const [subUpgrading, setSubUpgrading] = useState(false)
  const [showSubBanner, setShowSubBanner] = useState(!!returnedSubscription)
  const [trustStatus, setTrustStatus] = useState<any>(null)
  // Phase 17: compact trust tab state
  const [trustDetail, setTrustDetail] = useState<any>(null)
  const [trustDetailLoading, setTrustDetailLoading] = useState(false)
  const [certExpanded, setCertExpanded] = useState(false)

  const navigateToSection = (nextSection: ProfileSection) => {
    setSection(nextSection)
    try { localStorage.setItem(PROFILE_SECTION_KEY, nextSection) } catch {}
  }


  useEffect(() => {
    if (initialSection) navigateToSection(initialSection)
    if (deepLink) {
      // Centralised deep-link routing — maps old names to new 4-tab sections
      const DEEP_LINK_SECTION: Record<string, ProfileSection> = {
        'section-verification':   'trust-passport',
        'section-certifications': 'trust-passport',
        'section-documents':      'trust-passport',
        'section-badges':         'trust-passport',
        'trust-summary':          'trust-passport',
        'trust-verification':     'trust-passport',
        'trust-certifications':   'trust-passport',
        'trust-manual-proof':     'trust-passport',
        'trust-badges':           'trust-passport',
        'trust-review':           'trust-passport',
        'trust-work-history':     'trust-passport',
        'section-settings':       'account',
        'section-clients':        'account',
        'section-skills':         'work-preferences',
        'section-availability':   'work-preferences',
        'section-bio':            'profile',
        'section-contact':        'profile',
        'section-photo':          'profile',
        'section-languages':      'profile',
        'section-share':          'profile',
      }
      const destSection = DEEP_LINK_SECTION[deepLink]
      if (destSection) navigateToSection(destSection)
      // Activate inline editors
      if (deepLink === 'section-bio') setEditing(true)
      if (deepLink === 'section-skills') setEditingSkills(true)
      if (deepLink === 'section-contact') setEditingContact(true)
      if (deepLink === 'section-languages') setShowLangInput(true)
      // Scroll to anchor after section renders (200ms lets React repaint)
      setTimeout(() => {
        const anchorId = getProfileAnchorForDeepLink(deepLink) || deepLink
        if (!anchorId) return
        const el = document.getElementById(anchorId)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    }
  }, [deepLink, initialSection])

  // Phase 2 fix: fetchMyClients with AbortController timeout and explicit error state
  const fetchMyClients = () => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 8000)
    setClientsLoading(true)
    setClientsError(false)
    fetch(`${API_BASE}/api/my-clients?token=${encodeURIComponent(token)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => { setMyClients(d.success ? (d.clients || []) : []) })
      .catch(() => { setClientsError(true) })
      .finally(() => { clearTimeout(tid); setClientsLoading(false) })
  }
  useEffect(() => {
    if (section !== 'account') return
    fetchMyClients()
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

  // Load verification badge count for profile card
  useEffect(() => {
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    fetch(`${API_BASE}/api/verification-status?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.trust) {
          const t = d.trust
          setTrustStatus(t)
          const count = [t.id_verified, t.background_checked, t.cna_verified, t.cpr_certified].filter(Boolean).length
        }
      })
      .catch(() => {})
  }, [])

  // Phase 17: fetch backend trust status when Trust tab is open
  useEffect(() => {
    if (section !== 'trust-passport') return
    const token = localStorage.getItem('cgp_token')
    if (!token) return
    setTrustDetailLoading(true)
    fetch(`${API_BASE}/api/cgp-trust-status?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => { if (d.checklist) setTrustDetail(d) })
      .catch(() => {})
      .finally(() => setTrustDetailLoading(false))
  }, [section])

  const [showAddDoc, setShowAddDoc] = useState(false)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('certification')
  const [docExpiry, setDocExpiry] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [reviewLinkCopied, setReviewLinkCopied] = useState(false)
  const [profileReviews, setProfileReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [apiDocs, setApiDocs] = useState<any[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [proofType, setProofType] = useState('Government ID')
  const [otherDocName, setOtherDocName] = useState('')
  const [proofNotes, setProofNotes] = useState('')
  const [proofSubmitOk, setProofSubmitOk] = useState(false)
  const [proofSubmitErr, setProofSubmitErr] = useState(false)
  const [travelRadius, setTravelRadius] = useState<number>(() => {
    if (typeof window === 'undefined') return 10
    const profileVal = (profile as any)?.travelRadiusMiles
    if (profileVal && profileVal >= 5 && profileVal <= 50) return profileVal
    const saved = localStorage.getItem('cgp_travel_radius')
    return saved ? Number(saved) : 10
  })
  const [radiusSaveStatus, setRadiusSaveStatus] = useState<'idle'|'saved'|'error'>('idle')
  const [saveFeedback, setSaveFeedback] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const showSaveFeedback = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setSaveFeedback({ msg, type })
    setTimeout(() => setSaveFeedback(null), 3000)
  }
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cgToken = typeof window !== 'undefined' ? (localStorage.getItem('cgp_token') || '') : ''

  const scrollToProfileSection = (id: string, focusSelector?: string) => {
    window.setTimeout(() => {
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (focusSelector) {
        window.setTimeout(() => {
          const focusTarget = el.querySelector(focusSelector) as HTMLElement | null
          focusTarget?.focus?.()
        }, 250)
      }
    }, 100)
  }

  const openBioEditor = (focusRate = false) => {
    navigateToSection('profile')
    setEditing(true)
    scrollToProfileSection('section-bio', focusRate ? 'input[type="number"]' : 'textarea')
  }

  const openSkillsEditor = () => {
    navigateToSection('work-preferences')
    setSelectedSkills(profile?.skills || [])
    setEditingSkills(true)
    scrollToProfileSection('section-skills-work')
  }

  const openContactEditor = () => {
    navigateToSection('profile')
    setEditPhone(profile?.phone || '')
    setEditCity(profile?.location?.city || '')
    setEditState(profile?.location?.state || '')
    setEditingContact(true)
    scrollToProfileSection('section-contact', 'input[type="tel"]')
  }

  useEffect(() => {
    if (cgToken) loadApiDocs()
  }, [cgToken])

  const loadApiDocs = async () => {
    setDocsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/cgp-docs?token=${cgToken}`)
      const data = await res.json()
      if (data.success) setApiDocs(data.documents || [])
    } catch (e) {}
    setDocsLoading(false)
  }

  const localDocs = refreshDocumentStatuses()
  const rawDocs = apiDocs.length > 0 ? apiDocs : localDocs
  // G6 fix: dedup by cloudId/id first, then by type+normalized-name (keep first seen = most recent from ordered API)
  const dedupedDocs = (() => {
    const seen = new Set<string>()
    return rawDocs.filter((doc: any) => {
      const key = doc.cloudId
        || doc.id
        || `${(doc.type || doc.doc_type || doc.document_type || 'other').toLowerCase()}::${(doc.fileName || doc.file_name || doc.name || '').toLowerCase().replace(/\s+/g, ' ').trim()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()
  const docs = dedupedDocs.map((doc: any) => {
    const expiryDate = doc.expiryDate || doc.expiry_date || doc.expires_at
    let status = doc.status
    if (!['valid', 'expiring_soon', 'expired', 'no_expiry'].includes(status)) {
      if (!expiryDate) status = 'no_expiry'
      else {
        const daysUntil = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 86400)
        status = daysUntil < 0 ? 'expired' : daysUntil < 30 ? 'expiring_soon' : 'valid'
      }
    }
    return {
      ...doc,
      type: doc.type || doc.doc_type || doc.document_type || 'other',
      expiryDate,
      status,
      fileName: doc.fileName || doc.file_name,
      r2Key: doc.r2Key || doc.r2_key,
    }
  })
  const { score: completeness, items: completenessItems } = calculateCompleteness(profile, docs)

  const handleToggleAvailability = () => {
    const newStatus = !isAvailable
    setIsAvailable(newStatus)
    onUpdateProfile({ status: newStatus ? 'active' : 'inactive' })
    showSaveFeedback(newStatus ? 'You are now available for work' : 'You are now offline')
  }

  const handleSaveProfile = () => {
    onUpdateProfile({
      bio: editBio,
      hourlyRate: parseFloat(editRate) || profile?.hourlyRate,
    })
    setEditing(false)
    showSaveFeedback('Profile updated')
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
        showSaveFeedback('Profile photo updated')
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
    showSaveFeedback('Contact info saved')
  }

  const handleToggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  const handleSaveSkills = () => {
    onUpdateProfile({ skills: selectedSkills })
    setEditingSkills(false)
    showSaveFeedback('Skills saved (' + selectedSkills.length + ' selected)')
  }

  const handleSaveRadius = () => {
    try {
      localStorage.setItem('cgp_travel_radius', String(travelRadius))
      onUpdateProfile({ travelRadiusMiles: travelRadius })
      setRadiusSaveStatus('saved')
      showSaveFeedback('Travel radius saved')
      setTimeout(() => setRadiusSaveStatus('idle'), 3500)
    } catch (_e) {
      setRadiusSaveStatus('error')
      setTimeout(() => setRadiusSaveStatus('idle'), 3500)
    }
  }

  // ── Phase 13C: Proof type → doc_type mapping ──────────────────
  const PROOF_TYPE_TO_DOC_TYPE: Record<string, string> = {
    'Government ID': 'other',
    'CPR / First Aid': 'certification',
    'CNA / HHA / License': 'certification',
    'Training Certificate': 'training',
    'Health Clearance': 'health',
    'Insurance': 'insurance',
    'Background Check Document': 'background_check',
    'Work Eligibility': 'other',
    'Other': 'other',
  }
  const PROOF_TYPES_EXPIRY = ['Government ID', 'CPR / First Aid', 'CNA / HHA / License', 'Training Certificate', 'Health Clearance', 'Insurance', 'Background Check Document', 'Work Eligibility']

  const handleSubmitProof = async () => {
    const resolvedName = proofType === 'Other' ? otherDocName.trim() : proofType
    if (!resolvedName || resolvedName.length < 2) return
    const resolvedType = PROOF_TYPE_TO_DOC_TYPE[proofType] || 'other'
    setProofSubmitErr(false)
    setProofSubmitOk(false)
    if (cgToken) {
      try {
        const fd = new FormData()
        fd.append('token', cgToken)
        fd.append('name', resolvedName)
        fd.append('doc_type', resolvedType)
        if (docExpiry) fd.append('expiry_date', docExpiry)
        if (proofNotes.trim()) fd.append('notes', proofNotes.trim())
        if (docFile) fd.append('file', docFile)
        const res = await fetch(`${API_BASE}/api/cgp-docs`, { method: 'POST', body: fd })
        const data = await res.json()
        if (data.success) {
          try { await submitVerificationCopy(cgToken, resolvedType, resolvedName, docExpiry, docFile) } catch (e) { console.warn('Verification copy failed', e) }
          await loadApiDocs()
          setShowAddDoc(false)
          setProofType('Government ID'); setOtherDocName(''); setDocExpiry(''); setDocFile(null); setProofNotes('')
          setProofSubmitOk(true)
          window.setTimeout(() => setProofSubmitOk(false), 4000)
          onDocumentsChange()
          return
        }
      } catch (e) {}
    }
    // fallback: local state
    addDocument({ name: resolvedName, type: resolvedType as CaregiverDocument['type'], expiryDate: docExpiry || undefined, notes: proofNotes || undefined })
    setShowAddDoc(false)
    setProofType('Government ID'); setOtherDocName(''); setDocExpiry(''); setDocFile(null); setProofNotes('')
    setProofSubmitOk(true)
    window.setTimeout(() => setProofSubmitOk(false), 4000)
    onDocumentsChange()
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
        const res = await fetch(`${API_BASE}/api/cgp-docs`, { method: 'POST', body: fd })
        const data = await res.json()
        if (data.success) {
          try { await submitVerificationCopy(cgToken, docType, docName.trim(), docExpiry, docFile) } catch (e) { console.warn('Verification review submission failed', e) }
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
        const res = await fetch(`${API_BASE}/api/cgp-docs?id=${id}&token=${cgToken}`, { method: 'DELETE' })
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
      // Phase 26B: save pending action before Stripe redirect
      const p26bCtx = { action: 'boost_profile', returnTab: 'profile', returnView: 'visibility', plan: 'unlimited', createdAt: new Date().toISOString(), source: 'caregiver_subscription_unlock' }
      try { sessionStorage.setItem('cgp_pending_subscription_action', JSON.stringify(p26bCtx)) } catch {}
      try { localStorage.setItem('cgp_pending_subscription_action_backup', JSON.stringify(p26bCtx)) } catch {}
      const r = await fetch(`${API_BASE}/api/create-caregiver-subscription-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, caregiverAction: 'boost_profile', returnTab: 'profile', returnView: 'visibility' }),
      })
      const d = await r.json()
      if (d.url) window.location.href = d.url
    } catch (e) {}
    setSubUpgrading(false)
  }

  const profileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?caregiver=${profile?.id}`
    : `https://work.carehia.com?caregiver=${profile?.id}`
  const profileUrlLabel = profileUrl.replace(/^https?:\/\//, '')
  const reviewUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?reviewCaregiver=${profile?.id}`
    : `https://work.carehia.com?reviewCaregiver=${profile?.id}`
  const reviewUrlLabel = reviewUrl.replace(/^https?:\/\//, '')

  const copyProfileLink = () => {
    navigator.clipboard?.writeText(profileUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  useEffect(() => {
    if (!profile?.id) return
    setReviewsLoading(true)
    fetch(`${API_BASE}/api/caregiver-reviews?id=${encodeURIComponent(String(profile.id))}`)
      .then(r => r.json())
      .then(d => setProfileReviews(d.success ? (d.reviews || []) : []))
      .catch(() => setProfileReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [profile?.id])

  const earnedBadges = BADGES.filter(b => b.earn(profile, docs))
  const unearnedBadges = BADGES.filter(b => !b.earn(profile, docs))
  const validDocCount = docs.filter(d => d.status === 'valid' || d.status === 'no_expiry').length
  const expiringDocCount = docs.filter(d => d.status === 'expiring_soon' || d.status === 'expired').length
  const verification = getVerificationModel(profile, docs, trustStatus, completeness)
  const certificationDocs = verification.certDocs
  const trustBadgeCards = [
    { id: 'identity_verified', icon: Shield, label: 'Identity Verified', desc: 'ID has been reviewed and approved', earned: verification.idVerified, unlock: 'Upload a Driver License, State ID, or Passport.' },
    { id: 'cpr_certified', icon: Award, label: 'CPR Certified', desc: 'CPR certification has been verified', earned: verification.cprVerified, unlock: 'Upload a CPR certificate for review.' },
    { id: 'cna_certified', icon: BadgeCheck, label: 'CNA Certified', desc: 'CNA certification has been verified', earned: !!trustStatus?.cna_verified, unlock: 'Upload a CNA certificate for review.' },
    { id: 'background_checked', icon: Shield, label: 'Background Checked', desc: 'Background check is verified', earned: verification.backgroundVerified, unlock: 'Start the background check when integration is available.' },
  ]
  const earnedTrustBadges = trustBadgeCards.filter(b => b.earned)
  const lockedTrustBadges = trustBadgeCards.filter(b => !b.earned)
  const readinessTasks = [
    {
      done: !!profile.profilePhoto,
      title: 'Add a profile photo',
      detail: 'Families are more likely to contact caregivers they can recognize.',
      action: 'Add photo',
      run: () => photoInputRef.current?.click(),
    },
    {
      done: !!profile.bio && profile.bio.trim().length >= 40,
      title: 'Write a stronger bio',
      detail: 'Share your experience, care style, and what families can count on.',
      action: 'Edit bio',
      run: () => openBioEditor(),
    },
    {
      done: !!profile.hourlyRate && profile.hourlyRate > 0,
      title: 'Set hourly rate',
      detail: 'Clear pricing helps families decide quickly.',
      action: 'Set rate',
      run: () => openBioEditor(true),
    },
    {
      done: (profile.skills?.length || 0) >= 3,
      title: 'Select at least 3 care skills',
      detail: 'Skills improve matching for live jobs and interview requests.',
      action: 'Edit skills',
      run: openSkillsEditor,
    },
    {
      done: !!profile.phone && !!profile.location?.city,
      title: 'Add phone and service area',
      detail: 'Clients need to know where you work and how to reach you.',
      action: 'Edit contact',
      run: openContactEditor,
    },
    {
      done: validDocCount > 0,
      title: 'Upload at least 1 trust document',
      detail: 'Certifications, licenses, and background checks build confidence.',
      action: 'Add document',
      run: () => { navigateToSection('trust-passport'); setShowAddDoc(true); setTimeout(() => scrollToProfileSection('trust-manual-proof'), 80) },
    },
  ]
  const nextReadinessTasks = readinessTasks.filter(t => !t.done).slice(0, 3)

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
      <div id="section-photo" className="px-4 pt-6 pb-4 text-center">
        <div className="relative inline-block mb-3">
          <div className="w-24 h-24 rounded-full bg-base-200 border border-base-300 flex items-center justify-center overflow-hidden shadow-sm">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary">
                {profile.firstName?.[0]}{profile.lastName?.[0]}
              </span>
            )}
          </div>
          <button
            onClick={() => photoInputRef.current?.click()}
            className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md border-2 border-base-100"
          >
            <Camera size={15} className="text-primary-content" />
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" style={{ display: "none" }} onChange={handlePhotoChange} />
        </div>
        <h2 className="text-2xl font-bold text-base-content">{profile.firstName} {profile.lastName}</h2>
        <div className="mt-1 flex items-center justify-center gap-2 text-sm text-base-content/55" style={{ gap: "8px" }}>
          <span>Professional Caregiver</span>
          <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-success' : 'bg-base-content/30'}`} />
          <span>{isAvailable ? 'Available' : 'Offline'}</span>
        </div>
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {earnedBadges.slice(0, 3).map(b => (
            <div key={b.id} className="flex items-center gap-1 bg-base-200 rounded-full px-2.5 py-1">
              <b.icon size={12} className={b.color} />
              <span className="text-xs font-medium text-base-content/70">{b.label}</span>
            </div>
          ))}
          {earnedBadges.length === 0 && (
            <div className="flex items-center gap-1 bg-base-200 rounded-full px-2.5 py-1">
              <Shield size={12} className="text-success" />
              <span className="text-xs font-medium text-base-content/70">Trust profile</span>
            </div>
          )}
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

      {/* Section tabs – 4-tab grid, never overflows on mobile */}
      <div className="px-4 mt-4 mb-3 grid grid-cols-4 gap-1" role="tablist">
        {([
          { key: 'profile' as ProfileSection, label: 'Profile' },
          { key: 'trust-passport' as ProfileSection, label: 'Trust' },
          { key: 'work-preferences' as ProfileSection, label: 'Work' },
          { key: 'account' as ProfileSection, label: 'Account' },
        ] as Array<{key: ProfileSection; label: string}>).map(t => (
          <button key={t.key}
            className={`btn btn-sm rounded-full text-xs font-semibold ${section === t.key ? 'btn-primary' : 'btn-ghost'}`}
            role="tab"
            aria-selected={section === t.key}
            onClick={() => navigateToSection(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ── PROFILE SECTION ── */}
      {section === 'profile' && (
        <div className="px-4 space-y-3">
          <div className="bg-base-200 rounded-3xl p-4 border border-base-300/70">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary/70">Profile Summary</p>
                <p className="text-lg font-bold text-base-content">{profile.firstName} {profile.lastName}</p>
                <p className="text-sm text-base-content/55 mt-1">
                  {profile.location?.city ? `${profile.location.city}${profile.location.state ? ', ' + profile.location.state : ''}` : 'Service area missing'} · ${profile.hourlyRate || 25}/hr
                </p>
              </div>
              <div className="relative h-16 w-16 shrink-0">
                <svg viewBox="0 0 44 44" className="h-16 w-16 -rotate-90">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="5" />
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className={completeness >= 80 ? 'text-success' : completeness >= 50 ? 'text-warning' : 'text-primary'}
                    strokeDasharray={`${(completeness / 100) * 113} 113`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-base-content">
                  {completeness}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-xl bg-base-100 p-3 text-center">
                <p className="text-lg font-bold text-base-content">{completeness}%</p>
                <p className="text-[10px] text-base-content/50">Complete</p>
              </div>
              <div className="rounded-xl bg-base-100 p-3 text-center">
                <p className="text-lg font-bold text-base-content">{verification.trustScore}</p>
                <p className="text-[10px] text-base-content/50">Trust Score</p>
              </div>
              <div className="rounded-xl bg-base-100 p-3 text-center">
                <p className={`text-lg font-bold ${isAvailable ? 'text-success' : 'text-base-content/55'}`}>{isAvailable ? 'Online' : 'Off'}</p>
                <p className="text-[10px] text-base-content/50">Status</p>
              </div>
            </div>
          </div>


          {/* Quick actions — simplified to profile-only actions (P13A) */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => openBioEditor()} className="btn btn-outline rounded-2xl border-primary/25 text-primary"><Edit3 size={15} /> Edit Profile</button>
            <button onClick={() => setShowQR(true)} className="btn btn-outline rounded-2xl border-primary/25 text-primary"><Share2 size={15} /> Share Profile</button>
          </div>

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

          {/* Verification Center card removed from Profile section (P13A) — accessible via Trust tab → Trust Passport */}

          {/* Bio */}
          <div id="section-bio" className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm text-base-content">About</p>
              <button onClick={() => setEditing(!editing)} className="btn btn-outline btn-xs gap-1 border-primary/30 text-primary"><Edit3 size={12} /> Edit</button>
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
              <button onClick={() => { setEditPhone(profile.phone || ''); setEditCity(profile.location?.city || ''); setEditState(profile.location?.state || ''); setEditingContact(!editingContact) }} className="btn btn-outline btn-xs gap-1 border-primary/30 text-primary"><Edit3 size={12} /> Edit</button>
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

          {/* Share & QR */}
          <div id="section-share" className="bg-base-200 rounded-2xl p-4 border border-primary/15">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={15} className="text-primary" />
              <p className="font-bold text-sm text-base-content">Share Your Profile</p>
            </div>
            <div className="flex items-center gap-2 bg-base-100 rounded-xl px-3 py-2 mb-3">
              <span className="text-xs text-base-content/60 truncate flex-1">{profileUrlLabel}</span>
              <button
                onClick={async () => {
                  const url = profileUrl
                  try { await navigator.clipboard.writeText(url); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) } catch {}
                }}
                className="flex items-center gap-1 text-primary text-xs font-semibold flex-shrink-0"
              >
                {linkCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={async () => {
                  const url = profileUrl
                  try { await navigator.share({ title: `${profile?.firstName} ${profile?.lastName} — Carehia`, url }) } catch {
                    try { await navigator.clipboard.writeText(url); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) } catch {}
                  }
                }}
                className="btn btn-primary btn-sm flex-1 gap-1.5 rounded-xl"
              >
                <Share2 size={14} /> Share
              </button>
              {profile?.id && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`I'm a professional caregiver on Carehia. Book me here: ${profileUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm flex-1 gap-1.5 rounded-xl text-white border-0"
                  style={{ background: '#25D366' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              )}
              {profile?.id && (
                <button
                  onClick={() => setShowQR(true)}
                  className="btn btn-outline btn-sm gap-1.5 rounded-xl border-primary/30 text-primary"
                >
                  📲 QR
                </button>
              )}
            </div>
          </div>

          {/* Review requests */}
          <div id="section-reviews" className="bg-base-200 rounded-2xl p-4 border border-warning/20">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Star size={15} className="text-warning fill-warning" />
                  <p className="font-bold text-sm text-base-content">Request Client Reviews</p>
                </div>
                <p className="text-xs text-base-content/55 mt-1">Send this link after a completed visit. New reviews appear here and in Trust Center.</p>
              </div>
              <span className="text-xs font-bold text-warning whitespace-nowrap">{profileReviews.length} total</span>
            </div>
            <div className="flex items-center gap-2 bg-base-100 rounded-xl px-3 py-2 mb-3">
              <span className="text-xs text-base-content/60 truncate flex-1">{reviewUrlLabel}</span>
              <button
                onClick={async () => {
                  try { await navigator.clipboard.writeText(reviewUrl); setReviewLinkCopied(true); setTimeout(() => setReviewLinkCopied(false), 2000) } catch {}
                }}
                className="flex items-center gap-1 text-warning text-xs font-semibold flex-shrink-0"
              >
                {reviewLinkCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              <button
                onClick={async () => {
                  try { await navigator.share({ title: `Review ${profile?.firstName || 'my care'} on Carehia`, text: 'Could you leave a quick review of your care experience?', url: reviewUrl }) } catch {
                    try { await navigator.clipboard.writeText(reviewUrl); setReviewLinkCopied(true); setTimeout(() => setReviewLinkCopied(false), 2000) } catch {}
                  }
                }}
                className="btn btn-warning btn-sm flex-1 gap-1.5 rounded-xl text-white"
              >
                <Share2 size={14} /> Send review link
              </button>
              <a
                href={`sms:?&body=${encodeURIComponent(`Could you leave a quick Carehia review for me? ${reviewUrl}`)}`}
                className="btn btn-outline btn-sm flex-1 gap-1.5 rounded-xl border-warning/30 text-warning"
              >
                <Mail size={14} /> SMS
              </a>
            </div>
            {reviewsLoading ? (
              <div className="text-xs text-base-content/45">Loading reviews...</div>
            ) : profileReviews.length === 0 ? (
              <div className="rounded-xl bg-base-100 border border-base-300 p-3 text-xs text-base-content/55">
                No client reviews yet. Once a client submits this form, their stars and comment will show here.
              </div>
            ) : (
              <div className="space-y-2">
                {profileReviews.slice(0, 3).map(review => (
                  <div key={review.id || `${review.created_at}-${review.rating}`} className="rounded-xl bg-base-100 border border-base-300 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={12} className={n <= review.rating ? 'text-warning fill-warning' : 'text-base-content/20'} />
                        ))}
                      </div>
                      <span className="text-[11px] text-base-content/40">{review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}</span>
                    </div>
                    {review.review_text && <p className="text-xs text-base-content/65 leading-relaxed">"{review.review_text}"</p>}
                  </div>
                ))}
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
              <button onClick={() => setShowLangInput(true)} className="btn btn-outline btn-xs gap-1 border-primary/30 text-primary">
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
                      if (!current.includes(langInput.trim())) { onUpdateProfile({ languages: [...current, langInput.trim()] }); showSaveFeedback('Language added') }
                      setLangInput(''); setShowLangInput(false)
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (langInput.trim()) {
                      const current = profile.languages || []
                      if (!current.includes(langInput.trim())) { onUpdateProfile({ languages: [...current, langInput.trim()] }); showSaveFeedback('Language added') }
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


        </div>
      )}

      {/* ── TRUST PASSPORT: Compact Redesign (Phase 17) ── */}
      {section === 'trust-passport' && (() => {
        // Use backend trust data when available, fall back to local engine
        const td = trustDetail || {}
        const score = td.score != null ? td.score : (earnedTrustBadges.length * 15 + earnedBadges.length * 5)
        const tier = td.tier || (verification.idVerified ? 'Verified' : 'Basic')
        const nextAction = td.next_action || null
        const checklistItems: any[] = td.checklist && td.checklist.length > 0 ? td.checklist : [
          { key: 'profile_complete', label: 'Profile Complete', status: completeness >= 70 ? 'complete' : 'not_started', points: 10, progress: null, rejection_reason: null },
          { key: 'identity_verified', label: 'Identity Verification', status: verification.idVerified ? 'approved' : verification.idDoc ? 'submitted' : 'not_started', points: 20, progress: null, rejection_reason: null },
          { key: 'background_check', label: 'Background Check', status: verification.backgroundVerified ? 'approved' : 'not_started', points: 20, progress: null, rejection_reason: null },
          { key: 'cpr_certification', label: 'CPR Certification', status: verification.cprVerified ? 'approved' : 'not_started', points: 15, progress: null, rejection_reason: null },
          { key: 'cna_hha', label: 'CNA / HHA Verification', status: !!trustStatus?.cna_verified ? 'approved' : 'not_started', points: 10, progress: null, rejection_reason: null },
          { key: 'completed_shifts', label: '5+ Completed Shifts', status: (profile?.totalJobs || 0) >= 5 ? 'earned' : 'not_earned', points: 10, progress: `${Math.min(profile?.totalJobs || 0, 5)}/5`, rejection_reason: null },
          { key: 'fast_responder', label: 'Fast Responder', status: 'not_earned', points: 5, progress: null, rejection_reason: null },
          { key: 'repeat_clients', label: 'Repeat Clients', status: 'not_earned', points: 5, progress: null, rejection_reason: null },
          { key: 'five_star_avg', label: '5-Star Average', status: profile?.rating && profile.rating >= 5 ? 'earned' : 'not_earned', points: 5, progress: profile?.rating ? `${Number(profile.rating).toFixed(1)}★` : null, rejection_reason: null },
        ]
        const rep = td.reputation || { rating: profile?.rating || null, reviews: profileReviews.length, sessions: profile?.totalJobs || 0 }
        const bdgs = td.badges || { earned: earnedTrustBadges.map((b: any) => b.label), next: lockedTrustBadges[0]?.label || null, total_earned: earnedTrustBadges.length }

        const slLabel = (s: string) => {
          if (s === 'approved' || s === 'complete' || s === 'earned') return { text: 'Done', color: '#22C55E', bg: 'rgba(34,197,94,0.10)' }
          if (s === 'submitted') return { text: 'Under Review', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' }
          if (s === 'rejected') return { text: 'Needs Attention', color: '#EF4444', bg: 'rgba(239,68,68,0.10)' }
          if (s === 'not_earned') return { text: 'Not Earned', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' }
          return { text: 'Not Started', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' }
        }
        const slIcon = (s: string) => {
          if (s === 'approved' || s === 'complete' || s === 'earned') return '✅'
          if (s === 'submitted') return '⏳'
          if (s === 'rejected') return '⚠️'
          return '○'
        }

        const heroMessage = nextAction?.description || 'Complete each step to rank higher and unlock more booking opportunities.'
        const heroCta = nextAction?.cta || null
        const handleHeroCta = () => {
          if (!nextAction?.cta) return
          if (nextAction.type === 'upload_id' || nextAction.type === 'resubmit_id') {
            setProofType('Government ID'); setShowAddDoc(true); setProofSubmitOk(false); setProofSubmitErr(false)
          } else if (nextAction.type === 'add_certification') {
            setShowAddDoc(true); setProofSubmitOk(false); setProofSubmitErr(false)
          }
        }

        const earnedCount = (bdgs.earned?.length || 0)
        const nextBadgeName = bdgs.next || lockedTrustBadges[0]?.label || null

        return (
          <div className="px-4 space-y-3 pb-8">

            {/* ─ 1. TRUST HERO ─ */}
            <div id="trust-summary" style={{ background: 'linear-gradient(135deg,#7C5CFF 0%,#4A90E2 100%)', borderRadius: 20, padding: '20px 18px', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.75, margin: 0 }}>Carehia Trust Passport</p>
                  <p style={{ fontSize: 24, fontWeight: 800, margin: '2px 0 0', letterSpacing: '-0.5px' }}>{tier}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{score}</span>
                    <span style={{ fontSize: 9, opacity: 0.75, lineHeight: 1.3 }}>/ 100</span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 13, opacity: 0.9, margin: '0 0 14px', lineHeight: 1.5 }}>{heroMessage}</p>
              {heroCta && nextAction?.type !== 'background_check' && nextAction?.type !== 'id_under_review' && nextAction?.type !== 'bg_under_review' && (
                <button onClick={handleHeroCta} style={{ background: '#fff', color: '#7C5CFF', border: 'none', borderRadius: 12, padding: '11px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', width: '100%', marginBottom: 8 }}>
                  {heroCta}
                </button>
              )}
              {(nextAction?.status === 'submitted' || nextAction?.type === 'id_under_review' || nextAction?.type === 'bg_under_review') && (
                <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 12, opacity: 0.85, margin: 0 }}>⏳ Typically reviewed within 1–2 business days</p>
                </div>
              )}
              {trustDetailLoading && <p style={{ fontSize: 11, opacity: 0.6, textAlign: 'center', margin: '8px 0 0' }}>Refreshing…</p>}
            </div>

            {/* ─ 2. TRUST CHECKLIST ─ */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#7C5CFF', opacity: 0.75, margin: 0, letterSpacing: '0.06em' }}>Trust Checklist</p>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{checklistItems.filter((i: any) => ['approved','complete','earned'].includes(i.status)).length}/{checklistItems.length} done</p>
              </div>
              {checklistItems.map((item: any, idx: number) => {
                const sl = slLabel(item.status)
                const si = slIcon(item.status)
                const isLast = idx === checklistItems.length - 1
                return (
                  <div key={item.key} style={{ padding: '10px 14px', borderBottom: isLast ? 'none' : '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, width: 22, textAlign: 'center', flexShrink: 0 }}>{si}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>{item.label}</p>
                      {item.rejection_reason && (
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#EF4444', lineHeight: 1.3 }}>{item.rejection_reason}</p>
                      )}
                      {item.progress && !['approved','complete','earned'].includes(item.status) && (
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94a3b8' }}>{item.progress}</p>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: sl.bg, color: sl.color, whiteSpace: 'nowrap' }}>{sl.text}</span>
                      <span style={{ fontSize: 11, color: '#7C5CFF', fontWeight: 700, opacity: 0.55, whiteSpace: 'nowrap' }}>+{item.points}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ─ 3. CERTIFICATIONS (collapsible) ─ */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <button onClick={() => setCertExpanded(!certExpanded)} style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#7C5CFF', opacity: 0.75, margin: 0, letterSpacing: '0.06em' }}>Certifications & Proof</p>
                  <p style={{ fontSize: 13, color: '#475569', margin: '2px 0 0' }}>{docs.length > 0 ? `${docs.length} on file` : 'None on file'}</p>
                </div>
                <span style={{ fontSize: 18, color: '#94a3b8', transform: certExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
              </button>
              {certExpanded && (
                <div style={{ borderTop: '1px solid #F1F5F9', padding: '10px 14px 14px' }}>
                  {proofSubmitOk && <div style={{ margin: '0 0 8px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#16a34a', fontWeight: 500 }}>✅ Proof submitted. Carehia will review it shortly.</div>}
                  {proofSubmitErr && <div style={{ margin: '0 0 8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#EF4444', fontWeight: 500 }}>⚠️ Upload failed. Please try again.</div>}
                  <button onClick={() => { setShowAddDoc(true); setProofSubmitOk(false); setProofSubmitErr(false) }}
                    style={{ width: '100%', marginBottom: 6, padding: '10px', background: '#7C5CFF', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    + Add Proof
                  </button>
                  <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: '0 0 10px' }}>🔒 Documents are private and never shared publicly</p>
                  {docs.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>No certifications on file yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {docs.map((doc: any) => (
                        <div key={doc.id} style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 10, border: '1px solid #E2E8F0' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{doc.name}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>
                              {DOC_TYPES.find((t: any) => t.value === doc.type)?.label || doc.type}
                              {doc.expiryDate ? ` · Expires ${new Date(doc.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                            </p>
                            {doc.r2Key && cgToken && (
                              <a href={`${API_BASE}/api/cgp-docs/file?key=${encodeURIComponent(doc.r2Key)}&token=${cgToken}`} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 11, color: '#7C5CFF', textDecoration: 'none' }}>View file ↗</a>
                            )}
                          </div>
                          <button onClick={() => handleDeleteDocument(doc.id)} style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: '#EF4444', fontSize: 13, flexShrink: 0 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─ 4. REPUTATION ─ */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#7C5CFF', opacity: 0.75, margin: '0 0 10px', letterSpacing: '0.06em' }}>Reputation</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ textAlign: 'center', background: '#F8FAFC', borderRadius: 12, padding: '10px 4px' }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{rep.rating != null ? Number(rep.rating).toFixed(1) : '—'}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>Rating</p>
                </div>
                <div style={{ textAlign: 'center', background: '#F8FAFC', borderRadius: 12, padding: '10px 4px' }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{rep.reviews}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>Reviews</p>
                </div>
                <div style={{ textAlign: 'center', background: '#F8FAFC', borderRadius: 12, padding: '10px 4px' }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{rep.sessions}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>Sessions</p>
                </div>
              </div>
            </div>

            {/* ─ 5. TRUST BADGES (compact) ─ */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#7C5CFF', opacity: 0.75, margin: '0 0 10px', letterSpacing: '0.06em' }}>Trust Badges</p>
              {earnedCount === 0 && earnedTrustBadges.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 8px' }}>No badges yet. Complete trust steps to earn your first badge.</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>🏅</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{earnedCount} badge{earnedCount !== 1 ? 's' : ''} unlocked</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                      {bdgs.earned?.slice(0, 3).join(', ') || earnedTrustBadges.slice(0, 3).map((b: any) => b.label).join(', ')}
                    </p>
                  </div>
                </div>
              )}
              {nextBadgeName && (
                <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, opacity: 0.4 }}>🔒</span>
                  <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>Next: <strong style={{ color: '#0F172A' }}>{nextBadgeName}</strong></p>
                </div>
              )}
            </div>

          </div>
        )
      })()}

      {/* ── ADD PROOF CENTERED MODAL ── */}
      {section === 'trust-passport' && showAddDoc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 16px calc(80px + env(safe-area-inset-bottom)) 16px', background: 'rgba(15,23,42,0.45)' }} onClick={() => setShowAddDoc(false)}>
          <div onClick={(e: any) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: 'calc(100dvh - 96px - env(safe-area-inset-bottom))', overflowY: 'auto', padding: '20px 16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#0F172A' }}>Add Proof</p>
              <button onClick={() => { setShowAddDoc(false); setProofType('Government ID'); setOtherDocName(''); setDocExpiry(''); setDocFile(null); setProofNotes('') }}
                style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>🔒 All documents are private and never shared publicly.</p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>What are you adding?</label>
              <select style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, background: '#fff', color: '#0F172A', boxSizing: 'border-box' as any }}
                value={proofType} onChange={(e: any) => { setProofType(e.target.value); setOtherDocName('') }}>
                {['Government ID', 'CPR / First Aid', 'CNA / HHA / License', 'Training Certificate', 'Health Clearance', 'Insurance', 'Background Check Document', 'Work Eligibility', 'Other'].map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {proofType === 'Other' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Document name <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="text" style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' as any }}
                  placeholder="e.g. Dementia Care Training, TB Test" value={otherDocName}
                  onChange={(e: any) => setOtherDocName(e.target.value.slice(0, 80))} maxLength={80} />
                {otherDocName.trim().length > 0 && otherDocName.trim().length < 2 && (
                  <p style={{ fontSize: 11, color: '#EF4444', margin: '3px 0 0' }}>Please enter at least 2 characters.</p>
                )}
              </div>
            )}
            {(PROOF_TYPES_EXPIRY.includes(proofType) || proofType === 'Other') && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Expiry date {PROOF_TYPES_EXPIRY.includes(proofType) ? <span style={{ color: '#94a3b8', fontWeight: 400 }}>(recommended)</span> : <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>}
                </label>
                <input type="date" style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' as any }}
                  value={docExpiry} onChange={(e: any) => setDocExpiry(e.target.value)} />
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Upload file <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx" style={{ display: 'none' }}
                onChange={(e: any) => setDocFile(e.target.files?.[0] || null)} />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', padding: '10px 12px', border: '2px dashed #E2E8F0', borderRadius: 10, background: '#F8FAFC', fontSize: 13, color: docFile ? '#7C5CFF' : '#64748b', cursor: 'pointer', fontWeight: 500, textAlign: 'left' as any }}>
                📎 {docFile ? docFile.name : 'Choose file (PDF, JPG, PNG)'}
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Notes <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
              <textarea style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, resize: 'none', boxSizing: 'border-box' as any }}
                rows={2} placeholder="Add anything Carehia should know about this proof."
                value={proofNotes} onChange={(e: any) => setProofNotes(e.target.value)} />
            </div>
            <button onClick={handleSubmitProof} disabled={proofType === 'Other' && otherDocName.trim().length < 2}
              style={{ width: '100%', padding: '14px', background: '#7C5CFF', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: (proofType === 'Other' && otherDocName.trim().length < 2) ? 0.5 : 1 }}>
              Submit Proof
            </button>
          </div>
        </div>
      )}

      {/* ── ACCOUNT SECTION ── */}
      {section === 'account' && (
        <div className="px-4 space-y-3 pb-4">
          {/* Subscription success banner */}
          {showSubBanner && (
            <div style={{ background: 'linear-gradient(135deg,#22C55E 0%,#16a34a 100%)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>You&apos;re on Unlimited!</p>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: 0 }}>All new bookings will be auto-unlocked.</p>
              </div>
              <button onClick={() => setShowSubBanner(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          )}
          {/* Subscription card */}
          <div className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-base-content">Subscription</p>
              {cgSub?.subscribed && (<span className="text-xs font-semibold px-2 py-1 rounded-full bg-success/10 text-success border border-success/20">Active</span>)}
            </div>
            {cgSubLoading ? (<p className="text-xs text-base-content/60">Loading...</p>) : cgSub?.subscribed ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-base">♾️</div>
                  <div>
                    <p className="font-semibold text-sm text-base-content">Unlimited Plan</p>
                    <p className="text-xs text-base-content/60">$19.99/mo · All bookings auto-unlocked</p>
                  </div>
                </div>
                {cgSub.createdAt && (<p className="text-xs text-base-content/50">Member since {new Date(cgSub.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>)}
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
                <button onClick={handleCgSubscribe} disabled={subUpgrading} className="btn btn-primary btn-sm w-full rounded-xl gap-1">
                  {subUpgrading ? 'Redirecting...' : '⚡ Upgrade to Unlimited'}
                </button>
              </div>
            )}
          </div>
          {/* Account settings row */}
          <div className="bg-base-200 rounded-2xl overflow-hidden">
            <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-3 p-4 hover:bg-base-300 transition-colors">
              <Settings size={18} className="text-base-content/60" />
              <span className="flex-1 text-left text-sm text-base-content">Settings &amp; Support</span>
              <ChevronRight size={16} className="opacity-30" />
            </button>
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-base-content/45">My Clients</p>
          {clientsLoading && (
            <div className="text-center py-8 text-base-content/60 text-sm">Loading your clients…</div>
          )}
          {!clientsLoading && clientsError && (
            <div className="bg-base-200 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="font-semibold text-sm text-base-content">Couldn{"'"}t load clients</p>
              <p className="text-xs text-base-content/60 mt-1 mb-3">Check your connection and try again.</p>
              <button onClick={fetchMyClients} className="btn btn-primary btn-sm">Try again</button>
            </div>
          )}
          {!clientsLoading && !clientsError && myClients.length === 0 && (
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
          <button onClick={onLogout} className="btn btn-ghost w-full text-error gap-2 mt-2">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      )}


      {/* ── WORK PREFERENCES SECTION ── */}
      {section === 'work-preferences' && (
        <div className="px-4 space-y-4 pb-4">
          <div className="rounded-3xl p-4" style={{ background: 'linear-gradient(135deg,rgba(124,92,255,0.08) 0%,rgba(74,144,226,0.08) 100%)', border: '1.5px solid rgba(124,92,255,0.20)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary/70 mb-1">Work Preferences</p>
            <h2 className="text-lg font-bold text-base-content">Set when, where, and how you want to work.</h2>
          </div>

          {/* Availability */}
          <div className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-base-content">Available for Work</p>
                <p className="text-xs text-base-content/70">Clients can find and book you when online</p>
              </div>
              <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={isAvailable} onChange={handleToggleAvailability} />
            </div>
          </div>

          {/* Hourly rate */}
          <div className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm text-base-content">Hourly Rate</p>
              <span className="text-lg font-bold text-primary">${profile.hourlyRate || 25}/hr</span>
            </div>
            <p className="text-xs text-base-content/60 mb-3">Clear pricing helps families decide quickly.</p>
            <button onClick={() => openBioEditor(true)} className="btn btn-outline btn-sm w-full rounded-xl border-primary/30 text-primary gap-1">
              <Edit3 size={13} /> Edit Rate
            </button>
          </div>

          {/* Care skills editor */}
          <div id="section-skills-work" className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-base-content">Care Skills &amp; Specialties</p>
              <button onClick={() => { setEditingSkills(!editingSkills); setSelectedSkills(profile.skills || []) }} className="btn btn-outline btn-xs gap-1 border-primary/30 text-primary">
                <Edit3 size={12} /> {editingSkills ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editingSkills ? (
              <div>
                <p className="text-xs text-base-content/50 mb-3">Select care services you offer. Matching improves your visibility.</p>
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
                  <p className="text-xs text-base-content/65">No skills added yet. Tap Edit to add care services.</p>
                )}
              </div>
            )}
          </div>

          {/* Service area */}
          <div className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm text-base-content">Service Area</p>
            </div>
            {profile.location?.city ? (
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-primary" />
                <span className="text-sm text-base-content/70">{profile.location.city}{profile.location.state ? `, ${profile.location.state}` : ''}</span>
              </div>
            ) : (
              <p className="text-xs text-base-content/60 mb-3">Add your city so families know where you work.</p>
            )}
            <button onClick={openContactEditor} className="btn btn-outline btn-sm w-full rounded-xl border-primary/30 text-primary gap-1">
              <MapPin size={13} /> Edit Service Area
            </button>
          </div>

          {/* ── TRAVEL RADIUS ── */}
          <div className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm text-base-content">How far can you travel?</p>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{travelRadius} mi</span>
            </div>
            <p className="text-xs text-base-content/60 mb-3">Set the distance you are willing to travel for care requests.</p>

            {/* No service area warning */}
            {!profile.location?.city && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 mb-3 flex items-start gap-2">
                <span className="text-warning text-base mt-0.5">&#9888;</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-warning-content mb-1.5">Add your service area first so Carehia can match you with nearby families.</p>
                  <button onClick={openContactEditor} className="btn btn-warning btn-xs rounded-lg gap-1">
                    <MapPin size={11} /> Add Service Area
                  </button>
                </div>
              </div>
            )}

            {/* Slider */}
            <div className="mb-3">
              <input
                type="range"
                min={5} max={50} step={5}
                value={travelRadius}
                onChange={e => {
                  const v = Number(e.target.value)
                  setTravelRadius(v)
                  localStorage.setItem('cgp_travel_radius', String(v))
                }}
                className="carehia-range"
              />
              <div className="flex justify-between text-[10px] text-base-content/40 mt-1 px-0.5" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span><span>35</span><span>40</span><span>45</span><span>50</span>
              </div>
            </div>

            {/* Preset labels */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {([
                { miles: 5,  label: 'Nearby' },
                { miles: 10, label: 'Local' },
                { miles: 15, label: 'Wider area' },
                { miles: 25, label: 'Farther' },
                { miles: 50, label: 'Max reach' },
              ] as { miles: number; label: string }[]).map(({ miles, label }) => (
                <button
                  key={miles}
                  onClick={() => { setTravelRadius(miles); localStorage.setItem('cgp_travel_radius', String(miles)) }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    travelRadius === miles
                      ? 'bg-primary text-white border-primary'
                      : 'bg-base-100 text-base-content/60 border-base-300 hover:border-primary/40'
                  }`}
                >
                  {miles} mi — {label}
                </button>
              ))}
            </div>

            {/* Current radius callout */}
            <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 mb-3">
              <p className="text-xs text-base-content/70">
                <span className="font-semibold text-primary">Current radius: {travelRadius} miles</span>
                {travelRadius <= 10 && <span className="ml-1">&#8212; You\'ll see local requests near your area.</span>}
                {travelRadius > 10 && travelRadius <= 25 && <span className="ml-1">&#8212; Good balance of nearby and wider requests.</span>}
                {travelRadius > 25 && <span className="ml-1">&#8212; You\'ll receive more requests across a larger area.</span>}
              </p>
            </div>

            {travelRadius < 25 && (
              <p className="text-[11px] text-base-content/45 mb-2">
                &#128161; Increasing your radius may help you see more care requests.
              </p>
            )}

            {/* Privacy note */}
            <p className="text-[10px] text-base-content/40 leading-relaxed">
              &#128274; Carehia uses your service area to match you with nearby families. We do not show your exact address to clients.
            </p>

            {/* Save button */}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleSaveRadius}
                className="btn btn-primary btn-sm px-5"
              >
                Save Travel Radius
              </button>
              {radiusSaveStatus === 'saved' && (
                <span className="text-xs text-success font-medium">&#10003; Saved. You will receive care requests within {travelRadius} miles of your service area.</span>
              )}
              {radiusSaveStatus === 'error' && (
                <span className="text-xs text-error font-medium">Could not save travel radius. Please try again.</span>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ─── SAVE FEEDBACK TOAST ─── */}
      {saveFeedback && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, background: saveFeedback.type === 'ok' ? '#22C55E' : '#EF4444',
          color: '#fff', padding: '10px 20px', borderRadius: 12,
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          animation: 'fadeIn 0.2s ease', maxWidth: '85vw', textAlign: 'center' as any,
          whiteSpace: 'nowrap' as any
        }}>
          {saveFeedback.type === 'ok' ? '✓' : '⚠'} {saveFeedback.msg}
        </div>
      )}

      {/* ─── SETTINGS PANEL ─── */}
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
                <a href="https://carehia.com/trust-safety" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.07)', color: '#fff' }}>
                  <span style={{ fontSize: 18 }}>🛡️</span>
                  <span style={{ fontSize: 14, flex: 1 }}>Trust &amp; Safety</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>→</span>
                </a>
                <a href="https://carehia.com/report-concern" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.07)', color: '#EF4444' }}>
                  <span style={{ fontSize: 18 }}>🚨</span>
                  <span style={{ fontSize: 14, flex: 1 }}>Report a Concern</span>
                  <span style={{ fontSize: 11, color: '#EF444480' }}>→</span>
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


      {/* ─── Phase 20: INVITE A CAREGIVER + ONBOARDING NUDGES (additive) ─── */}
      {section === 'account' && profile?.id && (() => {
        const refCode = 'CGP' + profile.id
        const inviteLink = 'https://work.carehia.com?ref=' + refCode
        const copyLink = () => {
          try {
            navigator.clipboard.writeText(inviteLink).then(() => {
              const btn = document.getElementById('cgp-copy-btn-' + profile.id)
              if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy Link' }, 2000) }
            })
          } catch {}
        }
        const shareLink = async () => {
          try {
            if (navigator.share) {
              await navigator.share({ title: 'Join me on Carehia', text: 'I use Carehia to manage my caregiving work. Join here:', url: inviteLink })
            } else { copyLink() }
          } catch {}
        }

        // Nudges based on profile completeness
        const nudges = []
        if (!profile.bio || profile.bio.trim() === '') nudges.push({ icon: '✍️', text: 'Add a short bio to introduce yourself to families', action: 'Edit your profile above' })
        if (!profile.skills || (profile.skills as any[]).length === 0) nudges.push({ icon: '💪', text: 'Add your care skills to get matched with the right clients', action: 'Tap Skills to add them' })
        if (!profile.hourly_rate || Number(profile.hourly_rate) === 0) nudges.push({ icon: '💵', text: 'Set your hourly rate so families know what to expect', action: 'Tap Edit Profile to add it' })
        if (!profile.photo_url) nudges.push({ icon: '📸', text: 'Add a profile photo — caregivers with photos get 3x more requests', action: 'Tap the photo circle above' })

        return (
          <>
            {/* Invite card */}
            <div style={{ margin: '0 0 16px', padding: '20px', background: 'linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)', borderRadius: 16, border: '1px solid rgba(124,92,255,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(124,92,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤝</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 15 }}>Invite a Caregiver</div>
                  <div style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>Know someone who'd be great on Carehia?</div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#475569', fontFamily: 'monospace', marginBottom: 12, wordBreak: 'break-all' }}>
                {inviteLink}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  id={'cgp-copy-btn-' + profile.id}
                  onClick={copyLink}
                  style={{ flex: 1, padding: '10px', background: '#7C5CFF', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                >📋 Copy Link</button>
                {'share' in navigator && (
                  <button
                    onClick={shareLink}
                    style={{ flex: 1, padding: '10px', background: 'rgba(124,92,255,0.12)', color: '#7C5CFF', border: '1px solid rgba(124,92,255,0.3)', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                  >↗ Share</button>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 10, textAlign: 'center' }}>
                Your code: <strong style={{ color: '#7C5CFF' }}>{refCode}</strong> · No sign-up fee, no catch
              </div>
            </div>

            {/* Onboarding nudges */}
            {nudges.length > 0 && (
              <div style={{ margin: '0 0 16px', padding: '16px 20px', background: '#FFFBEB', borderRadius: 16, border: '1px solid #FDE68A' }}>
                <div style={{ fontWeight: 700, color: '#92400E', fontSize: 14, marginBottom: 12 }}>💡 Complete your profile</div>
                {nudges.slice(0, 3).map((n, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < nudges.slice(0,3).length - 1 ? 10 : 0 }}>
                    <span style={{ fontSize: 16 }}>{n.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>{n.text}</div>
                      <div style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>{n.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )
      })()}

      {/* ─── QR FULLSCREEN MODAL ─── */}
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
                src={'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodeURIComponent(profileUrl) + '&color=7C5CFF&bgcolor=FFFFFF&qzone=2'}
                alt="Profile QR Code" width={280} height={280} className="rounded-2xl"
              />
            </div>
            <div className="text-center">
              <p className="text-white/80 text-sm font-semibold">{profile.firstName} {profile.lastName}</p>
              <p className="text-white/50 text-xs mt-0.5">{profileUrlLabel}</p>
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
