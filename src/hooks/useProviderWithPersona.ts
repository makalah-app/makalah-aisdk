// ============================================
// MAKALAH AI: Persona-Aware Provider Hook
// ============================================
// Task P07.1 Implementation: Provider Hook dengan Persona Context Integration
// Created: August 2025
// Features: Provider management hook with persona awareness, health monitoring

import { useState, useEffect, useCallback } from 'react'
import { useChatStore } from '@/store/chat'
import { 
  personaAwareProvider, 
  getPersonaAwareModel,
  validatePersonaAwareProviderConfiguration 
} from '@/lib/providers/persona-aware-provider'
import type { PersonaTemplate } from '@/types/persona'

// ============================================
// HOOK TYPES
// ============================================

interface ProviderHealthStatus {
  primaryAvailable: boolean
  fallbackAvailable: boolean
  failureCount: number
  lastFailureTime: number
  backoffActive: boolean
  validationResults?: any
}

interface ProviderUsageStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastRequestTime: number | null
}

interface UseProviderWithPersonaReturn {
  // Current provider state
  currentModel: any | null
  isLoading: boolean
  error: string | null
  
  // Health and status
  healthStatus: ProviderHealthStatus | null
  usageStats: ProviderUsageStats
  
  // Provider management
  refreshModel: () => Promise<void>
  resetFailureState: () => void
  validateConfiguration: () => Promise<any>
  
  // Persona-aware utilities
  getModelForMode: (mode: 'formal' | 'casual') => Promise<any>
  switchToFallback: () => Promise<void>
  
  // Debug information
  debugInfo: {
    personaContext: any
    lastModelSwitch: number | null
    providerHistory: Array<{
      timestamp: number
      chatMode: string
      personaId: string | null
      provider: string
      success: boolean
    }>
  }
}

// ============================================
// PROVIDER HOOK IMPLEMENTATION
// ============================================

