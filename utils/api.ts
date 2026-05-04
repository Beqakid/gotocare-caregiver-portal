// @ts-nocheck
const API_BASE = 'https://gotocare-original.jjioji.workers.dev'

let authToken = ''

async function apiFetch(endpoint: string, options?: RequestInit): Promise<any> {
  const headers: any = { 'Content-Type': 'application/json' }
  if (authToken) headers['Authorization'] = `JWT ${authToken}`
  
  const url = `${API_BASE}${endpoint}`
  const method = options?.method || 'GET'
  const body = options?.body || ''
  
  // In instant app sandbox, fetch() is blocked by CSP — use runCommand as proxy
  if (window.tasklet?.runCommand) {
    let cmd = `curl -s -X ${method} "${url}" -H "Content-Type: application/json"`
    if (authToken) cmd += ` -H "Authorization: JWT ${authToken}"`
    if (body) cmd += ` -d '${typeof body === 'string' ? body : JSON.stringify(body)}'`
    
    const result = await window.tasklet.runCommand(cmd)
    try {
      return JSON.parse(result.log || '{}')
    } catch {
      return { error: result.log || 'Unknown error' }
    }
  }
  
  // Production: standard fetch
  const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } })
  return res.json()
}

// ── Payload CMS auth (agency caregivers) ──
export async function login(email: string, password: string): Promise<any> {
  const data = await apiFetch('/api/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (data.token) authToken = data.token
  return data
}

// ── Marketplace caregiver auth ──
export async function marketplaceRegister(name: string, email: string, password: string): Promise<any> {
  return apiFetch('/api/caregiver-register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export async function marketplaceLogin(email: string, password: string): Promise<any> {
  return apiFetch('/api/caregiver-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function googleAuth(credential: string): Promise<any> {
  return apiFetch('/api/caregiver-auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  })
}

export async function validateMarketplaceToken(token: string): Promise<any> {
  const url = `${API_BASE}/api/caregiver-account?token=${token}`
  const res = await fetch(url)
  return res.json()
}

export async function saveCaregiverSetup(token: string, zipCode: string, careTypes: string[]): Promise<any> {
  return apiFetch('/api/caregiver-setup', {
    method: 'POST',
    body: JSON.stringify({ token, zipCode, careTypes }),
  })
}

// ── Existing endpoints ──
export async function fetchCaregiverProfile(email: string): Promise<any> {
  return apiFetch(`/api/caregivers?where[email][equals]=${encodeURIComponent(email)}&depth=0`)
}

export async function fetchShifts(caregiverId: number): Promise<any> {
  return apiFetch(`/api/shifts?where[caregiver][equals]=${caregiverId}&sort=date&depth=1&limit=50`)
}

export async function fetchTimesheets(caregiverId: number): Promise<any> {
  return apiFetch(`/api/timesheets?where[caregiver][equals]=${caregiverId}&sort=-date&depth=1&limit=50`)
}

export async function fetchBookings(caregiverId: number | string): Promise<any> {
  return apiFetch(`/api/caregiver-bookings?caregiverId=${caregiverId}`)
}

export async function updateBookingStatus(bookingId: number, status: 'accepted' | 'declined'): Promise<any> {
  return apiFetch('/api/update-booking', {
    method: 'POST',
    body: JSON.stringify({ bookingId, status }),
  })
}

export async function clockIn(shiftId: number): Promise<any> {
  return apiFetch('/api/clock-in', {
    method: 'POST',
    body: JSON.stringify({ shiftId }),
  })
}

export async function clockOut(timesheetId: number, hourlyRate: number): Promise<any> {
  return apiFetch('/api/clock-out', {
    method: 'POST',
    body: JSON.stringify({ timesheetId, hourlyRate }),
  })
}

export async function updateProfile(caregiverId: number, data: any): Promise<any> {
  return apiFetch(`/api/caregivers/${caregiverId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function getToken() { return authToken }
export function setToken(token: string) { authToken = token }
export function clearAuth() { authToken = '' }
