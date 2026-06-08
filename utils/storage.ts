// @ts-nocheck
// localStorage wrapper for offline-first caregiver tools
// These tools work Day 1 — no backend needed

import { TimeEntry, CaregiverDocument, Invoice, PrivateClient, MileageEntry } from '../types'

const KEYS = {
  TIME_ENTRIES: 'gtc_time_entries',
  DOCUMENTS: 'gtc_documents',
  INVOICES: 'gtc_invoices',
  CLIENTS: 'gtc_private_clients',
  MILEAGE: 'gtc_mileage',
  ACTIVE_TIMER: 'gtc_active_timer',
}

function get<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch { return [] }
}

function set(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify(data))
}

// Generate short IDs
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ---- TIME ENTRIES ----
export function getTimeEntries(): TimeEntry[] { return get<TimeEntry>(KEYS.TIME_ENTRIES) }

export function addTimeEntry(entry: Omit<TimeEntry, 'id' | 'createdAt'>): TimeEntry {
  const all = getTimeEntries()
  const newEntry: TimeEntry = { ...entry, id: uid(), createdAt: new Date().toISOString() }
  all.unshift(newEntry)
  set(KEYS.TIME_ENTRIES, all)
  return newEntry
}

export function updateTimeEntry(id: string, updates: Partial<TimeEntry>): void {
  const all = getTimeEntries().map(e => e.id === id ? { ...e, ...updates } : e)
  set(KEYS.TIME_ENTRIES, all)
}

export function deleteTimeEntry(id: string): void {
  set(KEYS.TIME_ENTRIES, getTimeEntries().filter(e => e.id !== id))
}