export function useProviderWithPersona(sessionId?: string | null): UseProviderWithPersonaReturn {
  // Store state
  const {
    currentPersona,
    chatModeState,
    getChatModeForSession
  } = useChatStore()

  // Local state
  const [currentModel, setCurrentModel] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<ProviderHealthStatus | null>(null)
  const [usageStats, setUsageStats] = useState<ProviderUsageStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: null
  })
  
  const [debugInfo, setDebugInfo] = useState({
    personaContext: null,
    lastModelSwitch: null as number | null,
    providerHistory: [] as Array<{
      timestamp: number
      chatMode: string
      personaId: string | null
      provider: string
      success: boolean
    }>
  })

  // Get effective chat mode
  const sessionChatMode = sessionId ? getChatModeForSession(sessionId) : null
  const effectiveChatMode = sessionChatMode || chatModeState.currentMode

  // ============================================
  // PROVIDER MANAGEMENT FUNCTIONS
  // ============================================

  /**
   * Load model berdasarkan current persona context
   */
  const loadModel = useCallback(async (
    forceRefresh = false,
    specificMode?: 'formal' | 'casual'
  ) => {
    setIsLoading(true)
    setError(null)

    const startTime = Date.now()
    const chatMode = specificMode || effectiveChatMode
    
    try {
      console.log('[PROVIDER HOOK] Loading model:', {
        chatMode,
        personaId: currentPersona?.id,
        sessionId,
        forceRefresh
      })

      const personaContext = {
        chatMode,
        personaTemplate: currentPersona,
        sessionId
      }

      // Get persona-aware model
      const model = await getPersonaAwareModel(
        chatMode,
        currentPersona,
        sessionId
      )

      setCurrentModel(model)
      
      const responseTime = Date.now() - startTime
      
      // Update usage stats
      setUsageStats(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
        successfulRequests: prev.successfulRequests + 1,
        averageResponseTime: prev.totalRequests > 0 
          ? (prev.averageResponseTime * prev.totalRequests + responseTime) / (prev.totalRequests + 1)
          : responseTime,
        lastRequestTime: Date.now()
      }))
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        personaContext,
        lastModelSwitch: Date.now(),
        providerHistory: [
          ...prev.providerHistory.slice(-9), // Keep last 10 entries
          {
            timestamp: Date.now(),
            chatMode: chatMode || 'unknown',
            personaId: currentPersona?.id || null,
            provider: 'persona-aware',
            success: true
          }
        ]
      }))

      console.log('[PROVIDER HOOK] Model loaded successfully:', {
        chatMode,
        responseTime,
        modelType: typeof model
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load model'
      console.error('[PROVIDER HOOK] Model loading failed:', err)
      
      setError(errorMessage)
      
      // Update failure stats
      setUsageStats(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
        failedRequests: prev.failedRequests + 1,
        lastRequestTime: Date.now()
      }))
      
      // Update debug info with failure
      setDebugInfo(prev => ({
        ...prev,
        providerHistory: [
          ...prev.providerHistory.slice(-9),
          {
            timestamp: Date.now(),
            chatMode: chatMode || 'unknown',
            personaId: currentPersona?.id || null,
            provider: 'persona-aware',
            success: false
          }
        ]
      }))
    } finally {
      setIsLoading(false)
    }
  }, [effectiveChatMode, currentPersona, sessionId])

  /**
   * Refresh health status
   */
  const refreshHealthStatus = useCallback(async () => {
    try {
      const health = personaAwareProvider.getHealthStatus()
      const validation = await validatePersonaAwareProviderConfiguration()
      
      setHealthStatus({
        primaryAvailable: health.primaryAvailable,
        fallbackAvailable: validation.fallbackProvider.configured,
        failureCount: health.failureCount,
        lastFailureTime: health.lastFailureTime,
        backoffActive: health.backoffActive,
        validationResults: validation
      })
      
    } catch (err) {
      console.error('[PROVIDER HOOK] Health check failed:', err)
      setHealthStatus({
        primaryAvailable: false,
        fallbackAvailable: false,
        failureCount: 0,
        lastFailureTime: 0,
        backoffActive: false
      })
    }
  }, [])

  // ============================================
  // PUBLIC API FUNCTIONS
  // ============================================

  const refreshModel = useCallback(async () => {
    await loadModel(true)
  }, [loadModel])

  const resetFailureState = useCallback(() => {
    personaAwareProvider.resetFailureState()
    setError(null)
    refreshHealthStatus()
  }, [refreshHealthStatus])

  const validateConfiguration = useCallback(async () => {
    return await validatePersonaAwareProviderConfiguration()
  }, [])

  const getModelForMode = useCallback(async (mode: 'formal' | 'casual') => {
    await loadModel(false, mode)
    return currentModel
  }, [loadModel, currentModel])

  const switchToFallback = useCallback(async () => {
    try {
      personaAwareProvider.resetFailureState()
      // Force failure state untuk trigger fallback
      personaAwareProvider['markPrimaryFailed']()
      await loadModel(true)
    } catch (err) {
      console.error('[PROVIDER HOOK] Fallback switch failed:', err)
    }
  }, [loadModel])

  // ============================================
  // EFFECTS
  // ============================================

  // Load model when persona context changes
  useEffect(() => {
    if (effectiveChatMode !== null) {
      loadModel()
    }
  }, [effectiveChatMode, currentPersona?.id, sessionId, loadModel])

  // Refresh health status periodically
  useEffect(() => {
    refreshHealthStatus()
    
    const interval = setInterval(refreshHealthStatus, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [refreshHealthStatus])

  // ============================================
  // RETURN HOOK INTERFACE
  // ============================================

  return {
    // Current state
    currentModel,
    isLoading,
    error,
    
    // Health and monitoring
    healthStatus,
    usageStats,
    
    // Management functions
    refreshModel,
    resetFailureState,
    validateConfiguration,
    
    // Persona-aware utilities
    getModelForMode,
    switchToFallback,
    
    // Debug information
    debugInfo
  }
}

// ============================================
// UTILITIES AND HELPERS
// ============================================

/**
 * Hook untuk provider health monitoring
 */
export function useProviderHealth() {
  const [health, setHealth] = useState<ProviderHealthStatus | null>(null)
  const [lastCheck, setLastCheck] = useState<number | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      const status = personaAwareProvider.getHealthStatus()
      const validation = await validatePersonaAwareProviderConfiguration()
      
      setHealth({
        primaryAvailable: status.primaryAvailable,
        fallbackAvailable: validation.fallbackProvider.configured,
        failureCount: status.failureCount,
        lastFailureTime: status.lastFailureTime,
        backoffActive: status.backoffActive,
        validationResults: validation
      })
      
      setLastCheck(Date.now())
    } catch (error) {
      console.error('[PROVIDER HEALTH] Check failed:', error)
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 60000) // Every minute
    return () => clearInterval(interval)
  }, [checkHealth])

  return {
    health,
    lastCheck,
    refetch: checkHealth
  }
}

/**
 * Hook untuk provider usage statistics
 */
export function useProviderStats(sessionId?: string) {
  const [stats, setStats] = useState({
    totalModelSwitches: 0,
    preferredMode: null as 'formal' | 'casual' | null,
    averageLoadTime: 0,
    errorRate: 0,
    lastActivity: null as number | null
  })

  // This would typically connect to a real analytics service
  useEffect(() => {
    // Mock implementation - in real app, fetch from analytics service
    const mockStats = {
      totalModelSwitches: Math.floor(Math.random() * 50),
      preferredMode: Math.random() > 0.5 ? 'formal' : 'casual' as 'formal' | 'casual',
      averageLoadTime: 1200 + Math.random() * 800, // 1.2-2.0 seconds
      errorRate: Math.random() * 0.05, // 0-5% error rate
      lastActivity: Date.now() - Math.random() * 3600000 // Last hour
    }
    
    setStats(mockStats)
  }, [sessionId])

  return stats
}

// ============================================
// EXPORTS
// ============================================

export default useProviderWithPersona

// Re-export types untuk convenience
export type { 
  ProviderHealthStatus,
  ProviderUsageStats,
  UseProviderWithPersonaReturn
}