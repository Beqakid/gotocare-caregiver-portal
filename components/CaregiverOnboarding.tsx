// @ts-nocheck
import React, { useState, useCallback, useEffect, useRef } from 'react'

// ── Storage keys (UNCHANGED from Phase 23A) ──────────────────────────────────
const DATA_KEY     = 'cgp_onboarding_data'
const STEP_KEY     = 'cgp_onboarding_step'
const COMPLETE_KEY = 'cgp_onboarding_complete'
const COMPLETE_AT  = 'cgp_onboarding_complete_at'
const VERSION_KEY  = 'cgp_onboarding_version'
const ONBOARDING_VERSION = '26b'

// ── Type (UNCHANGED) ─────────────────────────────────────────────────────────
export interface OnboardingData {
  firstName: string
  caregiverTypes: string[]
  caregiverGoals: string[]
  careServices: string[]
  workPreferences: string[]
  serviceArea: string
  travelRadiusMiles: number
  officeTools: string[]
  firstTrustStep: string
}

interface Props {
  profile: any | null
  onComplete: (data: OnboardingData) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function blankData(profile: any): OnboardingData {
  const saved = (() => { try { const r = localStorage.getItem(DATA_KEY); return r ? JSON.parse(r) : null } catch { return null } })()
  return saved || {
    firstName: profile?.firstName || '',
    caregiverTypes: [],
    caregiverGoals: [],
    careServices: [],
    workPreferences: [],
    serviceArea: profile?.location?.zipCode || profile?.location?.city || '',
    travelRadiusMiles: profile?.travelRadiusMiles || 15,
    officeTools: [],
    firstTrustStep: '',
  }
}

function readStep(): number {
  try {
    // Reset step if onboarding version changed (prevents old step mapping to wrong screen)
    const ver = localStorage.getItem(VERSION_KEY)
    if (ver !== ONBOARDING_VERSION) return 0
    const s = parseInt(localStorage.getItem(STEP_KEY) || '0', 10)
    return isNaN(s) ? 0 : Math.min(s, 7)
  } catch { return 0 }
}

function save(data: OnboardingData, step: number) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data))
    localStorage.setItem(STEP_KEY, String(step))
    localStorage.setItem(VERSION_KEY, ONBOARDING_VERSION)
  } catch {}
}

// ── Palette ───────────────────────────────────────────────────────────────────
const P  = '#7C5CFF'
const P2 = '#4A90E2'
const PK = '#C084FC'
const BG = '#F0F4FF'
const WH = '#FFFFFF'

// ── Shared sub-components ─────────────────────────────────────────────────────
const Dot = ({ active }: { active: boolean }) => (
  <div style={{
    width: active ? 20 : 8, height: 8,
    borderRadius: 4,
    background: active ? P : 'rgba(124,92,255,0.22)',
    transition: 'all 0.3s ease',
  }} />
)

const KaiHint = ({ text }: { text: string }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: 10,
    background: 'linear-gradient(135deg,rgba(124,92,255,0.08),rgba(74,144,226,0.06))',
    border: '1px solid rgba(124,92,255,0.18)',
    borderRadius: 14, padding: '11px 13px', marginTop: 16,
  }}>
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: 'linear-gradient(135deg,#7C5CFF,#4A90E2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, flexShrink: 0,
    }}>&#x2728;</div>
    <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: '1.5', fontStyle: 'italic' }}>
      <strong style={{ color: P, fontStyle: 'normal' }}>Kai: </strong>{text}
    </p>
  </div>
)

function KeyPoint({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'rgba(124,92,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, flexShrink: 0,
      }}>{icon}</div>
      <span style={{ fontSize: 14, color: '#374151', lineHeight: '1.4' }}>{text}</span>
    </div>
  )
}

function MultiChip({
  options, selected, onToggle, maxSelect,
}: { options: string[]; selected: string[]; onToggle: (v: string) => void; maxSelect?: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const active = selected.includes(opt)
        const disabled = !active && maxSelect !== undefined && selected.length >= maxSelect
        return (
          <button
            key={opt}
            onClick={() => !disabled && onToggle(opt)}
            style={{
              padding: '7px 14px', borderRadius: 50,
              fontSize: 13, fontWeight: active ? 600 : 500,
              border: `1.5px solid ${active ? P : 'rgba(148,163,184,0.4)'}`,
              background: active ? `linear-gradient(135deg,${P},${P2})` : 'rgba(255,255,255,0.7)',
              color: active ? '#fff' : disabled ? '#cbd5e1' : '#374151',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'all 0.18s',
              boxShadow: active ? `0 2px 8px rgba(124,92,255,0.28)` : 'none',
            }}
          >{opt}</button>
        )
      })}
    </div>
  )
}

// ── Illustration components ───────────────────────────────────────────────────

