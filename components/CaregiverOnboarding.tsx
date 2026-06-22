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
  try { const s = parseInt(localStorage.getItem(STEP_KEY) || '0', 10); return isNaN(s) ? 0 : Math.min(s, 4) } catch { return 0 }
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

// ── Screen definitions (merged 9 → 5) ────────────────────────────────────────
const SCREENS = [
  {
    id: 'welcome',
    gradient: 'linear-gradient(145deg,#7C5CFF 0%,#C084FC 60%,#4A90E2 100%)',
    Illustration: IlluWelcome,
    kaiHint: 'Hi, I\'m Kai. I\'ll help set up your caregiver office step by step.',
  },
  {
    id: 'type-goals',
    gradient: 'linear-gradient(145deg,#4A90E2 0%,#7C5CFF 100%)',
    Illustration: IlluTypes,
    kaiHint: 'Your answers help me guide you to the right setup. Pick what matters most!',
  },
  {
    id: 'services-prefs',
    gradient: 'linear-gradient(145deg,#7C5CFF 0%,#4A90E2 100%)',
    Illustration: IlluServices,
    kaiHint: 'These services help families understand how you can support them.',
  },
  {
    id: 'location',
    gradient: 'linear-gradient(145deg,#22C55E 0%,#4A90E2 100%)',
    Illustration: IlluMap,
    kaiHint: 'You control your service area. We will not show your exact address.',
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

// ── Fix 6: Smart defaults map ─────────────────────────────────────────────────
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

// ── Main component ─────────────────────────────────────────────────────────────
export const CaregiverOnboarding: React.FC<Props> = ({ profile, onComplete }) => {
  // Fix 2: Determine if we should skip the name step
  const skipNameStep = !!profile?.firstName && profile.firstName !== (profile?.email || '').split('@')[0]

  const [step, setStep]   = useState<number>(() => {
    const saved = readStep()
    // If skipping name step and saved step is 0, start from 1
    if (skipNameStep && saved === 0) return 1
    return saved
  })
  const [data, setData]   = useState<OnboardingData>(() => {
    const d = blankData(profile)
    // Fix 2: If skipping name step, ensure firstName is set from profile
    if (skipNameStep && !d.firstName) {
      d.firstName = profile.firstName
    }
    return d
  })
  const [err, setErr]     = useState('')
  const [busy, setBusy]   = useState(false)
  const scrollRef         = useRef<HTMLDivElement>(null)

  // Fix 2: Calculate total screens and display step
  const totalScreens = skipNameStep ? 4 : 5
  const displayStep = skipNameStep ? step : step + 1
  const minStep = skipNameStep ? 1 : 0

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
    if (step === 1) {
      if (data.caregiverTypes.length === 0) { setErr('Please select at least one type'); return false }
      if (data.caregiverGoals.length === 0) { setErr('Please choose at least one goal'); return false }
    }
    if (step === 2) {
      if (data.careServices.length === 0) { setErr('Please select at least one service'); return false }
      if (data.workPreferences.length === 0) { setErr('Please choose at least one preference'); return false }
    }
    if (step === 3) {
      if (!data.serviceArea.trim()) { setErr('Please enter your ZIP code or city'); return false }
    }
    return true
  }

  const next = async () => {
    setErr('')
    if (!validate()) return
    // Fix 6: Apply smart defaults when moving from Type+Goals (step 1) to Services+Prefs (step 2)
    if (step === 1 && data.careServices.length === 0) {
      const defaults = getSmartDefaults(data.caregiverTypes)
      if (defaults.length > 0) {
        setData(prev => ({ ...prev, careServices: defaults }))
      }
    }
    if (step < 4) { setStep(s => s + 1); return }
    // Step 4 = final — complete
    setBusy(true)
    const final = { ...data, officeTools: [], firstTrustStep: '' }
    try {
      localStorage.setItem(COMPLETE_KEY, 'true')
      localStorage.setItem(COMPLETE_AT, new Date().toISOString())
      onComplete(final)
    } finally {
      setBusy(false)
    }
  }

  const back = () => { if (step > minStep) setStep(s => s - 1) }

  // Fix 5: Skip for now — complete with current data + defaults
  const skipForNow = () => {
    const final = {
      ...data,
      officeTools: [],
      firstTrustStep: '',
    }
    setBusy(true)
    try {
      localStorage.setItem(COMPLETE_KEY, 'true')
      localStorage.setItem(COMPLETE_AT, new Date().toISOString())
      onComplete(final)
    } finally {
      setBusy(false)
    }
  }

  const scr = SCREENS[step]
  const name = data.firstName.trim() || profile?.firstName || 'there'
  const progress = ((displayStep) / totalScreens) * 100

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
            {step === 4
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
            Step {displayStep} of {totalScreens}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '20px 24px 24px' }}>
          {step === 0 && <Screen1 name={name} data={data} patch={patch} err={err} kaiHint={scr.kaiHint!} />}
          {step === 1 && <ScreenTypeGoals data={data} toggleArr={toggleArr} err={err} kaiHint={scr.kaiHint!} />}
          {step === 2 && <ScreenServicesPrefs data={data} toggleArr={toggleArr} err={err} kaiHint={scr.kaiHint!} />}
          {step === 3 && <ScreenLocation data={data} patch={patch} err={err} kaiHint={scr.kaiHint!} />}
          {step === 4 && <ScreenReady data={data} name={name} />}
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          {SCREENS.slice(skipNameStep ? 1 : 0).map((_, i) => <Dot key={i} active={i === (step - minStep)} />)}
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
            : step === 4 ? '✨ Enter my office' : 'Continue →'
          }
        </button>

        {/* Back link */}
        {step > minStep && (
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

        {/* Fix 5: Skip for now escape hatch — show on screens 1-3 (Type+Goals, Services+Prefs, Location) */}
        {step >= 1 && step <= 3 && (
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

// Screen 0: Welcome + Name (skipped if name already known)
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

// Screen 1: Caregiver Type + Goals (merged)
function ScreenTypeGoals({ data, toggleArr, err, kaiHint }: any) {
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

      <SectionLabel text="What would you like Carehia to help with?" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>Select up to 3</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: P }}>{data.caregiverGoals.length}/3</span>
      </div>
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

// Screen 2: Care Services + Work Preferences (merged)
function ScreenServicesPrefs({ data, toggleArr, err, kaiHint }: any) {
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

      <SectionLabel text="Tell us how you like to work" />
      <p style={{ margin: '0 0 12px', fontSize: 14, color: '#64748b' }}>
        Carehia works better when it understands your real schedule.
      </p>
      <MultiChip
        options={WORK_PREFS}
        selected={data.workPreferences}
        onToggle={v => toggleArr('workPreferences', v)}
      />
      <KaiHint text={kaiHint} />
    </>
  )
}

// Screen 3: Location
function ScreenLocation({ data, patch, err, kaiHint }: any) {
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

// Screen 4: Ready!
function ScreenReady({ data, name }: { data: OnboardingData; name: string }) {
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
    { icon: '📸', text: 'Add your profile photo' },
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
