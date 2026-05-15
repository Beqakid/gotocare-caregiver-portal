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
  FileText,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { Timesheet, Invoice, InvoiceItem, TimeEntry } from '../types'
import {
  addInvoice,
  deleteInvoice,
  getInvoices,
  getMileageEntries,
  getNextInvoiceNumber,
  getTimeEntries,
  updateInvoice,
} from '../utils/storage'
import {
  cloudAddInvoice,
  cloudDeleteInvoice,
  cloudGetInvoices,
  cloudGetPrivateClients,
  cloudUpdateInvoiceStatus,
} from '../utils/cloud-api'

const API = 'https://gotocare-original.jjioji.workers.dev/api'

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
  const [view, setView] = useState<'workspace' | 'invoices' | 'tax'>('workspace')
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week')
  const [invoices, setInvoices] = useState<Invoice[]>(getInvoices())
  const [showCreate, setShowCreate] = useState(false)
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
        setInvoices([...cloudInvoices, ...localOnly])
      }
    }
    loadCloud()
  }, [])

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const monthAgo = new Date(now.getTime() - 30 * 86400000)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const allEntries = getTimeEntries().filter(e => e.status === 'completed')
  const localEntries = allEntries.filter(e => period === 'all' || new Date(e.date) >= (period === 'week' ? weekAgo : monthAgo))
  const relevantTimesheets = timesheets.filter(t => period === 'all' || new Date(t.date) >= (period === 'week' ? weekAgo : monthAgo))
  const uninvoicedEntries = allEntries.filter(e => !e.isInvoiced)

  const invoiceTotal = invItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  const paidInvoices = invoices.filter(i => i.status === 'paid')
  const sentInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')
  const draftInvoices = invoices.filter(i => i.status === 'draft')

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

  const ytdLocal = allEntries.filter(e => new Date(e.date) >= yearStart)
  const ytdLocalEarnings = ytdLocal.reduce((sum, e) => sum + entryAmount(e), 0)
  const ytdApiEarnings = timesheets.filter(t => new Date(t.date) >= yearStart).reduce((sum, t) => sum + (t.totalPay || 0), 0)
  const ytdTotal = ytdLocalEarnings + ytdApiEarnings
  const ytdMiles = getMileageEntries().filter(m => new Date(m.date) >= yearStart).reduce((sum, m) => sum + m.miles, 0)
  const mileageDeduction = ytdMiles * 0.67
  const estSelfEmploymentTax = ytdTotal * 0.153
  const estIncomeTax = Math.max(0, ytdTotal - mileageDeduction) * 0.22

  const resetInvoiceForm = () => {
    setInvClientId('')
    setInvClient('')
    setInvClientEmail('')
    setInvItems([{ description: 'Care services', hours: 0, rate: 25, amount: 0 }])
    setInvNotes('')
    setInvDueDays('14')
    setUsedEntryIds([])
    setUsedCloudIds([])
    setAutoFilledNote('')
  }

  const openCreate = () => {
    setView('invoices')
    setShowCreate(true)
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
    setAutoFilledNote(`Pre-filled ${entries.length} uninvoiced session${entries.length === 1 ? '' : 's'} totaling ${hours.toFixed(1)} hours.`)
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
      setAutoFilledNote('No uninvoiced sessions found for this client. Add hours manually.')
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

  const handleCreateInvoice = () => {
    if (!invClient.trim() || invoiceTotal <= 0) return
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (parseInt(invDueDays, 10) || 14))
    const inv = addInvoice({
      invoiceNumber: getNextInvoiceNumber(),
      clientName: invClient.trim(),
      clientEmail: invClientEmail || undefined,
      items: invItems.filter(item => item.amount > 0),
      subtotal: invoiceTotal,
      total: invoiceTotal,
      status: 'draft',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      notes: invNotes || undefined,
    })
    cloudAddInvoice(inv)
    if (usedCloudIds.length > 0) cloudMarkEntriesInvoiced(usedCloudIds)
    setInvoices(getInvoices())
    setShowCreate(false)
    resetInvoiceForm()
  }

  const changeInvoiceStatus = (id: string, status: Invoice['status']) => {
    updateInvoice(id, { status })
    if (id.startsWith('cloud_')) cloudUpdateInvoiceStatus(id.replace('cloud_', ''), status)
    setInvoices(getInvoices())
  }

  const handleDeleteInvoice = (id: string) => {
    deleteInvoice(id)
    if (id.startsWith('cloud_')) cloudDeleteInvoice(id.replace('cloud_', ''))
    setInvoices(getInvoices())
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
            onClick={() => setView(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'workspace' && (
        <div className="px-4 space-y-4">
          <div className="rounded-[1.25rem] bg-gradient-to-br from-primary to-[#2563eb] p-5 text-primary-content shadow-lg shadow-primary/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-content/70">Ready to invoice</p>
                <p className="mt-1 text-4xl font-bold">{money(readyToInvoiceAmount)}</p>
                <p className="mt-1 text-sm text-primary-content/75">{readyToInvoiceHours.toFixed(1)} uninvoiced hours</p>
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
              <button onClick={() => setView('invoices')} className="btn btn-ghost btn-xs">View all</button>
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
                    onClick={() => setPeriod(key)}
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
                  <p className="text-lg font-bold text-base-content">Draft invoice</p>
                </div>
                <button
                  onClick={() => { setShowCreate(false); resetInvoiceForm() }}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
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

                {(!privateClients.length || invClientId === '__new__') && (
                  <div className="grid gap-2">
                    <input className="input input-bordered w-full" placeholder="Client name" value={invClient} onChange={e => setInvClient(e.target.value)} />
                    <input className="input input-bordered w-full" placeholder="Client email optional" value={invClientEmail} onChange={e => setInvClientEmail(e.target.value)} />
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
                  <FileText size={16} /> Save draft invoice
                </button>
              </div>
            </div>
          )}

          {invoices.length === 0 && !showCreate ? (
            <div className="rounded-2xl bg-base-200 p-8 text-center">
              <FileText size={38} className="mx-auto mb-3 text-base-content/25" />
              <p className="font-semibold text-base-content">No invoices yet</p>
              <p className="mt-1 text-sm text-base-content/55">Create a draft once you have private client hours to bill.</p>
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
                      <p className="mt-1 text-xs text-base-content/55">{inv.items.length} item{inv.items.length === 1 ? '' : 's'} - {inv.items.reduce((sum, item) => sum + (item.hours || 0), 0).toFixed(1)} hrs</p>
                    </div>
                    <p className="text-xl font-bold text-base-content">${inv.total.toFixed(2)}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {inv.status === 'draft' && (
                      <button onClick={() => changeInvoiceStatus(inv.id, 'sent')} className="btn btn-info btn-xs gap-1">
                        <Send size={12} /> Mark sent
                      </button>
                    )}
                    {inv.status !== 'paid' && (
                      <button onClick={() => changeInvoiceStatus(inv.id, 'paid')} className="btn btn-success btn-xs gap-1">
                        <CreditCard size={12} /> Paid
                      </button>
                    )}
                    <button onClick={() => handleDeleteInvoice(inv.id)} className="btn btn-ghost btn-xs ml-auto">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <span className="text-base-content/65">YTD gross income</span>
                <strong>{money(ytdTotal)}</strong>
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
                <strong className="text-lg">{money(ytdTotal - estSelfEmploymentTax - estIncomeTax)}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-base-200 p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-warning" />
              <p className="font-semibold text-base-content">Quarterly planning</p>
            </div>
            <p className="text-sm text-base-content/60">
              Set aside about {Math.round(((estSelfEmploymentTax + estIncomeTax) / Math.max(ytdTotal, 1)) * 100)}% of each private payment for taxes.
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