const IlluWelcome = () => (
  <svg viewBox="0 0 340 220" style={{ width: '100%', height: '100%' }} aria-label="Caregiver offering warm support to an older adult in a calm home setting">
    {/* soft BG rings */}
    <circle cx="170" cy="115" r="105" fill="rgba(192,132,252,0.10)"/>
    <circle cx="170" cy="115" r="75"  fill="rgba(124,92,255,0.09)"/>
    {/* window / sunlight */}
    <rect x="210" y="28" width="82" height="110" rx="6" fill="rgba(255,237,180,0.5)" stroke="rgba(251,191,36,0.35)" strokeWidth="1.5"/>
    <line x1="251" y1="28" x2="251" y2="138" stroke="rgba(251,191,36,0.4)" strokeWidth="1.5"/>
    <line x1="210" y1="83" x2="292" y2="83" stroke="rgba(251,191,36,0.4)" strokeWidth="1.5"/>
    {/* sun rays */}
    <circle cx="292" cy="52" r="14" fill="rgba(252,211,77,0.55)"/>
    <circle cx="292" cy="52" r="8" fill="rgba(252,211,77,0.9)"/>
    {/* couch / seat */}
    <rect x="50" y="155" width="240" height="28" rx="10" fill="rgba(192,132,252,0.22)" stroke="rgba(124,92,255,0.18)" strokeWidth="1"/>
    <rect x="60" y="140" width="40" height="30" rx="6" fill="rgba(192,132,252,0.3)"/>
    <rect x="245" y="140" width="40" height="30" rx="6" fill="rgba(192,132,252,0.3)"/>
    {/* elder figure - seated */}
    <circle cx="135" cy="105" r="22" fill="#FDDCAA"/>
    <rect x="113" y="125" width="44" height="38" rx="10" fill="#94a3b8"/>
    {/* caregiver figure - standing */}
    <circle cx="220" cy="90" r="24" fill="#FBB99C"/>
    <rect x="197" y="112" width="46" height="50" rx="10" fill={P}/>
    {/* caregiver's arm reaching out */}
    <path d="M 200 125 Q 175 132 155 122" stroke={P} strokeWidth="10" strokeLinecap="round" fill="none"/>
    {/* hand clasp */}
    <circle cx="155" cy="122" r="8" fill="#FBB99C"/>
    <circle cx="148" cy="119" r="7" fill="#FDDCAA"/>
    {/* heart floats */}
    <text x="90" y="75" fontSize="16" fill={PK} opacity="0.8">&#x2764;</text>
    <text x="185" y="60" fontSize="12" fill={P} opacity="0.7">&#x2764;</text>
    <text x="255" y="95" fontSize="10" fill="#F472B6" opacity="0.6">&#x2764;</text>
    {/* Carehia badge on caregiver */}
    <rect x="208" y="114" width="30" height="14" rx="4" fill="rgba(255,255,255,0.85)"/>
    <text x="223" y="123" fontSize="8" textAnchor="middle" fill={P} fontWeight="700">Carehia</text>
  </svg>
)

const IlluOrganized = () => (
  <svg viewBox="0 0 340 220" style={{ width: '100%', height: '100%' }} aria-label="Organized caregiver tools: clock, calendar, invoice, and checklist">
    <circle cx="170" cy="110" r="100" fill="rgba(255,255,255,0.08)"/>
    {/* Clock card */}
    <g transform="translate(35,30)">
      <rect width="120" height="80" rx="16" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
      <circle cx="60" cy="36" r="22" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
      <line x1="60" y1="36" x2="60" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      <line x1="60" y1="36" x2="72" y2="36" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      <text x="60" y="72" fontSize="10" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontWeight="600">Track Hours</text>
    </g>
    {/* Invoice card */}
    <g transform="translate(185,30)">
      <rect width="120" height="80" rx="16" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
      <rect x="35" y="14" width="50" height="40" rx="6" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <line x1="42" y1="25" x2="78" y2="25" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
      <line x1="42" y1="33" x2="70" y2="33" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
      <line x1="42" y1="41" x2="65" y2="41" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      <text x="60" y="72" fontSize="10" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontWeight="600">Invoices</text>
    </g>
    {/* Clients card */}
    <g transform="translate(35,125)">
      <rect width="120" height="80" rx="16" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
      <circle cx="48" cy="36" r="12" fill="rgba(255,255,255,0.2)"/>
      <circle cx="60" cy="36" r="12" fill="rgba(255,255,255,0.25)"/>
      <circle cx="72" cy="36" r="12" fill="rgba(255,255,255,0.3)"/>
      <text x="60" y="72" fontSize="10" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontWeight="600">Manage Clients</text>
    </g>
    {/* Checklist card */}
    <g transform="translate(185,125)">
      <rect width="120" height="80" rx="16" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
      <rect x="30" y="16" width="14" height="14" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <text x="37" y="27" fontSize="10" textAnchor="middle" fill="#fff">✓</text>
      <line x1="52" y1="23" x2="85" y2="23" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <rect x="30" y="36" width="14" height="14" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <text x="37" y="47" fontSize="10" textAnchor="middle" fill="#fff">✓</text>
      <line x1="52" y1="43" x2="80" y2="43" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <text x="60" y="72" fontSize="10" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontWeight="600">Stay Organized</text>
    </g>
  </svg>
)

const IlluProfile = () => (
  <svg viewBox="0 0 340 220" style={{ width: '100%', height: '100%' }} aria-label="A caregiver profile card with experience, services, and reviews">
    <circle cx="170" cy="110" r="95" fill="rgba(255,255,255,0.06)"/>
    {/* Profile card */}
    <rect x="70" y="22" width="200" height="180" rx="20" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
    {/* Avatar */}
    <circle cx="170" cy="62" r="28" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
    <text x="170" y="70" fontSize="22" textAnchor="middle">👤</text>
    {/* Name line */}
    <rect x="125" y="98" width="90" height="10" rx="5" fill="rgba(255,255,255,0.4)"/>
    {/* Badge */}
    <rect x="135" y="114" width="70" height="18" rx="9" fill="rgba(34,197,94,0.3)" stroke="rgba(34,197,94,0.5)" strokeWidth="1"/>
    <text x="170" y="126" fontSize="8" textAnchor="middle" fill="#fff" fontWeight="600">✓ Verified</text>
    {/* Service tags */}
    <rect x="88" y="142" width="60" height="16" rx="8" fill="rgba(255,255,255,0.2)"/>
    <text x="118" y="153" fontSize="7" textAnchor="middle" fill="rgba(255,255,255,0.8)">Personal Care</text>
    <rect x="155" y="142" width="55" height="16" rx="8" fill="rgba(255,255,255,0.2)"/>
    <text x="183" y="153" fontSize="7" textAnchor="middle" fill="rgba(255,255,255,0.8)">Companion</text>
    <rect x="216" y="142" width="40" height="16" rx="8" fill="rgba(255,255,255,0.2)"/>
    <text x="236" y="153" fontSize="7" textAnchor="middle" fill="rgba(255,255,255,0.8)">+3</text>
    {/* Stars */}
    <text x="170" y="178" fontSize="14" textAnchor="middle" fill="rgba(252,211,77,0.9)">★★★★★</text>
    {/* Share link hint */}
    <rect x="115" y="185" width="110" height="14" rx="7" fill="rgba(255,255,255,0.12)"/>
    <text x="170" y="195" fontSize="7" textAnchor="middle" fill="rgba(255,255,255,0.7)">🔗 Share your profile link</text>
  </svg>
)