// Active timer
export function getActiveTimer(): TimeEntry | null {
  try {
    const raw = localStorage.getItem(KEYS.ACTIVE_TIMER)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function setActiveTimer(entry: TimeEntry | null): void {
  if (entry) localStorage.setItem(KEYS.ACTIVE_TIMER, JSON.stringify(entry))
  else localStorage.removeItem(KEYS.ACTIVE_TIMER)
}

// ---- DOCUMENTS ----
export function getDocuments(): CaregiverDocument[] { return get<CaregiverDocument>(KEYS.DOCUMENTS) }

export function addDocument(doc: Omit<CaregiverDocument, 'id' | 'addedAt' | 'status'>): CaregiverDocument {
  const all = getDocuments()
  let status: CaregiverDocument['status'] = 'no_expiry'
  if (doc.expiryDate) {
    const daysUntil = (new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 86400)
    if (daysUntil < 0) status = 'expired'
    else if (daysUntil < 30) status = 'expiring_soon'
    else status = 'valid'
  }
  const newDoc: CaregiverDocument = { ...doc, id: uid(), addedAt: new Date().toISOString(), status }
  all.unshift(newDoc)
  set(KEYS.DOCUMENTS, all)
  return newDoc
}

export function deleteDocument(id: string): void {
  set(KEYS.DOCUMENTS, getDocuments().filter(d => d.id !== id))
}

export function refreshDocumentStatuses(): CaregiverDocument[] {
  const all = getDocuments().map(doc => {
    if (!doc.expiryDate) return { ...doc, status: 'no_expiry' as const }
    const daysUntil = (new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 86400)
    if (daysUntil < 0) return { ...doc, status: 'expired' as const }
    if (daysUntil < 30) return { ...doc, status: 'expiring_soon' as const }
    return { ...doc, status: 'valid' as const }
  })
  set(KEYS.DOCUMENTS, all)
  return all
}

// ---- INVOICES ----
export function getInvoices(): Invoice[] { return get<Invoice>(KEYS.INVOICES) }

export function addInvoice(inv: Omit<Invoice, 'id' | 'createdAt'>): Invoice {
  const all = getInvoices()
  const newInv: Invoice = { ...inv, id: uid(), createdAt: new Date().toISOString() }
  all.unshift(newInv)
  set(KEYS.INVOICES, all)
  return newInv
}

export function updateInvoice(id: string, updates: Partial<Invoice>): void {
  const all = getInvoices().map(i => i.id === id ? { ...i, ...updates } : i)
  set(KEYS.INVOICES, all)
}

export function deleteInvoice(id: string): void {
  set(KEYS.INVOICES, getInvoices().filter(i => i.id !== id))
}

export function getNextInvoiceNumber(): string {
  const all = getInvoices()
  const num = all.length + 1
  return `INV-${String(num).padStart(4, '0')}`
}

// ---- PRIVATE CLIENTS ----
export function getPrivateClients(): PrivateClient[] { return get<PrivateClient>(KEYS.CLIENTS) }

export function addPrivateClient(client: Omit<PrivateClient, 'id' | 'createdAt'>): PrivateClient {
  const all = getPrivateClients()
  const newClient: PrivateClient = { ...client, id: uid(), createdAt: new Date().toISOString() }
  all.unshift(newClient)
  set(KEYS.CLIENTS, all)
  return newClient
}

export function deletePrivateClient(id: string): void {
  set(KEYS.CLIENTS, getPrivateClients().filter(c => c.id !== id))
}

// ---- MILEAGE ----
export function getMileageEntries(): MileageEntry[] { return get<MileageEntry>(KEYS.MILEAGE) }

export function addMileageEntry(entry: Omit<MileageEntry, 'id'>): MileageEntry {
  const all = getMileageEntries()
  const newEntry: MileageEntry = { ...entry, id: uid() }
  all.unshift(newEntry)
  set(KEYS.MILEAGE, all)
  return newEntry
}

export function deleteMileageEntry(id: string): void {
  set(KEYS.MILEAGE, getMileageEntries().filter(e => e.id !== id))
}

// ---- PROFILE COMPLETENESS ----
export function calculateCompleteness(profile: any, docs: CaregiverDocument[]): { score: number; items: { label: string; done: boolean; hint: string; icon: string; action: { section: 'profile' | 'documents'; scrollTo: string } }[] } {
  const items = [
    {
      label: 'Basic info',
      done: !!(profile?.firstName && profile?.lastName),
      hint: 'Add your full name',
      icon: '👤',
      action: { section: 'profile' as const, scrollTo: 'section-bio' },
    },
    {
      label: 'Profile photo',
      done: !!profile?.profilePhoto,
      hint: 'Upload a professional photo',
      icon: '📸',
      action: { section: 'profile' as const, scrollTo: 'section-photo' },
    },
    {
      label: 'Bio written',
      done: !!(profile?.bio && profile.bio.length > 20),
      hint: 'Tell clients about yourself',
      icon: '✍️',
      action: { section: 'profile' as const, scrollTo: 'section-bio' },
    },
    {
      label: 'Hourly rate set',
      done: !!(profile?.hourlyRate && profile.hourlyRate > 0),
      hint: 'Set your hourly rate',
      icon: '💰',
      action: { section: 'profile' as const, scrollTo: 'section-bio' },
    },
    {
      label: 'Skills selected (3+)',
      done: (profile?.skills?.length || 0) >= 3,
      hint: 'Add the care services you offer',
      icon: '🩺',
      action: { section: 'profile' as const, scrollTo: 'section-skills' },
    },
    {
      label: 'Phone number',
      done: !!profile?.phone,
      hint: 'Add your phone number',
      icon: '📞',
      action: { section: 'profile' as const, scrollTo: 'section-contact' },
    },
    {
      label: 'Location added',
      done: !!(profile?.location?.city),
      hint: 'Add your city / service area',
      icon: '📍',
      action: { section: 'profile' as const, scrollTo: 'section-contact' },
    },
    {
      label: 'Languages added',
      done: (profile?.languages?.length || 0) > 0,
      hint: 'Add languages you speak',
      icon: '🌐',
      action: { section: 'profile' as const, scrollTo: 'section-languages' },
    },
    {
      label: '1+ certification uploaded',
      done: docs.filter(d => d.type === 'certification' || d.type === 'license').length > 0,
      hint: 'Upload CNA, HHA, or other cert',
      icon: '🎓',
      action: { section: 'documents' as const, scrollTo: 'section-documents' },
    },
    {
      label: 'Background check',
      done: docs.some(d => d.type === 'background_check'),
      hint: 'Upload your background check',
      icon: '🛡️',
      action: { section: 'documents' as const, scrollTo: 'section-documents' },
    },
  ]
  const done = items.filter(i => i.done).length
  return { score: Math.round((done / items.length) * 100), items }
}

// Invoice → Entry ID map (persists entry claims across refreshes)
const INV_ENTRY_MAP_KEY = 'gtc_inv_entry_map'
function _getInvEntryMap(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(INV_ENTRY_MAP_KEY) || '{}') } catch { return {} }
}
export function setInvoiceEntryIds(invoiceId: string, ids: string[]): void {
  if (!invoiceId || !ids.length) return
  const m = _getInvEntryMap()
  m[invoiceId] = ids
  localStorage.setItem(INV_ENTRY_MAP_KEY, JSON.stringify(m))
}
export function getInvoiceEntryIds(invoiceId: string): string[] {
  return _getInvEntryMap()[invoiceId] || []
}
export function clearInvoiceEntryIds(invoiceId: string): void {
  const m = _getInvEntryMap()
  delete m[invoiceId]
  localStorage.setItem(INV_ENTRY_MAP_KEY, JSON.stringify(m))
}
