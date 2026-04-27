// @ts-nocheck
import React, { useState } from 'react'
import { Camera, MapPin, DollarSign, Star, Shield, Globe, Award, Clock, ChevronRight, LogOut, Settings, Edit3, Phone, Mail } from 'lucide-react'
import { CaregiverProfile } from '../types'

interface ProfileTabProps {
  profile: CaregiverProfile | null
  onLogout: () => void
  onUpdateProfile: (data: any) => void
}

// The canonical list of care needs — must stay in sync with the client portal
const ALL_CARE_NEEDS = [
  'Elder Care', 'Dementia Care', 'Alzheimer\'s Support', 'Wheelchair Assistance',
  'Post-Surgery Recovery', 'Medication Management', 'Bathing & Grooming', 'Meal Preparation',
  'Companionship', 'Transportation', 'Overnight Care', 'Physical Therapy Aid',
  'Wound Care', 'Hospice Support', 'Mental Health Support', 'Feeding Assistance',
  'Incontinence Care', 'Fall Prevention', 'Light Housekeeping', 'Errands & Shopping',
  'Respiratory Care', 'Stroke Recovery', 'Disability Support',
]

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, onLogout, onUpdateProfile }) => {
  const [isAvailable, setIsAvailable] = useState(profile?.status === 'active')
  const [editing, setEditing] = useState(false)
  const [editBio, setEditBio] = useState(profile?.bio || '')
  const [editRate, setEditRate] = useState(String(profile?.hourlyRate || ''))
  const [editingSkills, setEditingSkills] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>(profile?.skills || [])

  const handleToggleAvailability = () => {
    const newStatus = !isAvailable
    setIsAvailable(newStatus)
    onUpdateProfile({ status: newStatus ? 'active' : 'inactive' })
  }

  const handleSaveProfile = () => {
    onUpdateProfile({
      bio: editBio,
      hourlyRate: parseFloat(editRate) || profile?.hourlyRate,
    })
    setEditing(false)
  }

  const handleToggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  const handleSaveSkills = () => {
    onUpdateProfile({ skills: selectedSkills })
    setEditingSkills(false)
  }

  if (!profile) return null

  return (
    <div className="pb-4">
      {/* Profile header */}
      <div className="earnings-card px-4 pt-6 pb-8 text-center">
        <div className="relative inline-block mb-3">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center avatar-ring">
            <span className="text-2xl font-bold text-white">
              {profile.firstName?.[0]}{profile.lastName?.[0]}
            </span>
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md">
            <Camera size={14} className="text-primary" />
          </button>
        </div>
        <h2 className="text-xl font-bold text-white">{profile.firstName} {profile.lastName}</h2>
        <p className="text-white/90 text-sm mt-0.5">Professional Caregiver</p>
        <div className="flex items-center justify-center gap-3 mt-2">
          {profile.rating && (
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5">
              <Star size={12} className="text-yellow-300" />
              <span className="text-xs font-medium text-white">{profile.rating}</span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5">
            <Shield size={12} className="text-green-300" />
            <span className="text-xs font-medium text-white">Verified</span>
          </div>
        </div>
      </div>

      {/* Availability toggle */}
      <div className="-mt-4 mx-4 bg-base-100 rounded-2xl p-4 shadow-sm border border-base-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm text-base-content">Available for Work</p>
            <p className="text-xs text-base-content/70">Clients can find and book you</p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={isAvailable}
            onChange={handleToggleAvailability}
          />
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-base-200 rounded-xl p-3 text-center">
            <DollarSign size={16} className="mx-auto text-primary mb-1" />
            <p className="text-base font-bold text-base-content">${profile.hourlyRate || 25}</p>
            <p className="text-[10px] text-base-content/50">Per Hour</p>
          </div>
          <div className="bg-base-200 rounded-xl p-3 text-center">
            <Award size={16} className="mx-auto text-warning mb-1" />
            <p className="text-base font-bold text-base-content">{profile.totalJobs || 0}</p>
            <p className="text-[10px] text-base-content/50">Jobs Done</p>
          </div>
          <div className="bg-base-200 rounded-xl p-3 text-center">
            <Clock size={16} className="mx-auto text-success mb-1" />
            <p className="text-base font-bold text-base-content">{profile.totalReviews || 0}</p>
            <p className="text-[10px] text-base-content/50">Reviews</p>
          </div>
        </div>

        {/* Bio section */}
        <div className="bg-base-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm text-base-content">About</p>
            <button onClick={() => setEditing(!editing)} className="btn btn-ghost btn-xs gap-1">
              <Edit3 size={12} /> Edit
            </button>
          </div>
          {editing ? (
            <div className="space-y-3">
              <textarea
                className="textarea textarea-bordered w-full text-sm"
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell clients about yourself..."
              />
              <div>
                <label className="text-xs text-base-content/60 mb-1 block">Hourly Rate ($)</label>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm flex-1">Cancel</button>
                <button onClick={handleSaveProfile} className="btn btn-primary btn-sm flex-1">Save</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-base-content/70 leading-relaxed">
              {profile.bio || 'No bio yet. Tap edit to tell clients about your experience and care philosophy.'}
            </p>
          )}
        </div>

        {/* Contact info */}
        <div className="bg-base-200 rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-sm text-base-content">Contact</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail size={14} className="text-primary" />
            </div>
            <span className="text-sm text-base-content/70">{profile.email}</span>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone size={14} className="text-primary" />
              </div>
              <span className="text-sm text-base-content/70">{profile.phone}</span>
            </div>
          )}
          {profile.location && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin size={14} className="text-primary" />
              </div>
              <span className="text-sm text-base-content/70">
                {profile.location.city}, {profile.location.state}
              </span>
            </div>
          )}
        </div>

        {/* Skills & Specializations */}
        <div className="bg-base-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm text-base-content">Skills & Specializations</p>
            <button
              onClick={() => { setEditingSkills(!editingSkills); setSelectedSkills(profile.skills || []) }}
              className="btn btn-ghost btn-xs gap-1"
            >
              <Edit3 size={12} /> {editingSkills ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editingSkills ? (
            <div>
              <p className="text-xs text-base-content/50 mb-3">Tap to select the care services you offer. Clients searching for these needs will find you.</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {ALL_CARE_NEEDS.map((need) => {
                  const active = selectedSkills.includes(need)
                  return (
                    <button
                      key={need}
                      onClick={() => handleToggleSkill(need)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        active
                          ? 'bg-primary text-white border-primary'
                          : 'bg-base-100 text-base-content/60 border-base-300'
                      }`}
                    >
                      {need}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingSkills(false)} className="btn btn-ghost btn-sm flex-1">Cancel</button>
                <button onClick={handleSaveSkills} className="btn btn-primary btn-sm flex-1">Save ({selectedSkills.length} selected)</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(profile.skills && profile.skills.length > 0) ? profile.skills.map((skill, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  {skill}
                </span>
              )) : (
                <p className="text-xs text-base-content/50">No skills added yet. Tap Edit to select care services you offer.</p>
              )}
            </div>
          )}
        </div>

        {/* Languages */}
        {profile.languages && profile.languages.length > 0 && (
          <div className="bg-base-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-primary" />
              <p className="font-semibold text-sm text-base-content">Languages</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.languages.map((lang, i) => (
                <span key={i} className="badge badge-sm badge-ghost py-2.5">{lang}</span>
              ))}
            </div>
          </div>
        )}

        {/* Menu items */}
        <div className="bg-base-200 rounded-2xl overflow-hidden">
          {[
            { icon: Shield, label: 'Verification & Documents', color: 'text-success' },
            { icon: Settings, label: 'Settings', color: 'text-base-content/60' },
          ].map((item, i) => (
            <button key={i} className="w-full flex items-center gap-3 p-4 hover:bg-base-300 transition-colors border-b border-base-300 last:border-0">
              <item.icon size={18} className={item.color} />
              <span className="flex-1 text-left text-sm text-base-content">{item.label}</span>
              <ChevronRight size={16} className="opacity-30" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button onClick={onLogout} className="btn btn-ghost w-full text-error gap-2 mt-2">
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  )
}
