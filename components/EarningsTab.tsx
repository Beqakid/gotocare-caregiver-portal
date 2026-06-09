// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Calculator,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Edit3,
  FileText,
  Mail,
  Plus,
  Printer,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { Timesheet, Invoice, InvoiceItem, TimeEntry, CaregiverProfile } from '../types'
import {
  addInvoice,
  clearInvoiceEntryIds,
  deleteInvoice,
  getInvoiceEntryIds,
  getInvoices,
  getMileageEntries,
  getNextInvoiceNumber,
  getTimeEntries,
  setInvoiceEntryIds,
  updateInvoice,
  updateTimeEntry,
} from '../utils/storage'
import {
  cloudAddInvoice,
  cloudDeleteInvoice,
  cloudGetInvoices,
  cloudGetPrivateClients,
  cloudSendInvoice,
  cloudUpdateInvoice,
} from '../utils/cloud-api'

const API = 'https://gotocare-original.jjioji.workers.dev/api'
const EARNINGS_VIEW_KEY = 'cgp_earnings_view'
const EARNINGS_PERIOD_KEY = 'cgp_earnings_period'
type EarningsView = 'workspace' | 'invoices' | 'tax'
type EarningsPeriod = 'week' | 'month' | 'all'

function getSavedEarningsView(): EarningsView {
  try {
    const saved = localStorage.getItem(EARNINGS_VIEW_KEY) as EarningsView | null
    if (saved === 'workspace' || saved === 'invoices' || saved === 'tax') return saved
  } catch {}
  return 'workspace'
}

function getSavedEarningsPeriod(): EarningsPeriod {
  try {
    const saved = localStorage.getItem(EARNINGS_PERIOD_KEY) as EarningsPeriod | null
    if (saved === 'week' || saved === 'month' || saved === 'all') return saved
  } catch {}
  return 'week'
}

const cloudMarkEntriesInvoiced = async (cloudIds: string[]) => {
  if (!cloudIds.length) return
  const token = localStorage.getItem('cgp_token') || ''
  if (!token) return
  try {
    await fetch(`${API}/caregiver-time-entries`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, cloudIds }),
    })
  } catch {}
}

interface EarningsTabProps {
  timesheets: Timesheet[]
  loading: boolean
}

const money = (value: number) => `$${Math.max(0, value || 0).toFixed(0)}`

const dateLabel = (date: string) => {
  try {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return date
  }
}

const fullDateLabel = (date: string) => {
  try {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return date
  }
}

const escapeHtml = (value: any) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

type InvoiceCaregiverInfo = {
  name: string
  email: string
  phone: string
  location: string
}

const getInvoiceCaregiverInfo = (): InvoiceCaregiverInfo => {
  try {
    const saved = localStorage.getItem('cgp_account')
    const profile = saved ? JSON.parse(saved) as Partial<CaregiverProfile> & { name?: string; zipCode?: string } : null
    const firstLast = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
    const name = profile?.name || firstLast || profile?.email?.split('@')[0] || 'Carehia caregiver'
    const location = [
      profile?.location?.city,
      profile?.location?.state,
      profile?.location?.zipCode || profile?.zipCode,
    ].filter(Boolean).join(', ')
    return {
      name,
      email: profile?.email || '',
      phone: profile?.phone || '',
      location,
    }
  } catch {
    return { name: 'Carehia caregiver', email: '', phone: '', location: '' }
  }
}