const IlluTrust = () => (
  <svg viewBox="0 0 340 220" style={{ width: '100%', height: '100%' }} aria-label="Trust Passport shield with verification steps">
    <circle cx="170" cy="110" r="95" fill="rgba(255,255,255,0.06)"/>
    {/* Shield shape */}
    <path d="M170 28 L240 58 L240 130 Q240 180 170 200 Q100 180 100 130 L100 58 Z"
      fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
    {/* Inner glow */}
    <path d="M170 48 L225 70 L225 128 Q225 165 170 182 Q115 165 115 128 L115 70 Z"
      fill="rgba(255,255,255,0.08)"/>
    {/* Check steps */}
    <g transform="translate(135,72)">
      <circle r="10" cx="10" cy="10" fill="rgba(34,197,94,0.4)"/>
      <text x="10" y="14" fontSize="10" textAnchor="middle" fill="#fff">✓</text>
      <text x="30" y="14" fontSize="9" fill="rgba(255,255,255,0.9)" fontWeight="500">Phone verified</text>
    </g>
    <g transform="translate(135,100)">
      <circle r="10" cx="10" cy="10" fill="rgba(34,197,94,0.4)"/>
      <text x="10" y="14" fontSize="10" textAnchor="middle" fill="#fff">✓</text>
      <text x="30" y="14" fontSize="9" fill="rgba(255,255,255,0.9)" fontWeight="500">ID uploaded</text>
    </g>
    <g transform="translate(135,128)">
      <circle r="10" cx="10" cy="10" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
      <text x="30" y="14" fontSize="9" fill="rgba(255,255,255,0.7)" fontWeight="500">References</text>
    </g>
    <g transform="translate(135,156)">
      <circle r="10" cx="10" cy="10" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
      <text x="30" y="14" fontSize="9" fill="rgba(255,255,255,0.7)" fontWeight="500">More steps</text>
    </g>
    {/* Trust Passport label */}
    <rect x="120" y="184" width="100" height="20" rx="10" fill="rgba(255,255,255,0.15)"/>
    <text x="170" y="198" fontSize="9" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontWeight="700">🛡️ Trust Passport</text>
  </svg>
)

const IlluKai = () => (
  <svg viewBox="0 0 340 220" style={{ width: '100%', height: '100%' }} aria-label="Kai, your Carehia guide — a friendly AI assistant orb">
    {/* Outer glow rings */}
    <circle cx="170" cy="100" r="90" fill="rgba(255,255,255,0.04)"/>
    <circle cx="170" cy="100" r="70" fill="rgba(255,255,255,0.06)"/>
    <circle cx="170" cy="100" r="50" fill="rgba(255,255,255,0.08)"/>
    {/* Kai orb */}
    <defs>
      <linearGradient id="kaig" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#fff" stopOpacity="0.3"/>
        <stop offset="1" stopColor="#fff" stopOpacity="0.1"/>
      </linearGradient>
      <filter id="kglow">
        <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="rgba(255,255,255,0.4)"/>
      </filter>
    </defs>
    <circle cx="170" cy="100" r="36" fill="url(#kaig)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" filter="url(#kglow)"/>
    <text x="170" y="95" fontSize="24" textAnchor="middle">✨</text>
    <text x="170" y="115" fontSize="12" textAnchor="middle" fill="#fff" fontWeight="800">Kai</text>
    {/* Floating action hints */}
    {[
      { x: 60, y: 50, text: '📋 Complete profile', w: 95 },
      { x: 235, y: 45, text: '🛡️ Trust Passport', w: 90 },
      { x: 45, y: 150, text: '⏰ Track hours', w: 80 },
      { x: 230, y: 155, text: '💰 Create invoice', w: 90 },
      { x: 130, y: 185, text: '📞 Verify phone', w: 82 },
    ].map(({ x, y, text, w }) => (
      <g key={text}>
        <rect x={x - w/2} y={y - 10} width={w} height="20" rx="10"
          fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
        <text x={x} y={y + 4} fontSize="8" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontWeight="500">{text}</text>
      </g>
    ))}
    {/* Connection lines from orb to hints */}
    {[
      { x1: 145, y1: 78, x2: 90, y2: 55 },
      { x1: 195, y1: 78, x2: 255, y2: 50 },
      { x1: 145, y1: 122, x2: 75, y2: 148 },
      { x1: 195, y1: 122, x2: 250, y2: 152 },
      { x1: 170, y1: 132, x2: 170, y2: 175 },
    ].map(({ x1, y1, x2, y2 }, i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3"/>
    ))}
  </svg>
)

const IlluFree = () => (
  <svg viewBox="0 0 340 220" style={{ width: '100%', height: '100%' }} aria-label="Free launch year access celebration with gift and confetti">
    <circle cx="170" cy="110" r="90" fill="rgba(255,255,255,0.06)"/>
    {/* Gift box */}
    <rect x="130" y="90" width="80" height="65" rx="8" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
    {/* Ribbon vertical */}
    <rect x="165" y="90" width="10" height="65" fill="rgba(255,255,255,0.15)"/>
    {/* Lid */}
    <rect x="122" y="78" width="96" height="18" rx="6" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
    {/* Bow */}
    <ellipse cx="160" cy="78" rx="14" ry="10" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
    <ellipse cx="180" cy="78" rx="14" ry="10" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
    <circle cx="170" cy="78" r="5" fill="rgba(255,255,255,0.3)"/>
    {/* FREE badge */}
    <rect x="140" y="110" width="60" height="24" rx="12" fill="rgba(34,197,94,0.35)" stroke="rgba(34,197,94,0.6)" strokeWidth="1.5"/>
    <text x="170" y="126" fontSize="11" textAnchor="middle" fill="#fff" fontWeight="800">FREE</text>
    {/* Confetti / sparkles */}
    {['🎉','✨','🌟','💜','⭐','🎊','💫','✨'].map((e, i) => (
      <text key={i} x={30 + i * 40} y={25 + (i % 3) * 18} fontSize={10 + (i % 3) * 4}
        textAnchor="middle" opacity={0.5 + (i % 3) * 0.15}>{e}</text>
    ))}
    {/* Year banner */}
    <rect x="105" y="170" width="130" height="22" rx="11" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
    <text x="170" y="185" fontSize="9" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontWeight="600">🚀 Launch year — all features included</text>
  </svg>
)

