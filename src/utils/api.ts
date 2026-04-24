// @ts-nocheck
const API_BASE = 'https://gotocare-original.jjioji.workers.dev';
let authToken = '';
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const data = await res.json();
  if (data.token) authToken = data.token;
  return data;
}
export async function fetchMyShifts(caregiverId) {
  const res = await fetch(`${API_BASE}/api/my-shifts?caregiverId=${caregiverId}`, { headers: { 'Authorization': `JWT ${authToken}` } });
  return res.json();
}
export async function fetchShifts(caregiverId) {
  const res = await fetch(`${API_BASE}/api/shifts?where[caregiver][equals]=${caregiverId}&sort=date&depth=1&limit=50`, { headers: { 'Authorization': `JWT ${authToken}` } });
  return res.json();
}
export async function fetchTimesheets(caregiverId) {
  const res = await fetch(`${API_BASE}/api/timesheets?where[caregiver][equals]=${caregiverId}&sort=-date&depth=1&limit=50`, { headers: { 'Authorization': `JWT ${authToken}` } });
  return res.json();
}
export async function clockIn(shiftId) {
  const res = await fetch(`${API_BASE}/api/clock-in`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `JWT ${authToken}` }, body: JSON.stringify({ shiftId }) });
  return res.json();
}
export async function clockOut(timesheetId, hourlyRate) {
  const res = await fetch(`${API_BASE}/api/clock-out`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `JWT ${authToken}` }, body: JSON.stringify({ timesheetId, hourlyRate }) });
  return res.json();
}
export async function fetchCaregiverProfile(email) {
  const res = await fetch(`${API_BASE}/api/caregivers?where[email][equals]=${encodeURIComponent(email)}&depth=0`, { headers: { 'Authorization': `JWT ${authToken}` } });
  return res.json();
}
export function getToken() { return authToken; }
