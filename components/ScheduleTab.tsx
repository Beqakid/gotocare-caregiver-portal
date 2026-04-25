// @ts-nocheck
import React, { useState } from 'react'
import { Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { Shift } from '../types'

interface ScheduleTabProps {
  shifts: Shift[]
  loading: boolean
  onClockIn: (shiftId: number) => void
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ shifts, loading, onClockIn }) => {
  const [viewMode, setViewMode] = useState<'upcoming' | 'past'>('upcoming')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sortedShifts = [...shifts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const upcomingShifts = sortedShifts.filter(s => new Date(s.date) >= today)
  const pastShifts = sortedShifts.filter(s => new Date(s.date) < today).reverse()
  const displayShifts = viewMode === 'upcoming' ? upcomingShifts : pastShifts

  // Group by date
  const grouped: Record<string, Shift[]> = {}
  displayShifts.forEach(s => {
    const dateKey = s.date?.split('T')[0] || s.date
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(s)
  })

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const todayStr = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    if (dateStr === todayStr) return 'Today'
    if (dateStr === tomorrowStr) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'badge-info',
      in_progress: 'badge-success',
      completed: 'badge-ghost',
      cancelled: 'badge-error',
    }
    return map[status] || 'badge-ghost'
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-base-content">Schedule</h1>
        <div className="flex gap-2 mt-3">
          <button
            className={`btn btn-sm rounded-full ${viewMode === 'upcoming' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('upcoming')}
          >
            Upcoming ({upcomingShifts.length})
          </button>
          <button
            className={`btn btn-sm rounded-full ${viewMode === 'past' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('past')}
          >
            Past ({pastShifts.length})
          </button>
        </div>
      </div>

      {/* Shifts grouped by date */}
      <div className="px-4 space-y-5">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={40} className="mx-auto opacity-20 mb-3" />
            <p className="text-base-content/60 text-sm">No {viewMode} shifts</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dateShifts]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {dateShifts.map(shift => (
                  <div key={shift.id} className="bg-base-200 rounded-2xl p-4 press-card">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-base-content">{shift.startTime || '9:00'}</span>
                          <div className="w-px h-4 bg-base-300 my-0.5" />
                          <span className="text-xs text-base-content/50">{shift.endTime || '13:00'}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-base-content">
                            {typeof shift.client === 'object' 
                              ? `${shift.client?.firstName || ''} ${shift.client?.lastName || ''}`.trim() 
                              : `Client #${shift.client}`}
                          </p>
                          {shift.careType && (
                            <span className="inline-block mt-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {shift.careType}
                            </span>
                          )}
                          {shift.address && (
                            <p className="text-xs text-base-content/50 mt-1 flex items-center gap-1">
                              <MapPin size={10} /> {shift.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`badge badge-sm ${statusBadge(shift.status)}`}>
                          {shift.status?.replace('_', ' ')}
                        </span>
                        {shift.status === 'scheduled' && viewMode === 'upcoming' && (
                          <button onClick={() => onClockIn(shift.id)} className="btn btn-primary btn-xs">
                            Check In
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
