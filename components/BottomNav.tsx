// @ts-nocheck
import React from 'react'
import { CheckSquare, Briefcase, DollarSign, User } from 'lucide-react'
import { TabType } from '../types'

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  requestCount?: number
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, requestCount = 0 }) => {
  // Requests is merged into Work — only 4 visible tabs
  // Internal 'requests' TabType is preserved; Work tab handles it
  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'home',     label: 'Today',   icon: CheckSquare },
    { id: 'schedule', label: 'Work',    icon: Briefcase   },
    { id: 'earnings', label: 'Money',   icon: DollarSign  },
    { id: 'profile',  label: 'Profile', icon: User        },
  ]

  // Work tab is active when the underlying tab is 'schedule' OR 'requests'
  const isWorkActive = activeTab === 'schedule' || activeTab === 'requests'

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 safe-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === 'schedule' ? isWorkActive : activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`bottom-nav-item flex flex-col items-center justify-center gap-0.5 relative transition-all ${isActive ? 'active' : 'text-base-content/70'}`}
              style={{ minWidth: 56, padding: '8px 4px' }}
            >
              {/* Active background pill */}
              {isActive && (
                <div className="absolute inset-0 rounded-2xl bg-primary/10" style={{ margin: '4px 2px' }} />
              )}
              <div className="relative z-10">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {/* Request badge lives on Work tab */}
                {tab.id === 'schedule' && requestCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-error text-error-content text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {requestCount > 9 ? '9+' : requestCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium relative z-10 ${isActive ? 'text-primary' : ''}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