const IlluSetup = () => (
  <svg viewBox="0 0 340 220" style={{ width: '100%', height: '100%' }} aria-label="Quick setup: choose your caregiver type and services">
    <circle cx="170" cy="110" r="95" fill="rgba(255,255,255,0.05)"/>
    {/* Cards grid */}
    {[
      { x: 28, label: 'CNA', icon: '🏥', op: 0.25 },
      { x: 108, label: 'Companion', icon: '🤝', op: 0.20 },
      { x: 188, label: 'Live-In', icon: '🏠', op: 0.25 },
      { x: 268, label: 'Private', icon: '⭐', op: 0.20 },
    ].map(({ x, label, icon, op }) => (
      <g key={x}>
        <rect x={x} y="35" width="62" height="72" rx="14"
          fill={`rgba(255,255,255,${op})`} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
        <text x={x + 31} y="72" fontSize="18" textAnchor="middle">{icon}</text>
        <text x={x + 31} y="95" fontSize="8" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontWeight="600">{label}</text>
      </g>
    ))}
    {/* Services row */}
    {[
      { x: 48, label: 'Meals', icon: '🍽️' },
      { x: 128, label: 'Transport', icon: '🚗' },
      { x: 208, label: 'Mobility', icon: '🚶' },
      { x: 288, label: 'Overnight', icon: '🌙' },
    ].map(({ x, label, icon }) => (
      <g key={x}>
        <rect x={x - 30} y="125" width="60" height="55" rx="12"
          fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
        <text x={x} y="155" fontSize="16" textAnchor="middle">{icon}</text>
        <text x={x} y="172" fontSize="7" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontWeight="500">{label}</text>
      </g>
    ))}
    <text x="170" y="210" fontSize="9" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontWeight="600">
      Tell us a little about your care work
    </text>
  </svg>
)

const IlluOfficeReady = ({ name }: { name: string }) => (
  <svg viewBox="0 0 340 215" style={{ width: '100%', height: '100%' }} aria-label="Carehia caregiver office dashboard with Kai, profile, Trust Passport, clock-in, and invoice cards">
    {/* confetti */}
    {['🎉','✨','🌟','💜','🎊','⭐','💫','🌈'].map((e,i) => (
      <text key={i} x={28+(i*38)} y={12+(i%3)*10} fontSize={10+(i%3)*3} textAnchor="middle" opacity={0.7+(i%3)*0.1}>{e}</text>
    ))}
    {/* glow ring */}
    <circle cx="170" cy="125" r="88" fill="rgba(124,92,255,0.07)"/>
    <circle cx="170" cy="125" r="65" fill="rgba(192,132,252,0.07)"/>
    {/* central Kai orb */}
    <circle cx="170" cy="118" r="38" fill="url(#readyg)" filter="url(#ors)"/>
    <text x="170" y="108" fontSize="20" textAnchor="middle">✨</text>
    <text x="170" y="130" fontSize="10" textAnchor="middle" fill="#fff" fontWeight="700">Kai</text>
    <text x="170" y="143" fontSize="8" textAnchor="middle" fill="rgba(255,255,255,0.8)">Your Guide</text>
    {/* surrounding cards */}
    <rect x="20"  y="55"  width="80" height="56" rx="12" fill="#fff" stroke="rgba(124,92,255,0.2)" strokeWidth="1.2" filter="url(#ors)"/>
    <text x="60"  y="83"  fontSize="18" textAnchor="middle">⏰</text>
    <text x="60"  y="100" fontSize="8"  textAnchor="middle" fill="#374151" fontWeight="600">Clock In</text>
    <rect x="240" y="55"  width="80" height="56" rx="12" fill="#fff" stroke="rgba(34,197,94,0.25)" strokeWidth="1.2" filter="url(#ors)"/>
    <text x="280" y="83"  fontSize="18" textAnchor="middle">🛡️</text>
    <text x="280" y="100" fontSize="8"  textAnchor="middle" fill="#374151" fontWeight="600">Trust Passport</text>
    <rect x="20"  y="150" width="80" height="56" rx="12" fill="#fff" stroke="rgba(245,158,11,0.25)" strokeWidth="1.2" filter="url(#ors)"/>
    <text x="60"  y="178" fontSize="18" textAnchor="middle">💰</text>
    <text x="60"  y="195" fontSize="8"  textAnchor="middle" fill="#374151" fontWeight="600">Invoice</text>
    <rect x="240" y="150" width="80" height="56" rx="12" fill="#fff" stroke="rgba(74,144,226,0.25)" strokeWidth="1.2" filter="url(#ors)"/>
    <text x="280" y="178" fontSize="18" textAnchor="middle">👤</text>
    <text x="280" y="195" fontSize="8"  textAnchor="middle" fill="#374151" fontWeight="600">Profile</text>
    {/* launch banner */}
    <rect x="96" y="168" width="148" height="22" rx="8" fill="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.35)" strokeWidth="1"/>
    <text x="170" y="183" fontSize="9" textAnchor="middle" fill="#16a34a" fontWeight="700">✅ Free Launch Access Active</text>
    <defs>
      <filter id="ors"><feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(124,92,255,0.2)"/></filter>
      <linearGradient id="readyg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7C5CFF"/><stop offset="0.5" stopColor="#8B5CF6"/><stop offset="1" stopColor="#4A90E2"/></linearGradient>
    </defs>
  </svg>
)

