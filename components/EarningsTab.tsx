// @ts-nocheck
import React, { useState } from 'react'
import { DollarSign, TrendingUp, Clock, CreditCard, ArrowUpRight } from 'lucide-react'
import { Timesheet, Earning } from '../types'

interface EarningsTabProps {
  timesheets: Timesheet[]
  loading: boolean
}

export const EarningsTab: React.FC<EarningsTabProps> = ({ timesheets, loading }) => {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week')

  // Calculate earnings from timesheets
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const filterByPeriod = (ts: Timesheet[]) => {
    if (period === 'all') return ts
    const cutoff = period === 'week' ? weekAgo : monthAgo
    return ts.filter(t => new Date(t.date) >= cutoff)
  }

  const relevantTimesheets = filterByPeriod(timesheets)
  const totalEarnings = relevantTimesheets.reduce((sum, t) => sum + (t.totalPay || 0), 0)
  const totalHours = relevantTimesheets.reduce((sum, t) => sum + (t.hoursWorked || 0), 0)
  const paidAmount = relevantTimesheets.filter(t => t.status === 'paid').reduce((sum, t) => sum + (t.totalPay || 0), 0)
  const pendingAmount = totalEarnings - paidAmount

  // Simple daily earnings for the bar chart (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const dailyEarnings = last7Days.map(date => {
    const dayTs = timesheets.filter(t => t.date?.startsWith(date))
    return {
      date,
      amount: dayTs.reduce((sum, t) => sum + (t.totalPay || 0), 0),
      day: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })
    }
  })
  const maxDaily = Math.max(...dailyEarnings.map(d => d.amount), 1)

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

      {/* Period selector */}
      <div className="px-4 flex gap-2 mb-4">
        {[
          { key: 'week' as const, label: 'This Week' },
          { key: 'month' as const, label: 'This Month' },
          { key: 'all' as const, label: 'All Time' },
        ].map(p => (
          <button
            key={p.key}
            className={`btn btn-sm rounded-full ${period === p.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4">
        {/* Earnings summary card */}
        <div className="earnings-card rounded-2xl p-5 text-white">
          <p className="text-white/90 text-xs font-medium uppercase tracking-wide">Total Earnings</p>
          <p className="text-4xl font-bold mt-1">${totalEarnings.toFixed(2)}</p>
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
        </div>

        {/* Paid vs Pending */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <CreditCard size={16} className="text-success" />
              </div>
            </div>
            <p className="text-lg font-bold text-base-content">${paidAmount.toFixed(0)}</p>
            <p className="text-[10px] text-base-content/70 uppercase tracking-wide">Paid</p>
          </div>
          <div className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock size={16} className="text-warning" />
              </div>
            </div>
            <p className="text-lg font-bold text-base-content">${pendingAmount.toFixed(0)}</p>
            <p className="text-[10px] text-base-content/70 uppercase tracking-wide">Pending</p>
          </div>
        </div>

        {/* Bar chart */}
        <div className="bg-base-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-base-content mb-4">Last 7 Days</p>
          <div className="flex items-end gap-2 h-28">
            {dailyEarnings.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-base-content/70 font-medium">
                  {d.amount > 0 ? `$${d.amount.toFixed(0)}` : ''}
                </span>
                <div
                  className="w-full rounded-t-lg bg-primary/85 min-h-[4px] transition-all"
                  style={{ height: `${(d.amount / maxDaily) * 80}px` }}
                />
                <span className="text-[10px] text-base-content/60">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent payments */}
        <div>
          <p className="text-sm font-semibold text-base-content mb-3">Recent Activity</p>
          {relevantTimesheets.length === 0 ? (
            <p className="text-sm text-base-content/65 text-center py-6">No activity in this period</p>
          ) : (
            <div className="space-y-2">
              {relevantTimesheets.slice(0, 10).map(ts => (
                <div key={ts.id} className="bg-base-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ts.status === 'paid' ? 'bg-success/10' : 'bg-base-300'}`}>
                      <DollarSign size={14} className={ts.status === 'paid' ? 'text-success' : 'opacity-60'} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-base-content">
                        {ts.hoursWorked?.toFixed(1) || '0'} hours
                      </p>
                      <p className="text-[10px] text-base-content/65">
                        {new Date(ts.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-base-content">${(ts.totalPay || 0).toFixed(2)}</p>
                    <span className={`text-[10px] ${ts.status === 'paid' ? 'text-success' : 'text-base-content/60'}`}>
                      {ts.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
