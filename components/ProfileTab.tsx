// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { Camera, MapPin, DollarSign, Star, Shield, Globe, Award, Clock, ChevronRight, LogOut, Settings, Edit3, Phone, Mail, FolderOpen, Plus, Trash2, AlertTriangle, CheckCircle2, X, Link2, Copy, Check, Zap, Heart, ThumbsUp, Upload, Share2, Bell, User, Users, FileCheck2, BadgeCheck, Lock } from 'lucide-react'
import { CaregiverProfile, CaregiverDocument } from '../types'
import { addDocument, deleteDocument, refreshDocumentStatuses, calculateCompleteness } from '../utils/storage'
import { TrustCenter } from './TrustCenter'
import { VerificationTab } from './VerificationTab'

const API_BASE = 'https://gotocare-original.jjioji.workers.dev'
const PROFILE_SECTION_KEY = 'cgp_profile_section'
const PROFILE_VERIFICATION_OPEN_KEY = 'cgp_profile_verification_open'
type ProfileSection = 'profile' | 'trust-passport' | 'work-preferences' | 'account'

const SECTION_MAP: Record<string, ProfileSection> = {
  overview: 'profile', profile: 'profile', clients: 'profile',
  verification: 'trust-passport', certifications: 'trust-passport',
  documents: 'trust-passport', badges: 'trust-passport', trust: 'trust-passport',
  'trust-passport': 'trust-passport',
  'work-preferences': 'work-preferences',
  settings: 'account', account: 'account',
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
  if (!doc) return { label: 'Missing', tone: 'bg-base-300 text-base-content/60', state: 'missing' }
  if (doc.status === 'expired') return { label: 'Expired', tone: 'bg-error/10 text-error', state: 'expired' }
  if (doc.status === 'expiring_soon') return { label: 'Expiring Soon', tone: 'bg-warning/15 text-warning', state: 'expiring' }
  return { label: 'Pending Review', tone: 'bg-warning/15 text-warning', state: 'pending' }
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
  // NEW: Verification Center state
  const [showVerification, setShowVerification] = useState(() => {
    try { return localStorage.getItem(PROFILE_VERIFICATION_OPEN_KEY) === '1' } catch { return false }
  })
  const [verifBadgeCount, setVerifBadgeCount] = useState(0)
  const [trustStatus, setTrustStatus] = useState<any>(null)

  const navigateToSection = (nextSection: ProfileSection) => {
    setSection(nextSection)
    try { localStorage.setItem(PROFILE_SECTION_KEY, nextSection) } catch {}
  }

  const setVerificationOpen = (open: boolean) => {
    setShowVerification(open)
    try {
      if (open) localStorage.setItem(PROFILE_VERIFICATION_OPEN_KEY, '1')
      else localStorage.removeItem(PROFILE_VERIFICATION_OPEN_KEY)
    } catch {}
  }

  useEffect(() => {
    if (initialSection) navigateToSection(initialSection)
    if (deepLink) {
      setTimeout(() => {
        if (deepLink === 'section-verification') navigateToSection('trust-passport')
        if (deepLink === 'section-certifications') navigateToSection('trust-passport')
        if (deepLink === 'section-documents') navigateToSection('trust-passport')
        if (deepLink === 'section-settings') navigateToSection('account')
        const el = document.getElementById(deepLink)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (deepLink === 'section-bio') setEditing(true)
        if (deepLink === 'section-skills') setEditingSkills(true)
        if (deepLink === 'section-contact') setEditingContact(true)
        if (deepLink === 'section-languages') setShowLangInput(true)
      }, 150)
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
          setVerifBadgeCount(count)
        }
      })
      .catch(() => {})
  }, [showVerification])

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
    scrollToProfileSection('section-skills')
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
  const docs = rawDocs.map((doc: any) => {
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
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <h2 className="text-2xl font-bold text-base-content">{profile.firstName} {profile.lastName}</h2>
        <div className="mt-1 flex items-center justify-center gap-2 text-sm text-base-content/55">
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

          {/* Compact Trust Passport summary → Trust tab */}
          <div className="bg-base-200 rounded-3xl p-4 border border-primary/15">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Shield size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-base-content">Carehia Trust Passport</p>
                <p className="text-xs text-base-content/60">{verification.verificationProgress}% complete · {verification.nextStep}</p>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-base-100 overflow-hidden mb-3">
              <div className="h-full rounded-full bg-primary" style={{ width: `${verification.verificationProgress}%` }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigateToSection('trust-passport')} className="btn btn-primary btn-sm flex-1 rounded-2xl">
                View Trust Passport
              </button>
              <button onClick={() => onOpenTrustPassport?.()} className="btn btn-outline btn-sm rounded-2xl border-primary/30 text-primary">
                Full View
              </button>
            </div>
          </div>

          <div className="bg-base-200 rounded-3xl p-4 border border-base-300/70">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-sm text-base-content">Profile Readiness Checklist</p>
              <span className="text-xs font-bold text-primary">{verification.progressItems.filter(i => i.done).length}/{verification.progressItems.length}</span>
            </div>
            <div className="space-y-2">
              {verification.progressItems.map(item => {
                const tone = item.status === 'Complete' ? 'bg-success/10 text-success' : item.status === 'Pending' || item.status === 'Pending Review' || item.status === 'Expiring Soon' ? 'bg-warning/15 text-warning' : item.status === 'Expired' ? 'bg-error/10 text-error' : 'bg-base-100 text-base-content/60'
                return (
                  <div key={item.key} className="flex items-center gap-3 rounded-2xl bg-base-100 px-3 py-2.5">
                    <span className={`h-8 w-8 rounded-xl flex items-center justify-center ${item.done ? 'bg-success/10 text-success' : 'bg-base-300 text-base-content/45'}`}>
                      {item.done ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-base-content">{item.label}</span>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${tone}`}>{item.status}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => openBioEditor()} className="btn btn-outline rounded-2xl border-primary/25 text-primary"><Edit3 size={15} /> Edit Bio</button>
            <button onClick={() => { navigateToSection('trust-passport'); setDocType('certification'); setDocName('CPR'); setShowAddDoc(true) }} className="btn btn-outline rounded-2xl border-primary/25 text-primary"><Award size={15} /> Add Certification</button>
            <button onClick={() => { navigateToSection('trust-passport'); setShowAddDoc(true) }} className="btn btn-outline rounded-2xl border-primary/25 text-primary"><Upload size={15} /> Upload Proof</button>
            <button onClick={() => setShowQR(true)} className="btn btn-outline rounded-2xl border-primary/25 text-primary"><Share2 size={15} /> Show QR Code</button>
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

          {/* ═══ VERIFICATION CENTER CARD (NEW — additive) ═══ */}
          <button
            onClick={() => setVerificationOpen(true)}
            className="w-full bg-base-200 rounded-2xl p-4 text-left"
            style={{ border: verifBadgeCount > 0 ? '1.5px solid rgba(34,197,94,0.35)' : '1.5px solid rgba(124,92,255,0.2)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: verifBadgeCount > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(124,92,255,0.12)' }}>
                  {verifBadgeCount > 0 ? '✅' : '🔍'}
                </div>
                <div>
                  <p className="font-semibold text-sm text-base-content">Verification Center</p>
                  <p className="text-xs text-base-content/60">
                    {verifBadgeCount > 0 ? `${verifBadgeCount} badge${verifBadgeCount > 1 ? 's' : ''} earned · Tap to manage` : 'Get verified badges · Rank higher in search'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {verifBadgeCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#22C55E' }}>{verifBadgeCount}</span>
                )}
                <ChevronRight size={16} className="opacity-40" />
              </div>
            </div>
          </button>

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

          {/* Skills – display-only; full editor in Work tab */}
          <div id="section-skills" className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-base-content">Care Skills</p>
              <button onClick={() => navigateToSection('work-preferences')} className="btn btn-outline btn-xs gap-1 border-primary/30 text-primary">
                <Edit3 size={12} /> Edit in Work
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(profile.skills?.length || 0) > 0 ? profile.skills!.map((skill, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">{skill}</span>
              )) : (
                <button onClick={() => navigateToSection('work-preferences')} className="w-full text-center text-xs text-primary/70 hover:text-primary py-2 border border-dashed border-primary/20 rounded-lg">
                  + Add care skills in Work tab
                </button>
              )}
            </div>
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

      {/* ── TRUST PASSPORT: Verification ── */}
      {section === 'trust-passport' && (
        <div id="trust-summary" className="px-4 space-y-4">
          {/* Trust Passport header */}
          <div className="rounded-3xl p-4" style={{ background: 'linear-gradient(135deg,rgba(124,92,255,0.10) 0%,rgba(74,144,226,0.10) 100%)', border: '1.5px solid rgba(124,92,255,0.25)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary/70 mb-1">Carehia Trust Passport</p>
            <h2 className="text-lg font-bold text-base-content">Build trust step by step and unlock more opportunities.</h2>
            <p className="text-xs text-base-content/60 mt-1">Complete each module to rank higher and get more bookings.</p>
          </div>
          <div id="trust-verification">
          <div className="rounded-3xl bg-base-200 border border-primary/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary/70">Verification Center</p>
                <h3 className="text-lg font-bold text-base-content mt-1">Strengthen your Carehia profile</h3>
                <p className="text-sm text-base-content/60 mt-1">Complete your verification to help families feel confident choosing you.</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <BadgeCheck size={26} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-2xl bg-base-100 p-3">
                <p className="text-2xl font-black text-base-content">{verification.verificationProgress}%</p>
                <p className="text-xs text-base-content/55">Verification progress</p>
              </div>
              <div className="rounded-2xl bg-base-100 p-3">
                <p className="text-2xl font-black text-base-content">{verification.trustScore}</p>
                <p className="text-xs text-base-content/55">Trust score</p>
              </div>
            </div>
          </div>

          {[
            {
              title: 'Identity Verification',
              icon: User,
              status: verification.idVerified ? 'Verified' : verification.idDoc ? getDocReviewStatus(verification.idDoc).label : 'Not Started',
              body: 'Accepted documents: Driver License, State ID, or Passport.',
              action: 'Upload ID',
              disabled: false,
              run: () => { navigateToSection('documents'); setDocType('license'); setDocName('Identity Document'); setShowAddDoc(true); scrollToProfileSection('section-documents') },
            },
            {
              title: 'Background Check',
              icon: Shield,
              status: verification.backgroundVerified ? 'Verified' : verification.bgDoc ? 'Pending' : 'Not Started',
              body: verification.backgroundVerified ? 'Your background check is verified.' : 'Background check integration coming soon. You can store proof privately for review.',
              action: verification.backgroundVerified ? 'Verified' : 'Coming soon',
              disabled: true,
              run: () => {},
            },
            {
              title: 'References',
              icon: Users,
              status: 'Missing',
              body: 'Professional references are planned for a future profile trust update.',
              action: 'Coming soon',
              disabled: true,
              run: () => {},
            },
          ].map(card => {
            const Icon = card.icon
            const tone = card.status === 'Verified' ? 'bg-success/10 text-success' : card.status === 'Pending' || card.status === 'Pending Review' ? 'bg-warning/15 text-warning' : 'bg-base-100 text-base-content/60'
            return (
              <div key={card.title} className="rounded-3xl bg-base-200 border border-base-300/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon size={21} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-base-content">{card.title}</p>
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${tone}`}>{card.status}</span>
                    </div>
                    <p className="text-sm text-base-content/60 mt-1">{card.body}</p>
                    <button onClick={card.run} disabled={card.disabled} className={`btn btn-sm mt-3 rounded-2xl ${card.disabled ? 'btn-disabled' : 'btn-primary'}`}>
                      {card.action}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          <div className="rounded-3xl bg-base-200 border border-base-300/70 p-4">
            <p className="font-bold text-base-content mb-3">Verification Timeline</p>
            {docs.length === 0 ? (
              <div className="rounded-2xl bg-base-100 border border-base-300 p-4 text-sm text-base-content/60">
                No verification activity yet. Upload an ID or certification to begin.
              </div>
            ) : (
              <div className="space-y-2">
                {docs.slice(0, 5).map(doc => (
                  <div key={doc.id} className="flex items-start gap-3 rounded-2xl bg-base-100 p-3">
                    <div className="mt-0.5 h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <FileCheck2 size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-base-content">{doc.name}</p>
                      <p className="text-xs text-base-content/55">{DOC_TYPES.find(t => t.value === doc.type)?.label || doc.type} submitted {doc.addedAt ? new Date(doc.addedAt).toLocaleDateString() : ''}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${getDocReviewStatus(doc).tone}`}>{getDocReviewStatus(doc).label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <TrustCenter profile={profile} />
          </div>{/* /trust-verification */}
        </div>
      )}

      {/* ── TRUST PASSPORT: Certifications & Skills Proof ── */}
      {section === 'trust-passport' && (
        <div id="trust-certifications" className="px-4 space-y-4">
          <div className="rounded-3xl bg-base-200 border border-base-300/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary/70">Certifications &amp; Skills Proof</p>
                <h3 className="text-lg font-bold text-base-content mt-1">Show your care qualifications</h3>
                <p className="text-sm text-base-content/60 mt-1">Verified certifications can help improve your visibility. Uploaded proof stays private during review.</p>
              </div>
              <button onClick={() => { setDocType('certification'); setDocName('CPR'); setShowAddDoc(true) }} className="btn btn-primary btn-sm rounded-2xl">
                <Plus size={15} /> Add
              </button>
            </div>
          </div>

          {showAddDoc && (
            <div className="bg-base-200 rounded-2xl p-4 border-2 border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">Add Certification</p>
                <button onClick={() => setShowAddDoc(false)} className="btn btn-ghost btn-xs btn-circle"><X size={14} /></button>
              </div>
              <div className="space-y-2">
                <select className="select select-bordered select-sm w-full" value={CERTIFICATION_TYPES.includes(docName) ? docName : 'CPR'} onChange={e => setDocName(e.target.value)}>
                  {CERTIFICATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" className="input input-bordered input-sm w-full" placeholder="Issuing organization (optional)" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="input input-bordered input-sm w-full" aria-label="Issue date" />
                  <input type="date" className="input input-bordered input-sm w-full" aria-label="Expiration date" value={docExpiry} onChange={e => setDocExpiry(e.target.value)} />
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                  onChange={e => setDocFile(e.target.files?.[0] || null)} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-outline btn-sm w-full gap-1 border-dashed">
                  <Upload size={14} />
                  {docFile ? docFile.name : 'Upload proof document'}
                </button>
                <button onClick={() => { setDocType('certification'); if (!docName) setDocName('CPR'); handleAddDocument() }} className="btn btn-primary btn-sm w-full">
                  Submit for Review
                </button>
                <p className="text-[11px] text-base-content/50">Issuing organization and issue date are UI-only for now. Proof is stored through the existing document vault.</p>
              </div>
            </div>
          )}

          {CERTIFICATION_TYPES.map(type => {
            const doc = certificationDocs.find(d => type === 'Other' ? d.type === 'certification' : docText(d).includes(type.toLowerCase()))
            const status = getDocReviewStatus(doc)
            return (
              <div key={type} className="rounded-3xl bg-base-200 border border-base-300/70 p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${doc ? 'bg-primary/10 text-primary' : 'bg-base-300 text-base-content/45'}`}>
                    <Award size={21} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-base-content">{type}</p>
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${status.tone}`}>{status.label}</span>
                    </div>
                    <p className="text-sm text-base-content/60 mt-1">
                      {doc ? `${doc.name}${doc.expiryDate ? ' · Expires ' + new Date(doc.expiryDate).toLocaleDateString() : ''}` : `Upload ${type} proof to submit for review.`}
                    </p>
                    {doc?.r2Key ? <p className="text-xs text-success mt-1">Uploaded proof attached</p> : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── TRUST PASSPORT: Manual Proof / Document Vault ── */}
      {section === 'trust-passport' && (
        <div id="trust-manual-proof" className="px-4 space-y-4">
          <div className="rounded-3xl bg-base-200 border border-base-300/70 p-4">
            <p className="text-lg font-bold text-base-content">Manual Proof</p>
            <p className="text-sm text-base-content/60 mt-1">Upload proof when a trust step needs supporting documents such as certifications, licenses, training, or background check records. Documents are private.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Identity', 'Certification', 'Training', 'Medical clearance', 'Other'].map(label => (
                <span key={label} className="rounded-full bg-base-100 border border-base-300 px-2.5 py-1 text-[11px] font-semibold text-base-content/60">{label}</span>
              ))}
            </div>
          </div>
          <div className="text-xs text-base-content/60">
            Store your certifications, licenses, and training records. Get alerts before they expire so you never fall out of compliance.
            <p className="text-xs text-base-content/60 mt-1">🔒 Documents are private unless you choose to share them.</p>
          </div>

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
                        {!doc.expiryDate && <p className="text-xs text-base-content/60 mt-0.5">No expiry</p>}
                        {doc.r2Key && cgToken && (
                          <a href={`${API_BASE}/api/cgp-docs/file?key=${encodeURIComponent(doc.r2Key)}&token=${cgToken}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary/70 mt-0.5 flex items-center gap-0.5 hover:text-primary">
                            <Upload size={10} /> View file
                          </a>
                        )}
                        {doc.fileName && !doc.r2Key && (
                          <p className="text-xs text-base-content/60 mt-0.5">{doc.fileName}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteDocument(doc.id)} className="btn btn-outline btn-xs btn-circle border-error/30 text-error">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* ── TRUST PASSPORT: Badges ── */}
      {section === 'trust-passport' && (
        <div id="trust-badges" className="px-4 space-y-4 pb-2">
          <p className="text-xs text-base-content/60">
            Earn badges to build trust with clients. Badges appear on your public profile and in search results.
          </p>

          {earnedTrustBadges.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Verified Trust Badges</p>
              <div className="space-y-2">
                {earnedTrustBadges.map(badge => (
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

          {earnedBadges.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Profile Badges</p>
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

          {lockedTrustBadges.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Locked Trust Badges</p>
              <div className="space-y-2">
                {lockedTrustBadges.map(badge => (
                  <div key={badge.id} className="bg-base-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center">
                      <Lock size={22} className="text-base-content/50" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-base-content">{badge.label}</p>
                      <p className="text-xs text-base-content/60">{badge.unlock}</p>
                    </div>
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

          {/* Languages */}
          <div className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm text-base-content">Languages</p>
              <button onClick={() => { navigateToSection('profile'); setTimeout(() => setShowLangInput(true), 150) }} className="btn btn-outline btn-xs gap-1 border-primary/30 text-primary">
                <Plus size={12} /> Add
              </button>
            </div>
            {profile.languages && profile.languages.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.languages.map((lang, i) => (
                  <span key={i} className="badge badge-sm badge-ghost py-2.5">{lang}</span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-base-content/65">No languages added. Languages improve your match rate.</p>
            )}
          </div>
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
      {profile?.id && (() => {
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

      {/* ─── VERIFICATION CENTER OVERLAY (NEW — last child, additive) ─── */}
      {showVerification && profile?.id && (
        <VerificationTab
          caregiverId={profile.id}
          onClose={() => setVerificationOpen(false)}
        />
      )}
    </div>
  )
}

export default ProfileTab
