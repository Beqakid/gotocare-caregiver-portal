// Phase 25 — Geofence & Location Utilities
// Carehia uses location ONLY at check-in / check-out — not continuously.

export interface Coordinates {
  lat: number
  lng: number
  accuracy?: number   // metres (from browser Geolocation API)
  timestamp?: number
}

export type LocationMode =
  | 'fixed_location'    // in-home care — must be at address
  | 'travel_allowed'    // errands / transport — start at address, end anywhere
  | 'remote_allowed'    // telehealth / remote — always ok
  | 'manual_required'   // force manual regardless of GPS

export interface CareLocation {
  lat: number
  lng: number
  radiusMeters: number   // default 100
  address?: string
  mode: LocationMode
}

export type CheckInReason =
  | 'confirmed_location'
  | 'outside_geofence'
  | 'gps_unavailable'
  | 'gps_weak'
  | 'too_early'
  | 'no_location_data'
  | 'manual_required'
  | 'remote_allowed'

export interface CheckInEligibility {
  allowed: boolean
  reason: CheckInReason
  distanceMeters?: number
  minutesUntilStart?: number
}

// ── Haversine distance ──────────────────────────────────────────────────────
const EARTH_R = 6_371_000 // metres

export function calculateDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_R * Math.asin(Math.sqrt(a))
}

// ── Within-geofence check (GPS-accuracy-aware) ──────────────────────────────
export function isWithinCareLocation(p: {
  caregiverLat: number
  caregiverLng: number
  careLat: number
  careLng: number
  radiusMeters: number
  gpsAccuracyMeters?: number
}): boolean {
  const dist = calculateDistanceMeters(p.caregiverLat, p.caregiverLng, p.careLat, p.careLng)
  // Add half of GPS uncertainty as a leniency buffer
  const effective = p.radiusMeters + (p.gpsAccuracyMeters ?? 0) / 2
  return dist <= effective
}

// ── Early-check window: allow 15 min before scheduled start ─────────────────
const EARLY_MINUTES = 15

export function getCheckInEligibility(p: {
  currentLocation: Coordinates | null
  careLocation: CareLocation | null
  scheduledStart: string | null
  locationMode: LocationMode
}): CheckInEligibility {
  const { currentLocation, careLocation, scheduledStart, locationMode } = p

  if (locationMode === 'remote_allowed') return { allowed: true, reason: 'remote_allowed' }
  if (locationMode === 'manual_required') return { allowed: false, reason: 'manual_required' }

  // No care-location coords set up yet
  if (!careLocation || (!careLocation.lat && !careLocation.lng)) {
    return { allowed: false, reason: 'no_location_data' }
  }

  // GPS not available
  if (!currentLocation) return { allowed: false, reason: 'gps_unavailable' }

  // GPS accuracy too poor (> 150 m)
  if (currentLocation.accuracy != null && currentLocation.accuracy > 150) {
    return { allowed: false, reason: 'gps_weak' }
  }

  // Too early
  if (scheduledStart) {
    const minsUntil = (new Date(scheduledStart).getTime() - Date.now()) / 60_000
    if (minsUntil > EARLY_MINUTES) {
      return { allowed: false, reason: 'too_early', minutesUntilStart: Math.round(minsUntil) }
    }
  }

  const dist = calculateDistanceMeters(
    currentLocation.lat, currentLocation.lng,
    careLocation.lat, careLocation.lng,
  )

  // travel_allowed: start must still be at care location (check-out anywhere)
  if (locationMode === 'travel_allowed') {
    const inZone = isWithinCareLocation({
      caregiverLat: currentLocation.lat, caregiverLng: currentLocation.lng,
      careLat: careLocation.lat, careLng: careLocation.lng,
      radiusMeters: careLocation.radiusMeters, gpsAccuracyMeters: currentLocation.accuracy,
    })
    return { allowed: inZone, reason: inZone ? 'confirmed_location' : 'outside_geofence', distanceMeters: Math.round(dist) }
  }

  const inZone = isWithinCareLocation({
    caregiverLat: currentLocation.lat, caregiverLng: currentLocation.lng,
    careLat: careLocation.lat, careLng: careLocation.lng,
    radiusMeters: careLocation.radiusMeters, gpsAccuracyMeters: currentLocation.accuracy,
  })
  return {
    allowed: inZone,
    reason: inZone ? 'confirmed_location' : 'outside_geofence',
    distanceMeters: Math.round(dist),
  }
}

// ── Browser geolocation wrapper ─────────────────────────────────────────────
export async function getCurrentPosition(): Promise<Coordinates | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 10_000)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout)
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        })
      },
      () => { clearTimeout(timeout); resolve(null) },
      { enableHighAccuracy: true, timeout: 9_000, maximumAge: 30_000 },
    )
  })
}

// ── Extract care location from a Shift (Payload CMS or D1) ──────────────────
export function extractCareLocation(shift: any): CareLocation | null {
  if (!shift) return null
  const loc = shift.location
  if (!loc) return null
  const lat = loc.latitude ?? loc.lat ?? null
  const lng = loc.longitude ?? loc.lng ?? null
  if (!lat || !lng) return null
  const mode: LocationMode = (() => {
    const ct = (shift.careType || '').toLowerCase()
    if (/transport|errand|shopping|doctor|mobility/.test(ct)) return 'travel_allowed'
    if (/remote|virtual|tele/.test(ct)) return 'remote_allowed'
    return 'fixed_location'
  })()
  return { lat, lng, radiusMeters: loc.radiusMeters ?? 100, address: loc.address, mode }
}
