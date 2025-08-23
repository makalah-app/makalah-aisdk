'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMode } from '@/types'

interface ChatTypeOption {
  id: string
  mode: ChatMode
  label: string
  description: string
  icon: string
}

interface ChatTypeDropdownProps {
  onChatCreate: (mode: ChatMode) => void
}

const CHAT_TYPE_OPTIONS: ChatTypeOption[] = [
  {
    id: 'formal-mode',
    mode: 'formal',
    label: 'Mode Akademik Formal',
    description: 'Paper 8 fase, Bahasa Indonesia formal',
    icon: '🎓'
  },
  {
    id: 'casual-mode',
    mode: 'casual',
    label: 'Mode Santai Jakarta',
    description: 'Ngobrol bebas akademik, gue-lo style',
    icon: '💬'
  }
]

export function ChatTypeDropdown({ onChatCreate }: ChatTypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleOptionSelect = (option: ChatTypeOption) => {
    setIsOpen(false)
    onChatCreate(option.mode)
  }

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Chat Baru Button with Dropdown */}
      <button
        onClick={toggleDropdown}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-between gap-2 font-medium"
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Chat Baru
        </div>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="py-2">
            {CHAT_TYPE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-3"
              >
                <div className="text-xl flex-shrink-0 mt-0.5">
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-1">
                    {option.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}