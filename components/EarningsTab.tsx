// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Clock, CreditCard, FileText, Plus, Send, Download, Trash2, X, Calculator, Car } from 'lucide-react'
import { Timesheet, Invoice, InvoiceItem, TimeEntry } from '../types'
import { getInvoices, addInvoice, updateInvoice, deleteInvoice, getNextInvoiceNumber, getTimeEntries, getMileageEntries } from '../utils/storage'
import { cloudGetInvoices, cloudAddInvoice, cloudUpdateInvoiceStatus, cloudDeleteInvoice, cloudGetMileage, cloudGetPrivateClients } from '../utils/cloud-api'

interface EarningsTabProps {
  timesheets: Timesheet[]
  loading: boolean
}

export const EarningsTab: React.FC<EarningsTabProps> = ({ timesheets, loading }) => {
  const [view, setView] = useState<'overview' | 'invoices' | 'tax'>('overview')
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week')
  const [invoices, setInvoices] = useState<Invoice[]>(getInvoices())
  const [showCreate, setShowCreate] = useState(false)
  const [privateClients, setPrivateClients] = useState<any[]>([])
  const [invClientId, setInvClientId] = useState<string>('') // '' = none, '__new__' = type new name


  React.useEffect(() => {
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
        const merged = [...cloudInvoices, ...localOnly]
        setInvoices(merged)
      }
    }
    loadCloud()
  }, [])

  // Invoice form state
  const [invClient, setInvClient] = useState('')
  const [invClientEmail, setInvClientEmail] = useState('')
  const [invItems, setInvItems] = useState<InvoiceItem[]>([{ description: 'Care services', hours: 0, rate: 25, amount: 0 }])
  const [invNotes, setInvNotes] = useState('')
  const [invDueDays, setInvDueDays] = useState('30')

  // Earnings calculations
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const monthAgo = new Date(now.getTime() - 30 * 86400000)

  const filterByPeriod = (ts: Timesheet[]) => {
    if (period === 'all') return ts
    const cutoff = period === 'week' ? weekAgo : monthAgo
    return ts.filter(t => new Date(t.date) >= cutoff)
  }

  // Combine API timesheets + local time entries
  const localEntries = getTimeEntries().filter(e => e.status === 'completed')
  const relevantTimesheets = filterByPeriod(timesheets)

  const apiEarnings = relevantTimesheets.reduce((sum, t) => sum + (t.totalPay || 0), 0)
  const apiHours = relevantTimesheets.reduce((sum, t) => sum + (t.hoursWorked || 0), 0)

  const localFiltered = period === 'all' ? localEntries :
    localEntries.filter(e => new Date(e.date) >= (period === 'week' ? weekAgo : monthAgo))
  const localEarnings = localFiltered.reduce((sum, e) => sum + ((e.duration || 0) / 60) * e.hourlyRate, 0)
  const localHours = localFiltered.reduce((sum, e) => sum + ((e.duration || 0) / 60), 0)

  const totalEarnings = apiEarnings + localEarnings
  const totalHours = apiHours + localHours
  const paidAmount = relevantTimesheets.filter(t => t.status === 'paid').reduce((sum, t) => sum + (t.totalPay || 0), 0)
  const invoicePaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0)
  const pendingAmount = totalEarnings - paidAmount

  // Avg hourly rate
  const avgHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0

  // Projected this month
  const weekHoursForProjection = localFiltered.reduce((sum, e) => sum + ((e.duration || 0) / 60), 0) + apiHours
  const projectedMonth = totalEarnings > 0 ? (totalEarnings / 7) * 30 : 0

  // Animated count-up for hero earnings
  const [displayAmount, setDisplayAmount] = useState(0)
  useEffect(() => {
    if (totalEarnings === 0) {
      setDisplayAmount(0)
      return
    }
    let start = 0
    const duration = 800
    const increment = totalEarnings / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= totalEarnings) {
        setDisplayAmount(totalEarnings)
        clearInterval(timer)
      } else {
        setDisplayAmount(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [totalEarnings])

  // Bar chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
  const dailyEarnings = last7Days.map(date => {
    const dayTs = timesheets.filter(t => t.date?.startsWith(date))
    const dayLocal = localEntries.filter(e => e.date === date)
    const amt = dayTs.reduce((s, t) => s + (t.totalPay || 0), 0) + dayLocal.reduce((s, e) => s + ((e.duration || 0) / 60) * e.hourlyRate, 0)
    return { date, amount: amt, day: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }) }
  })
  const maxDaily = Math.max(...dailyEarnings.map(d => d.amount), 1)

  // Tax calculations
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const allTimeEntries = getTimeEntries().filter(e => e.status === 'completed')
  const ytdLocal = allTimeEntries.filter(e => new Date(e.date) >= yearStart)
  const ytdLocalEarnings = ytdLocal.reduce((s, e) => s + ((e.duration || 0) / 60) * e.hourlyRate, 0)
  const ytdApiEarnings = timesheets.filter(t => new Date(t.date) >= yearStart).reduce((s, t) => s + (t.totalPay || 0), 0)
  const ytdTotal = ytdLocalEarnings + ytdApiEarnings
  const mileageEntries = getMileageEntries()
  const ytdMiles = mileageEntries.filter(m => new Date(m.date) >= yearStart).reduce((s, m) => s + m.miles, 0)
  const mileageDeduction = ytdMiles * 0.67 // 2025 IRS rate
  const estSelfEmploymentTax = ytdTotal * 0.153
  const estIncomeTax = Math.max(0, ytdTotal - mileageDeduction) * 0.22 // rough 22% bracket

  // Invoice helpers
  const updateItem = (idx: number, field: string, val: any) => {
    setInvItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: val }
      updated.amount = updated.hours * updated.rate
      return updated
    }))
  }

  const addItem = () => setInvItems(prev => [...prev, { description: '', hours: 0, rate: 25, amount: 0 }])
  const removeItem = (idx: number) => setInvItems(prev => prev.filter((_, i) => i !== idx))


  // Client dropdown handler
  const handleClientSelect = (id: string) => {
    setInvClientId(id)
    if (id === '__new__') {
      setInvClient('')
      setInvClientEmail('')
    } else {
      const c = privateClients.find((_, i) => String(i) === id)
      if (c) {
        setInvClient(c.name)
        setInvClientEmail(c.email || '')
      }
    }
  }

  // ⚡ Generate invoice from this week's time tracker entries
  const generateFromThisWeek = () => {
    const now = new Date()
    const day = now.getDay() // 0=Sun
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const thisWeek = localEntries.filter(e => e.date >= weekStartStr)
    if (thisWeek.length === 0) {
      alert('No time entries found for this week. Start the timer on the Schedule tab first.')
      return
    }

    // Group by clientName
    const groups: Record<string, { hours: number; rate: number }> = {}
    thisWeek.forEach(e => {
      const key = e.clientName || 'General'
      if (!groups[key]) groups[key] = { hours: 0, rate: e.hourlyRate || 25 }
      groups[key].hours += (e.duration || 0) / 60
    })

    const items = Object.entries(groups).map(([name, data]) => ({
      description: `Care services — ${name}`,
      hours: Math.round(data.hours * 100) / 100,
      rate: data.rate,
      amount: Math.round(data.hours * data.rate * 100) / 100,
    }))

    setInvItems(items)

    // Auto-select client: if only one client and they're in private clients list
    const firstName = Object.keys(groups)[0]
    const matchedIdx = privateClients.findIndex(c => c.name === firstName)
    if (matchedIdx >= 0) {
      setInvClientId(String(matchedIdx))
      setInvClient(privateClients[matchedIdx].name)
      setInvClientEmail(privateClients[matchedIdx].email || '')
    } else {
      setInvClientId('__new__')
      setInvClient(firstName === 'General' ? '' : firstName)
    }

    setInvNotes(`Week of ${weekStartStr} — ${thisWeek.length} sessions`)
    setShowCreate(true)
  }

  const handleCreateInvoice = () => {
    if (!invClient.trim() || invItems.every(i => i.amount === 0)) return
    const subtotal = invItems.reduce((s, i) => s + i.amount, 0)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (parseInt(invDueDays) || 30))
    const inv = addInvoice({
      invoiceNumber: getNextInvoiceNumber(),
      clientName: invClient.trim(),
      clientEmail: invClientEmail || undefined,
      items: invItems.filter(i => i.amount > 0),
      subtotal,
      total: subtotal,
      status: 'draft',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      notes: invNotes || undefined,
    })
    cloudAddInvoice(inv)
    setInvoices(getInvoices())
    setShowCreate(false)
    setInvClient(''); setInvClientEmail(''); setInvNotes(''); setInvClientId('')
    setInvItems([{ description: 'Care services', hours: 0, rate: 25, amount: 0 }])
  }

  const handleMarkPaid = (id: string) => {
    updateInvoice(id, { status: 'paid' })
    if (id.startsWith('cloud_')) cloudUpdateInvoiceStatus(id.replace('cloud_', ''), 'paid')
    setInvoices(getInvoices())
  }

  const handleDeleteInvoice = (id: string) => {
    deleteInvoice(id)
    if (id.startsWith('cloud_')) cloudDeleteInvoice(id.replace('cloud_', ''))
    setInvoices(getInvoices())
  }

  // Auto-fill from recent time entries
  const autoFillFromEntries = () => {
    const recent = localEntries.slice(0, 5)
    const clientGroups: Record<string, { hours: number; rate: number }> = {}
    recent.forEach(e => {
      if (!clientGroups[e.clientName]) clientGroups[e.clientName] = { hours: 0, rate: e.hourlyRate }
      clientGroups[e.clientName].hours += (e.duration || 0) / 60
    })
    const items = Object.entries(clientGroups).map(([name, data]) => ({
      description: `Care services - ${name}`,
      hours: Math.round(data.hours * 100) / 100,
      rate: data.rate,
      amount: Math.round(data.hours * data.rate * 100) / 100,
    }))
    if (items.length > 0) {
      setInvItems(items)
      if (!invClient) setInvClient(Object.keys(clientGroups)[0] || '')
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="skeleton-shimmer h-40 rounded-2xl" />
        <div className="skeleton-shimmer h-48 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-base-content">Earnings</h1>
      </div>

      {/* View tabs */}
      <div className="px-4 flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {[
          { key: 'overview' as const, label: 'Overview' },
          { key: 'invoices' as const, label: `Invoices (${invoices.length})` },
          { key: 'tax' as const, label: 'Tax & Deductions' },
        ].map(t => (
          <button key={t.key}
            className={`btn btn-sm rounded-full whitespace-nowrap ${view === t.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ---- OVERVIEW ---- */}
      {view === 'overview' && (
        <div className="px-4 space-y-4">
          {/* Period selector */}
          <div className="flex gap-2">
            {[
              { key: 'week' as const, label: 'This Week' },
              { key: 'month' as const, label: 'This Month' },
              { key: 'all' as const, label: 'All Time' },
            ].map(p => (
              <button key={p.key}
                className={`btn btn-sm rounded-full ${period === p.key ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPeriod(p.key)}
              >{p.label}</button>
            ))}
          </div>

          {/* Earnings summary — with animated count-up */}
          <div className="earnings-card rounded-2xl p-5 text-white">
            <p className="text-white/90 text-xs font-medium uppercase tracking-wide">Total Earnings</p>
            <p className="text-4xl font-bold mt-1 earnings-number">${displayAmount.toFixed(2)}</p>
            {projectedMonth > 0 && (
              <p className="text-white/70 text-xs mt-1">
                Projected this month: ${projectedMonth.toFixed(0)}
              </p>
            )}
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-white/85" />
                <span className="text-sm text-white/90">{totalHours.toFixed(1)} hrs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign size={12} className="text-white/85" />
                <span className="text-sm text-white/90">${totalHours > 0 ? (totalEarnings / totalHours).toFixed(0) : 0}/hr avg</span>
              </div>
            </div>
            {localEarnings > 0 && (
              <p className="text-white/70 text-[10px] mt-2">Includes ${localEarnings.toFixed(0)} from time tracker</p>
            )}
          </div>

          {/* Care Impact */}
          <div className="bg-blue-500/8 border border-blue-400/20 rounded-2xl p-4 mb-1">
            <p className="text-xs font-semibold text-blue-500 mb-3 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>
              Your care impact {period === 'week' ? 'this week' : period === 'month' ? 'this month' : '(all time)'}
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-base font-bold text-base-content">{Math.round(totalHours) || '—'}</p>
                <p className="text-[10px] text-base-content/50">Hours delivered</p>
              </div>
              <div className="border-x border-base-300/50">
                <p className="text-base font-bold text-base-content">{relevantTimesheets.length + localFiltered.length || '—'}</p>
                <p className="text-[10px] text-base-content/50">Families helped</p>
              </div>
              <div>
                <p className="text-base font-bold text-base-content">{invoices.filter(i => i.status === 'paid').length || '—'}</p>
                <p className="text-[10px] text-base-content/50">Clients served</p>
              </div>
            </div>
          </div>

          {/* 3-column stats: Avg hourly | Collected | Pending */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-base-200 rounded-2xl p-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <TrendingUp size={14} className="text-primary" />
              </div>
              <p className="text-base font-bold text-base-content">${avgHourlyRate.toFixed(0)}/hr</p>
              <p className="text-[10px] text-base-content/70 uppercase tracking-wide">Avg Rate</p>
            </div>
            <div className="bg-base-200 rounded-2xl p-3">
              <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center mb-2">
                <CreditCard size={14} className="text-success" />
              </div>
              <p className="text-base font-bold text-base-content">${(paidAmount + invoicePaid).toFixed(0)}</p>
              <p className="text-[10px] text-base-content/70 uppercase tracking-wide">Collected</p>
            </div>
            <div className="bg-base-200 rounded-2xl p-3">
              <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center mb-2">
                <Clock size={14} className="text-warning" />
              </div>
              <p className="text-base font-bold text-base-content">${pendingAmount.toFixed(0)}</p>
              <p className="text-[10px] text-base-content/70 uppercase tracking-wide">Pending</p>
            </div>
          </div>

          {/* Bar chart — pill-shaped bars with glow on tallest */}
          <div className="bg-base-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-base-content mb-4">Last 7 Days</p>
            <div className="flex items-end gap-2 h-28">
              {dailyEarnings.map((d, i) => {
                const isMax = d.amount === maxDaily && d.amount > 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-base-content/70 font-medium">
                      {d.amount > 0 ? `$${d.amount.toFixed(0)}` : ''}
                    </span>
                    <div
                      className="w-full rounded-full min-h-[4px] transition-all"
                      style={{
                        height: `${(d.amount / maxDaily) * 80}px`,
                        background: isMax
                          ? 'linear-gradient(180deg, #7C5CFF 0%, #4A90E2 100%)'
                          : 'rgba(124,92,255,0.4)',
                        boxShadow: isMax ? '0 4px 12px rgba(124,92,255,0.4)' : 'none',
                      }}
                    />
                    <span className="text-[10px] text-base-content/60">{d.day}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick invoice CTA */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={generateFromThisWeek}
              className="btn btn-primary w-full gap-2 rounded-2xl">
              ⚡ This Week
            </button>
            <button onClick={() => { setView('invoices'); setShowCreate(true) }}
              className="btn btn-outline btn-primary w-full gap-2 rounded-2xl">
              <FileText size={16} /> Blank
            </button>
          </div>
        </div>
      )}

      {/* ---- INVOICES VIEW ---- */}
      {view === 'invoices' && (
        <div className="px-4 space-y-4">
          <button onClick={() => setShowCreate(true)} className="btn btn-primary w-full gap-2 rounded-2xl">
            <Plus size={18} /> Create New Invoice
          </button>

          {showCreate && (
            <div className="bg-base-200 rounded-2xl p-4 border-2 border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-sm">New Invoice</p>
                <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-xs btn-circle"><X size={14} /></button>
              </div>

              <div className="space-y-3">
                {/* Client dropdown */}
                {privateClients.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      className="select select-bordered select-sm w-full"
                      value={invClientId}
                      onChange={e => handleClientSelect(e.target.value)}
                    >
                      <option value="">— Select client —</option>
                      {privateClients.map((c, i) => (
                        <option key={i} value={String(i)}>{c.name}{c.email ? ` (${c.email})` : ''}</option>
                      ))}
                      <option value="__new__">＋ New client (not in list)</option>
                    </select>
                    {invClientId === '__new__' && (
                      <>
                        <input type="text" className="input input-bordered input-sm w-full" placeholder="Client name *"
                          value={invClient} onChange={e => setInvClient(e.target.value)} />
                        <input type="email" className="input input-bordered input-sm w-full" placeholder="Client email (optional)"
                          value={invClientEmail} onChange={e => setInvClientEmail(e.target.value)} />
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <input type="text" className="input input-bordered input-sm w-full" placeholder="Client name *"
                      value={invClient} onChange={e => setInvClient(e.target.value)} />
                    <input type="email" className="input input-bordered input-sm w-full" placeholder="Client email (optional)"
                      value={invClientEmail} onChange={e => setInvClientEmail(e.target.value)} />
                  </>
                )}

                {localEntries.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={generateFromThisWeek} className="btn btn-primary btn-xs gap-1">
                      ⚡ Generate from this week
                    </button>
                    <button onClick={autoFillFromEntries} className="btn btn-ghost btn-xs gap-1 text-primary">
                      <Clock size={12} /> Auto-fill recent
                    </button>
                  </div>
                )}

                {/* Line items */}
                <div className="space-y-2">
                  {invItems.map((item, i) => (
                    <div key={i} className="bg-base-100 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <input type="text" className="input input-bordered input-xs flex-1 mr-2" placeholder="Description"
                          value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                        {invItems.length > 1 && (
                          <button onClick={() => removeItem(i)} className="btn btn-ghost btn-xs btn-circle"><X size={12} /></button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-base-content/60">Hours</label>
                          <input type="number" step="0.25" className="input input-bordered input-xs w-full"
                            value={item.hours || ''} onChange={e => updateItem(i, 'hours', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-base-content/60">Rate</label>
                          <input type="number" className="input input-bordered input-xs w-full"
                            value={item.rate || ''} onChange={e => updateItem(i, 'rate', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-base-content/60">Amount</label>
                          <p className="text-sm font-bold text-base-content pt-1">${item.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addItem} className="btn btn-ghost btn-xs gap-1">
                    <Plus size={12} /> Add Line Item
                  </button>
                </div>

                <div className="flex items-center justify-between bg-base-100 rounded-xl p-3">
                  <span className="font-semibold text-sm">Total</span>
                  <span className="font-bold text-lg text-primary">${invItems.reduce((s, i) => s + i.amount, 0).toFixed(2)}</span>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-base-content/60">Due in (days)</label>
                    <input type="number" className="input input-bordered input-xs w-full"
                      value={invDueDays} onChange={e => setInvDueDays(e.target.value)} />
                  </div>
                </div>

                <textarea className="textarea textarea-bordered w-full text-sm" rows={2} placeholder="Notes (optional)"
                  value={invNotes} onChange={e => setInvNotes(e.target.value)} />

                <button onClick={handleCreateInvoice} className="btn btn-primary btn-sm w-full gap-1">
                  <FileText size={14} /> Create Invoice
                </button>
              </div>
            </div>
          )}

          {/* Invoice list */}
          {invoices.length === 0 && !showCreate ? (
            <div className="text-center py-10">
              <FileText size={36} className="mx-auto opacity-20 mb-2" />
              <p className="text-sm text-base-content/60">No invoices yet</p>
              <p className="text-xs text-base-content/40 mt-1">Create professional invoices for your private clients</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="bg-base-200 rounded-2xl p-4 press-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-base-content">{inv.clientName}</p>
                        <span className={`badge badge-xs ${
                          inv.status === 'paid' ? 'badge-success' : inv.status === 'sent' ? 'badge-info' : inv.status === 'overdue' ? 'badge-error' : 'badge-ghost'
                        }`}>{inv.status}</span>
                      </div>
                      <p className="text-xs text-base-content/60 mt-0.5">{inv.invoiceNumber} · Due {inv.dueDate}</p>
                      <p className="text-xs text-base-content/50 mt-0.5">
                        {inv.items.length} item{inv.items.length > 1 ? 's' : ''} · {inv.items.reduce((s, i) => s + i.hours, 0)}h
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-base-content">${inv.total.toFixed(2)}</p>
                      <div className="flex gap-1 mt-1">
                        {inv.status !== 'paid' && (
                          <button onClick={() => handleMarkPaid(inv.id)} className="btn btn-success btn-xs gap-1">
                            <DollarSign size={10} /> Paid
                          </button>
                        )}
                        <button onClick={() => handleDeleteInvoice(inv.id)} className="btn btn-ghost btn-xs opacity-40">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- TAX & DEDUCTIONS VIEW ---- */}
      {view === 'tax' && (
        <div className="px-4 space-y-4">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 border border-primary/10">
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={20} className="text-primary" />
              <h3 className="font-bold text-sm text-base-content">{now.getFullYear()} Tax Summary</h3>
            </div>
            <p className="text-xs text-base-content/60 mb-4">Estimated figures — consult a tax professional</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-base-content/70">YTD Gross Income</span>
                <span className="font-bold text-base-content">${ytdTotal.toFixed(0)}</span>
              </div>
              <div className="h-px bg-base-300" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Car size={14} className="text-base-content/50" />
                  <span className="text-sm text-base-content/70">Mileage ({ytdMiles.toFixed(0)} mi × $0.67)</span>
                </div>
                <span className="font-medium text-success">-${mileageDeduction.toFixed(0)}</span>
              </div>
              <div className="h-px bg-base-300" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-base-content/70">Est. Self-Employment Tax (15.3%)</span>
                <span className="font-medium text-error">${estSelfEmploymentTax.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-base-content/70">Est. Income Tax (~22%)</span>
                <span className="font-medium text-error">${estIncomeTax.toFixed(0)}</span>
              </div>
              <div className="h-px bg-base-300" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-base-content">Est. Net After Tax</span>
                <span className="font-bold text-lg text-base-content">
                  ${(ytdTotal - estSelfEmploymentTax - estIncomeTax).toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-base-200 rounded-2xl p-4">
            <p className="font-semibold text-sm text-base-content mb-2">Quarterly Tax Reminder</p>
            <p className="text-xs text-base-content/60">
              As an independent caregiver, you may need to pay estimated taxes quarterly.
              Set aside ~{Math.round(((estSelfEmploymentTax + estIncomeTax) / Math.max(ytdTotal, 1)) * 100)}% of each payment.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { q: 'Q1', due: 'Apr 15', passed: now.getMonth() >= 3 },
                { q: 'Q2', due: 'Jun 15', passed: now.getMonth() >= 5 },
                { q: 'Q3', due: 'Sep 15', passed: now.getMonth() >= 8 },
                { q: 'Q4', due: 'Jan 15', passed: false },
              ].map(q => (
                <div key={q.q} className={`rounded-xl p-2 text-center text-xs ${q.passed ? 'bg-base-300 opacity-60' : 'bg-primary/10'}`}>
                  <span className="font-semibold">{q.q}</span> · Due {q.due}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-base-200 rounded-2xl p-4">
            <p className="font-semibold text-sm text-base-content mb-2">Common Deductions for Caregivers</p>
            <ul className="text-xs text-base-content/70 space-y-1.5">
              <li>🚗 Mileage: $0.67/mile for work travel (tracked above)</li>
              <li>📱 Phone & internet (% used for work)</li>
              <li>👔 Scrubs, uniforms, PPE</li>
              <li>📚 Training & certification costs</li>
              <li>🏥 Professional liability insurance</li>
              <li>💼 Professional association dues</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
