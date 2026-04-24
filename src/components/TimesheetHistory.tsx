// @ts-nocheck
import React, { useState } from 'react'
import { Clock, DollarSign, CheckCircle, XCircle, Square } from 'lucide-react'
import { Timesheet } from '../types'

interface TimesheetHistoryProps {
  timesheets: Timesheet[]
  onClockOut: (timesheetId: number, hourlyRate: number) => Promise<void>
  loading: boolean
}

const statusIcons: Record<string, React.ReactNode> = {
  clocked_in: <Clock size={14} className="text-warning" />,
  pending: <Square size={14} className="text-info" />,
  approved: <CheckCircle size={14} className="text-success" />,
  rejected: <XCircle size={14} className="text-error" />,
}

export const TimesheetHistory: React.FC<TimesheetHistoryProps> = ({ timesheets, onClockOut, loading }) => {
  const [clockingOut, setClockingOut] = useState<number | null>(null)
  const [rateInput, setRateInput] = useState<string>('25')

  const handleClockOut = async (tsId: number) => {
    setClockingOut(tsId)
    try {
      await onClockOut(tsId, parseFloat(rateInput) || 25)
    } finally {
      setClockingOut(null)
    }
  }

  const getClientName = (client: any) => {
    if (!client) return 'Unknown'
    if (typeof client === 'object') return `${client.firstName || ''} ${client.lastName || ''}`.trim()
    return `Client #${client}`
  }

  const totalEarnings = timesheets
    .filter(t => t.status === 'approved')
    .reduce((sum, t) => sum + (t.totalPay || 0), 0)

  const totalHours = timesheets
    .filter(t => t.hoursWorked)
    .reduce((sum, t) => sum + (t.hoursWorked || 0), 0)

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card bg-base-200">
          <div className="card-body p-3 text-center">
            <p className="text-xs text-base-content/60">Total Hours</p>
            <p className="text-xl font-bold text-primary">{totalHours.toFixed(1)}</p>
          </div>
        </div>
        <div className="card bg-base-200">
          <div className="card-body p-3 text-center">
            <p className="text-xs text-base-content/60">Approved Pay</p>
            <p className="text-xl font-bold text-success">${totalEarnings.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {timesheets.length === 0 ? (
        <div className="text-center p-8 text-base-content/60">
          <DollarSign size={48} className="mx-auto mb-3 opacity-40" />
          <p>No timesheets yet</p>
        </div>
      ) : (
        timesheets.map((ts) => (
          <div key={ts.id} className="card bg-base-200">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-base-content">{getClientName(ts.client)}</p>
                  <p className="text-xs text-base-content/60">
                    {new Date(ts.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {statusIcons[ts.status]}
                  <span className="text-xs text-base-content/60">{ts.status.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-base-content/60 mt-1">
                {ts.clockIn && (
                  <span>In: {new Date(ts.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
                {ts.clockOut && (
                  <span>Out: {new Date(ts.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
                {ts.hoursWorked != null && (
                  <span className="font-medium">{ts.hoursWorked.toFixed(1)}h</span>
                )}
                {ts.totalPay != null && ts.totalPay > 0 && (
                  <span className="text-success font-medium">${ts.totalPay.toFixed(2)}</span>
                )}
              </div>

              {ts.status === 'clocked_in' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    className="input input-bordered input-xs w-20"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    placeholder="$/hr"
                  />
                  <button
                    className="btn btn-error btn-sm flex-1"
                    onClick={() => handleClockOut(ts.id)}
                    disabled={clockingOut === ts.id}
                  >
                    {clockingOut === ts.id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <Clock size={14} />
                    )}
                    Clock Out
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
