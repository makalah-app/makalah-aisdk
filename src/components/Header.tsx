'use client'

import { useThemeStore } from '@/store/theme'
import { useState, useMemo } from 'react'
import { UserMenu } from './UserMenu'
import Image from 'next/image'

// Icon paths constants for better maintainability
const THEME_ICONS = {
  light: '/icons/lightmode.svg',
  dark: '/icons/darkmode.svg'
} as const

const THEME_LABELS = {
  light: 'Mode Terang',
  dark: 'Mode Gelap'
} as const

export function Header() {
  const { theme, toggleTheme } = useThemeStore()
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Memoized theme computations to prevent repeated calculations on every render
  const themeIcon = useMemo(() => THEME_ICONS[theme], [theme])
  const themeLabel = useMemo(() => THEME_LABELS[theme], [theme])

  return (
    <header className="h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
      {/* Left Side - Clean Branding */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            M
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white">Makalah AI</h1>
            <p className="text-xs text-slate-300 font-medium">Agen Ai Penyusunan Naskah Akademik</p>
          </div>
        </div>
        
      </div>


      {/* Right Side - Professional Controls */}
      <div className="flex items-center gap-2">
        {/* Status Indicator */}
        <div className="hidden md:flex items-center gap-2 text-sm mr-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-white font-medium">Ready</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/80 transition-all duration-200 group"
          title={`Switch theme (current: ${themeLabel})`}
        >
          <div className="group-hover:scale-110 transition-transform duration-200">
            <Image
              src={themeIcon}
              alt={themeLabel}
              width={20}
              height={20}
              className="w-5 h-5"
            />
          </div>
          <span className="hidden sm:inline text-sm font-medium text-white">
            {themeLabel}
          </span>
        </button>

        {/* Clean Divider */}
        <div className="w-px h-5 bg-border/60 mx-1"></div>

        {/* User Account */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/40 transition-all duration-200"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-sm">
              U
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-semibold text-white">Writer</div>
              <div className="text-xs text-white">Academic</div>
            </div>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 text-white ${showUserMenu ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {/* User Menu Dropdown */}
          <UserMenu 
            isOpen={showUserMenu} 
            onClose={() => setShowUserMenu(false)} 
          />
        </div>
      </div>
    </header>
  )
}