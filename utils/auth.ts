// @ts-nocheck

const TOKEN_KEY = 'cgp_token'
const ACCOUNT_KEY = 'cgp_account'
const AUTH_TYPE_KEY = 'cgp_auth_type'

export type AuthType = 'marketplace' | 'agency'

export interface MarketplaceAccount {
  id: number
  email: string
  name: string
  zipCode: string
  careTypes: string[]
  phone?: string
  bio?: string
  photoUrl?: string
  setupComplete: boolean
}

export function saveMarketplaceAuth(token: string, account: MarketplaceAccount) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account))
  localStorage.setItem(AUTH_TYPE_KEY, 'marketplace')
}

export function getMarketplaceToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getMarketplaceAccount(): MarketplaceAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function getAuthType(): AuthType | null {
  return localStorage.getItem(AUTH_TYPE_KEY) as AuthType | null
}

export function isMarketplaceAuth(): boolean {
  return localStorage.getItem(AUTH_TYPE_KEY) === 'marketplace'
}

export function clearMarketplaceAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ACCOUNT_KEY)
  localStorage.removeItem(AUTH_TYPE_KEY)
}

export function updateMarketplaceAccount(updates: Partial<MarketplaceAccount>) {
  const current = getMarketplaceAccount()
  if (current) {
    const updated = { ...current, ...updates }
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(updated))
  }
}
