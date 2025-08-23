'use client'

import { ChatMode } from '@/types'
import { AVAILABLE_MODES } from './JenisChatSelector'

interface ChatModeIndicatorProps {
  mode: ChatMode | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  interactive?: boolean
  onClick?: () => void
}

export function ChatModeIndicator({ 
  mode, 
  className = '', 
  size = 'md', 
  showLabel = true,
  interactive = false,
  onClick 
}: ChatModeIndicatorProps) {
  if (!mode) return null

  const modeConfig = AVAILABLE_MODES.find(m => m.mode === mode)
  if (!modeConfig) return null

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5', 
    lg: 'text-base px-4 py-2'
  }

  const modeStyles = {
    formal: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      icon: '🎓'
    },
    casual: {
      bg: 'bg-green-50 dark:bg-green-900/20', 
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      icon: '💬'
    }
  }

  const styles = modeStyles[mode]
  const Component = interactive ? 'button' : 'div'

  return (
    <Component
      onClick={interactive ? onClick : undefined}
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200
        ${sizeClasses[size]}
        ${styles.bg}
        ${styles.border} 
        ${styles.text}
        ${interactive ? 'hover:scale-105 hover:shadow-sm cursor-pointer' : ''}
        ${className}
      `}
      title={modeConfig.description}
    >
      <span className="text-sm">{styles.icon}</span>
      {showLabel && (
        <span className="truncate">
          {modeConfig.displayName}
        </span>
      )}
      
      {interactive && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      )}
    </Component>
  )
}

// 🚀 MODE-SPECIFIC CHAT STYLING HOOK
export function useChatModeStyles(mode: ChatMode | null) {
  if (!mode) return {}

  const modeStyles = {
    formal: {
      '--chat-mode-primary': '#2563eb',
      '--chat-mode-bg': '#eff6ff',
      '--chat-mode-border': '#bfdbfe',
      '--chat-mode-text': '#1e40af'
    },
    casual: {
      '--chat-mode-primary': '#16a34a',
      '--chat-mode-bg': '#f0fdf4', 
      '--chat-mode-border': '#bbf7d0',
      '--chat-mode-text': '#15803d'
    }
  }

  return modeStyles[mode] || {}
}

// 🚀 MODE-SPECIFIC MESSAGE STYLING
interface ChatModeBubbleProps {
  mode: ChatMode | null
  isUser: boolean
  children: React.ReactNode
  className?: string
}

export function ChatModeBubble({ mode, isUser, children, className = '' }: ChatModeBubbleProps) {
  if (!mode) {
    return <div className={className}>{children}</div>
  }

  const modeClasses = {
    formal: {
      user: 'bg-blue-600 text-white border-blue-600',
      assistant: 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 text-slate-900 dark:text-slate-100'
    },
    casual: {
      user: 'bg-green-600 text-white border-green-600', 
      assistant: 'bg-white dark:bg-slate-900 border-green-200 dark:border-green-800 text-slate-900 dark:text-slate-100'
    }
  }

  const roleKey = isUser ? 'user' : 'assistant'
  const modeClass = modeClasses[mode]?.[roleKey] || ''

  return (
    <div className={`${modeClass} ${className}`}>
      {children}
    </div>
  )
}