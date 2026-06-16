// @ts-nocheck
import React, { useState, useCallback, useEffect, useRef } from 'react'

// ── Storage keys ──────────────────────────────────────────────────────────────
const DATA_KEY     = 'cgp_onboarding_data'
const STEP_KEY     = 'cgp_onboarding_step'
const COMPLETE_KEY = 'cgp_onboarding_complete'
const COMPLETE_AT  = 'cgp_onboarding_complete_at'

// ── Type ──────────────────────────────────────────────────────────────────────
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
  try { const s = parseInt(localStorage.getItem(STEP_KEY) || '0', 10); return isNaN(s) ? 0 : Math.min(s, 8) } catch { return 0 }
}

function save(data: OnboardingData, step: number) {
  try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); localStorage.setItem(STEP_KEY, String(step)) } catch {}
}

// ── Palette ───────────────────────────────────────────────────────────────────
const P  = '#7C5CFF'
const P2 = '#4A90E2'
const PK = '#C084FC'
const BG = '#F0F4FF'
const WH = '#FFFFFF'

// ── Shared sub-components ──────────────────────────────────────────────────────
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

const IlluTypes = () => (
  <svg viewBox="0 0 340 210" style={{ width: '100%', height: '100%' }} aria-label="Different types of caregivers shown as warm profile cards">
    {/* cards */}
    {[
      { x: 28, label: 'CNA', icon: '🏥', grad: ['#7C5CFF','#9B72FF'] },
      { x: 108, label: 'Companion', icon: '🤝', grad: ['#4A90E2','#60AAFF'] },
      { x: 188, label: 'Live-In', icon: '🏠', grad: ['#C084FC','#D8A4FF'] },
      { x: 268, label: 'Private', icon: '⭐', grad: ['#F472B6','#FB8AC1'] },
    ].map(({ x, label, icon, grad }) => (
      <g key={x}>
        <rect x={x} y="55" width="72" height="105" rx="14"
          fill={`url(#g${x})`} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"
          filter="url(#card-shadow)"/>
        <defs>
          <linearGradient id={`g${x}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={grad[0]}/>
            <stop offset="100%" stopColor={grad[1]}/>
          </linearGradient>
        </defs>
        {/* avatar circle */}
        <circle cx={x+36} cy="88" r="22" fill="rgba(255,255,255,0.25)"/>
        <text x={x+36} y="96" fontSize="20" textAnchor="middle">{icon}</text>
        {/* label */}
        <rect x={x+8} y="120" width="56" height="18" rx="9" fill="rgba(255,255,255,0.25)"/>
        <text x={x+36} y="132" fontSize="10" textAnchor="middle" fill="#fff" fontWeight="700">{label}</text>
        {/* dots */}
        <circle cx={x+24} cy="148" r="3" fill="rgba(255,255,255,0.5)"/>
        <circle cx={x+36} cy="148" r="3" fill="rgba(255,255,255,0.7)"/>
        <circle cx={x+48} cy="148" r="3" fill="rgba(255,255,255,0.5)"/>
      </g>
    ))}
    <defs>
      <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(124,92,255,0.2)"/>
      </filter>
    </defs>
    {/* headline bg */}
    <text x="170" y="32" fontSize="13" textAnchor="middle" fill={P} fontWeight="700">
      Every caregiver has a home here
    </text>
    <line x1="90" y1="38" x2="250" y2="38" stroke="rgba(124,92,255,0.25)" strokeWidth="1"/>
  </svg>
)

const IlluGoals = () => (
  <svg viewBox="0 0 340 220" style={{ width: '100%', height: '100%' }} aria-label="Caregiver work tools displayed around a mobile Carehia dashboard">
    {/* phone */}
    <rect x="125" y="30" width="90" height="165" rx="14" fill="#1e1b4b" stroke="rgba(124,92,255,0.4)" strokeWidth="2" filter="url(#ps)"/>
    <rect x="130" y="40" width="80" height="148" rx="9" fill="#0f172a"/>
    {/* screen content */}
    <rect x="135" y="48" width="70" height="16" rx="4" fill="rgba(124,92,255,0.6)"/>
    <text x="170" y="59" fontSize="8" textAnchor="middle" fill="#fff" fontWeight="700">Carehia Office</text>
    <rect x="135" y="70" width="30" height="22" rx="5" fill="rgba(34,197,94,0.7)"/>
    <text x="150" y="84" fontSize="8" textAnchor="middle" fill="#fff">&#x23F0;</text>
    <rect x="170" y="70" width="35" height="22" rx="5" fill="rgba(74,144,226,0.7)"/>
    <text x="187" y="84" fontSize="8" textAnchor="middle" fill="#fff">&#x1F4C4;</text>
    <rect x="135" y="97" width="70" height="18" rx="4" fill="rgba(192,132,252,0.5)"/>
    <text x="170" y="109" fontSize="7" textAnchor="middle" fill="#fff">Trust Passport &#x1F6E1;&#xFE0F;</text>
    <rect x="135" y="120" width="33" height="20" rx="4" fill="rgba(245,158,11,0.6)"/>
    <text x="151" y="133" fontSize="7" textAnchor="middle" fill="#fff">&#x1F4B0; Pay</text>
    <rect x="172" y="120" width="33" height="20" rx="4" fill="rgba(239,68,68,0.5)"/>
    <text x="188" y="133" fontSize="7" textAnchor="middle" fill="#fff">&#x1F4CC; Tasks</text>
    {/* Kai orb on screen */}
    <circle cx="170" cy="158" r="12" fill="linear-gradient(135deg,#7C5CFF,#4A90E2)"/>
    <circle cx="170" cy="158" r="12" fill="url(#kaig)"/>
    <text x="170" y="163" fontSize="10" textAnchor="middle">&#x2728;</text>
    {/* floating chips */}
    <rect x="20" y="55" width="88" height="26" rx="13" fill={`rgba(124,92,255,0.12)`} stroke="rgba(124,92,255,0.3)" strokeWidth="1.2"/>
    <text x="64" y="71" fontSize="10" textAnchor="middle" fill={P} fontWeight="600">&#x1F4B3; Invoices</text>
    <rect x="14" y="100" width="86" height="26" rx="13" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.3)" strokeWidth="1.2"/>
    <text x="57" y="116" fontSize="10" textAnchor="middle" fill="#22C55E" fontWeight="600">&#x23F1;&#xFE0F; Track Hours</text>
    <rect x="22" y="147" width="86" height="26" rx="13" fill="rgba(74,144,226,0.1)" stroke="rgba(74,144,226,0.3)" strokeWidth="1.2"/>
    <text x="65" y="163" fontSize="10" textAnchor="middle" fill="#4A90E2" fontWeight="600">&#x1F4C5; Schedule</text>
    <rect x="234" y="55" width="84" height="26" rx="13" fill="rgba(192,132,252,0.12)" stroke="rgba(192,132,252,0.35)" strokeWidth="1.2"/>
    <text x="276" y="71" fontSize="10" textAnchor="middle" fill={PK} fontWeight="600">&#x1F9E0; Find Clients</text>
    <rect x="238" y="100" width="84" height="26" rx="13" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" strokeWidth="1.2"/>
    <text x="280" y="116" fontSize="10" textAnchor="middle" fill="#F59E0B" fontWeight="600">&#x1F4CB; Timesheets</text>
    <rect x="234" y="147" width="84" height="26" rx="13" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.25)" strokeWidth="1.2"/>
    <text x="276" y="163" fontSize="10" textAnchor="middle" fill="#EF4444" fontWeight="600">&#x1F6E1;&#xFE0F; Build Trust</text>
    {/* connector lines */}
    <line x1="105" y1="68" x2="125" y2="80" stroke="rgba(124,92,255,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
    <line x1="100" y1="113" x2="125" y2="108" stroke="rgba(34,197,94,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
    <line x1="108" y1="160" x2="125" y2="148" stroke="rgba(74,144,226,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
    <line x1="218" y1="68" x2="215" y2="80" stroke="rgba(192,132,252,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
    <line x1="238" y1="113" x2="215" y2="110" stroke="rgba(245,158,11,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
    <line x1="234" y1="160" x2="215" y2="148" stroke="rgba(239,68,68,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
    <defs>
      <filter id="ps"><feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="rgba(30,27,75,0.5)"/></filter>
      <linearGradient id="kaig" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7C5CFF"/><stop offset="1" stopColor="#4A90E2"/></linearGradient>
    </defs>
  </svg>
)

const IlluServices = () => (
  <svg viewBox="0 0 340 215" style={{ width: '100%', height: '100%' }} aria-label="Illustrations of different caregiving services such as meals, companionship, and mobility support">
    {[
      { x: 24,  y: 35,  icon: '🍽️', label: 'Meals',       col: ['rgba(245,158,11,0.15)','rgba(245,158,11,0.35)'] },
      { x: 108, y: 35,  icon: '🤝', label: 'Companionship',col: ['rgba(124,92,255,0.12)','rgba(124,92,255,0.35)'] },
      { x: 192, y: 35,  icon: '💊', label: 'Medication',   col: ['rgba(239,68,68,0.10)','rgba(239,68,68,0.3)'] },
      { x: 276, y: 35,  icon: '🚗', label: 'Transport',    col: ['rgba(74,144,226,0.12)','rgba(74,144,226,0.32)'] },
      { x: 24,  y: 130, icon: '🧠', label: 'Dementia',     col: ['rgba(192,132,252,0.12)','rgba(192,132,252,0.35)'] },
      { x: 108, y: 130, icon: '🚶', label: 'Mobility',     col: ['rgba(34,197,94,0.10)','rgba(34,197,94,0.3)'] },
      { x: 192, y: 130, icon: '🌙', label: 'Overnight',    col: ['rgba(30,27,75,0.12)','rgba(124,92,255,0.3)'] },
      { x: 276, y: 130, icon: '🏠', label: 'Household',    col: ['rgba(245,158,11,0.10)','rgba(245,158,11,0.3)'] },
    ].map(({ x, y, icon, label, col }) => (
      <g key={`${x}-${y}`}>
        <rect x={x} y={y} width="72" height="78" rx="14"
          fill={col[0]} stroke={col[1]} strokeWidth="1.5"/>
        <text x={x+36} y={y+40} fontSize="22" textAnchor="middle">{icon}</text>
        <text x={x+36} y={y+62} fontSize="9" textAnchor="middle" fill="#374151" fontWeight="600">{label}</text>
      </g>
    ))}
  </svg>
)

const IlluSchedule = () => (
  <svg viewBox="0 0 340 215" style={{ width: '100%', height: '100%' }} aria-label="Caregiver schedule with calendar and clock options">
    {/* calendar card */}
    <rect x="40" y="20" width="200" height="180" rx="16" fill="#fff" stroke="rgba(124,92,255,0.2)" strokeWidth="1.5" filter="url(#ss)"/>
    <rect x="40" y="20" width="200" height="42" rx="16" fill="url(#calhdr)"/>
    <rect x="40" y="47" width="200" height="15" rx="0" fill="url(#calhdr)"/>
    <text x="140" y="47" fontSize="13" textAnchor="middle" fill="#fff" fontWeight="700">My Schedule</text>
    {/* day headers */}
    {['M','T','W','T','F','S','S'].map((d,i) => (
      <text key={i} x={58+(i*26)} y={78} fontSize="10" textAnchor="middle" fill="rgba(124,92,255,0.7)" fontWeight="600">{d}</text>
    ))}
    {/* day cells */}
    {Array.from({length:28},(_,i) => {
      const col = i%7; const row = Math.floor(i/7);
      const x2 = 58+(col*26); const y2 = 96+(row*24);
      const filled = [2,3,9,10,16,17].includes(i);
      const today = i===9;
      return (
        <g key={i}>
          {filled && <rect x={x2-10} y={y2-13} width="20" height="20" rx="6" fill={today?P:'rgba(124,92,255,0.15)'}/>}
          <text x={x2} y={y2} fontSize="10" textAnchor="middle" fill={filled?(today?'#fff':P):'#94a3b8'}>{i+1}</text>
        </g>
      )
    })}
    {/* right panel - shift chips */}
    <g>
      <rect x="258" y="30" width="72" height="26" rx="10" fill="rgba(255,237,180,0.8)" stroke="rgba(251,191,36,0.4)" strokeWidth="1.2"/>
      <text x="294" y="47" fontSize="9" textAnchor="middle" fill="#92400e" fontWeight="600">☀️ Day</text>
      <rect x="258" y="64" width="72" height="26" rx="10" fill="rgba(192,132,252,0.2)" stroke="rgba(192,132,252,0.4)" strokeWidth="1.2"/>
      <text x="294" y="81" fontSize="9" textAnchor="middle" fill="#7C5CFF" fontWeight="600">🌆 Eve</text>
      <rect x="258" y="98" width="72" height="26" rx="10" fill="rgba(30,27,75,0.15)" stroke="rgba(124,92,255,0.25)" strokeWidth="1.2"/>
      <text x="294" y="115" fontSize="9" textAnchor="middle" fill="#1e1b4b" fontWeight="600">🌙 Night</text>
      <rect x="258" y="132" width="72" height="26" rx="10" fill="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.35)" strokeWidth="1.2"/>
      <text x="294" y="149" fontSize="9" textAnchor="middle" fill="#16a34a" fontWeight="600">&#x1F504; Flex</text>
      <rect x="258" y="166" width="72" height="26" rx="10" fill="rgba(74,144,226,0.15)" stroke="rgba(74,144,226,0.35)" strokeWidth="1.2"/>
      <text x="294" y="183" fontSize="9" textAnchor="middle" fill="#1d4ed8" fontWeight="600">&#x1F4C5; FT/PT</text>
    </g>
    <defs>
      <filter id="ss"><feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(124,92,255,0.15)"/></filter>
      <linearGradient id="calhdr" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#7C5CFF"/><stop offset="1" stopColor="#4A90E2"/></linearGradient>
    </defs>
  </svg>
)

const IlluMap = () => (
  <svg viewBox="0 0 340 215" style={{ width: '100%', height: '100%' }} aria-label="Map showing a caregiver service area and travel radius">
    {/* map background */}
    <rect x="20" y="15" width="300" height="190" rx="16" fill="#e0f2fe" stroke="rgba(74,144,226,0.25)" strokeWidth="1.5" filter="url(#ms)"/>
    {/* roads */}
    <line x1="20" y1="115" x2="320" y2="115" stroke="rgba(255,255,255,0.9)" strokeWidth="6"/>
    <line x1="170" y1="15" x2="170" y2="205" stroke="rgba(255,255,255,0.9)" strokeWidth="6"/>
    <line x1="20" y1="65" x2="120" y2="115" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
    <line x1="220" y1="115" x2="320" y2="80" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
    {/* radius rings */}
    <circle cx="170" cy="115" r="85" fill="rgba(124,92,255,0.06)" stroke="rgba(124,92,255,0.18)" strokeWidth="1.5" strokeDasharray="5,4"/>
    <circle cx="170" cy="115" r="55" fill="rgba(74,144,226,0.07)" stroke="rgba(74,144,226,0.25)" strokeWidth="1.5" strokeDasharray="4,4"/>
    <circle cx="170" cy="115" r="25" fill="rgba(192,132,252,0.15)" stroke="rgba(192,132,252,0.4)" strokeWidth="1.5"/>
    {/* home pin */}
    <circle cx="170" cy="115" r="14" fill="url(#pgrad)" filter="url(#ps2)"/>
    <text x="170" y="121" fontSize="12" textAnchor="middle">🏠</text>
    {/* opportunity dots */}
    <circle cx="120" cy="80"  r="7" fill="rgba(34,197,94,0.8)"/><text x="120" y="84" fontSize="7" textAnchor="middle" fill="#fff">★</text>
    <circle cx="225" cy="90"  r="7" fill="rgba(34,197,94,0.8)"/><text x="225" y="94" fontSize="7" textAnchor="middle" fill="#fff">★</text>
    <circle cx="140" cy="150" r="7" fill="rgba(34,197,94,0.6)"/><text x="140" y="154" fontSize="7" textAnchor="middle" fill="#fff">★</text>
    <circle cx="215" cy="148" r="5" fill="rgba(74,144,226,0.7)"/>
    <circle cx="105" cy="135" r="5" fill="rgba(74,144,226,0.5)"/>
    {/* label */}
    <rect x="80" y="186" width="180" height="20" rx="6" fill="rgba(255,255,255,0.85)"/>
    <text x="170" y="199" fontSize="9" textAnchor="middle" fill="#475569" fontWeight="600">Your area — exact address never shared</text>
    <defs>
      <filter id="ms"><feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(74,144,226,0.15)"/></filter>
      <filter id="ps2"><feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgba(124,92,255,0.4)"/></filter>
      <linearGradient id="pgrad" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7C5CFF"/><stop offset="1" stopColor="#4A90E2"/></linearGradient>
    </defs>
  </svg>
)

const IlluOfficeTools = () => (
  <svg viewBox="0 0 340 215" style={{ width: '100%', height: '100%' }} aria-label="Mobile caregiver office showing clock-in, timesheets, invoices, mileage, and client tools">
    {/* phone frame */}
    <rect x="115" y="10" width="110" height="200" rx="18" fill="#1e1b4b" stroke="rgba(124,92,255,0.5)" strokeWidth="2" filter="url(#ots)"/>
    <rect x="121" y="22" width="98" height="182" rx="12" fill="#0f172a"/>
    {/* notch */}
    <rect x="148" y="14" width="44" height="8" rx="4" fill="#0f172a"/>
    {/* top bar */}
    <rect x="126" y="28" width="88" height="20" rx="6" fill="rgba(124,92,255,0.8)"/>
    <text x="170" y="42" fontSize="9" textAnchor="middle" fill="#fff" fontWeight="700">Your Office</text>
    {/* cards grid */}
    {[
      { x: 126, y: 54, icon: '⏰', label: 'Clock In', col: 'rgba(34,197,94,0.7)' },
      { x: 170, y: 54, icon: '📋', label: 'Timesheet', col: 'rgba(74,144,226,0.7)' },
      { x: 126, y: 108, icon: '💰', label: 'Invoice', col: 'rgba(245,158,11,0.7)' },
      { x: 170, y: 108, icon: '🚗', label: 'Mileage', col: 'rgba(239,68,68,0.6)' },
    ].map(({ x, y, icon, label, col }) => (
      <g key={`${x}-${y}`}>
        <rect x={x} y={y} width="38" height="46" rx="8" fill={col}/>
        <text x={x+19} y={y+24} fontSize="14" textAnchor="middle">{icon}</text>
        <text x={x+19} y={y+39} fontSize="7" textAnchor="middle" fill="#fff" fontWeight="600">{label}</text>
      </g>
    ))}
    {/* bottom bar */}
    <rect x="126" y="162" width="88" height="36" rx="8" fill="rgba(124,92,255,0.5)"/>
    <text x="170" y="183" fontSize="8" textAnchor="middle" fill="#fff" fontWeight="600">✨ Kai: What do you need?</text>
    {/* floating cards - left */}
    <rect x="14" y="40" width="90" height="52" rx="10" fill="#fff" stroke="rgba(124,92,255,0.2)" strokeWidth="1.2" filter="url(#ots)"/>
    <text x="59" y="65" fontSize="18" textAnchor="middle">⏱️</text>
    <text x="59" y="81" fontSize="9" textAnchor="middle" fill="#374151" fontWeight="600">2h 15m tracked</text>
    <rect x="14" y="108" width="90" height="52" rx="10" fill="#fff" stroke="rgba(34,197,94,0.25)" strokeWidth="1.2" filter="url(#ots)"/>
    <text x="59" y="133" fontSize="18" textAnchor="middle">📄</text>
    <text x="59" y="149" fontSize="9" textAnchor="middle" fill="#374151" fontWeight="600">Invoice ready</text>
    <rect x="14" y="160" width="90" height="42" rx="10" fill="#fff" stroke="rgba(74,144,226,0.25)" strokeWidth="1.2" filter="url(#ots)"/>
    <text x="59" y="184" fontSize="9" textAnchor="middle" fill="#374151" fontWeight="600">👥 3 Clients</text>
    {/* floating cards - right */}
    <rect x="236" y="40" width="90" height="52" rx="10" fill="#fff" stroke="rgba(245,158,11,0.25)" strokeWidth="1.2" filter="url(#ots)"/>
    <text x="281" y="65" fontSize="18" textAnchor="middle">🗺️</text>
    <text x="281" y="81" fontSize="9" textAnchor="middle" fill="#374151" fontWeight="600">12.4 mi tracked</text>
    <rect x="236" y="108" width="90" height="52" rx="10" fill="#fff" stroke="rgba(192,132,252,0.25)" strokeWidth="1.2" filter="url(#ots)"/>
    <text x="281" y="133" fontSize="18" textAnchor="middle">📊</text>
    <text x="281" y="149" fontSize="9" textAnchor="middle" fill="#374151" fontWeight="600">Work history</text>
    <defs>
      <filter id="ots"><feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="rgba(124,92,255,0.15)"/></filter>
    </defs>
  </svg>
)

const IlluTrustPassport = () => (
  <svg viewBox="0 0 340 215" style={{ width: '100%', height: '100%' }} aria-label="Caregiver profile, trust badge, resume timeline, and shareable profile link">
    {/* main profile card */}
    <rect x="60" y="15" width="220" height="195" rx="18" fill="#fff" stroke="rgba(124,92,255,0.2)" strokeWidth="1.5" filter="url(#tps)"/>
    {/* gradient header */}
    <rect x="60" y="15" width="220" height="75" rx="18" fill="url(#tphdr)"/>
    <rect x="60" y="71" width="220" height="15" rx="0" fill="url(#tphdr)"/>
    {/* avatar */}
    <circle cx="170" cy="58" r="28" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
    <text x="170" y="68" fontSize="26" textAnchor="middle">👩‍⚕️</text>
    {/* name area */}
    <text x="170" y="110" fontSize="13" textAnchor="middle" fill="#0f172a" fontWeight="700">Your Caregiver Profile</text>
    <text x="170" y="126" fontSize="10" textAnchor="middle" fill="#64748b">Carehia Verified Professional</text>
    {/* trust badge */}
    <circle cx="170" cy="152" r="22" fill="url(#badgeg)" filter="url(#bs)"/>
    <text x="170" y="148" fontSize="11" textAnchor="middle" fill="#fff">🛡️</text>
    <text x="170" y="163" fontSize="7" textAnchor="middle" fill="#fff" fontWeight="700">TRUSTED</text>
    {/* badge glow ring */}
    <circle cx="170" cy="152" r="28" fill="none" stroke="rgba(124,92,255,0.3)" strokeWidth="3" strokeDasharray="4,3"/>
    {/* share link bar */}
    <rect x="75" y="184" width="190" height="20" rx="8" fill="rgba(124,92,255,0.08)" stroke="rgba(124,92,255,0.2)" strokeWidth="1"/>
    <text x="170" y="197" fontSize="8" textAnchor="middle" fill={P} fontWeight="600">🔗 carehia.com/cg/your-name</text>
    {/* floating star reviews */}
    <rect x="14" y="50" width="36" height="36" rx="10" fill="#fff" stroke="rgba(245,158,11,0.3)" strokeWidth="1.2" filter="url(#tps)"/>
    <text x="32" y="73" fontSize="14" textAnchor="middle">⭐</text>
    <rect x="290" y="50" width="36" height="36" rx="10" fill="#fff" stroke="rgba(34,197,94,0.3)" strokeWidth="1.2" filter="url(#tps)"/>
    <text x="308" y="73" fontSize="14" textAnchor="middle">✅</text>
    <rect x="14" y="140" width="36" height="36" rx="10" fill="#fff" stroke="rgba(192,132,252,0.3)" strokeWidth="1.2" filter="url(#tps)"/>
    <text x="32" y="163" fontSize="14" textAnchor="middle">📜</text>
    <rect x="290" y="140" width="36" height="36" rx="10" fill="#fff" stroke="rgba(74,144,226,0.3)" strokeWidth="1.2" filter="url(#tps)"/>
    <text x="308" y="163" fontSize="14" textAnchor="middle">🏅</text>
    <defs>
      <filter id="tps"><feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(124,92,255,0.15)"/></filter>
      <filter id="bs"><feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="rgba(124,92,255,0.4)"/></filter>
      <linearGradient id="tphdr" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7C5CFF"/><stop offset="1" stopColor="#C084FC"/></linearGradient>
      <linearGradient id="badgeg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7C5CFF"/><stop offset="1" stopColor="#4A90E2"/></linearGradient>
    </defs>
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
    <text x="170" y="143" fontSize="8" textAnchor="middle" fill="rgba(255,255,255,0.8)">AI Copilot</text>
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

// ── Screen definitions ─────────────────────────────────────────────────────────
const SCREENS = [
  {
    id: 'welcome',
    gradient: 'linear-gradient(145deg,#7C5CFF 0%,#C084FC 60%,#4A90E2 100%)',
    Illustration: IlluWelcome,
    kaiHint: 'Hi, I\'m Kai. I\'ll help set up your caregiver office step by step.',
  },
  {
    id: 'type',
    gradient: 'linear-gradient(145deg,#4A90E2 0%,#7C5CFF 100%)',
    Illustration: IlluTypes,
    kaiHint: 'Your answers help me guide you to the right setup.',
  },
  {
    id: 'goals',
    gradient: 'linear-gradient(145deg,#C084FC 0%,#7C5CFF 80%,#4A90E2 100%)',
    Illustration: IlluGoals,
    kaiHint: 'Pick what matters most. I\'ll use this to build your first action plan.',
  },
  {
    id: 'services',
    gradient: 'linear-gradient(145deg,#7C5CFF 0%,#4A90E2 100%)',
    Illustration: IlluServices,
    kaiHint: 'These services help families understand how you can support them.',
  },
  {
    id: 'schedule',
    gradient: 'linear-gradient(145deg,#4A90E2 0%,#C084FC 100%)',
    Illustration: IlluSchedule,
    kaiHint: 'Your work preferences help me recommend the right next steps.',
  },
  {
    id: 'location',
    gradient: 'linear-gradient(145deg,#22C55E 0%,#4A90E2 100%)',
    Illustration: IlluMap,
    kaiHint: 'You control your service area. We will not show your exact address.',
  },
  {
    id: 'tools',
    gradient: 'linear-gradient(145deg,#7C5CFF 0%,#C084FC 100%)',
    Illustration: IlluOfficeTools,
    kaiHint: 'I can help you set up these tools once you enter your office.',
  },
  {
    id: 'trust',
    gradient: 'linear-gradient(145deg,#C084FC 0%,#7C5CFF 50%,#4A90E2 100%)',
    Illustration: IlluTrustPassport,
    kaiHint: 'Your Trust Passport helps families feel more confident choosing you.',
  },
  {
    id: 'ready',
    gradient: 'linear-gradient(145deg,#7C5CFF 0%,#C084FC 50%,#4A90E2 100%)',
    Illustration: IlluOfficeReady,
    kaiHint: null,
  },
]

const CAREGIVER_TYPES = [
  'Private caregiver','Independent caregiver','CNA','HHA',
  'Companion caregiver','Agency caregiver','Facility caregiver',
  'Live-in caregiver','I\'m exploring caregiving',
]

const CAREGIVER_GOALS = [
  'Find more clients','Track my hours','Clock in and out',
  'Send timesheets','Send invoices','Build trust with families',
  'Build my resume while I work','Share my caregiver profile',
  'Keep my work organized','Manage my schedule',
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

const OFFICE_TOOLS = [
  'Clock in/out','Timesheets','Invoices','Mileage','Work history','Client list',
]

const TRUST_STEPS = [
  'Add profile photo','Add bio','Upload Government ID',
  'Add CPR / First Aid','Add work experience','Build public profile link',
]

// ── Main component ─────────────────────────────────────────────────────────────
export const CaregiverOnboarding: React.FC<Props> = ({ profile, onComplete }) => {
  const [step, setStep]   = useState<number>(() => readStep())
  const [data, setData]   = useState<OnboardingData>(() => blankData(profile))
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
    if (step === 0 && !data.firstName.trim()) { setErr('Please enter your first name'); return false }
    if (step === 1 && data.caregiverTypes.length === 0) { setErr('Please select at least one type'); return false }
    if (step === 2 && data.caregiverGoals.length === 0) { setErr('Please choose at least one goal'); return false }
    if (step === 3 && data.careServices.length === 0) { setErr('Please select at least one service'); return false }
    if (step === 4 && data.workPreferences.length === 0) { setErr('Please choose at least one preference'); return false }
    if (step === 5) {
      if (!data.serviceArea.trim()) { setErr('Please enter your ZIP code or city'); return false }
    }
    if (step === 7 && !data.firstTrustStep) { setErr('Please choose your first trust step'); return false }
    return true
  }

  const next = async () => {
    setErr('')
    if (!validate()) return
    if (step < 8) { setStep(s => s + 1); return }
    // Step 8 = final — complete
    setBusy(true)
    const final = { ...data }
    try {
      localStorage.setItem(COMPLETE_KEY, 'true')
      localStorage.setItem(COMPLETE_AT, new Date().toISOString())
      onComplete(final)
    } finally {
      setBusy(false)
    }
  }

  const back = () => { if (step > 0) setStep(s => s - 1) }

  const scr = SCREENS[step]
  const name = data.firstName.trim() || profile?.firstName || 'there'
  const progress = ((step + 1) / 9) * 100

  // ── Shared layout ─────────────────────────────────────────────────────────────
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
          minHeight: '38vh', maxHeight: 280,
          background: scr.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px 24px 28px',
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
            {step === 8
              ? <IlluOfficeReady name={name} />
              : React.createElement(scr.Illustration)
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
            Step {step + 1} of 9
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '20px 24px 24px' }}>
          {step === 0 && <Screen1 name={name} data={data} patch={patch} err={err} kaiHint={scr.kaiHint!} />}
          {step === 1 && <Screen2 data={data} toggleArr={toggleArr} err={err} kaiHint={scr.kaiHint!} />}
          {step === 2 && <Screen3 data={data} toggleArr={toggleArr} err={err} kaiHint={scr.kaiHint!} />}
          {step === 3 && <Screen4 data={data} toggleArr={toggleArr} err={err} kaiHint={scr.kaiHint!} />}
          {step === 4 && <Screen5 data={data} toggleArr={toggleArr} err={err} kaiHint={scr.kaiHint!} />}
          {step === 5 && <Screen6 data={data} patch={patch} err={err} kaiHint={scr.kaiHint!} />}
          {step === 6 && <Screen7 data={data} toggleArr={toggleArr} err={err} kaiHint={scr.kaiHint!} />}
          {step === 7 && <Screen8 data={data} patch={patch} err={err} kaiHint={scr.kaiHint!} />}
          {step === 8 && <Screen9 data={data} name={name} />}
        </div>

        {/* bottom spacer so content clears the fixed CTA */}
        <div style={{ height: 120 }} />
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          {SCREENS.map((_, i) => <Dot key={i} active={i === step} />)}
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
            : step === 8 ? '✨ Enter my office' : 'Continue →'
          }
        </button>

        {/* Back link */}
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

function Screen1({ name, data, patch, err, kaiHint }: any) {
  return (
    <>
      <Headline
        title="Care for others. Carehia cares for you."
        copy="Your caregiving office, work tools, trust profile, and daily support — all in one place."
      />
      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
        What should we call you?
      </label>
      <input
        type="text"
        autoFocus
        autoComplete="given-name"
        placeholder="Your first name"
        value={data.firstName}
        onChange={e => patch({ firstName: e.target.value })}
        style={{
          width: '100%', padding: '13px 16px', borderRadius: 14,
          border: `1.5px solid ${err ? '#EF4444' : 'rgba(124,92,255,0.3)'}`,
          fontSize: 16, fontWeight: 600, color: '#0f172a',
          background: '#fff', outline: 'none', boxSizing: 'border-box',
          boxShadow: '0 2px 8px rgba(124,92,255,0.08)',
        }}
      />
      <KaiHint text={kaiHint} />
    </>
  )
}

function Screen2({ data, toggleArr, err, kaiHint }: any) {
  return (
    <>
      <Headline
        title="What kind of caregiver are you?"
        copy="We'll tailor your Carehia office to fit how you work."
      />
      {err && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{err}</p>}
      <MultiChip
        options={CAREGIVER_TYPES}
        selected={data.caregiverTypes}
        onToggle={v => toggleArr('caregiverTypes', v)}
      />
      <KaiHint text={kaiHint} />
    </>
  )
}

function Screen3({ data, toggleArr, err, kaiHint }: any) {
  return (
    <>
      <Headline
        title="What would you like Carehia to help with?"
        copy="Choose up to three. Kai will use this to guide your first steps."
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>Select up to 3</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: P }}>{data.caregiverGoals.length}/3</span>
      </div>
      {err && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{err}</p>}
      <MultiChip
        options={CAREGIVER_GOALS}
        selected={data.caregiverGoals}
        onToggle={v => toggleArr('caregiverGoals', v, 3)}
        maxSelect={3}
      />
      <KaiHint text={kaiHint} />
    </>
  )
}

function Screen4({ data, toggleArr, err, kaiHint }: any) {
  return (
    <>
      <Headline
        title="What care do you provide?"
        copy="This helps Carehia prepare your work profile and future matches."
      />
      {err && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{err}</p>}
      <MultiChip
        options={CARE_SERVICES}
        selected={data.careServices}
        onToggle={v => toggleArr('careServices', v)}
      />
      <KaiHint text={kaiHint} />
    </>
  )
}

function Screen5({ data, toggleArr, err, kaiHint }: any) {
  return (
    <>
      <Headline
        title="Tell us how you like to work"
        copy="Carehia works better when it understands your real schedule."
      />
      {err && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{err}</p>}
      <MultiChip
        options={WORK_PREFS}
        selected={data.workPreferences}
        onToggle={v => toggleArr('workPreferences', v)}
      />
      <KaiHint text={kaiHint} />
    </>
  )
}

function Screen6({ data, patch, err, kaiHint }: any) {
  return (
    <>
      <Headline
        title="Where do you want to work?"
        copy="Set your local area so Carehia can prepare your office and future opportunities."
      />
      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
        ZIP code or city
      </label>
      <input
        type="text"
        placeholder="e.g. 95814 or Sacramento, CA"
        value={data.serviceArea}
        onChange={e => patch({ serviceArea: e.target.value })}
        style={{
          width: '100%', padding: '13px 16px', borderRadius: 14,
          border: `1.5px solid ${err ? '#EF4444' : 'rgba(124,92,255,0.3)'}`,
          fontSize: 15, color: '#0f172a',
          background: '#fff', outline: 'none', boxSizing: 'border-box',
          boxShadow: '0 2px 8px rgba(124,92,255,0.08)',
        }}
      />

      <div style={{ marginTop: 20 }}>
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
          onChange={e => patch({ travelRadiusMiles: Number(e.target.value) })}
          style={{ width: '100%', accentColor: P }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>5 mi</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>50 mi</span>
        </div>
      </div>

      <KaiHint text={kaiHint} />
    </>
  )
}

function Screen7({ data, toggleArr, err, kaiHint }: any) {
  return (
    <>
      <Headline
        title="Carehia helps with the work behind the care"
        copy="Clock in, track mileage, send timesheets, create invoices, and stay organized."
      />
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px' }}>Choose what you want ready first:</p>
      {err && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{err}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {OFFICE_TOOLS.map(tool => {
          const active = data.officeTools.includes(tool)
          const icons: Record<string,string> = {
            'Clock in/out':'⏰','Timesheets':'📋','Invoices':'💰',
            'Mileage':'🚗','Work history':'📊','Client list':'👥',
          }
          return (
            <button
              key={tool}
              onClick={() => toggleArr('officeTools', tool)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 14,
                border: `1.5px solid ${active ? P : 'rgba(148,163,184,0.35)'}`,
                background: active ? 'linear-gradient(135deg,rgba(124,92,255,0.08),rgba(74,144,226,0.05))' : '#fff',
                cursor: 'pointer', textAlign: 'left',
                boxShadow: active ? '0 2px 10px rgba(124,92,255,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'all 0.18s',
              }}
            >
              <span style={{ fontSize: 20 }}>{icons[tool]}</span>
              <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? P : '#374151', flex: 1 }}>{tool}</span>
              {active && <span style={{ fontSize: 18, color: P }}>&#x2713;</span>}
            </button>
          )
        })}
      </div>
      <KaiHint text={kaiHint} />
    </>
  )
}

function Screen8({ data, patch, err, kaiHint }: any) {
  const icons: Record<string,string> = {
    'Add profile photo':'📸',
    'Add bio':'✍️',
    'Upload Government ID':'🪪',
    'Add CPR / First Aid':'🏥',
    'Add work experience':'💼',
    'Build public profile link':'🔗',
  }
  return (
    <>
      <Headline
        title="Build your caregiver profile while you work"
        copy="Every skill, shift, review, and trust badge helps build a stronger caregiver story."
      />
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px' }}>Choose your first trust step:</p>
      {err && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{err}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TRUST_STEPS.map(step => {
          const active = data.firstTrustStep === step
          return (
            <button
              key={step}
              onClick={() => patch({ firstTrustStep: step })}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 14,
                border: `1.5px solid ${active ? P : 'rgba(148,163,184,0.35)'}`,
                background: active ? 'linear-gradient(135deg,rgba(124,92,255,0.1),rgba(192,132,252,0.06))' : '#fff',
                cursor: 'pointer', textAlign: 'left',
                boxShadow: active ? '0 2px 10px rgba(124,92,255,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'all 0.18s',
              }}
            >
              <span style={{ fontSize: 20 }}>{icons[step]}</span>
              <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? P : '#374151', flex: 1 }}>{step}</span>
              {active && (
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#7C5CFF,#4A90E2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 11, color: '#fff' }}>&#x2713;</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
      <KaiHint text={kaiHint} />
    </>
  )
}

function Screen9({ data, name }: { data: OnboardingData; name: string }) {
  const goals = data.caregiverGoals
  const goalMap: Record<string, { icon: string; next: string }> = {
    'Find more clients':         { icon: '🔍', next: 'Complete your public caregiver profile' },
    'Track my hours':            { icon: '⏱️', next: 'Set up your first clock-in' },
    'Clock in and out':          { icon: '⏰', next: 'Start your first clock-in' },
    'Send timesheets':           { icon: '📋', next: 'Create your first timesheet' },
    'Send invoices':             { icon: '💰', next: 'Create your first invoice' },
    'Build trust with families': { icon: '🛡️', next: 'Start your Trust Passport' },
    'Build my resume while I work': { icon: '📄', next: 'Add your work experience' },
    'Share my caregiver profile':{ icon: '🔗', next: 'Build your public profile link' },
    'Keep my work organized':    { icon: '📌', next: 'Explore your caregiver office' },
    'Manage my schedule':        { icon: '📅', next: 'Set your availability in Work' },
  }
  const nextSteps = [
    ...(data.firstTrustStep ? [{ icon: '🛡️', text: data.firstTrustStep }] : [{ icon: '📸', text: 'Add your profile photo' }]),
    ...(goals.slice(0,2).map(g => ({ icon: goalMap[g]?.icon || '✅', text: goalMap[g]?.next || g }))),
    { icon: '🟢', text: 'Go online for work requests' },
  ].slice(0, 4)

  const summaryItems = [
    { label: 'Name', value: name },
    data.caregiverTypes.length > 0 && { label: 'Role', value: data.caregiverTypes.slice(0,2).join(', ') + (data.caregiverTypes.length > 2 ? ` +${data.caregiverTypes.length-2}` : '') },
    data.careServices.length > 0 && { label: 'Services', value: `${data.careServices.length} selected` },
    data.workPreferences.length > 0 && { label: 'Availability', value: data.workPreferences.slice(0,3).join(', ') },
    data.serviceArea && { label: 'Area', value: data.serviceArea + (data.travelRadiusMiles ? `, ${data.travelRadiusMiles} mi radius` : '') },
    data.caregiverGoals.length > 0 && { label: 'Goals', value: data.caregiverGoals.slice(0,2).join(', ') + (data.caregiverGoals.length > 2 ? ` +${data.caregiverGoals.length-2}` : '') },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div style={{ animation: 'ob-fadein 0.4s ease' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900, color: '#0f172a', lineHeight: '1.2' }}>
        {name}, your office is ready ✨
      </h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>
        We have prepared your starter office based on what you shared.
      </p>

      {/* Readiness progress */}
      <div style={{
        background: '#fff', borderRadius: 16,
        border: '1.5px solid rgba(124,92,255,0.15)',
        padding: '14px 16px', marginBottom: 16,
        boxShadow: '0 2px 10px rgba(124,92,255,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Office Readiness</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: P }}>35%</span>
        </div>
        <div style={{ height: 8, borderRadius: 8, background: 'rgba(124,92,255,0.12)' }}>
          <div style={{ height: '100%', width: '35%', borderRadius: 8, background: 'linear-gradient(90deg,#7C5CFF,#4A90E2)' }}/>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8' }}>Complete your profile to reach 100%</p>
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

      {/* Summary card */}
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

      {/* Next steps */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(124,92,255,0.06),rgba(74,144,226,0.04))',
        borderRadius: 16, border: '1.5px solid rgba(124,92,255,0.12)',
        padding: '14px 16px', marginBottom: 16,
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Your next best steps</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {nextSteps.map((ns, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `rgba(124,92,255,${0.15-(i*0.02)})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, flexShrink: 0,
              }}>{i+1}</div>
              <span style={{ fontSize: 13, color: '#374151' }}>{ns.icon} {ns.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kai greeting */}
      <KaiHint text={`Hi ${name}, I'm Kai. I can help you finish setup, get trusted, track work, and get paid. Let's go!`} />
    </div>
  )
}