// ── Screen configuration ──────────────────────────────────────────────────────
const SCREEN_META = [
  { id: 'welcome',    gradient: 'linear-gradient(145deg,#7C5CFF 0%,#C084FC 60%,#4A90E2 100%)' },
  { id: 'organized',  gradient: 'linear-gradient(145deg,#4A90E2 0%,#7C5CFF 100%)' },
  { id: 'profile',    gradient: 'linear-gradient(145deg,#7C5CFF 0%,#C084FC 100%)' },
  { id: 'trust',      gradient: 'linear-gradient(145deg,#22C55E 0%,#4A90E2 70%,#7C5CFF 100%)' },
  { id: 'kai',        gradient: 'linear-gradient(145deg,#7C5CFF 0%,#8B5CF6 50%,#4A90E2 100%)' },
  { id: 'free',       gradient: 'linear-gradient(145deg,#16a34a 0%,#22C55E 50%,#4A90E2 100%)' },
  { id: 'setup',      gradient: 'linear-gradient(145deg,#7C5CFF 0%,#4A90E2 100%)' },
  { id: 'ready',      gradient: 'linear-gradient(145deg,#7C5CFF 0%,#C084FC 50%,#4A90E2 100%)' },
]

const ILLUSTRATIONS = [
  IlluWelcome, IlluOrganized, IlluProfile, IlluTrust, IlluKai, IlluFree, IlluSetup, null /* ready uses special render */,
]

const TOTAL_SCREENS = 8

// ── Data options (unchanged) ──────────────────────────────────────────────────
const CAREGIVER_TYPES = [
  'Private caregiver','Independent caregiver','CNA','HHA',
  'Companion caregiver','Agency caregiver','Facility caregiver',
  'Live-in caregiver','I\'m exploring caregiving',
]

const CARE_SERVICES = [
  'Companion care','Personal care','Dementia care','Meal prep',
  'Medication reminders','Transportation','Respite care',
  'Overnight care','Mobility support','Household support',
]

const WORK_PREFS = [
  'Day shift','Evening shift','Overnight','Weekdays',
  'Weekends','Flexible','Live-in','Part-time','Full-time',
]

// ── Smart defaults map ────────────────────────────────────────────────────────
const TYPE_SERVICE_DEFAULTS: Record<string, string[]> = {
  'CNA': ['Personal care', 'Medication reminders', 'Mobility support'],
  'HHA': ['Personal care', 'Medication reminders', 'Mobility support'],
  'Companion caregiver': ['Companion care', 'Meal prep', 'Transportation'],
  'Live-in caregiver': ['Companion care', 'Personal care', 'Overnight care', 'Household support', 'Meal prep'],
  'Agency caregiver': ['Personal care', 'Medication reminders'],
  'Facility caregiver': ['Personal care', 'Medication reminders'],
  'Private caregiver': ['Companion care', 'Personal care'],
  'Independent caregiver': ['Companion care', 'Personal care'],
  'I\'m exploring caregiving': [],
}

function getSmartDefaults(caregiverTypes: string[]): string[] {
  const defaults = new Set<string>()
  for (const t of caregiverTypes) {
    for (const s of (TYPE_SERVICE_DEFAULTS[t] || [])) {
      defaults.add(s)
    }
  }
  return Array.from(defaults)
}

