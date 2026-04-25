// @ts-nocheck
const API_BASE = 'https://gotocare-original.jjioji.workers.dev'

let authToken = ''

async function apiFetch(url: string, options?: RequestInit): Promise<any> {
  const headers: any = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `JWT ${authToken}`;
  const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
  return res.json();
}

export async function login(email: string, password: string): Promise<any> {
  const data = await apiFetch(`${API_BASE}/api/users/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    authToken = data.token;
  }
  return data;
}

export async function fetchMyShifts(caregiverId: number): Promise<any> {
  return apiFetch(`${API_BASE}/api/my-shifts?caregiverId=${caregiverId}`);
}

export async function fetchShifts(caregiverId: number): Promise<any> {
  return apiFetch(`${API_BASE}/api/shifts?where[caregiver][equals]=${caregiverId}&sort=date&depth=1&limit=50`);
}

export async function fetchTimesheets(caregiverId: number): Promise<any> {
  return apiFetch(`${API_BASE}/api/timesheets?where[caregiver][equals]=${caregiverId}&sort=-date&depth=1&limit=50`);
}

export async function clockIn(shiftId: number): Promise<any> {
  return apiFetch(`${API_BASE}/api/clock-in`, {
    method: 'POST',
    body: JSON.stringify({ shiftId }),
  });
}

export async function clockOut(timesheetId: number, hourlyRate: number): Promise<any> {
  return apiFetch(`${API_BASE}/api/clock-out`, {
    method: 'POST',
    body: JSON.stringify({ timesheetId, hourlyRate }),
  });
}

export async function fetchCaregiverProfile(email: string): Promise<any> {
  return apiFetch(`${API_BASE}/api/caregivers?where[email][equals]=${encodeURIComponent(email)}&depth=0`);
}

export function getToken() {
  return authToken;
}
