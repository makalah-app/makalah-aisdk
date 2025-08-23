// ============================================
// MAKALAH AI: Persona Context Hook for UI Components
// ============================================
// Task P07.3 Implementation: UI component persona context integration
// Created: August 2025
// Features: Persona context consumption, state management, error handling

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useChatStore } from '@/store/chat'
import { personaSessionManager } from '@/lib/auth/persona-session'
import { logPersonaEvent } from '@/lib/audit/persona-logging'
import type { PersonaTemplate } from '@/types/persona'

// ============================================
// HOOK TYPES
// ============================================

export interface PersonaContextData {
  // Current persona state
  currentPersona: PersonaTemplate | null
  chatMode: 'formal' | 'casual' | null
  sessionId: string | null
  
  // UI behavior configuration
  uiConfig: {
    showPersonaIndicator: boolean
    enableModeSwitch: boolean
    preferredLanguage: 'formal' | 'jakarta-gue-lo'
    compactMode: boolean
    theme: 'light' | 'dark' | 'system'
  }
  
  // Workflow context
  workflowContext: {
    isActive: boolean
    currentPhase: number | null
    totalPhases: number
    workflowType: string | null
  }
  
  // Performance metrics
  performance: {
    lastPersonaSwitch: number | null
    contextLoadTime: number | null
    errorCount: number
  }
}

export interface PersonaContextActions {
  // Persona management
  switchPersona: (personaId: string) => Promise<boolean>
  switchChatMode: (mode: 'formal' | 'casual') => Promise<boolean>
  resetToDefault: () => Promise<boolean>
  
  // UI preferences
  updateUIConfig: (config: Partial<PersonaContextData['uiConfig']>) => void
  togglePersonaIndicator: () => void
  toggleModeSwitch: () => void
  
  // Context utilities
  refreshContext: () => Promise<void>
  clearError: () => void
}

export interface UsePersonaContextReturn {
  // Data
  context: PersonaContextData
  
  // Actions
  actions: PersonaContextActions
  
  // State
  isLoading: boolean
  error: string | null
  isInitialized: boolean
  
  // Utilities
  getPersonaDisplayName: () => string
  getPersonaModeLabel: () => string
  isPersonaAvailable: (personaId: string) => boolean
  getRecommendedPersonas: () => PersonaTemplate[]
}

// ============================================
// PERSONA CONTEXT HOOK
// ============================================

