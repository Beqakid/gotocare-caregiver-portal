// @ts-nocheck
import React, { useState } from 'react'
import { MapPin, ArrowRight, Sparkles } from 'lucide-react'

const CARE_NEEDS = [
  'Elder Care', 'Dementia Care', "Alzheimer's Support", 'Wheelchair Assistance',
  'Post-Surgery Recovery', 'Medication Management', 'Bathing & Grooming', 'Meal Preparation',
  'Companionship', 'Transportation', 'Overnight Care', 'Physical Therapy Aid',
  'Wound Care', 'Hospice Support', 'Mental Health Support', 'Feeding Assistance',
  'Incontinence Care', 'Fall Prevention', 'Light Housekeeping', 'Errands & Shopping',
  'Respiratory Care', 'Stroke Recovery', 'Disability Support',
]

interface OnboardingScreenProps {
  name: string
  onComplete: (zipCode: string, careTypes: string[]) => Promise<void>
  loading: boolean
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ name, onComplete, loading }) => {
  const [zipCode, setZipCode] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState('')

  const firstName = name ? name.split(' ')[0] : 'there'

  const toggle = (need: string) => {
    setSelected(prev =>
      prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]
    )
  }

  const handleSubmit = async () => {
    if (!zipCode || zipCode.length < 5) {
      setError('Please enter a valid zip code')
      return
    }
    if (selected.length === 0) {
      setError('Please select at least one type of care you provide')
      return
    }
    setError('')
    await onComplete(zipCode, selected)
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      {/* Gradient header */}
      <div className="earnings-card px-6 pt-14 pb-10 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Almost there, {firstName}! 🎉</h1>
        <p className="text-white/75 text-sm max-w-xs">2 quick questions and your caregiving office is ready</p>
      </div>

      {/* Form */}
      <div className="flex-1 -mt-5 bg-base-100 rounded-t-3xl px-6 pt-7 pb-24 overflow-y-auto">
        {error && (
          <div className="alert alert-error mb-4 text-sm py-2">
            <span>{error}</span>
          </div>
        )}

        {/* Zip Code */}
        <div className="mb-7">
          <label className="flex items-center gap-2 text-base font-semibold text-base-content mb-2">
            <MapPin size={18} className="text-primary" />
            What's your zip code?
          </label>
          <p className="text-xs text-base-content/50 mb-3">Used to match you with nearby clients</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            className="input input-bordered w-full h-12 text-lg font-semibold tracking-widest text-center"
            placeholder="30301"
            value={zipCode}
            onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
          />
        </div>

        {/* Care Types */}
        <div className="mb-8">
          <label className="text-base font-semibold text-base-content mb-1 block">
            What type of care do you provide?
          </label>
          <p className="text-xs text-base-content/50 mb-4">
            Select all that apply — you can always update this later
            {selected.length > 0 && (
              <span className="ml-2 text-primary font-semibold">{selected.length} selected</span>
            )}
          </p>

          <div className="flex flex-wrap gap-2">
            {CARE_NEEDS.map(need => {
              const active = selected.includes(need)
              return (
                <button
                  key={need}
                  type="button"
                  onClick={() => toggle(need)}
                  className={`px-4 py-2 text-sm font-medium transition-all border ${
                    active
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-base-200 text-base-content/70 border-base-300 hover:border-primary/40'
                  }`}
                  style={{ borderRadius: '50px' }}
                >
                  {need}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-base-100/95 backdrop-blur border-t border-base-300">
        <button
          onClick={handleSubmit}
          disabled={loading || !zipCode || selected.length === 0}
          className="btn btn-primary w-full h-14 text-base font-semibold gap-2 shadow-lg"
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              Get Started — Your Office is Ready
              <ArrowRight size={18} />
            </>
          )}
        </button>
        {selected.length === 0 && zipCode.length === 5 && (
          <p className="text-center text-xs text-base-content/40 mt-2">Select at least one care type above</p>
        )}
      </div>
    </div>
  )
}