const invoicePrintHtml = (invoice: Invoice, caregiver: InvoiceCaregiverInfo) => {
  const rows = (invoice.items || []).map(item => `
    <tr>
      <td>${escapeHtml(item.description || 'Care services')}</td>
      <td class="num">${(item.hours || 0).toFixed(1)}</td>
      <td class="num">$${(item.rate || 0).toFixed(2)}</td>
      <td class="num strong">$${(item.amount || 0).toFixed(2)}</td>
    </tr>
  `).join('')
  const notes = invoice.notes ? `
    <section class="notes no-break">
      <p class="eyebrow">Notes</p>
      <p>${escapeHtml(invoice.notes)}</p>
    </section>
  ` : ''

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(invoice.invoiceNumber || "Invoice")} - Carehia Invoice</title>
        <style>
          @page { size: letter; margin: 0.5in; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #ffffff;
            color: #0f172a;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .page { max-width: 7.5in; margin: 0 auto; padding: 0; }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          .brand { font-size: 32px; line-height: 1; font-weight: 900; color: #0f172a; }
          .muted { color: #64748b; }
          .small { font-size: 13px; }
          .right { text-align: right; }
          .eyebrow {
            margin: 0 0 6px;
            color: #94a3b8;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          h1, h2, p { margin: 0; }
          .invoice-no { margin-top: 4px; font-size: 20px; font-weight: 800; }
          .status { margin-top: 4px; color: #64748b; font-size: 13px; text-transform: capitalize; }
          .meta {
            display: grid;
            grid-template-columns: 1.1fr 1.1fr 0.9fr;
            gap: 24px;
            margin-bottom: 32px;
          }
          .party { margin-top: 8px; font-size: 17px; font-weight: 800; }
          .line { margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 14px; }
          thead tr { background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
          th { padding: 12px 10px; color: #64748b; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; text-align: left; }
          td { padding: 14px 10px; border-bottom: 1px solid #f1f5f9; }
          .num { text-align: right; }
          .strong { font-weight: 800; }
          .notes {
            margin-bottom: 32px;
            border-radius: 12px;
            background: #f8fafc;
            padding: 16px;
            color: #475569;
            font-size: 14px;
          }
          .total { display: flex; justify-content: flex-end; }
          .total-box { width: 230px; border-top: 2px solid #0f172a; padding-top: 16px; text-align: right; }
          .total-amount { margin-top: 4px; font-size: 32px; line-height: 1; font-weight: 900; }
          .no-break, tr { break-inside: avoid; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="header no-break">
            <div>
              <p class="brand">Carehia</p>
              <p class="muted small" style="margin-top: 8px;">Professional caregiver invoice</p>
            </div>
            <div class="right">
              <p class="eyebrow">Invoice</p>
              <p class="invoice-no">${escapeHtml(invoice.invoiceNumber)}</p>
              <p class="status">${escapeHtml(invoice.status)}</p>
            </div>
          </header>

          <section class="meta no-break">
            <div>
              <p class="eyebrow">From</p>
              <p class="party">${escapeHtml(caregiver.name)}</p>
              ${caregiver.email ? `<p class="muted small line">${escapeHtml(caregiver.email)}</p>` : ''}
              ${caregiver.phone ? `<p class="muted small line">${escapeHtml(caregiver.phone)}</p>` : ''}
              ${caregiver.location ? `<p class="muted small line">${escapeHtml(caregiver.location)}</p>` : ''}
            </div>
            <div>
              <p class="eyebrow">Bill To</p>
              <p class="party">${escapeHtml(invoice.clientName || "Client")}</p>
              ${invoice.clientEmail ? `<p class="muted small line">${escapeHtml(invoice.clientEmail)}</p>` : ''}
            </div>
            <div class="right">
              <p class="eyebrow">Dates</p>
              <p class="small" style="margin-top: 8px;">Issued ${escapeHtml(fullDateLabel(invoice.issueDate))}</p>
              <p class="small muted" style="margin-top: 4px;">Due ${escapeHtml(fullDateLabel(invoice.dueDate))}</p>
            </div>
          </section>

          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th class="num">Hours</th>
                <th class="num">Rate</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          ${notes}

          <section class="total no-break">
            <div class="total-box">
              <p class="eyebrow">Total Due</p>
              <p class="total-amount">$${Number(invoice.total || 0).toFixed(2)}</p>
            </div>
          </section>
        </main>
      </body>
    </html>`
}

const entryHours = (entry: TimeEntry) => {
  if (entry.regularHours !== undefined || entry.overtimeHours !== undefined) {
    return (entry.regularHours || 0) + (entry.overtimeHours || 0)
  }
  return entry.duration ? entry.duration / 60 : 0
}

const entryAmount = (entry: TimeEntry) => {
  if (entry.totalPay !== undefined) return entry.totalPay
  return entryHours(entry) * (entry.hourlyRate || 0)
}

const dateValue = (date?: string) => {
  if (!date) return 0
  const parsed = new Date(date.includes('T') ? date : `${date}T00:00:00`).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-bold uppercase tracking-wide text-base-content/45">{children}</p>
)

const MetricCard = ({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'primary',
}: {
  label: string
  value: string
  sub?: string
  icon: any
  tone?: 'primary' | 'success' | 'warning' | 'info'
}) => {
  const toneClass = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/15 text-warning',
    info: 'bg-info/10 text-info',
  }[tone]

  return (
    <div className="rounded-2xl bg-base-200 p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon size={18} />
      </div>
      <p className="text-xl font-bold text-base-content">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/50">{label}</p>
      {sub && <p className="mt-2 text-xs text-base-content/55">{sub}</p>}
    </div>
  )
}

const InvoiceStatusBadge = ({ status }: { status: Invoice['status'] }) => {
  const cls = {
    draft: 'badge-ghost',
    sent: 'badge-info',
    paid: 'badge-success',
    overdue: 'badge-error',
  }[status]
  return <span className={`badge badge-xs ${cls}`}>{status}</span>
}

export const EarningsTab: React.FC<EarningsTabProps> = ({ timesheets, loading }) => {
  const [view, setView] = useState<EarningsView>(getSavedEarningsView)
  const [period, setPeriod] = useState<EarningsPeriod>(getSavedEarningsPeriod)
  const [invoices, setInvoices] = useState<Invoice[]>(getInvoices())
  const [showCreate, setShowCreate] = useState(false)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)
  const [sendNotice, setSendNotice] = useState('')
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null)
  const [invoiceSentTo, setInvoiceSentTo] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [privateClients, setPrivateClients] = useState<any[]>([])
  const [invClientId, setInvClientId] = useState('')
  const [invClient, setInvClient] = useState('')
  const [invClientEmail, setInvClientEmail] = useState('')
  const [invItems, setInvItems] = useState<InvoiceItem[]>([{ description: 'Care services', hours: 0, rate: 25, amount: 0 }])
  const [invNotes, setInvNotes] = useState('')
  const [invDueDays, setInvDueDays] = useState('14')
  const [usedEntryIds, setUsedEntryIds] = useState<string[]>([])
  const [usedCloudIds, setUsedCloudIds] = useState<string[]>([])
  const [autoFilledNote, setAutoFilledNote] = useState('')
  const [draftSavedToast, setDraftSavedToast] = useState('')

  const openInvoicePreview = (invoice: Invoice) => {
    try {
      setPreviewInvoice(invoice)
      setSendNotice('')
    } catch {
      setSendNotice('Invoice preview could not be opened. Please try editing and saving the invoice.')
    }
  }

  const navigateToView = (nextView: EarningsView) => {
    setView(nextView)
    try { localStorage.setItem(EARNINGS_VIEW_KEY, nextView) } catch {}
  }

  const navigateToPeriod = (nextPeriod: EarningsPeriod) => {
    setPeriod(nextPeriod)
    try { localStorage.setItem(EARNINGS_PERIOD_KEY, nextPeriod) } catch {}
  }

  useEffect(() => {
    const loadCloud = async () => {
      const token = localStorage.getItem('cgp_token')
      if (!token) return
      const [cloudInvoices, clients] = await Promise.all([
        cloudGetInvoices(),
        cloudGetPrivateClients(),
      ])
      if (clients.length > 0) setPrivateClients(clients)
      if (cloudInvoices.length > 0) {
        const localOnly = getInvoices().filter(i => !i.id.startsWith('cloud_'))
        setInvoices([
          ...cloudInvoices.map((ci: any) => ({
            ...ci,
            timeEntryIds: getInvoiceEntryIds(ci.id).length ? getInvoiceEntryIds(ci.id) : (ci.timeEntryIds || []),
          })),
          ...localOnly,
        ])
      }
    }
    loadCloud()
  }, [])

  // Auto-reconcile old paid invoices that have no stored timeEntryIds
  // (one-time migration for invoices created before the isInvoiced fix)
  useEffect(() => {
    const oldPaidInvs = invoices.filter((i: any) =>
      i.status === 'paid' &&
      !(i.timeEntryIds?.length) &&
      !(i.cloudTimeEntryIds?.length)
    )
    if (oldPaidInvs.length === 0) return
    const unclaimedEntries = getTimeEntries().filter((e: any) => e.status === 'completed' && !e.isInvoiced)
    if (unclaimedEntries.length === 0) return
    const totalUnclaimed = unclaimedEntries.reduce((s: number, e: any) =>
      s + (e.totalPay || ((e.duration || 0) / 60) * (e.hourlyRate || 0)), 0)
    oldPaidInvs.forEach((inv: any) => {
      const invTotal = inv.total || 0
      if (invTotal <= 0) return
      const tolerance = Math.max(invTotal * 0.05, 2)
      if (Math.abs(totalUnclaimed - invTotal) <= tolerance) {
        const ids = unclaimedEntries.map((e: any) => String(e.id))
        setInvoiceEntryIds(inv.id, ids)
        ids.forEach((id: string) => updateTimeEntry(id, { isInvoiced: true }))
      }
    })
    // Notify HomeTab to re-read entries from localStorage
    window.dispatchEvent(new CustomEvent('carehia:entries-updated'))
  }, [invoices])

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const monthAgo = new Date(now.getTime() - 30 * 86400000)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const allEntries = getTimeEntries().filter(e => e.status === 'completed')
  const localEntries = allEntries.filter(e => period === 'all' || new Date(e.date) >= (period === 'week' ? weekAgo : monthAgo))
  const relevantTimesheets = timesheets.filter(t => period === 'all' || new Date(t.date) >= (period === 'week' ? weekAgo : monthAgo))
  // Collect all entry IDs claimed by active invoices (draft/sent/overdue/paid)
  const claimedEntryIds = useMemo(() => {
    const ids = new Set<string>()
    invoices.forEach(inv => {
      if (inv.status === 'draft' || inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'paid') {
        (inv.timeEntryIds || []).forEach(id => ids.add(id))
        ;(inv.cloudTimeEntryIds || []).forEach(id => ids.add(id))
      }
    })
    return ids
  }, [invoices])

  const uninvoicedEntries = allEntries.filter(e =>
    !e.isInvoiced &&
    !claimedEntryIds.has(e.id) &&
    !(e.cloudId && claimedEntryIds.has(e.cloudId))
  )

  const invoiceTotal = invItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  const paidInvoices = invoices.filter(i => i.status === 'paid')
  const sentInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')
  const draftInvoices = invoices.filter(i => i.status === 'draft')
  const invoiceCaregiverInfo = useMemo(() => getInvoiceCaregiverInfo(), [previewInvoice])

  const localEarnings = localEntries.reduce((sum, entry) => sum + entryAmount(entry), 0)
  const localHours = localEntries.reduce((sum, entry) => sum + entryHours(entry), 0)
  const apiEarnings = relevantTimesheets.reduce((sum, t) => sum + (t.totalPay || 0), 0)
  const apiHours = relevantTimesheets.reduce((sum, t) => sum + (t.hoursWorked || 0), 0)
  const totalEarnings = localEarnings + apiEarnings
  const totalHours = localHours + apiHours
  const readyToInvoiceAmount = uninvoicedEntries.reduce((sum, entry) => sum + entryAmount(entry), 0)
  const readyToInvoiceHours = uninvoicedEntries.reduce((sum, entry) => sum + entryHours(entry), 0)
  const pendingAmount = sentInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + inv.total, 0) +
    relevantTimesheets.filter(t => t.status === 'paid').reduce((sum, t) => sum + (t.totalPay || 0), 0)

  const clientSummaries = useMemo(() => {
    const groups: Record<string, { hours: number; amount: number; entries: TimeEntry[] }> = {}
    uninvoicedEntries.forEach(entry => {
      const name = entry.clientName || 'Private client'
      if (!groups[name]) groups[name] = { hours: 0, amount: 0, entries: [] }
      groups[name].hours += entryHours(entry)
      groups[name].amount += entryAmount(entry)
      groups[name].entries.push(entry)
    })
    return Object.entries(groups)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
  }, [uninvoicedEntries.length, readyToInvoiceAmount])

  const dailyEarnings = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dateStr = date.toISOString().split('T')[0]
      const dayEntries = allEntries.filter(e => e.date === dateStr)
      const daySheets = timesheets.filter(t => t.date?.startsWith(dateStr))
      const amount = dayEntries.reduce((sum, e) => sum + entryAmount(e), 0) +
        daySheets.reduce((sum, t) => sum + (t.totalPay || 0), 0)
      return {
        amount,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      }
    })
  }, [allEntries.length, timesheets.length])

  const maxDaily = Math.max(...dailyEarnings.map(d => d.amount), 1)

  const yearStartMs = yearStart.getTime()
  const invoiceYtdDate = (invoice: Invoice, paidOnly = false) => dateValue(
    paidOnly
      ? invoice.paidAt || invoice.lastSentAt || invoice.sentAt || invoice.issueDate || invoice.createdAt || invoice.dueDate
      : invoice.lastSentAt || invoice.sentAt || invoice.issueDate || invoice.createdAt || invoice.dueDate
  )
  const ytdPaidInvoices = paidInvoices.filter(inv => invoiceYtdDate(inv, true) >= yearStartMs)
  const ytdPendingInvoices = sentInvoices.filter(inv => invoiceYtdDate(inv) >= yearStartMs)
  const ytdDraftInvoices = draftInvoices.filter(inv => invoiceYtdDate(inv) >= yearStartMs)
  const ytdUnbilledEntries = allEntries.filter(e => !e.isInvoiced && dateValue(e.date) >= yearStartMs)
  const ytdPaidInvoiceIncome = ytdPaidInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const ytdPendingInvoiceIncome = ytdPendingInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const ytdDraftInvoiceIncome = ytdDraftInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const ytdUnbilledIncome = ytdUnbilledEntries.reduce((sum, e) => sum + entryAmount(e), 0)
  const ytdPaidPlatformIncome = timesheets
    .filter(t => t.status === 'paid' && dateValue(t.date) >= yearStartMs)
    .reduce((sum, t) => sum + (t.totalPay || 0), 0)
  const ytdCollectedIncome = ytdPaidInvoiceIncome + ytdPaidPlatformIncome
  const ytdMiles = getMileageEntries().filter(m => new Date(m.date) >= yearStart).reduce((sum, m) => sum + m.miles, 0)
  const mileageDeduction = ytdMiles * 0.67
  const estSelfEmploymentTax = ytdCollectedIncome * 0.153
  const estIncomeTax = Math.max(0, ytdCollectedIncome - mileageDeduction) * 0.22

  const resetInvoiceForm = () => {
    setEditingInvoiceId(null)
    setInvClientId('')
    setInvClient('')
    setInvClientEmail('')
    setInvItems([{ description: 'Care services', hours: 0, rate: 25, amount: 0 }])
    setInvNotes('')
    setInvDueDays('14')
    setUsedEntryIds([])
    setUsedCloudIds([])
    setAutoFilledNote('')
    setSendNotice('')
  }

  const openCreate = () => {
    navigateToView('invoices')
    setEditingInvoiceId(null)
    setSendNotice('')
    setShowCreate(true)
  }

  const syncInvoiceInView = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv))
  }

  const getInvoicePayload = (status: Invoice['status'] = 'draft') => {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (parseInt(invDueDays, 10) || 14))
    return {
      clientName: invClient.trim(),
      clientEmail: invClientEmail || undefined,
      items: invItems.filter(item => item.amount > 0),
      subtotal: invoiceTotal,
      total: invoiceTotal,
      status,
      dueDate: dueDate.toISOString().split('T')[0],
      notes: invNotes || undefined,
      timeEntryIds: usedEntryIds.length > 0 ? usedEntryIds : undefined,
      cloudTimeEntryIds: usedCloudIds.length > 0 ? usedCloudIds : undefined,
      source: (usedEntryIds.length > 0 || usedCloudIds.length > 0) ? 'time_entries' as const : 'manual' as const,
    }
  }

  const openEditInvoice = (invoice: Invoice) => {
    navigateToView('invoices')
    setShowCreate(true)
    setEditingInvoiceId(invoice.id)
    setInvClient(invoice.clientName)
    setInvClientEmail(invoice.clientEmail || '')
    setInvItems((invoice.items || []).length ? invoice.items : [{ description: 'Care services', hours: 0, rate: 25, amount: 0 }])
    setInvNotes(invoice.notes || '')
    const daysUntilDue = Math.max(0, Math.ceil((new Date(invoice.dueDate + 'T00:00:00').getTime() - Date.now()) / 86400000))
    setInvDueDays(String(daysUntilDue || 14))
    const matchedIdx = privateClients.findIndex(client => client.name === invoice.clientName)
    setInvClientId(matchedIdx >= 0 ? String(matchedIdx) : '__new__')
    setUsedEntryIds(invoice.timeEntryIds || [])
    setUsedCloudIds(invoice.cloudTimeEntryIds || [])
    setAutoFilledNote('Editing saved invoice details.')
    setSendNotice('')
  }

  const updateItem = (idx: number, field: string, val: any) => {
    setInvItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const next = { ...item, [field]: val }
      next.amount = Math.round((next.hours || 0) * (next.rate || 0) * 100) / 100
      return next
    }))
  }

  const addItem = () => setInvItems(prev => [...prev, { description: '', hours: 0, rate: 25, amount: 0 }])
  const removeItem = (idx: number) => setInvItems(prev => prev.filter((_, i) => i !== idx))

  const fillFromEntries = (entries: TimeEntry[], clientName?: string) => {
    if (!entries.length) return false
    const groups: Record<string, { hours: number; rate: number; ids: string[]; cloudIds: string[] }> = {}
    entries.forEach(entry => {
      const key = entry.date
      if (!groups[key]) groups[key] = { hours: 0, rate: entry.hourlyRate || 25, ids: [], cloudIds: [] }
      groups[key].hours += entryHours(entry)
      groups[key].ids.push(entry.id)
      if (entry.cloudId) groups[key].cloudIds.push(entry.cloudId)
    })
    const items = Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        description: `Care services - ${dateLabel(date)}`,
        hours: Math.round(data.hours * 100) / 100,
        rate: data.rate,
        amount: Math.round(data.hours * data.rate * 100) / 100,
      }))
    setInvItems(items)
    setUsedEntryIds(Object.values(groups).flatMap(g => g.ids))
    setUsedCloudIds(Object.values(groups).flatMap(g => g.cloudIds))
    const hours = entries.reduce((sum, entry) => sum + entryHours(entry), 0)
    setAutoFilledNote(`Pre-filled ${entries.length} unbilled session${entries.length === 1 ? '' : 's'} totaling ${hours.toFixed(1)} hours.`)
    setInvNotes(`Care services for ${clientName || entries[0].clientName || 'private client'}`)
    return true
  }

  const handleClientSelect = (id: string) => {
    setInvClientId(id)
    setAutoFilledNote('')
    if (!id) {
      resetInvoiceForm()
      return
    }
    if (id === '__new__') {
      setInvClient('')
      setInvClientEmail('')
      setInvItems([{ description: 'Care services', hours: 0, rate: 25, amount: 0 }])
      setUsedEntryIds([])
      setUsedCloudIds([])
      return
    }
    const client = privateClients[Number(id)]
    if (!client) return
    setInvClient(client.name)
    setInvClientEmail(client.email || '')
    const entries = uninvoicedEntries.filter(entry => entry.clientName === client.name)
    if (!fillFromEntries(entries, client.name)) {
      setInvItems([{ description: 'Care services', hours: 0, rate: client.hourlyRate || 25, amount: 0 }])
      setUsedEntryIds([])
      setUsedCloudIds([])
      setAutoFilledNote('No unbilled sessions found for this client. Add hours manually.')
    }
  }

  const generateFromReadyHours = () => {
    if (!uninvoicedEntries.length) {
      openCreate()
      return
    }
    const firstClient = uninvoicedEntries[0].clientName || ''
    const entries = firstClient
      ? uninvoicedEntries.filter(entry => entry.clientName === firstClient)
      : uninvoicedEntries
    const matchedIdx = privateClients.findIndex(client => client.name === firstClient)
    setInvClientId(matchedIdx >= 0 ? String(matchedIdx) : '__new__')
    setInvClient(firstClient)
    setInvClientEmail(matchedIdx >= 0 ? privateClients[matchedIdx].email || '' : '')
    fillFromEntries(entries, firstClient)
    openCreate()
  }

  const handleCreateInvoice = async () => {
    if (!invClient.trim() || invoiceTotal <= 0) return
    const existingInvoice = editingInvoiceId ? invoices.find(inv => inv.id === editingInvoiceId) : null
    const payload = getInvoicePayload(existingInvoice?.status || 'draft')
    if (editingInvoiceId) {
      updateInvoice(editingInvoiceId, payload)
      if (editingInvoiceId.startsWith('cloud_')) cloudUpdateInvoice(editingInvoiceId.replace('cloud_', ''), payload)
      syncInvoiceInView(editingInvoiceId, payload)
      setShowCreate(false)
      resetInvoiceForm()
      return
    }
    const capturedEntryIds = [...(payload.timeEntryIds || [])]
    const inv = addInvoice({
      invoiceNumber: getNextInvoiceNumber(),
      ...payload,
      issueDate: new Date().toISOString().split('T')[0],
    })
    const cloudId = await cloudAddInvoice(inv)
    if (usedCloudIds.length > 0) cloudMarkEntriesInvoiced(usedCloudIds)
    const finalInvId = cloudId ? `cloud_${cloudId}` : inv.id
    if (cloudId) {
      deleteInvoice(inv.id)
      setInvoices(prev => [{ ...inv, id: `cloud_${cloudId}`, cloudId }, ...prev.filter(existing => existing.id !== inv.id)])
    } else {
      setInvoices(getInvoices())
    }
    // Mark linked entries as invoiced in localStorage so they persist across refreshes
    if (capturedEntryIds.length > 0) {
      setInvoiceEntryIds(finalInvId, capturedEntryIds)
      capturedEntryIds.forEach(eid => updateTimeEntry(eid, { isInvoiced: true }))
    }
    const wasNewInvoice = !editingInvoiceId
    const hadLinkedEntries = usedEntryIds.length > 0 || usedCloudIds.length > 0
    setShowCreate(false)
    resetInvoiceForm()
    if (wasNewInvoice && hadLinkedEntries) {
      setDraftSavedToast('Draft invoice saved. The selected hours have been moved out of Ready to Invoice.')
      setTimeout(() => setDraftSavedToast(''), 5000)
    }
  }

  const changeInvoiceStatus = (id: string, status: Invoice['status']) => {
    const updates: Partial<Invoice> = status === 'paid'
      ? { status, paidAt: new Date().toISOString() }
      : { status }
    updateInvoice(id, updates)
    if (id.startsWith('cloud_')) cloudUpdateInvoice(id.replace('cloud_', ''), updates)
    syncInvoiceInView(id, updates)
    // P31-3: sync preview if currently open
    if (previewInvoice?.id === id) setPreviewInvoice(prev => prev ? { ...prev, ...updates } : null)
  }

  const handleSendInvoice = async (invoice: Invoice) => {
  if (!invoice.clientEmail) {
    setSendNotice('Add a client email before sending this invoice.')
    openEditInvoice(invoice)
    return
  }
  setSendingInvoiceId(invoice.id)
  setSendNotice('Sending invoice email...')
  try {
    // Ensure invoice is cloud-synced before sending
    let sendableInvoice = { ...invoice }
    if (!sendableInvoice.cloudId && !String(sendableInvoice.id).startsWith('cloud_')) {
      const newCloudId = await cloudAddInvoice(sendableInvoice)
      if (newCloudId) {
        sendableInvoice = { ...sendableInvoice, cloudId: newCloudId, id: `cloud_${newCloudId}` }
        syncInvoiceInView(invoice.id, { cloudId: newCloudId, id: `cloud_${newCloudId}` })
      }
    }
    const caregiver = getInvoiceCaregiverInfo()
    const result = await cloudSendInvoice(sendableInvoice, caregiver)
    const sentUpdates: Partial<Invoice> = {
      status: 'sent',
      sentAt: result.invoice?.sentAt || invoice.sentAt || new Date().toISOString(),
      lastSentAt: result.invoice?.lastSentAt || new Date().toISOString(),
      sendCount: result.invoice?.sendCount || (invoice.sendCount || 0) + 1,
      emailId: result.emailId || result.invoice?.emailId,
    }
    updateInvoice(invoice.id, sentUpdates)
    if (result.invoice?.id && result.invoice.id !== invoice.id) {
      setInvoices(prev => prev.map(inv => inv.id === invoice.id ? result.invoice : inv))
      if (previewInvoice?.id === invoice.id) setPreviewInvoice(result.invoice)
    } else {
      syncInvoiceInView(invoice.id, sentUpdates)
      if (previewInvoice?.id === invoice.id) setPreviewInvoice({ ...previewInvoice, ...sentUpdates })
    }
    setSendNotice('')
    setPreviewInvoice(null)
    setInvoiceSentTo(invoice.clientEmail) // ← triggers success dialog
  } catch (error) {
    setSendNotice(error instanceof Error ? error.message : 'Invoice email could not be sent.')
  } finally {
    setSendingInvoiceId(null)
  }
}

  // P31-1: show confirmation dialog instead of immediate delete
  const handleDeleteInvoice = (id: string) => {
    setDeleteConfirmId(id)
  }

  // P31-2: called only after user confirms
  const confirmDeleteInvoice = () => {
    const id = deleteConfirmId
    if (!id) return
    const inv = invoices.find(i => i.id === id)
    // Unmark entries when deleting a draft so hours return to Ready to Invoice
    if (inv && inv.status === 'draft') {
      const entryIds = (inv.timeEntryIds && inv.timeEntryIds.length > 0)
        ? inv.timeEntryIds
        : getInvoiceEntryIds(id)
      entryIds.forEach(eid => updateTimeEntry(eid, { isInvoiced: false }))
    }
    clearInvoiceEntryIds(id)
    deleteInvoice(id)
    if (id.startsWith('cloud_')) cloudDeleteInvoice(id.replace('cloud_', ''))
    setInvoices(prev => prev.filter(i => i.id !== id))
    if (previewInvoice?.id === id) setPreviewInvoice(null)
    setDeleteConfirmId(null)
  }

  const handlePrintInvoice = (invoice: Invoice) => {
    const caregiver = getInvoiceCaregiverInfo()
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', `Print ${invoice.invoiceNumber}`)
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '1px'
    iframe.style.height = '1px'
    iframe.style.opacity = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const cleanup = () => {
      window.setTimeout(() => {
        try { document.body.removeChild(iframe) } catch {}
      }, 1000)
    }

    const printFrame = () => {
      const frameWindow = iframe.contentWindow
      if (!frameWindow) return cleanup()
      frameWindow.focus()
      frameWindow.print()
      frameWindow.addEventListener('afterprint', cleanup, { once: true })
      window.setTimeout(cleanup, 30000)
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return cleanup()
    doc.open()
    try {
      doc.write(invoicePrintHtml(invoice, caregiver))
    } catch (err) {
      doc.write('<html><body><p style="font-family:sans-serif;padding:40px">Invoice print preview could not be generated. Please edit and save the invoice, then try again.</p></body></html>')
    }
    doc.close()
    window.setTimeout(printFrame, 150)
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="skeleton-shimmer h-40 rounded-2xl" />
        <div className="skeleton-shimmer h-56 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary/70">Money</p>
        <h1 className="text-2xl font-bold text-base-content">Get paid clearly</h1>
        <p className="mt-1 text-sm text-base-content/55">Track hours, invoice private clients, and follow up on payments.</p>
      </div>

      <div className="px-4 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'workspace' as const, label: 'Workspace' },
          { key: 'invoices' as const, label: `Invoices (${invoices.length})` },
          { key: 'tax' as const, label: 'Tax' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`btn btn-sm rounded-full whitespace-nowrap ${view === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => navigateToView(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {draftSavedToast && (
        <div className="mx-4 mb-2 rounded-xl bg-success/15 px-4 py-3 text-sm text-success flex items-center gap-2">
          <CheckCircle2 size={16} />
          {draftSavedToast}
        </div>
      )}

      {view === 'workspace' && (
        <div className="px-4 space-y-4">
          <div className="rounded-[1.25rem] bg-gradient-to-br from-primary to-[#2563eb] p-5 text-primary-content shadow-lg shadow-primary/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-content/70">Ready to invoice</p>
                <p className="mt-1 text-4xl font-bold">{money(readyToInvoiceAmount)}</p>
                <p className="mt-1 text-sm text-primary-content/75">{readyToInvoiceHours.toFixed(1)} unbilled hours</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <FileText size={24} />
              </div>
            </div>
            <button onClick={generateFromReadyHours} className="btn mt-5 w-full rounded-2xl border-0 bg-white text-primary hover:bg-white/90">
              {readyToInvoiceAmount > 0 ? 'Create invoice from hours' : 'Create invoice'}
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MetricCard label="Pending" value={money(pendingAmount)} icon={Clock} tone="warning" />
            <MetricCard label="Paid" value={money(paidAmount)} icon={CheckCircle2} tone="success" />
            <MetricCard label="This period" value={money(totalEarnings)} sub={`${totalHours.toFixed(1)} hrs`} icon={DollarSign} tone="info" />
          </div>

          <div className="rounded-2xl bg-base-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <SectionLabel>Invoice Pipeline</SectionLabel>
              <button onClick={() => navigateToView('invoices')} className="btn btn-outline btn-xs border-primary/55 text-primary bg-primary/6">View all</button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-base-100 p-3">
                <p className="text-lg font-bold text-base-content">{draftInvoices.length}</p>
                <p className="text-[10px] uppercase tracking-wide text-base-content/50">Drafts</p>
              </div>
              <div className="rounded-xl bg-base-100 p-3">
                <p className="text-lg font-bold text-base-content">{sentInvoices.length}</p>
                <p className="text-[10px] uppercase tracking-wide text-base-content/50">Awaiting</p>
              </div>
              <div className="rounded-xl bg-base-100 p-3">
                <p className="text-lg font-bold text-base-content">{paidInvoices.length}</p>
                <p className="text-[10px] uppercase tracking-wide text-base-content/50">Paid</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-base-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <SectionLabel>Uninvoiced Clients</SectionLabel>
              <span className="text-xs text-base-content/45">{clientSummaries.length} client{clientSummaries.length === 1 ? '' : 's'}</span>
            </div>
            {clientSummaries.length === 0 ? (
              <div className="rounded-xl bg-base-100 p-4 text-center">
                <CheckCircle2 size={28} className="mx-auto mb-2 text-success" />
                <p className="text-sm font-semibold text-base-content">No hours waiting on an invoice</p>
                <p className="mt-1 text-xs text-base-content/55">Track private client time, then return here to bill it.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clientSummaries.slice(0, 3).map(client => (
                  <button
                    key={client.name}
                    onClick={() => {
                      const matchedIdx = privateClients.findIndex(item => item.name === client.name)
                      setInvClientId(matchedIdx >= 0 ? String(matchedIdx) : '__new__')
                      setInvClient(client.name)
                      setInvClientEmail(matchedIdx >= 0 ? privateClients[matchedIdx].email || '' : '')
                      fillFromEntries(client.entries, client.name)
                      openCreate()
                    }}
                    className="w-full rounded-xl bg-base-100 p-3 text-left transition active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-base-content">{client.name}</p>
                        <p className="text-xs text-base-content/55">{client.hours.toFixed(1)} hrs ready</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-base-content">{money(client.amount)}</p>
                        <p className="text-[10px] text-primary">Invoice</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-base-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <SectionLabel>Last 7 Days</SectionLabel>
              <div className="flex gap-1">
                {(['week', 'month', 'all'] as const).map(key => (
                  <button
                    key={key}
                    onClick={() => navigateToPeriod(key)}
                    className={`btn btn-xs rounded-full ${period === key ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {key === 'week' ? 'Week' : key === 'month' ? 'Month' : 'All'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex h-28 items-end gap-2">
              {dailyEarnings.map((day, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-full bg-primary/50"
                    style={{ height: `${Math.max(4, (day.amount / maxDaily) * 76)}px` }}
                  />
                  <span className="text-[10px] text-base-content/55">{day.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'invoices' && (
        <div className="px-4 space-y-4">
          <button onClick={openCreate} className="btn btn-primary w-full gap-2 rounded-2xl">
            <Plus size={18} /> New Invoice
          </button>

          {showCreate && (
            <div className="rounded-2xl border border-primary/20 bg-base-200 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <SectionLabel>Invoice Builder</SectionLabel>
                  <p className="text-lg font-bold text-base-content">{editingInvoiceId ? 'Edit invoice' : 'Draft invoice'}</p>
                </div>
                <button
                  onClick={() => { setShowCreate(false); resetInvoiceForm() }}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {sendNotice && (
                  <div className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">{sendNotice}</div>
                )}
                {privateClients.length > 0 ? (
                  <select className="select select-bordered w-full" value={invClientId} onChange={e => handleClientSelect(e.target.value)}>
                    <option value="">Select client</option>
                    {privateClients.map((client, i) => {
                      const hours = uninvoicedEntries
                        .filter(entry => entry.clientName === client.name)
                        .reduce((sum, entry) => sum + entryHours(entry), 0)
                      return (
                        <option key={i} value={String(i)}>
                          {client.name}{hours > 0 ? ` - ${hours.toFixed(1)}h ready` : ''}
                        </option>
                      )
                    })}
                    <option value="__new__">New client</option>
                  </select>
                ) : null}

                {(!privateClients.length || invClientId === '__new__' || editingInvoiceId) && (
                  <div className="grid gap-2">
                    <input className="input input-bordered w-full" placeholder="Client name" value={invClient} onChange={e => setInvClient(e.target.value)} />
                    <input className="input input-bordered w-full" placeholder="Client email for sending" value={invClientEmail} onChange={e => setInvClientEmail(e.target.value)} />
                  </div>
                )}

                {autoFilledNote && (
                  <div className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">{autoFilledNote}</div>
                )}

                <div className="space-y-2">
                  {invItems.map((item, idx) => (
                    <div key={idx} className="rounded-xl bg-base-100 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          className="input input-bordered input-sm flex-1"
                          placeholder="Description"
                          value={item.description}
                          onChange={e => updateItem(idx, 'description', e.target.value)}
                        />
                        {invItems.length > 1 && (
                          <button onClick={() => removeItem(idx)} className="btn btn-ghost btn-sm btn-circle">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="text-[10px] text-base-content/55">
                          Hours
                          <input className="input input-bordered input-sm mt-1 w-full" type="number" step="0.25" value={item.hours || ''} onChange={e => updateItem(idx, 'hours', parseFloat(e.target.value) || 0)} />
                        </label>
                        <label className="text-[10px] text-base-content/55">
                          Rate
                          <input className="input input-bordered input-sm mt-1 w-full" type="number" value={item.rate || ''} onChange={e => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)} />
                        </label>
                        <div>
                          <p className="text-[10px] text-base-content/55">Amount</p>
                          <p className="pt-3 text-sm font-bold text-base-content">${(item.amount || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addItem} className="btn btn-ghost btn-sm gap-1">
                    <Plus size={14} /> Add item
                  </button>
                </div>

                <div className="rounded-xl bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-base-content">Invoice total</span>
                    <span className="text-2xl font-bold text-primary">${invoiceTotal.toFixed(2)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-base-content/55">
                      Due in days
                      <input className="input input-bordered input-sm mt-1 w-full" type="number" value={invDueDays} onChange={e => setInvDueDays(e.target.value)} />
                    </label>
                    <div className="rounded-xl bg-base-200 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-base-content/45">Status</p>
                      <p className="text-sm font-bold text-base-content">Draft</p>
                    </div>
                  </div>
                  <textarea className="textarea textarea-bordered mt-3 w-full text-sm" rows={2} placeholder="Notes optional" value={invNotes} onChange={e => setInvNotes(e.target.value)} />
                </div>

                <button
                  onClick={handleCreateInvoice}
                  disabled={!invClient.trim() || invoiceTotal <= 0}
                  className="btn btn-primary w-full rounded-2xl gap-2"
                >
                  <FileText size={16} /> {editingInvoiceId ? 'Save invoice changes' : 'Save draft invoice'}
                </button>
              </div>
            </div>
          )}

          {invoices.length === 0 && !showCreate ? (
            <div className="rounded-2xl bg-base-200 p-8 text-center">
              <FileText size={38} className="mx-auto mb-3 text-base-content/25" />
              <p className="font-semibold text-base-content">No invoices yet</p>
              <p className="mt-1 text-sm text-base-content/55">Create your first invoice from tracked hours or a private client.</p>
              <button onClick={openCreate} className="btn btn-primary btn-sm mt-4 gap-1 rounded-2xl">
                <Plus size={14} /> Create Invoice
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="rounded-2xl bg-base-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-semibold text-base-content">{inv.clientName}</p>
                        <InvoiceStatusBadge status={inv.status} />
                      </div>
                      <p className="text-xs text-base-content/55">{inv.invoiceNumber} - Due {dateLabel(inv.dueDate)}</p>
                      <p className="mt-1 text-xs text-base-content/55">{(inv.items || []).length} item{(inv.items || []).length === 1 ? '' : 's'} - {(inv.items || []).reduce((sum, item) => sum + (item.hours || 0), 0).toFixed(1)} hrs</p>
                    </div>
                    <p className="text-xl font-bold text-base-content">${Number(inv.total || 0).toFixed(2)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => openInvoicePreview(inv)} className="btn btn-outline btn-xs gap-1 border-primary/55 text-primary bg-primary/6">
                      <FileText size={12} /> Preview
                    </button>
                    <button onClick={() => handlePrintInvoice(inv)} className="btn btn-outline btn-xs gap-1 border-primary/55 text-primary bg-primary/6">
                      <Printer size={12} /> Print
                    </button>
                    <button onClick={() => openEditInvoice(inv)} className="btn btn-outline btn-xs gap-1 border-primary/55 text-primary bg-primary/6">
                      <Edit3 size={12} /> Edit
                    </button>
                    {inv.status === 'draft' && (
                      <button onClick={() => handleSendInvoice(inv)} disabled={sendingInvoiceId === inv.id} className="btn btn-info btn-xs gap-1">
                        <Send size={12} /> {sendingInvoiceId === inv.id ? 'Sending' : 'Send'}
                      </button>
                    )}
                    {inv.status === 'sent' || inv.status === 'overdue' ? (
                      <button onClick={() => handleSendInvoice(inv)} disabled={sendingInvoiceId === inv.id} className="btn btn-info btn-xs gap-1">
                        <Mail size={12} /> {sendingInvoiceId === inv.id ? 'Sending' : 'Resend'}
                      </button>
                    ) : null}
                    {inv.status !== 'paid' && (
                      <button onClick={() => changeInvoiceStatus(inv.id, 'paid')} className="btn btn-success btn-xs gap-1">
                        <CreditCard size={12} /> Paid
                      </button>
                    )}
                    <button onClick={() => handleDeleteInvoice(inv.id)} className="btn btn-outline btn-xs ml-auto border-error/30 text-error">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {previewInvoice && (
        <div className="fixed inset-0 z-[120] flex items-end bg-black/50 backdrop-blur-sm" onClick={() => { setPreviewInvoice(null); setSendNotice('') }}>
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-base-100 p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mx-auto max-w-lg">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary/70">Invoice Preview</p>
                  <h3 className="text-lg font-bold text-base-content">{previewInvoice.invoiceNumber}</h3>
                </div>
                <button onClick={() => { setPreviewInvoice(null); setSendNotice('') }} className="btn btn-ghost btn-sm btn-circle">
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-sm">
                <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-2xl font-black text-primary">Carehia</p>
                    <p className="text-xs text-slate-500">Professional caregiver invoice</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Invoice</p>
                    <p className="font-bold">{previewInvoice.invoiceNumber}</p>
                    <InvoiceStatusBadge status={previewInvoice.status} />
                  </div>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">From</p>
                    <p className="mt-1 font-bold">{invoiceCaregiverInfo.name}</p>
                    {invoiceCaregiverInfo.email && <p className="text-slate-500">{invoiceCaregiverInfo.email}</p>}
                    {invoiceCaregiverInfo.phone && <p className="text-slate-500">{invoiceCaregiverInfo.phone}</p>}
                    {invoiceCaregiverInfo.location && <p className="text-slate-500">{invoiceCaregiverInfo.location}</p>}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Bill To</p>
                    <p className="mt-1 font-bold">{previewInvoice.clientName}</p>
                    {previewInvoice.clientEmail && <p className="text-slate-500">{previewInvoice.clientEmail}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Dates</p>
                    <p className="mt-1">Issued {fullDateLabel(previewInvoice.issueDate)}</p>
                    <p>Due {fullDateLabel(previewInvoice.dueDate)}</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <div className="grid grid-cols-[1fr_52px_64px_72px] bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <span>Service</span>
                    <span className="text-right">Hrs</span>
                    <span className="text-right">Rate</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {(previewInvoice.items || []).length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-slate-500">
                      No invoice items yet. Edit this invoice to add care services or tracked hours.
                    </div>
                  ) : (previewInvoice.items || []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_52px_64px_72px] border-t border-slate-100 px-3 py-3 text-sm">
                      <span className="font-medium">{item.description || 'Care services'}</span>
                      <span className="text-right">{Number(item.hours || 0).toFixed(1)}</span>
                      <span className="text-right">${Number(item.rate || 0).toFixed(2)}</span>
                      <span className="text-right font-semibold">${Number(item.amount || (item.hours || 0) * (item.rate || 0) || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {previewInvoice.notes && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Notes</p>
                    {previewInvoice.notes}
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <div className="w-48 rounded-xl bg-primary/10 p-4 text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary/70">Total Due</p>
                    <p className="text-3xl font-black text-primary">${Number(previewInvoice.total || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {sendNotice && sendingInvoiceId === null && (
                <div className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">{sendNotice}</div>
              )}
              {sendingInvoiceId === previewInvoice.id && (
                <div className="mt-3 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">Sending invoice email&hellip;</div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => { openEditInvoice(previewInvoice); setPreviewInvoice(null) }} className="btn btn-outline btn-sm flex-1 gap-1 rounded-xl">
                  <Edit3 size={14} /> Edit
                </button>
                <button onClick={() => handlePrintInvoice(previewInvoice)} className="btn btn-outline btn-sm flex-1 gap-1 rounded-xl">
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => handleSendInvoice(previewInvoice)} disabled={sendingInvoiceId === previewInvoice.id} className="btn btn-primary btn-sm flex-1 gap-1 rounded-xl">
                  <Send size={14} /> {sendingInvoiceId === previewInvoice.id ? 'Sending…' : previewInvoice.status === 'draft' ? 'Send' : 'Resend'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {invoiceSentTo && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6" onClick={() => setInvoiceSentTo(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-base-100 p-6 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <h3 className="text-xl font-bold text-base-content">Invoice Sent!</h3>
            <p className="mt-2 text-sm text-base-content/60">Your invoice was emailed to</p>
            <p className="mt-1 font-semibold text-base-content">{invoiceSentTo}</p>
            <button
              onClick={() => setInvoiceSentTo(null)}
              className="btn btn-primary mt-6 w-full rounded-2xl"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* P31-1: Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6" onClick={() => setDeleteConfirmId(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-base-100 p-6 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
              <Trash2 size={28} className="text-error" />
            </div>
            <h3 className="text-xl font-bold text-base-content">Delete this invoice?</h3>
            <p className="mt-2 text-sm text-base-content/60">This removes the invoice from your Money view. This cannot be undone.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-outline flex-1 rounded-2xl">Cancel</button>
              <button onClick={confirmDeleteInvoice} className="btn btn-error flex-1 rounded-2xl">Delete</button>
            </div>
          </div>
        </div>
      )}

      {view === 'tax' && (
        <div className="px-4 space-y-4">
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Calculator size={20} className="text-primary" />
              <h3 className="font-bold text-base-content">{now.getFullYear()} Tax Summary</h3>
            </div>
            <p className="mb-4 text-xs text-base-content/60">Estimated figures only. A tax professional should confirm final numbers.</p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/65">Collected income</span>
                <strong>{money(ytdCollectedIncome)}</strong>
              </div>
              <div className="rounded-xl bg-base-100/70 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-base-content/55">Paid private invoices</span>
                  <strong>{money(ytdPaidInvoiceIncome)}</strong>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-base-content/55">Paid platform shifts</span>
                  <strong>{money(ytdPaidPlatformIncome)}</strong>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-base-content/65">Pending invoices not counted</span>
                <strong className="text-warning">{money(ytdPendingInvoiceIncome)}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-base-content/65">Draft invoices excluded</span>
                <strong className="text-base-content/60">{money(ytdDraftInvoiceIncome)}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-base-content/65">Unbilled tracked work</span>
                <strong className="text-base-content/60">{money(ytdUnbilledIncome)}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-base-content/65">Mileage deduction ({ytdMiles.toFixed(0)} mi)</span>
                <strong className="text-success">-{money(mileageDeduction)}</strong>
              </div>
              <div className="h-px bg-base-300" />
              <div className="flex justify-between text-sm">
                <span className="text-base-content/65">Self-employment tax estimate</span>
                <strong className="text-error">{money(estSelfEmploymentTax)}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-base-content/65">Income tax estimate</span>
                <strong className="text-error">{money(estIncomeTax)}</strong>
              </div>
              <div className="h-px bg-base-300" />
              <div className="flex justify-between">
                <span className="font-semibold text-base-content">Estimated net after tax</span>
                <strong className="text-lg">{money(ytdCollectedIncome - estSelfEmploymentTax - estIncomeTax)}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-base-200 p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-warning" />
              <p className="font-semibold text-base-content">Quarterly planning</p>
            </div>
            <p className="text-sm text-base-content/60">
              Set aside about {Math.round(((estSelfEmploymentTax + estIncomeTax) / Math.max(ytdCollectedIncome, 1)) * 100)}% of each collected private payment. Sent and draft invoices stay out of the estimate until they are paid.
            </p>
          </div>

          <div className="rounded-2xl bg-base-200 p-4">
            <p className="mb-3 font-semibold text-base-content">Common deductions</p>
            <div className="grid gap-2 text-sm text-base-content/65">
              <div className="flex items-center gap-2"><Car size={15} /> Mileage for work travel</div>
              <div className="flex items-center gap-2"><FileText size={15} /> Training and certification fees</div>
              <div className="flex items-center gap-2"><CreditCard size={15} /> Supplies, PPE, phone, and insurance</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