export function usePersonaContext(sessionId?: string | null): UsePersonaContextReturn {
  // Store state
  const {
    currentPersona,
    chatModeState,
    getChatModeForSession,
    setChatModeForSession,
    currentProject,
    workflowState,
    personas,
    setCurrentPersona,
    updatePersonaUsage
  } = useChatStore()

  // Local state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [uiConfig, setUIConfig] = useState({
    showPersonaIndicator: true,
    enableModeSwitch: true,
    preferredLanguage: 'formal' as 'formal' | 'jakarta-gue-lo',
    compactMode: false,
    theme: 'system' as 'light' | 'dark' | 'system'
  })
  const [performance, setPerformance] = useState({
    lastPersonaSwitch: null as number | null,
    contextLoadTime: null as number | null,
    errorCount: 0
  })

  // Get effective chat mode
  const effectiveChatMode = sessionId ? getChatModeForSession(sessionId) : chatModeState.currentMode

  // ============================================
  // CONTEXT DATA COMPUTATION
  // ============================================

  const contextData: PersonaContextData = useMemo(() => ({
    currentPersona,
    chatMode: effectiveChatMode,
    sessionId: sessionId || null,
    uiConfig,
    workflowContext: {
      isActive: workflowState?.isActive || false,
      currentPhase: workflowState?.currentPhase || null,
      totalPhases: workflowState?.maxPhases || 8,
      workflowType: workflowState?.type || null
    },
    performance
  }), [currentPersona, effectiveChatMode, sessionId, uiConfig, workflowState, performance])

  // ============================================
  // PERSONA MANAGEMENT ACTIONS
  // ============================================

  const switchPersona = useCallback(async (personaId: string): Promise<boolean> => {
    const startTime = Date.now()
    setIsLoading(true)
    setError(null)

    try {
      console.log('[PERSONA CONTEXT] Switching persona:', {
        from: currentPersona?.id || null,
        to: personaId,
        sessionId
      })

      // Find persona in available personas
      const targetPersona = personas.find(p => p.id === personaId)
      if (!targetPersona) {
        throw new Error(`Persona ${personaId} not found`)
      }

      // Update in store
      setCurrentPersona(targetPersona)

      // Update session if sessionId provided
      if (sessionId) {
        personaSessionManager.updateSession(sessionId, {
          preferredPersonaId: personaId,
          chatMode: targetPersona.chat_mode_type
        })
      }

      // Update UI config based on new persona
      setUIConfig(prev => ({
        ...prev,
        preferredLanguage: targetPersona.chat_mode_type === 'casual' ? 'jakarta-gue-lo' : 'formal'
      }))

      // Log persona switch
      logPersonaEvent(
        currentPersona ? 'persona_switched' : 'persona_selected',
        `Persona switched to: ${targetPersona.name}`,
        {
          sessionId: sessionId || undefined,
          chatMode: effectiveChatMode,
          personaId: targetPersona.id,
          personaName: targetPersona.name,
          personaMode: targetPersona.mode,
          timestamp: new Date().toISOString()
        },
        {
          previousPersonaId: currentPersona?.id || null,
          switchDuration: Date.now() - startTime
        }
      )

      // Update performance metrics
      setPerformance(prev => ({
        ...prev,
        lastPersonaSwitch: Date.now(),
        contextLoadTime: Date.now() - startTime
      }))

      console.log('[PERSONA CONTEXT] Persona switched successfully:', {
        newPersona: targetPersona.name,
        duration: Date.now() - startTime
      })

      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch persona'
      console.error('[PERSONA CONTEXT] Persona switch failed:', err)
      
      setError(errorMessage)
      setPerformance(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }))

      // Log error
      logPersonaEvent(
        'error_occurred',
        `Persona switch failed: ${errorMessage}`,
        {
          sessionId: sessionId || undefined,
          chatMode: effectiveChatMode,
          timestamp: new Date().toISOString()
        },
        {
          targetPersonaId: personaId,
          errorMessage,
          duration: Date.now() - startTime
        },
        'error'
      )

      return false

    } finally {
      setIsLoading(false)
    }
  }, [currentPersona, personas, sessionId, effectiveChatMode, setCurrentPersona])

  const switchChatMode = useCallback(async (mode: 'formal' | 'casual'): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[PERSONA CONTEXT] Switching chat mode:', {
        from: effectiveChatMode,
        to: mode,
        sessionId
      })

      // Update chat mode in store
      if (sessionId) {
        setChatModeForSession(sessionId, mode)
      } else {
        // Update global chat mode
        useChatStore.getState().setChatMode(mode)
      }

      // Update session
      if (sessionId) {
        personaSessionManager.updateSession(sessionId, {
          chatMode: mode
        })
      }

      // Update UI config
      setUIConfig(prev => ({
        ...prev,
        preferredLanguage: mode === 'casual' ? 'jakarta-gue-lo' : 'formal'
      }))

      // Log mode change
      logPersonaEvent(
        'chat_mode_changed',
        `Chat mode changed from ${effectiveChatMode || 'none'} to ${mode}`,
        {
          sessionId: sessionId || undefined,
          chatMode: mode,
          personaId: currentPersona?.id,
          timestamp: new Date().toISOString()
        },
        {
          previousMode: effectiveChatMode,
          newMode: mode
        }
      )

      console.log('[PERSONA CONTEXT] Chat mode switched successfully:', mode)
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch chat mode'
      console.error('[PERSONA CONTEXT] Chat mode switch failed:', err)
      
      setError(errorMessage)
      setPerformance(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }))

      return false

    } finally {
      setIsLoading(false)
    }
  }, [effectiveChatMode, sessionId, currentPersona, setChatModeForSession])

  const resetToDefault = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[PERSONA CONTEXT] Resetting to default persona')

      // Reset to default persona (first formal persona)
      const defaultPersona = personas.find(p => p.chat_mode_type === 'formal' && p.is_default) || 
                            personas.find(p => p.chat_mode_type === 'formal') ||
                            personas[0]

      if (!defaultPersona) {
        throw new Error('No default persona available')
      }

      // Reset persona and mode
      setCurrentPersona(defaultPersona)
      
      if (sessionId) {
        setChatModeForSession(sessionId, 'formal')
        personaSessionManager.updateSession(sessionId, {
          chatMode: 'formal',
          preferredPersonaId: defaultPersona.id
        })
      }

      // Reset UI config
      setUIConfig({
        showPersonaIndicator: true,
        enableModeSwitch: true,
        preferredLanguage: 'formal',
        compactMode: false,
        theme: 'system'
      })

      console.log('[PERSONA CONTEXT] Reset to default successfully:', defaultPersona.name)
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset to default'
      setError(errorMessage)
      return false

    } finally {
      setIsLoading(false)
    }
  }, [personas, sessionId, setCurrentPersona, setChatModeForSession])

  // ============================================
  // UI CONFIGURATION ACTIONS
  // ============================================

  const updateUIConfig = useCallback((config: Partial<PersonaContextData['uiConfig']>) => {
    setUIConfig(prev => ({ ...prev, ...config }))
    
    // Save to session if available
    if (sessionId) {
      // In real implementation, save UI preferences to session
      console.log('[PERSONA CONTEXT] UI config updated for session:', sessionId, config)
    }
  }, [sessionId])

  const togglePersonaIndicator = useCallback(() => {
    updateUIConfig({ showPersonaIndicator: !uiConfig.showPersonaIndicator })
  }, [uiConfig.showPersonaIndicator, updateUIConfig])

  const toggleModeSwitch = useCallback(() => {
    updateUIConfig({ enableModeSwitch: !uiConfig.enableModeSwitch })
  }, [uiConfig.enableModeSwitch, updateUIConfig])

  // ============================================
  // CONTEXT UTILITIES
  // ============================================

  const refreshContext = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Refresh persona data from store
      // In real implementation, might fetch from API
      console.log('[PERSONA CONTEXT] Context refreshed')
      
      setPerformance(prev => ({
        ...prev,
        contextLoadTime: Date.now()
      }))

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh context'
      setError(errorMessage)
      
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const getPersonaDisplayName = useCallback(() => {
    if (!currentPersona) return 'No Persona Selected'
    
    // Return appropriate display name based on UI config
    if (uiConfig.compactMode) {
      return currentPersona.name.split(' ')[0] // First word only
    }
    
    return currentPersona.name
  }, [currentPersona, uiConfig.compactMode])

  const getPersonaModeLabel = useCallback(() => {
    if (!effectiveChatMode) return 'No Mode'
    
    const labels = {
      formal: uiConfig.preferredLanguage === 'jakarta-gue-lo' ? 'Mode Formal' : 'Formal Mode',
      casual: uiConfig.preferredLanguage === 'jakarta-gue-lo' ? 'Mode Santai' : 'Casual Mode'
    }
    
    return labels[effectiveChatMode]
  }, [effectiveChatMode, uiConfig.preferredLanguage])

  const isPersonaAvailable = useCallback((personaId: string) => {
    return personas.some(p => p.id === personaId && p.is_active)
  }, [personas])

  const getRecommendedPersonas = useCallback(() => {
    if (!effectiveChatMode) return personas.slice(0, 3)
    
    // Get personas matching current chat mode, sorted by usage
    return personas
      .filter(p => p.chat_mode_type === effectiveChatMode && p.is_active)
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      .slice(0, 3)
  }, [personas, effectiveChatMode])

  // ============================================
  // INITIALIZATION EFFECT
  // ============================================

  useEffect(() => {
    if (!isInitialized) {
      const initializeContext = async () => {
        const startTime = Date.now()
        
        try {
          // Load UI preferences from session if available
          if (sessionId) {
            const sessionData = personaSessionManager.getSession(sessionId)
            if (sessionData?.personaPreferences.uiPreferences) {
              const prefs = sessionData.personaPreferences.uiPreferences
              setUIConfig({
                showPersonaIndicator: prefs.showPersonaIndicator !== false,
                enableModeSwitch: prefs.enableModeSwitch !== false,
                preferredLanguage: prefs.preferredLanguage || 'formal',
                compactMode: false,
                theme: 'system'
              })
            }
          }

          setPerformance(prev => ({
            ...prev,
            contextLoadTime: Date.now() - startTime
          }))

          setIsInitialized(true)
          console.log('[PERSONA CONTEXT] Initialized successfully:', {
            sessionId,
            chatMode: effectiveChatMode,
            personaId: currentPersona?.id
          })

        } catch (err) {
          console.error('[PERSONA CONTEXT] Initialization failed:', err)
          setError(err instanceof Error ? err.message : 'Initialization failed')
        }
      }

      initializeContext()
    }
  }, [isInitialized, sessionId, effectiveChatMode, currentPersona])

  // ============================================
  // RETURN HOOK INTERFACE
  // ============================================

  return {
    // Data
    context: contextData,
    
    // Actions
    actions: {
      switchPersona,
      switchChatMode,
      resetToDefault,
      updateUIConfig,
      togglePersonaIndicator,
      toggleModeSwitch,
      refreshContext,
      clearError
    },
    
    // State
    isLoading,
    error,
    isInitialized,
    
    // Utilities
    getPersonaDisplayName,
    getPersonaModeLabel,
    isPersonaAvailable,
    getRecommendedPersonas
  }
}

