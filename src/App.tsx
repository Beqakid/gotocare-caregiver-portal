// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { Calendar, Clock, User, RefreshCw, LogOut } from 'lucide-react'
import { Shift, Timesheet, CaregiverProfile } from './types'
import { login, fetchShifts, fetchTimesheets, clockIn, clockOut, fetchCaregiverProfile } from './utils/api'
import { LoginScreen } from './components/LoginScreen'
import { MyShifts } from './components/MyShifts'
import { TimesheetHistory } from './components/TimesheetHistory'

type Tab = 'shifts' | 'timesheets' | 'profile'

const App: React.FC<{}> = () => {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [tab, setTab] = useState<Tab>('shifts')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [profile, setProfile] = useState<CaregiverProfile | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [loadingTimesheets, setLoadingTimesheets] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async (caregiverId: number) => {
    setLoadingShifts(true)
    setLoadingTimesheets(true)
    try {
      const shiftRes = await fetchShifts(caregiverId)
      if (shiftRes?.docs) setShifts(shiftRes.docs)
    } catch (e) {
      console.error('Failed to load shifts:', e)
    } finally {
      setLoadingShifts(false)
    }
    try {
      const tsRes = await fetchTimesheets(caregiverId)
      if (tsRes?.docs) setTimesheets(tsRes.docs)
    } catch (e) {
      console.error('Failed to load timesheets:', e)
    } finally {
      setLoadingTimesheets(false)
    }
  }, [])

  const handleLogin = async (email: string, password: string) => {
    setLoginError('')
    try {
      const result = await login(email, password)
      if (result.token || result.user) {
        setUserEmail(email)
        setLoggedIn(true)
        // Find caregiver profile by email
        const profileRes = await fetchCaregiverProfile(email)
        if (profileRes?.docs && profileRes.docs.length > 0) {
          const cg = profileRes.docs[0]
          setProfile(cg)
          await loadData(cg.id)
        } else {
          setLoginError('No caregiver profile found for this account')
          setLoggedIn(false)
        }
      } else {
        setLoginError('Invalid email or password')
      }
    } catch (e) {
      setLoginError('Login failed. Please try again.')
      console.error('Login error:', e)
    }
  }

  const handleClockIn = async (shiftId: number) => {
    try {
      await clockIn(shiftId)
      if (profile) await loadData(profile.id)
    } catch (e) {
      console.error('Clock in failed:', e)
    }
  }

  const handleClockOut = async (timesheetId: number, hourlyRate: number) => {
    try {
      await clockOut(timesheetId, hourlyRate)
      if (profile) await loadData(profile.id)
    } catch (e) {
      console.error('Clock out failed:', e)
    }
  }

  const handleRefresh = async () => {
    if (!profile) return
    setRefreshing(true)
    await loadData(profile.id)
    setRefreshing(false)
  }

  if (!loggedIn) {
    return <LoginScreen onLogin={handleLogin} error={loginError} />
  }

  const activeTimesheets = timesheets.filter(t => t.status === 'clocked_in')

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Header */}
      <div className="bg-base-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏥</span>
          <div>
            <p className="font-bold text-sm text-base-content">
              {profile ? `${profile.firstName} ${profile.lastName}` : userEmail}
            </p>
            {activeTimesheets.length > 0 && (
              <p className="text-xs text-warning">⏱ {activeTimesheets.length} active shift(s)</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost btn-sm btn-square" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-ghost btn-sm btn-square" onClick={() => { setLoggedIn(false); setProfile(null) }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-16">
        {tab === 'shifts' && (
          <MyShifts shifts={shifts} onClockIn={handleClockIn} loading={loadingShifts} />
        )}
        {tab === 'timesheets' && (
          <TimesheetHistory timesheets={timesheets} onClockOut={handleClockOut} loading={loadingTimesheets} />
        )}
        {tab === 'profile' && profile && (
          <div className="p-4 space-y-3">
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-12">
                      <span className="text-lg">{profile.firstName?.[0]}{profile.lastName?.[0]}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-base-content">{profile.firstName} {profile.lastName}</p>
                    <p className="text-sm text-base-content/60">{profile.email}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Status</span>
                  <span className={`badge badge-sm ${profile.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                    {profile.status}
                  </span>
                </div>
                {profile.phone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/60">Phone</span>
                    <span className="text-base-content">{profile.phone}</span>
                  </div>
                )}
                {profile.hourlyRate != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/60">Hourly Rate</span>
                    <span className="text-base-content font-medium">${profile.hourlyRate}/hr</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Total Shifts</span>
                  <span className="text-base-content">{shifts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Total Timesheets</span>
                  <span className="text-base-content">{timesheets.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="btm-nav btm-nav-sm bg-base-200 border-t border-base-300">
        <button
          className={tab === 'shifts' ? 'active text-primary' : 'text-base-content/60'}
          onClick={() => setTab('shifts')}
        >
          <Calendar size={18} />
          <span className="btm-nav-label text-xs">Shifts</span>
        </button>
        <button
          className={tab === 'timesheets' ? 'active text-primary' : 'text-base-content/60'}
          onClick={() => setTab('timesheets')}
        >
          <Clock size={18} />
          <span className="btm-nav-label text-xs">Timesheets</span>
        </button>
        <button
          className={tab === 'profile' ? 'active text-primary' : 'text-base-content/60'}
          onClick={() => setTab('profile')}
        >
          <User size={18} />
          <span className="btm-nav-label text-xs">Profile</span>
        </button>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
export default App;
