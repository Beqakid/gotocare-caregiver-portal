// @ts-nocheck
import React from 'react'
import { Home, Calendar, Bell, DollarSign, User } from 'lucide-react'
import { TabType } from '../types'

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  requestCount?: number
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, requestCount = 0 }) => {
  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'requests', label: 'Requests', icon: Bell },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'profile', label: 'Profile', icon: User },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 safe-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`bottom-nav-item flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-xl relative ${isActive ? 'active' : 'text-base-content/40'}`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                {tab.id === 'requests' && requestCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-error text-error-content text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {requestCount > 9 ? '9+' : requestCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? '' : 'text-base-content/40'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
