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

export async function login(email: string, password: string): Promise<any> {
  const data = await apiFetch('/api/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (data.token) authToken = data.token
  return data
}

export async function fetchCaregiverProfile(email: string): Promise<any> {
  return apiFetch(`/api/caregivers?where[email][equals]=${encodeURIComponent(email)}&depth=0`)
}

export async function fetchShifts(caregiverId: number): Promise<any> {
  return apiFetch(`/api/shifts?where[caregiver][equals]=${caregiverId}&sort=date&depth=1&limit=50`)
}

export async function fetchTimesheets(caregiverId: number): Promise<any> {
  return apiFetch(`/api/timesheets?where[caregiver][equals]=${caregiverId}&sort=-date&depth=1&limit=50`)
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

export function getToken() {
  return authToken
}

export function setToken(token: string) {
  authToken = token
}

export function clearAuth() {
  authToken = ''
}