// ============================================
// SPECIALIZED HOOKS
// ============================================

/**
 * Hook untuk simple persona indicator display
 */
export function usePersonaIndicator(sessionId?: string | null) {
  const { context, getPersonaDisplayName, getPersonaModeLabel } = usePersonaContext(sessionId)
  
  return {
    personaName: getPersonaDisplayName(),
    modeLabel: getPersonaModeLabel(),
    isVisible: context.uiConfig.showPersonaIndicator,
    chatMode: context.chatMode,
    isCompact: context.uiConfig.compactMode
  }
}

/**
 * Hook untuk mode switching controls
 */
export function usePersonaModeSwitcher(sessionId?: string | null) {
  const { context, actions, isLoading, error } = usePersonaContext(sessionId)
  
  return {
    currentMode: context.chatMode,
    isEnabled: context.uiConfig.enableModeSwitch,
    switchToFormal: () => actions.switchChatMode('formal'),
    switchToCasual: () => actions.switchChatMode('casual'),
    isLoading,
    error,
    clearError: actions.clearError
  }
}

/**
 * Hook untuk persona recommendations
 */
export function usePersonaRecommendations(sessionId?: string | null) {
  const { context, actions, getRecommendedPersonas } = usePersonaContext(sessionId)
  
  const recommendations = getRecommendedPersonas()
  
  return {
    recommendations,
    currentPersonaId: context.currentPersona?.id || null,
    selectPersona: actions.switchPersona,
    hasRecommendations: recommendations.length > 0,
    chatMode: context.chatMode
  }
}