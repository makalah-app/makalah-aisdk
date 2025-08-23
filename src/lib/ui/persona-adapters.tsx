// ============================================
// MAKALAH AI: UI Component Adapters for Persona Integration
// ============================================
// Task P07.3 Implementation: Component adapters untuk persona compatibility
// Created: August 2025
// Features: Context adapters, error boundaries, state bridging

import React, { Component, createContext, useContext, ReactNode, ComponentType } from 'react'
import type { PersonaTemplate } from '@/types/persona'
import { usePersonaContext, type PersonaContextData, type PersonaContextActions } from '@/hooks/usePersonaContext'

// ============================================
// PERSONA ADAPTER UTILITIES
// ============================================

export class PersonaAdapterUtils {
  static getChatModeLabel(chatMode: 'formal' | 'casual' | null): string {
    switch (chatMode) {
      case 'formal':
        return 'Mode Akademik'
      case 'casual':
        return 'Mode Santai'
      default:
        return 'Mode Belum Dipilih'
    }
  }

  static getPersonaModeColor(mode: string): string {
    switch (mode) {
      case 'Research':
        return 'text-blue-600 bg-blue-50'
      case 'Writing':
        return 'text-green-600 bg-green-50'
      case 'Review':
        return 'text-purple-600 bg-purple-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  static isPersonaActive(persona: PersonaTemplate | null): boolean {
    return persona !== null && persona.is_active
  }

  static getPersonaDisplayName(persona: PersonaTemplate | null): string {
    return persona?.name || 'Default Assistant'
  }

  static formatPersonaMode(mode: string): string {
    return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase()
  }
}

// ============================================
// PERSONA CONTEXT TYPES
// ============================================

export interface PersonaContextData {
  currentPersona: PersonaTemplate | null
  chatMode: 'formal' | 'casual' | null
  sessionId: string | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean
}

// ============================================
// ERROR HANDLING UTILITIES
// ============================================

export function getPersonaErrorMessage(error: Error, personaContext?: PersonaContextData): string {
  const chatMode = personaContext?.chatMode
  
  if (chatMode === 'casual') {
    return `Waduh, ada masalah nih dengan persona chat: ${error.message}`
  }
  
  return `Terjadi kesalahan dalam sistem persona: ${error.message}. Silakan hubungi administrator untuk bantuan.`
}

export function isPersonaRelatedError(error: Error): boolean {
  const errorText = error.message.toLowerCase()
  const personaKeywords = ['persona', 'provider', 'chat-mode', 'template', 'context']
  
  return personaKeywords.some(keyword => errorText.includes(keyword))
}

// ============================================
// INTEGRATION VALIDATION
// ============================================

export function validatePersonaIntegration(context: PersonaContextData): {
  isValid: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  if (!context.isInitialized) {
    issues.push('Persona context not initialized')
    recommendations.push('Ensure PersonaContextProvider is properly set up')
  }

  if (context.error) {
    issues.push(`Error in persona context: ${context.error}`)
    recommendations.push('Check persona template configuration and API connectivity')
  }

  if (!context.sessionId) {
    issues.push('No session ID available')
    recommendations.push('Provide session ID for proper persona context tracking')
  }

  if (!context.chatMode) {
    issues.push('Chat mode not selected')
    recommendations.push('User should select either formal or casual mode')
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  }
}

// ============================================
// PERSONA ERROR BOUNDARY COMPONENT
// ============================================

interface PersonaErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: any
}

interface PersonaErrorBoundaryProps {
  children: ReactNode
  sessionId?: string | null
  fallback?: ComponentType<PersonaErrorFallbackProps>
  onError?: (error: Error, errorInfo: any) => void
}

interface PersonaErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  sessionId?: string | null
  personaContext?: PersonaContextData
}

function DefaultPersonaErrorFallback({ 
  error, 
  resetErrorBoundary, 
  sessionId,
  personaContext 
}: PersonaErrorFallbackProps) {
  return (
    <div className="persona-error-boundary p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Persona Component Error
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <p>
              Terjadi kesalahan dalam komponen persona. 
              {personaContext?.chatMode === 'casual' 
                ? ' Ada masalah dengan interface persona nih.'
                : ' An error occurred in the persona interface component.'
              }
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer hover:text-red-600">
                Detail Error
              </summary>
              <pre className="mt-1 text-xs bg-red-100 dark:bg-red-800/30 p-2 rounded overflow-x-auto">
                {error.message}
              </pre>
            </details>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={resetErrorBoundary}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-800 bg-red-100 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-200 dark:hover:bg-red-800/50 rounded-md transition-colors"
            >
              {personaContext?.chatMode === 'casual' ? 'Coba Lagi' : 'Try Again'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              {personaContext?.chatMode === 'casual' ? 'Refresh Page' : 'Reload Page'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export class PersonaErrorBoundary extends Component<PersonaErrorBoundaryProps, PersonaErrorBoundaryState> {
  constructor(props: PersonaErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<PersonaErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[PERSONA ERROR BOUNDARY] Component error caught:', {
      error: error.message,
      sessionId: this.props.sessionId,
      stack: error.stack,
      errorInfo
    })

    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultPersonaErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
          sessionId={this.props.sessionId}
        />
      )
    }

    return this.props.children
  }
}

// ============================================
// PERSONA-AWARE COMPONENT WRAPPER
// ============================================

interface PersonaAwareComponentProps {
  sessionId?: string | null
  requiresPersona?: boolean
  enableErrorBoundary?: boolean
  className?: string
  children: (props: {
    context: PersonaContextData
    actions: PersonaContextActions
    isLoading: boolean
    error: string | null
    isInitialized: boolean
  }) => ReactNode
}

export function PersonaAwareComponent({
  sessionId,
  requiresPersona = false,
  enableErrorBoundary = true,
  className = '',
  children
}: PersonaAwareComponentProps) {
  const personaHook = usePersonaContext(sessionId)

  const content = (
    <div className={`persona-aware-component ${className}`}>
      {children({
        context: personaHook.context,
        actions: personaHook.actions,
        isLoading: personaHook.isLoading,
        error: personaHook.error,
        isInitialized: personaHook.isInitialized
      })}
    </div>
  )

  // Wrap with error boundary if enabled
  if (enableErrorBoundary) {
    return (
      <PersonaErrorBoundary sessionId={sessionId}>
        {content}
      </PersonaErrorBoundary>
    )
  }

  return content
}

export default PersonaAdapterUtils