// @ts-nocheck
import React, { useState } from 'react'
import { Clock, Play, MapPin, AlertTriangle } from 'lucide-react'
import { Shift } from '../types'

interface MyShiftsProps {
  shifts: Shift[]
  onClockIn: (shiftId: number) => Promise<void>
  loading: boolean
}

const priorityColors: Record<string, string> = {
  urgent: 'badge-error',
  high: 'badge-warning',
  normal: 'badge-info',
  low: 'badge-ghost',
}

const statusColors: Record<string, string> = {
  scheduled: 'badge-info',
  in_progress: 'badge-warning',
  completed: 'badge-success',
  cancelled: 'badge-ghost',
}

export const MyShifts: React.FC<MyShiftsProps> = ({ shifts, onClockIn, loading }) => {
  const [clockingIn, setClockingIn] = useState<number | null>(null)

  const handleClockIn = async (shiftId: number) => {
    setClockingIn(shiftId)
    try {
      await onClockIn(shiftId)
    } finally {
      setClockingIn(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const getClientName = (client: any) => {
    if (!client) return 'Unknown'
    if (typeof client === 'object') return `${client.firstName || ''} ${client.lastName || ''}`.trim()
    return `Client #${client}`
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  if (shifts.length === 0) {
    return (
      <div className="text-center p-8 text-base-content/60">
        <Clock size={48} className="mx-auto mb-3 opacity-40" />
        <p className="font-medium">No upcoming shifts</p>
        <p className="text-sm">Check back later for new assignments</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-3">
      {shifts.map((shift) => (
        <div key={shift.id} className="card bg-base-200">
          <div className="card-body p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-base-content">{getClientName(shift.client)}</p>
                <p className="text-sm text-base-content/60">{formatDate(shift.date)}</p>
              </div>
              <div className="flex gap-1">
                {shift.priority && shift.priority !== 'normal' && (
                  <span className={`badge badge-sm ${priorityColors[shift.priority] || ''}`}>
                    {shift.priority === 'urgent' && <AlertTriangle size={10} className="mr-1" />}
                    {shift.priority}
                  </span>
                )}
                <span className={`badge badge-sm ${statusColors[shift.status] || ''}`}>
                  {shift.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-base-content/60 mt-1">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {shift.startTime} – {shift.endTime}
              </span>
              {shift.client && typeof shift.client === 'object' && shift.client.addressCity && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {shift.client.addressCity}
                </span>
              )}
            </div>

            {shift.notes && (
              <p className="text-xs text-base-content/40 mt-1">{shift.notes}</p>
            )}

            {shift.status === 'scheduled' && (
              <button
                className="btn btn-primary btn-sm mt-2"
                onClick={() => handleClockIn(shift.id)}
                disabled={clockingIn === shift.id}
              >
                {clockingIn === shift.id ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Play size={14} />
                )}
                Clock In
              </button>
            )}

            {shift.status === 'in_progress' && (
              <div className="badge badge-warning gap-1 mt-2">
                <span className="loading loading-ring loading-xs" />
                In Progress
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
