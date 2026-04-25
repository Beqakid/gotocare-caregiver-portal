// @ts-nocheck
import React from 'react'
import { MapPin, Clock, ChevronRight, Star, Briefcase, TrendingUp, Zap, Bell, Calendar } from 'lucide-react'
import { CaregiverProfile, Shift, Timesheet, CareRequest } from '../types'

interface HomeTabProps {
  profile: CaregiverProfile | null
  shifts: Shift[]
  timesheets: Timesheet[]
  requests: CareRequest[]
  loading: boolean
  onNavigateToRequests: () => void
  onNavigateToSchedule: () => void
  onClockIn: (shiftId: number) => void
}

export const HomeTab: React.FC<HomeTabProps> = ({
  profile, shifts, timesheets, requests, loading, onNavigateToRequests, onNavigateToSchedule, onClockIn
}) => {
  const today = new Date().toISOString().split('T')[0]
  const todayShifts = shifts.filter(s => s.date === today || s.date?.startsWith(today))
  const activeTimesheets = timesheets.filter(t => t.status === 'clocked_in')
  const pendingRequests = requests.filter(r => r.status === 'pending')

  // Calculate this week's earnings from timesheets
  const weekEarnings = timesheets
    .filter(t => t.status === 'approved' || t.status === 'paid')
    .reduce((sum, t) => sum + (t.totalPay || 0), 0)
  const weekHours = timesheets
    .filter(t => t.hoursWorked)
    .reduce((sum, t) => sum + (t.hoursWorked || 0), 0)

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="skeleton-shimmer h-8 w-48 rounded-lg" />
        <div className="skeleton-shimmer h-32 rounded-2xl" />
        <div className="skeleton-shimmer h-24 rounded-2xl" />
        <div className="skeleton-shimmer h-24 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5 pb-4">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-base-content">
            {greeting()}, {profile?.firstName || 'Caregiver'} 👋
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-success pulse-dot" />
            <span className="text-xs text-base-content/60">Available for work</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">
            {profile?.firstName?.[0]}{profile?.lastName?.[0]}
          </span>
        </div>
      </div>

      {/* Earnings Card */}
      <div className="earnings-card rounded-2xl p-5 text-white">
        <p className="text-white/90 text-xs font-medium uppercase tracking-wide">This Week</p>
        <div className="flex items-end justify-between mt-1">
          <div>
            <p className="text-3xl font-bold">${weekEarnings.toFixed(0)}</p>
            <p className="text-white/85 text-sm mt-0.5">{weekHours.toFixed(1)} hours worked</p>
          </div>
          <div className="flex items-center gap-1 bg-white/25 rounded-full px-2.5 py-1">
            <TrendingUp size={14} />
            <span className="text-xs font-medium">+12%</span>
          </div>
        </div>
        <div className="mt-3 bg-white/25 rounded-full h-1.5">
          <div className="bg-white rounded-full h-1.5" style={{ width: `${Math.min((weekHours / 40) * 100, 100)}%` }} />
        </div>
        <p className="text-white/85 text-[10px] mt-1">{weekHours.toFixed(0)}/40 hours goal</p>
      </div>

      {/* Active Shift Banner */}
      {activeTimesheets.length > 0 && (
        <div className="bg-success/10 border border-success/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
            <Zap size={20} className="text-success" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-base-content">Shift in Progress</p>
            <p className="text-xs text-base-content/60">{activeTimesheets.length} active — tap to view</p>
          </div>
          <ChevronRight size={18} className="opacity-40" />
        </div>
      )}

      {/* Today's Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base text-base-content">Today's Schedule</h2>
          <button onClick={onNavigateToSchedule} className="text-xs text-primary font-medium">View All</button>
        </div>
        {todayShifts.length === 0 ? (
          <div className="bg-base-200 rounded-2xl p-6 text-center">
            <Calendar size={32} className="mx-auto opacity-30 mb-2" />
            <p className="text-sm text-base-content/60">No shifts scheduled today</p>
            <p className="text-xs text-base-content/40 mt-1">Check requests for new opportunities</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayShifts.map((shift) => (
              <div key={shift.id} className="bg-base-200 rounded-2xl p-4 press-card">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                      <Clock size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-base-content">
                        {typeof shift.client === 'object' ? `${shift.client.firstName || ''} ${shift.client.lastName || ''}`.trim() : `Client #${shift.client}`}
                      </p>
                      <p className="text-xs text-base-content/60 mt-0.5">
                        {shift.startTime} — {shift.endTime}
                      </p>
                      {shift.careType && (
                        <span className="inline-block mt-1.5 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {shift.careType}
                        </span>
                      )}
                    </div>
                  </div>
                  {shift.status === 'scheduled' && (
                    <button
                      onClick={() => onClockIn(shift.id)}
                      className="btn btn-primary btn-sm text-xs"
                    >
                      Check In
                    </button>
                  )}
                  {shift.status === 'in_progress' && (
                    <span className="badge badge-success badge-sm">In Progress</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-base-content">
              New Requests
              <span className="ml-2 badge badge-primary badge-sm">{pendingRequests.length}</span>
            </h2>
            <button onClick={onNavigateToRequests} className="text-xs text-primary font-medium">View All</button>
          </div>
          <div className="bg-base-200 rounded-2xl p-4 press-card" onClick={onNavigateToRequests}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Bell size={18} className="text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-base-content">
                  {pendingRequests.length} care request{pendingRequests.length > 1 ? 's' : ''} waiting
                </p>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Up to ${Math.max(...pendingRequests.map(r => r.hourlyRate || 0))}/hr · Tap to respond
                </p>
              </div>
              <ChevronRight size={18} className="opacity-40" />
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div>
        <h2 className="font-bold text-base text-base-content mb-3">Your Stats</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-base-200 rounded-2xl p-3 text-center">
            <Star size={18} className="mx-auto text-warning mb-1" />
            <p className="text-lg font-bold text-base-content">{profile?.rating || '4.9'}</p>
            <p className="text-[10px] text-base-content/50">Rating</p>
          </div>
          <div className="bg-base-200 rounded-2xl p-3 text-center">
            <Briefcase size={18} className="mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-base-content">{profile?.totalJobs || shifts.length}</p>
            <p className="text-[10px] text-base-content/50">Jobs Done</p>
          </div>
          <div className="bg-base-200 rounded-2xl p-3 text-center">
            <TrendingUp size={18} className="mx-auto text-success mb-1" />
            <p className="text-lg font-bold text-base-content">96%</p>
            <p className="text-[10px] text-base-content/50">Response</p>
          </div>
        </div>
      </div>
    </div>
  )
}
