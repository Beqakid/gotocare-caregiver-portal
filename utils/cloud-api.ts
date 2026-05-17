// @ts-nocheck
// Cloud API utility — syncs caregiver tools to D1
// Falls back gracefully if no token or network error

const BASE = 'https://gotocare-original.jjioji.workers.dev/api'

function getToken(): string | null {
  try { return localStorage.getItem('cgp_token') } catch { return null }
}

// ---- TIME ENTRIES ----
export async function cloudGetTimeEntries(): Promise<any[]> {
  const token = getToken()
  if (!token) return []
  try {
    const res = await fetch(`${BASE}/caregiver-time-entries?token=${token}`)
    const data = await res.json()
    return data.success ? data.entries : []
  } catch { return [] }
}

export async function cloudAddTimeEntry(entry: any): Promise<string | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(`${BASE}/caregiver-time-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, entry })
    })
    const data = await res.json()
    return data.cloudId ? String(data.cloudId) : null
  } catch { return null }
}

export async function cloudDeleteTimeEntry(cloudId: string): Promise<void> {
  const token = getToken()
  if (!token) return
  try {
    await fetch(`${BASE}/caregiver-time-entries?token=${token}&cloudId=${cloudId}`, { method: 'DELETE' })
  } catch {}
}

// ---- ACTIVE TIMER ----
export async function cloudGetActiveTimer(): Promise<any | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(`${BASE}/caregiver-active-timer?token=${token}`)
    const data = await res.json()
    return data.timer || null
  } catch { return null }
}

export async function cloudSetActiveTimer(timer: any | null): Promise<void> {
  const token = getToken()
  if (!token) return
  try {
    await fetch(`${BASE}/caregiver-active-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, timer })
    })
  } catch {}
}

// ---- PERSONAL INVOICES ----
export async function cloudGetInvoices(): Promise<any[]> {
  const token = getToken()
  if (!token) return []
  try {
    const res = await fetch(`${BASE}/caregiver-personal-invoices?token=${token}`)
    const data = await res.json()
    return data.success ? (data.invoices || []).map((invoice: any) => ({
      ...invoice,
      id: invoice.id || (invoice.cloudId ? `cloud_${invoice.cloudId}` : ''),
      invoiceNumber: invoice.invoiceNumber || invoice.invoice_number || '',
      clientName: invoice.clientName || invoice.client_name || '',
      clientEmail: invoice.clientEmail || invoice.client_email || '',
      items: invoice.items || invoice.lineItems || invoice.line_items || [],
      subtotal: Number(invoice.subtotal ?? invoice.amount ?? invoice.total ?? 0),
      total: Number(invoice.total ?? invoice.amount ?? invoice.subtotal ?? 0),
      status: invoice.status || 'draft',
      issueDate: invoice.issueDate || invoice.issuedDate || invoice.issued_date || '',
      dueDate: invoice.dueDate || invoice.due_date || '',
      notes: invoice.notes || '',
    })) : []
  } catch { return [] }
}

export async function cloudAddInvoice(invoice: any): Promise<string | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(`${BASE}/caregiver-personal-invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, invoice })
    })
    const data = await res.json()
    return data.cloudId ? String(data.cloudId) : null
  } catch { return null }
}

export async function cloudUpdateInvoiceStatus(cloudId: string, status: string): Promise<void> {
  const token = getToken()
  if (!token) return
  try {
    // Use POST with cloudId + updates (PATCH not supported by Payload CMS router)
    await fetch(`${BASE}/caregiver-personal-invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, cloudId, updates: { status } })
    })
  } catch {}
}

export async function cloudUpdateInvoice(cloudId: string, updates: any): Promise<void> {
  const token = getToken()
  if (!token) return
  try {
    await fetch(`${BASE}/caregiver-personal-invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, cloudId, updates })
    })
  } catch {}
}

export async function cloudSendInvoice(invoice: any): Promise<any> {
  const token = getToken()
  if (!token) throw new Error('Sign in before sending invoices.')
  const cloudId = invoice.cloudId || (String(invoice.id || '').startsWith('cloud_') ? String(invoice.id).replace(/^cloud_/, '') : '')
  const res = await fetch(`${BASE}/caregiver-invoice-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, cloudId, invoice })
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.error || 'Invoice email could not be sent.')
  return data
}

export async function cloudDeleteInvoice(cloudId: string): Promise<void> {
  const token = getToken()
  if (!token) return
  try {
    await fetch(`${BASE}/caregiver-personal-invoices?token=${token}&cloudId=${cloudId}`, { method: 'DELETE' })
  } catch {}
}

// ---- PRIVATE CLIENTS ----
export async function cloudGetPrivateClients(): Promise<any[]> {
  const token = getToken()
  if (!token) return []
  try {
    const res = await fetch(`${BASE}/caregiver-private-clients?token=${token}`)
    const data = await res.json()
    return data.success ? data.clients : []
  } catch { return [] }
}

export async function cloudAddPrivateClient(client: any): Promise<string | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(`${BASE}/caregiver-private-clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, client })
    })
    const data = await res.json()
    return data.cloudId ? String(data.cloudId) : null
  } catch { return null }
}

export async function cloudDeletePrivateClient(cloudId: string): Promise<void> {
  const token = getToken()
  if (!token) return
  try {
    await fetch(`${BASE}/caregiver-private-clients?token=${token}&cloudId=${cloudId}`, { method: 'DELETE' })
  } catch {}
}

// ---- MILEAGE ----
export async function cloudGetMileage(): Promise<any[]> {
  const token = getToken()
  if (!token) return []
  try {
    const res = await fetch(`${BASE}/caregiver-mileage?token=${token}`)
    const data = await res.json()
    return data.success ? data.entries : []
  } catch { return [] }
}

export async function cloudAddMileage(entry: any): Promise<string | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(`${BASE}/caregiver-mileage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, entry })
    })
    const data = await res.json()
    return data.cloudId ? String(data.cloudId) : null
  } catch { return null }
}

export async function cloudDeleteMileage(cloudId: string): Promise<void> {
  const token = getToken()
  if (!token) return
  try {
    await fetch(`${BASE}/caregiver-mileage?token=${token}&cloudId=${cloudId}`, { method: 'DELETE' })
  } catch {}
}