// ── Main component ────────────────────────────────────────────────────────────
export const CaregiverOnboarding: React.FC<Props> = ({ profile, onComplete }) => {
  // Determine if name input is needed on welcome screen
  const hasName = !!profile?.firstName && profile.firstName !== (profile?.email || '').split('@')[0]

  const [step, setStep]   = useState<number>(readStep)
  const [data, setData]   = useState<OnboardingData>(() => {
    const d = blankData(profile)
    if (hasName && !d.firstName) d.firstName = profile.firstName
    return d
  })
  const [err, setErr]     = useState('')
  const [busy, setBusy]   = useState(false)
  const scrollRef         = useRef<HTMLDivElement>(null)

  // Persist on every change
  useEffect(() => { save(data, step) }, [data, step])

  // Scroll to top on step change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setErr('')
  }, [step])

  const patch = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

  const toggleArr = useCallback((key: keyof OnboardingData, val: string, max?: number) => {
    setData(prev => {
      const arr = (prev[key] as string[])
      const next = arr.includes(val)
        ? arr.filter(v => v !== val)
        : (max && arr.length >= max) ? arr : [...arr, val]
      return { ...prev, [key]: next }
    })
  }, [])

  const validate = (): boolean => {
    // Screen 0: Welcome — require name if not from profile
    if (step === 0 && !hasName && !data.firstName.trim()) {
      setErr('Please enter your first name'); return false
    }
    // Screens 1-5: Informational — no validation
    // Screen 6: Quick Setup — require at least one type and one service
    if (step === 6) {
      if (data.caregiverTypes.length === 0) { setErr('Please select at least one caregiver type'); return false }
      if (data.careServices.length === 0) { setErr('Please select at least one service you provide'); return false }
      if (!data.serviceArea.trim()) { setErr('Please enter your ZIP code or city'); return false }
    }
    return true
  }

  const finishOnboarding = useCallback((openKai?: boolean) => {
    setBusy(true)
    const final = { ...data, officeTools: [], firstTrustStep: '' }
    try {
      localStorage.setItem(COMPLETE_KEY, 'true')
      localStorage.setItem(COMPLETE_AT, new Date().toISOString())
      if (openKai) {
        try { localStorage.setItem('cgp_open_kai_after_onboarding', 'true') } catch {}
      }
      onComplete(final)
    } finally {
      setBusy(false)
    }
  }, [data, onComplete])

  const next = async () => {
    setErr('')
    if (!validate()) return
    // Apply smart service defaults when moving past setup if services are empty
    if (step === 6 && data.careServices.length === 0) {
      const defaults = getSmartDefaults(data.caregiverTypes)
      if (defaults.length > 0) {
        setData(prev => ({ ...prev, careServices: defaults }))
      }
    }
    if (step < 7) { setStep(s => s + 1); return }
    // Step 7 = final — enter office
    finishOnboarding(false)
  }

  const back = () => { if (step > 0) setStep(s => s - 1) }

  // Skip setup — complete with current data + defaults
  const skipForNow = () => finishOnboarding(false)

  const name = data.firstName.trim() || profile?.firstName || 'there'
  const progress = ((step + 1) / TOTAL_SCREENS) * 100

  const ctaText = (): string => {
    if (busy) return ''
    if (step === 0) return 'Start setup →'
    if (step === 7) return '✨ Enter my office'
    return 'Continue →'
  }

  const meta = SCREEN_META[step]

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: BG,
      display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      overflowY: 'hidden',
    }}>
      {/* ── Progress bar ── */}
      <div style={{ height: 3, background: 'rgba(124,92,255,0.15)', flexShrink: 0 }}>
        <div style={{
          height: '100%', background: 'linear-gradient(90deg,#7C5CFF,#C084FC)',
          width: `${progress}%`, transition: 'width 0.4s ease',
        }}/>
      </div>

      {/* ── Scrollable content ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* ── Hero illustration ── */}
        <div style={{
          minHeight: '34vh', maxHeight: 260,
          background: meta.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '18px 24px 24px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative blobs */}
          <div style={{
            position: 'absolute', width: 200, height: 200, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', top: -60, right: -60,
          }}/>
          <div style={{
            position: 'absolute', width: 130, height: 130, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', bottom: -40, left: -30,
          }}/>
          <div style={{ width: '100%', maxWidth: 340, height: '100%', maxHeight: 220, position: 'relative', zIndex: 1 }}>
            {step === 7
              ? <IlluOfficeReady name={name} />
              : ILLUSTRATIONS[step] ? React.createElement(ILLUSTRATIONS[step]!) : null
            }
          </div>
        </div>

        {/* ── Step counter pill ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -14, position: 'relative', zIndex: 2 }}>
          <div style={{
            background: WH, border: '1.5px solid rgba(124,92,255,0.2)',
            borderRadius: 50, padding: '4px 14px',
            fontSize: 12, fontWeight: 600, color: P,
            boxShadow: '0 2px 8px rgba(124,92,255,0.12)',
          }}>
            Step {step + 1} of {TOTAL_SCREENS}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '20px 24px 24px' }}>
          {step === 0 && <ScreenWelcome hasName={hasName} name={name} data={data} patch={patch} err={err} />}
          {step === 1 && <ScreenOrganized />}
          {step === 2 && <ScreenProfile />}
          {step === 3 && <ScreenTrustPassport />}
          {step === 4 && <ScreenKai />}
          {step === 5 && <ScreenFree />}
          {step === 6 && <ScreenSetup data={data} patch={patch} toggleArr={toggleArr} err={err} />}
          {step === 7 && <ScreenReady data={data} name={name} onOpenKai={() => finishOnboarding(true)} />}
        </div>

        {/* bottom spacer so content clears the fixed CTA */}
        <div style={{ height: 140 }} />
      </div>

      {/* ── Fixed CTA bar ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(240,244,255,0.96)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(124,92,255,0.12)',
        padding: '12px 24px calc(12px + env(safe-area-inset-bottom))',
        zIndex: 100,
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 12 }}>
          {SCREEN_META.map((_, i) => <Dot key={i} active={i === step} />)}
        </div>

        {/* Error */}
        {err && (
          <p style={{ margin: '0 0 8px', textAlign: 'center', fontSize: 13, color: '#EF4444', fontWeight: 500 }}>
            {err}
          </p>
        )}

        {/* Continue / Enter Office */}
        <button
          onClick={next}
          disabled={busy}
          style={{
            width: '100%', padding: '14px', borderRadius: 50,
            background: 'linear-gradient(135deg,#7C5CFF,#4A90E2)',
            border: 'none', cursor: busy ? 'default' : 'pointer',
            fontSize: 15, fontWeight: 700, color: '#fff',
            boxShadow: '0 4px 18px rgba(124,92,255,0.35)',
            opacity: busy ? 0.7 : 1, transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {busy
            ? <><span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'ob-spin 0.7s linear infinite' }}/> Setting up your office...</>
            : ctaText()
          }
        </button>

        {/* Back link — show on screens 1+ */}
        {step > 0 && (
          <button
            onClick={back}
            style={{
              display: 'block', width: '100%', marginTop: 10,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#94a3b8', fontWeight: 500, textAlign: 'center',
            }}
          >
            ← Back
          </button>
        )}

        {/* Skip setup for now — only on Quick Setup screen */}
        {step === 6 && (
          <button
            onClick={skipForNow}
            style={{
              display: 'block', width: '100%', marginTop: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#94a3b8', textDecoration: 'underline', textAlign: 'center',
            }}
          >
            Skip setup for now →
          </button>
        )}
      </div>

      <style>{`
        @keyframes ob-spin { to { transform: rotate(360deg); } }
        @keyframes ob-fadein { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Headline({ title, copy }: { title: string; copy: string }) {
  return (
    <div style={{ marginBottom: 20, animation: 'ob-fadein 0.35s ease' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: '1.25' }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: '1.55' }}>{copy}</p>
    </div>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <h2 style={{ margin: '24px 0 12px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{text}</h2>
  )
}

// ── Screen 0: Welcome to Carehia ──────────────────────────────────────────────
function ScreenWelcome({ hasName, name, data, patch, err }: any) {
  return (
    <div style={{ animation: 'ob-fadein 0.35s ease' }}>
      <Headline
        title="Welcome to Carehia"
        copy="Your caregiver office in your pocket."
      />
      <p style={{ margin: '0 0 18px', fontSize: 14, color: '#64748b', lineHeight: '1.6' }}>
        Carehia helps caregivers manage work, build trust, track hours, create invoices, and share a professional caregiver profile.
      </p>
      {!hasName && (
        <>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            What should we call you?
          </label>
          <input
            type="text"
            autoFocus
            autoComplete="given-name"
            placeholder="Your first name"
            value={data.firstName}
            onChange={(e: any) => patch({ firstName: e.target.value })}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 14,
              border: `1.5px solid ${err ? '#EF4444' : 'rgba(124,92,255,0.3)'}`,
              fontSize: 16, fontWeight: 600, color: '#0f172a',
              background: '#fff', outline: 'none', boxSizing: 'border-box',
              boxShadow: '0 2px 8px rgba(124,92,255,0.08)',
            }}
          />
        </>
      )}
      {hasName && (
        <div style={{
          background: 'rgba(124,92,255,0.06)', border: '1.5px solid rgba(124,92,255,0.15)',
          borderRadius: 14, padding: '14px 16px', textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            Welcome, {name}! 👋
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Let's set up your caregiver office.
          </p>
        </div>
      )}
      <KaiHint text="Hi, I'm Kai. I'll help set up your caregiver office step by step." />
    </div>
  )
}

// ── Screen 1: Carehia Helps You Stay Organized ───────────────────────────────
function ScreenOrganized() {
  return (
    <div style={{ animation: 'ob-fadein 0.35s ease' }}>
      <Headline
        title="Manage your care work in one place"
        copy="Track your hours, manage clients, organize your profile, and prepare invoices without juggling paper notes or scattered apps."
      />
      <div style={{ marginTop: 4 }}>
        <KeyPoint icon="⏰" text="Track hours and clock in/out for each shift" />
        <KeyPoint icon="👥" text="Manage your clients in one place" />
        <KeyPoint icon="💰" text="Create and send professional invoices" />
        <KeyPoint icon="📋" text="Keep all your work organized" />
      </div>
      <KaiHint text="You do not have to finish everything today. I'll guide you step by step." />
    </div>
  )
}

// ── Screen 2: Build Your Caregiver Profile ───────────────────────────────────
function ScreenProfile() {
  return (
    <div style={{ animation: 'ob-fadein 0.35s ease' }}>
      <Headline
        title="Build your caregiver resume as you work"
        copy="Your Carehia profile helps show your care experience, services, work preferences, Trust Passport progress, and reviews over time."
      />
      <div style={{ marginTop: 4 }}>
        <KeyPoint icon="📄" text="Showcase your care experience and skills" />
        <KeyPoint icon="⭐" text="Collect reviews and build your reputation" />
        <KeyPoint icon="🔗" text="Share your profile link with interested families" />
      </div>
      <div style={{
        background: 'rgba(124,92,255,0.06)', borderRadius: 12,
        border: '1px solid rgba(124,92,255,0.12)', padding: '10px 14px', marginTop: 16,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: '1.5' }}>
          💡 You can share your profile link with interested families or clients when you are ready.
        </p>
      </div>
    </div>
  )
}

// ── Screen 3: Trust Passport ─────────────────────────────────────────────────
function ScreenTrustPassport() {
  return (
    <div style={{ animation: 'ob-fadein 0.35s ease' }}>
      <Headline
        title="Build trust step by step"
        copy="Trust Passport helps you strengthen your profile with verified contact details, proof steps, and trust signals."
      />
      <div style={{ marginTop: 4 }}>
        <KeyPoint icon="📞" text="Verify your phone number" />
        <KeyPoint icon="🪪" text="Upload proof of identity" />
        <KeyPoint icon="📝" text="Add references and certifications" />
        <KeyPoint icon="🛡️" text="Build trust with families over time" />
      </div>
      <div style={{
        background: 'rgba(34,197,94,0.06)', borderRadius: 12,
        border: '1px solid rgba(34,197,94,0.15)', padding: '10px 14px', marginTop: 16,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: '#16a34a', lineHeight: '1.5' }}>
          🛡️ Trust Passport helps families better understand your profile and verification progress.
        </p>
      </div>
    </div>
  )
}

// ── Screen 4: Meet Kai ───────────────────────────────────────────────────────
function ScreenKai() {
  return (
    <div style={{ animation: 'ob-fadein 0.35s ease' }}>
      <Headline
        title="Meet Kai, your Carehia guide"
        copy="Kai helps you know what to do next, complete your setup, build trust, track work, and manage your caregiver office."
      />
      <div style={{ marginTop: 4 }}>
        <KeyPoint icon="🧭" text="What should I do next?" />
        <KeyPoint icon="📋" text="Complete my profile" />
        <KeyPoint icon="🛡️" text="Start Trust Passport" />
        <KeyPoint icon="📞" text="Verify my phone" />
        <KeyPoint icon="⏰" text="Track hours" />
        <KeyPoint icon="💰" text="Create invoices" />
      </div>
      <KaiHint text="I'll be here whenever you need help. Just tap the Kai button!" />
    </div>
  )
}

// ── Screen 5: Free During Launch Year ────────────────────────────────────────
function ScreenFree() {
  return (
    <div style={{ animation: 'ob-fadein 0.35s ease' }}>
      <Headline
        title="Free for caregivers during launch"
        copy="Caregiver access is free during Carehia's first launch year while we grow the platform and support early caregivers."
      />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(34,197,94,0.08)', border: '1.5px solid rgba(34,197,94,0.25)',
        borderRadius: 14, padding: '14px 16px', marginTop: 8,
      }}>
        <span style={{ fontSize: 28 }}>🎁</span>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#16a34a' }}>All features included</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#22c55e' }}>
            Time tracking, invoices, profile, Trust Passport, Kai — all free during launch.
          </p>
        </div>
      </div>
      <div style={{
        background: 'rgba(124,92,255,0.04)', borderRadius: 12,
        border: '1px solid rgba(124,92,255,0.1)', padding: '10px 14px', marginTop: 16,
      }}>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: '1.5' }}>
          Client subscriptions and future premium tools may be separate. Caregiver access stays free during launch year.
        </p>
      </div>
      <KaiHint text="You're joining early. That's a big deal. Let's make the most of it!" />
    </div>
  )
}

// ── Screen 6: Quick Setup ────────────────────────────────────────────────────
function ScreenSetup({ data, patch, toggleArr, err }: any) {
  return (
    <div style={{ animation: 'ob-fadein 0.35s ease' }}>
      <Headline
        title="Quick setup"
        copy="Tell us a little about your care work so Carehia can prepare your office."
      />
      {err && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{err}</p>}

      {/* Caregiver Type */}
      <SectionLabel text="What kind of caregiver are you?" />
      <MultiChip
        options={CAREGIVER_TYPES}
        selected={data.caregiverTypes}
        onToggle={(v: string) => toggleArr('caregiverTypes', v)}
      />

      {/* Care Services */}
      <SectionLabel text="What care do you provide?" />
      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b' }}>
        These help families understand how you can support them.
      </p>
      <MultiChip
        options={CARE_SERVICES}
        selected={data.careServices}
        onToggle={(v: string) => toggleArr('careServices', v)}
      />

      {/* Work Preferences */}
      <SectionLabel text="How do you like to work?" />
      <MultiChip
        options={WORK_PREFS}
        selected={data.workPreferences}
        onToggle={(v: string) => toggleArr('workPreferences', v)}
      />

      {/* Service Area */}
      <SectionLabel text="Where do you want to work?" />
      <input
        type="text"
        placeholder="e.g. 95814 or Sacramento, CA"
        value={data.serviceArea}
        onChange={(e: any) => patch({ serviceArea: e.target.value })}
        style={{
          width: '100%', padding: '13px 16px', borderRadius: 14,
          border: '1.5px solid rgba(124,92,255,0.3)',
          fontSize: 15, color: '#0f172a',
          background: '#fff', outline: 'none', boxSizing: 'border-box',
          boxShadow: '0 2px 8px rgba(124,92,255,0.08)',
        }}
      />
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Travel radius</label>
          <span style={{
            background: 'linear-gradient(135deg,#7C5CFF,#4A90E2)',
            color: '#fff', padding: '3px 12px', borderRadius: 20,
            fontSize: 13, fontWeight: 700,
          }}>{data.travelRadiusMiles} miles</span>
        </div>
        <input
          type="range" min={5} max={50} step={5}
          value={data.travelRadiusMiles}
          onChange={(e: any) => patch({ travelRadiusMiles: Number(e.target.value) })}
          style={{ width: '100%', accentColor: P }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>5 mi</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>50 mi</span>
        </div>
      </div>

      <KaiHint text="Your answers help me guide you to the right setup. Pick what matters most!" />
    </div>
  )
}

// ── Screen 7: Your Carehia Office Is Ready ───────────────────────────────────
function ScreenReady({ data, name, onOpenKai }: { data: OnboardingData; name: string; onOpenKai: () => void }) {
  const checklist = [
    { icon: '👤', text: 'Profile started', done: true },
    { icon: '✨', text: 'Kai ready', done: true },
    { icon: '🛡️', text: 'Trust Passport available', done: true },
    { icon: '📞', text: 'Phone verification available', done: true },
    { icon: '⏰', text: 'Time tracking ready', done: true },
    { icon: '💰', text: 'Invoices ready', done: true },
  ]

  const summaryItems = [
    { label: 'Name', value: name },
    data.caregiverTypes.length > 0 && { label: 'Role', value: data.caregiverTypes.slice(0,2).join(', ') + (data.caregiverTypes.length > 2 ? ` +${data.caregiverTypes.length-2}` : '') },
    data.careServices.length > 0 && { label: 'Services', value: `${data.careServices.length} selected` },
    data.workPreferences.length > 0 && { label: 'Availability', value: data.workPreferences.slice(0,3).join(', ') },
    data.serviceArea && { label: 'Area', value: data.serviceArea + (data.travelRadiusMiles ? `, ${data.travelRadiusMiles} mi radius` : '') },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div style={{ animation: 'ob-fadein 0.4s ease' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900, color: '#0f172a', lineHeight: '1.2' }}>
        Your Carehia office is ready ✨
      </h1>
      <p style={{ margin: '0 0 18px', fontSize: 14, color: '#64748b', lineHeight: '1.5' }}>
        Kai will help you finish your profile, start your Trust Passport, verify your phone, and prepare your work tools.
      </p>

      {/* Starter checklist */}
      <div style={{
        background: '#fff', borderRadius: 16,
        border: '1.5px solid rgba(124,92,255,0.15)',
        padding: '14px 16px', marginBottom: 16,
        boxShadow: '0 2px 10px rgba(124,92,255,0.08)',
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: P }}>Your office includes</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {checklist.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(34,197,94,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
              }}>{item.icon}</div>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{item.text}</span>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: '#22c55e' }}>✓</span>
            </div>
          ))}
        </div>
      </div>

      {/* Free launch access badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(34,197,94,0.08)', border: '1.5px solid rgba(34,197,94,0.3)',
        borderRadius: 14, padding: '11px 16px', marginBottom: 16,
      }}>
        <span style={{ fontSize: 20 }}>🎁</span>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Free Launch Access Active</p>
          <p style={{ margin: 0, fontSize: 12, color: '#4ade80' }}>All caregiver features are free during Carehia's first launch year</p>
        </div>
      </div>

      {/* Summary card — show only if user completed setup */}
      {summaryItems.length > 1 && (
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1.5px solid rgba(124,92,255,0.12)',
          padding: '14px 16px', marginBottom: 16,
          boxShadow: '0 2px 10px rgba(124,92,255,0.06)',
        }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: P }}>Your setup summary</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summaryItems.map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', width: 80, flexShrink: 0, paddingTop: 1 }}>{label}</span>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, lineHeight: '1.4' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Kai secondary CTA */}
      <button
        onClick={onOpenKai}
        style={{
          width: '100%', padding: '12px', borderRadius: 50,
          background: 'rgba(124,92,255,0.08)',
          border: '1.5px solid rgba(124,92,255,0.25)',
          cursor: 'pointer',
          fontSize: 14, fontWeight: 600, color: P,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 8,
          transition: 'all 0.2s',
        }}
      >
        ✨ Open Kai — my guide
      </button>

      <KaiHint text={`Hi ${name}, I'm Kai. I can help you finish setup, get trusted, track work, and get paid. Let's go!`} />
    </div>
  )
}
