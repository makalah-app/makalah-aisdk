// ============================================
// MAKALAH AI: Persona-Aware Error Boundary
// ============================================
// Task P07.3 Implementation: UI Error Boundaries dengan persona-aware error handling
// Created: August 2025
// Features: Persona context preservation, intelligent error recovery, user-friendly fallbacks

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { useChatStore } from '@/store/chat'
import { AlertTriangle, RefreshCw, ArrowLeft, Settings, MessageSquare } from 'lucide-react'

// ============================================
// ERROR BOUNDARY TYPES
// ============================================

interface PersonaAwareErrorState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  personaContext?: {
    chatMode: 'formal' | 'casual' | null
    personaId: string | null
    personaName: string | null
    sessionId: string | null
  }
  recoveryAttempts: number
  timestamp: number
}

interface PersonaAwareErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  enableRecovery?: boolean
  maxRecoveryAttempts?: number
}

// ============================================
// PERSONA-AWARE ERROR BOUNDARY CLASS
// ============================================

export class PersonaAwareErrorBoundary extends Component<
  PersonaAwareErrorBoundaryProps, 
  PersonaAwareErrorState
> {
  private recoveryTimer: NodeJS.Timeout | null = null

  constructor(props: PersonaAwareErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      recoveryAttempts: 0,
      timestamp: Date.now()
    }
  }

  static getDerivedStateFromError(error: Error): Partial<PersonaAwareErrorState> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId,
      timestamp: Date.now()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Extract persona context from global state
    const personaContext = this.extractPersonaContext()
    
    // Update state dengan persona context
    this.setState(prevState => ({
      ...prevState,
      errorInfo,
      personaContext
    }))

    // Log error dengan persona context for analytics
    this.logPersonaAwareError(error, errorInfo, personaContext)

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Attempt automatic recovery if enabled
    if (this.props.enableRecovery && this.state.recoveryAttempts < (this.props.maxRecoveryAttempts || 3)) {
      this.attemptRecovery()
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
    }
  }

  // ============================================
  // PERSONA CONTEXT EXTRACTION
  // ============================================

  private extractPersonaContext() {
    try {
      // Access Zustand store untuk get current persona context
      const store = useChatStore.getState()
      
      return {
        chatMode: store.chatModeState?.currentMode || null,
        personaId: store.currentPersona?.id || null,
        personaName: store.currentPersona?.name || null,
        sessionId: store.currentSessionId || null
      }
    } catch (contextError) {
      console.warn('[P07.3 ERROR BOUNDARY] Failed to extract persona context:', contextError)
      return undefined
    }
  }

  // ============================================
  // ERROR LOGGING DAN ANALYTICS
  // ============================================

  private logPersonaAwareError(
    error: Error, 
    errorInfo: ErrorInfo, 
    personaContext?: any
  ) {
    const errorData = {
      errorId: this.state.errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      personaContext,
      timestamp: this.state.timestamp,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    }

    // Log to console dengan enhanced formatting
    console.group('[P07.3 PERSONA-AWARE ERROR BOUNDARY]')
    console.error('Error ID:', this.state.errorId)
    console.error('Error:', error)
    console.error('Error Info:', errorInfo)
    console.error('Persona Context:', personaContext)
    console.error('Full Error Data:', errorData)
    console.groupEnd()

    // Send ke error tracking service jika ada
    try {
      // TODO: Integrate dengan error tracking service (Sentry, LogRocket, etc.)
      if (typeof window !== 'undefined' && (window as any).__ERROR_TRACKER__) {
        (window as any).__ERROR_TRACKER__.captureException(error, {
          tags: {
            component: 'persona-error-boundary',
            chatMode: personaContext?.chatMode,
            personaId: personaContext?.personaId
          },
          extra: errorData
        })
      }
    } catch (trackingError) {
      console.warn('[ERROR TRACKING] Failed to send error to tracking service:', trackingError)
    }
  }

  // ============================================
  // RECOVERY MECHANISM
  // ============================================

  private attemptRecovery = () => {
    const recoveryDelay = Math.min(1000 * Math.pow(2, this.state.recoveryAttempts), 10000) // Exponential backoff, max 10s

    this.recoveryTimer = setTimeout(() => {
      console.log(`[P07.3 RECOVERY] Attempting recovery #${this.state.recoveryAttempts + 1}`)
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        recoveryAttempts: prevState.recoveryAttempts + 1
      }))
    }, recoveryDelay)
  }

  private handleManualRetry = () => {
    console.log('[P07.3 RECOVERY] Manual retry initiated')
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempts: 0,
      timestamp: Date.now()
    })
  }

  private handleResetPersona = () => {
    try {
      // Reset persona state in Zustand store
      const store = useChatStore.getState()
      store.resetPersonaState?.()
      
      console.log('[P07.3 RECOVERY] Persona state reset')
      this.handleManualRetry()
    } catch (resetError) {
      console.error('[P07.3 RECOVERY] Failed to reset persona state:', resetError)
    }
  }

  // ============================================
  // ERROR UI RENDERING
  // ============================================

  private renderPersonaAwareErrorUI() {
    const { error, personaContext, errorId } = this.state
    const isPersonaRelated = this.isPersonaRelatedError(error)
    const chatMode = personaContext?.chatMode || 'formal'

    // Determine messaging style based on persona context
    const errorMessages = this.getPersonaAppropriateMessages(chatMode, isPersonaRelated)

    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-lg border border-red-200 dark:border-red-800">
        {/* Error Icon */}
        <div className="mb-6">
          <AlertTriangle className="w-16 h-16 text-red-500" />
        </div>

        {/* Error Title */}
        <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2 text-center">
          {errorMessages.title}
        </h2>

        {/* Error Description */}
        <p className="text-red-700 dark:text-red-300 text-center mb-6 max-w-md">
          {errorMessages.description}
        </p>

        {/* Persona Context Info */}
        {personaContext && (
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 border border-red-200 dark:border-red-700">
            <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">
              {chatMode === 'formal' ? 'Konteks Sesi Akademik:' : 'Info Sesi Chat:'}
            </h3>
            <div className="text-sm space-y-1">
              {personaContext.chatMode && (
                <p><span className="font-medium">Mode Chat:</span> {personaContext.chatMode}</p>
              )}
              {personaContext.personaName && (
                <p><span className="font-medium">Persona:</span> {personaContext.personaName}</p>
              )}
              {personaContext.sessionId && (
                <p><span className="font-medium">Session:</span> {personaContext.sessionId.slice(0, 8)}...</p>
              )}
            </div>
          </div>
        )}

        {/* Error ID untuk debugging */}
        <div className="text-xs text-gray-500 mb-6 font-mono">
          Error ID: {errorId}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={this.handleManualRetry}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {errorMessages.retryButton}
          </button>

          {isPersonaRelated && (
            <button
              onClick={this.handleResetPersona}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              {errorMessages.resetButton}
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {errorMessages.refreshButton}
          </button>
        </div>

        {/* Recovery Status */}
        {this.state.recoveryAttempts > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {errorMessages.recoveryStatus} {this.state.recoveryAttempts}
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private isPersonaRelatedError(error: Error | null): boolean {
    if (!error) return false

    const personaErrorKeywords = [
      'persona', 'provider', 'chat-mode', 'template', 'context', 
      'openrouter', 'openai', 'system-prompt'
    ]

    const errorText = `${error.message} ${error.stack || ''}`.toLowerCase()
    return personaErrorKeywords.some(keyword => errorText.includes(keyword))
  }

  private getPersonaAppropriateMessages(
    chatMode: 'formal' | 'casual' | null, 
    isPersonaRelated: boolean
  ) {
    if (chatMode === 'casual') {
      return {
        title: isPersonaRelated ? 'Oops! Ada masalah dengan persona chat' : 'Waduh, ada error nih!',
        description: isPersonaRelated 
          ? 'Kayaknya ada gangguan di sistem persona. Gue coba perbaiki ya!'
          : 'Ada yang nggak beres di aplikasi. Tapi tenang, gue bantu benerin!',
        retryButton: 'Coba Lagi',
        resetButton: 'Reset Persona',
        refreshButton: 'Refresh Halaman',
        recoveryStatus: 'Udah nyoba recover:'
      }
    }

    return {
      title: isPersonaRelated 
        ? 'Kesalahan Sistem Persona' 
        : 'Terjadi Kesalahan Aplikasi',
      description: isPersonaRelated
        ? 'Sistem persona mengalami gangguan. Kami akan mencoba memulihkan sesi akademik Anda.'
        : 'Aplikasi mengalami kesalahan teknis. Tim kami akan segera memperbaiki masalah ini.',
      retryButton: 'Ulangi',
      resetButton: 'Reset Persona',
      refreshButton: 'Muat Ulang',
      recoveryStatus: 'Percobaan pemulihan:'
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Otherwise use persona-aware error UI
      return this.renderPersonaAwareErrorUI()
    }

    return this.props.children
  }
}

// ============================================
// HOOK UNTUK FUNCTIONAL COMPONENTS
// ============================================

export function usePersonaAwareErrorRecovery() {
  const resetPersonaState = useChatStore(state => state.resetPersonaState)
  const currentPersona = useChatStore(state => state.currentPersona)
  const chatMode = useChatStore(state => state.chatModeState?.currentMode)

  const recoverFromError = (error: Error) => {
    console.log('[P07.3 HOOK] Attempting error recovery:', {
      error: error.message,
      personaId: currentPersona?.id,
      chatMode
    })

    try {
      // Reset persona state if error seems persona-related
      if (error.message.toLowerCase().includes('persona') || 
          error.message.toLowerCase().includes('provider')) {
        resetPersonaState?.()
        console.log('[P07.3 HOOK] Persona state reset due to error')
      }
    } catch (recoveryError) {
      console.error('[P07.3 HOOK] Recovery failed:', recoveryError)
    }
  }

  return { recoverFromError, currentPersona, chatMode }
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default PersonaAwareErrorBoundary