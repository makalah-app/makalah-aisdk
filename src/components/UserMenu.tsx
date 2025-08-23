'use client'

import { useEffect, useRef } from 'react'

interface UserMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function UserMenu({ isOpen, onClose }: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleLogout = () => {
    if (confirm('Yakin ingin keluar dari aplikasi?')) {
      // For now, just close the menu - in real app would handle actual logout
      onClose()
      alert('Logout functionality will be implemented in auth task')
    }
  }

  const menuItems = [
    {
      icon: '👤',
      label: 'Profil Pengguna',
      action: () => {
        onClose()
        alert('Profile functionality will be implemented in future tasks')
      }
    },
    {
      icon: '⚙️',
      label: 'Pengaturan',
      action: () => {
        onClose()
        alert('Settings functionality will be implemented in future tasks')
      }
    },
    {
      icon: '📊',
      label: 'Statistik Usage',
      action: () => {
        onClose()
        alert('Usage statistics will be implemented in future tasks')
      }
    },
    {
      icon: '📖',
      label: 'Panduan Penggunaan',
      action: () => {
        onClose()
        alert('User guide will be implemented in future tasks')
      }
    },
    {
      icon: '❓',
      label: 'Bantuan & Dukungan',
      action: () => {
        onClose()
        alert('Help & Support will be implemented in future tasks')
      }
    },
    { type: 'divider' },
    {
      icon: '🚪',
      label: 'Keluar',
      action: handleLogout,
      className: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
    }
  ]

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-2 z-50"
    >
      {/* User Info Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
            U
          </div>
          <div>
            <div className="font-medium text-sm">User</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">makalah.app@gmail.com</div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {menuItems.map((item, index) => {
          if (item.type === 'divider') {
            return (
              <div key={index} className="my-1 border-t border-slate-200 dark:border-slate-700"></div>
            )
          }

          return (
            <button
              key={index}
              onClick={item.action}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 ${
                item.className || ''
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-2 px-4 pb-2">
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Makalah AI v1.0.0
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          AI SDK v5 • Next.js 15
        </div>
      </div>
    </div>
  )
}