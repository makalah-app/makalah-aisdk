// ============================================
// MAKALAH AI: Persona-Aware AI Provider Management
// ============================================
// Task P07.1 Implementation: AI Provider Integration dengan Persona Context
// Created: August 2025
// Features: Provider configuration with persona context, fallback logic, error handling

import { openai } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { 
  createProviderRegistry, 
  customProvider, 
  wrapLanguageModel,
  defaultSettingsMiddleware,
  type LanguageModelV2Middleware
} from 'ai'
import type { PersonaTemplate, PersonaConfiguration } from '@/types/persona'

// ============================================
// PERSONA-AWARE PROVIDER CONFIGURATION
// ============================================

// Model configurations with persona awareness
export const personaAwareModels = {
  formal: {
    primary: process.env.PRIMARY_MODEL || 'google/gemini-2.5-pro',
    fallback: process.env.FALLBACK_MODEL || 'gpt-4o',
    temperature: 0.1, // Deterministic for academic work
    maxTokens: 2000,
  },
  casual: {
    primary: process.env.PRIMARY_MODEL || 'google/gemini-2.5-pro', 
    fallback: process.env.FALLBACK_MODEL || 'gpt-4o',
    temperature: 0.3, // More creative for casual conversation
    maxTokens: 2000,
  }
} as const

// ============================================
// PERSONA CONTEXT MIDDLEWARE
// ============================================

/**
 * Middleware untuk inject persona context ke dalam AI provider calls
 * Passes persona information through providerOptions untuk logging dan analytics
 */
export function createPersonaContextMiddleware(
  personaContext?: {
    chatMode?: 'formal' | 'casual' | null
    personaId?: string | null
    personaTemplate?: PersonaTemplate | null
    sessionId?: string | null
  }
): LanguageModelV2Middleware {
  return {
    transformParams: async ({ params }) => {
      // Inject persona context into provider metadata
      const enhancedParams = {
        ...params,
        providerMetadata: {
          ...params.providerMetadata,
          personaContext: {
            chatMode: personaContext?.chatMode,
            personaId: personaContext?.personaId,
            personaName: personaContext?.personaTemplate?.name,
            personaMode: personaContext?.personaTemplate?.mode,
            sessionId: personaContext?.sessionId,
            timestamp: new Date().toISOString(),
          }
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[PERSONA PROVIDER] Context injected:', {
          chatMode: personaContext?.chatMode,
          personaId: personaContext?.personaId,
          sessionId: personaContext?.sessionId
        })
      }

      return enhancedParams
    },

    wrapGenerate: async ({ doGenerate, params }) => {
      const startTime = Date.now()
      
      try {
        const result = await doGenerate()
        const duration = Date.now() - startTime

        // Log usage with persona context for analytics
        if (personaContext?.personaId) {
          console.log('[PERSONA USAGE] Generate completed:', {
            personaId: personaContext.personaId,
            chatMode: personaContext.chatMode,
            duration,
            tokenUsage: result.usage,
            timestamp: new Date().toISOString()
          })
        }

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        
        console.error('[PERSONA PROVIDER ERROR] Generate failed:', {
          personaId: personaContext?.personaId,
          chatMode: personaContext?.chatMode,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        throw error
      }
    },

    wrapStream: async ({ doStream, params }) => {
      const startTime = Date.now()
      
      try {
        const result = await doStream()
        
        // Log stream initiation
        if (personaContext?.personaId) {
          console.log('[PERSONA USAGE] Stream started:', {
            personaId: personaContext.personaId,
            chatMode: personaContext.chatMode,
            timestamp: new Date().toISOString()
          })
        }

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        
        console.error('[PERSONA PROVIDER ERROR] Stream failed:', {
          personaId: personaContext?.personaId,
          chatMode: personaContext?.chatMode,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        throw error
      }
    }
  }
}

// ============================================
// PERSONA-AWARE PROVIDER REGISTRY
// ============================================

/**
 * Creates persona-aware provider registry dengan lazy initialization untuk server-side only
 * This prevents client-side environment variable access errors
 */
export function createPersonaAwareProviderRegistry() {
  // Check if we're on server side
  const isServerSide = typeof window === 'undefined'
  
  if (!isServerSide) {
    throw new Error('PersonaAwareProviderRegistry can only be created on server side')
  }
  
  // Lazy initialization functions to avoid immediate environment variable access
  const createOpenRouterProvider = (chatMode: 'formal' | 'casual') => {
    return () => {
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not found in environment variables')
      }
      
      const openrouter = createOpenRouter({ apiKey })
      const modelConfig = personaAwareModels[chatMode]
      return openrouter.chat(modelConfig.primary)
    }
  }
  
  const createOpenAIProvider = (chatMode: 'formal' | 'casual') => {
    return () => {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found in environment variables')  
      }
      
      const modelConfig = personaAwareModels[chatMode]
      return openai.chat(modelConfig.fallback)
    }
  }

  const registry = createProviderRegistry(
    {
      // OpenRouter provider dengan persona-aware configurations
      openrouter: customProvider({
        languageModels: {
          // Formal academic mode - deterministic settings with lazy initialization
          'formal-primary': wrapLanguageModel({
            model: createOpenRouterProvider('formal')(),
            middleware: defaultSettingsMiddleware({
              settings: {
                temperature: personaAwareModels.formal.temperature,
                maxOutputTokens: personaAwareModels.formal.maxTokens,
                providerOptions: {
                  openrouter: {
                    route: 'fallback', // Use fallback routing for reliability
                  }
                }
              }
            })
          }),

          // Casual conversation mode - more creative settings with lazy initialization
          'casual-primary': wrapLanguageModel({
            model: createOpenRouterProvider('casual')(),
            middleware: defaultSettingsMiddleware({
              settings: {
                temperature: personaAwareModels.casual.temperature,
                maxOutputTokens: personaAwareModels.casual.maxTokens,
                providerOptions: {
                  openrouter: {
                    route: 'fallback',
                  }
                }
              }
            })
          }),
        },
        
        // Fallback to original OpenRouter provider with lazy initialization
        fallbackProvider: (() => {
          const apiKey = process.env.OPENROUTER_API_KEY
          if (!apiKey) {
            console.warn('[PERSONA PROVIDER] OPENROUTER_API_KEY not available for fallback provider')
            return null // Return null instead of throwing to allow graceful fallback
          }
          return createOpenRouter({ apiKey })
        })()
      }),

      // OpenAI fallback provider dengan persona awareness
      openai: customProvider({
        languageModels: {
          'formal-fallback': wrapLanguageModel({
            model: createOpenAIProvider('formal')(),
            middleware: defaultSettingsMiddleware({
              settings: {
                temperature: personaAwareModels.formal.temperature,
                maxOutputTokens: personaAwareModels.formal.maxTokens,
              }
            })
          }),

          'casual-fallback': wrapLanguageModel({
            model: createOpenAIProvider('casual')(),
            middleware: defaultSettingsMiddleware({
              settings: {
                temperature: personaAwareModels.casual.temperature,
                maxOutputTokens: personaAwareModels.casual.maxTokens,
              }
            })
          }),
        },
        
        fallbackProvider: openai
      })
    },
    { separator: ':' }
  )

  return registry
}

// ============================================
// PERSONA-AWARE PROVIDER CLASS
// ============================================

export class PersonaAwareProviderManager {
  private static instance: PersonaAwareProviderManager
  private registry: any = null // Lazy initialization
  private primaryFailed = false
  private failureCount = 0
  private lastFailureTime = 0

  private constructor() {}

  static getInstance(): PersonaAwareProviderManager {
    if (!this.instance) {
      this.instance = new PersonaAwareProviderManager()
    }
    return this.instance
  }

  /**
   * Get registry dengan lazy initialization (server-side only)
   */
  private getRegistry() {
    // Check if we're on server side
    const isServerSide = typeof window === 'undefined'
    
    if (!isServerSide) {
      throw new Error('PersonaAwareProviderManager can only be used on server side')
    }

    if (!this.registry) {
      console.log('[PERSONA PROVIDER] Initializing registry on server side...')
      this.registry = createPersonaAwareProviderRegistry()
    }
    
    return this.registry
  }

  /**
   * Get the best available model untuk given persona context
   */
  async getModelForPersona(personaContext: {
    chatMode?: 'formal' | 'casual' | null
    personaTemplate?: PersonaTemplate | null
    sessionId?: string | null
  }) {
    // Check if we're on server side
    const isServerSide = typeof window === 'undefined'
    
    if (!isServerSide) {
      throw new Error('getModelForPersona can only be called on server side')
    }

    const chatMode = personaContext.chatMode || 'formal'
    const modelConfig = personaAwareModels[chatMode]

    // Create middleware dengan persona context
    const personaMiddleware = createPersonaContextMiddleware({
      ...personaContext,
      personaId: personaContext.personaTemplate?.id || null
    })

    try {
      // Try primary provider first (OpenRouter)
      if (!this.shouldUseFallback()) {
        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
          throw new Error('OPENROUTER_API_KEY not found in environment variables')
        }

        const openrouter = createOpenRouter({ apiKey })
        const primaryModel = openrouter.chat(modelConfig.primary)
        
        // Wrap with persona context middleware and settings
        const enhancedModel = wrapLanguageModel({
          model: primaryModel,
          middleware: [
            defaultSettingsMiddleware({
              settings: {
                temperature: modelConfig.temperature,
                maxOutputTokens: modelConfig.maxTokens,
                providerOptions: {
                  openrouter: {
                    route: 'fallback', // Use fallback routing for reliability
                  }
                }
              }
            }),
            personaMiddleware
          ]
        })

        console.log(`[PERSONA PROVIDER] Using OpenRouter primary model: ${modelConfig.primary}`, {
          chatMode,
          personaId: personaContext.personaTemplate?.id
        })

        // Reset failure state on successful model creation
        this.primaryFailed = false
        return enhancedModel
      }
    } catch (error) {
      console.error('[PERSONA PROVIDER] OpenRouter primary provider failed:', error)
      this.markPrimaryFailed()
    }

    // Fallback to OpenAI
    try {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found in environment variables')
      }

      const fallbackModel = openai.chat(modelConfig.fallback)
      
      // Wrap with persona context middleware and settings
      const enhancedModel = wrapLanguageModel({
        model: fallbackModel,
        middleware: [
          defaultSettingsMiddleware({
            settings: {
              temperature: modelConfig.temperature,
              maxOutputTokens: modelConfig.maxTokens,
            }
          }),
          personaMiddleware
        ]
      })

      console.warn(`[PERSONA PROVIDER] Using OpenAI fallback model: ${modelConfig.fallback}`, {
        chatMode,
        personaId: personaContext.personaTemplate?.id
      })

      return enhancedModel
    } catch (error) {
      console.error('[PERSONA PROVIDER] All providers failed:', error)
      throw new Error(`Failed to get model for persona context: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if should use fallback based on failure patterns
   */
  private shouldUseFallback(): boolean {
    // If primary failed recently, use fallback immediately
    if (this.primaryFailed) return true

    // Use fallback if too many failures in short timeframe
    const now = Date.now()
    if (this.failureCount > 3 && now - this.lastFailureTime < 5 * 60 * 1000) {
      return true
    }

    return false
  }

  /**
   * Mark primary provider as failed with exponential backoff
   */
  private markPrimaryFailed() {
    this.primaryFailed = true
    this.failureCount++
    this.lastFailureTime = Date.now()

    // Reset after exponential backoff (min 1 minute, max 30 minutes)
    const backoffTime = Math.min(60000 * Math.pow(2, this.failureCount - 1), 30 * 60 * 1000)
    
    setTimeout(() => {
      this.primaryFailed = false
    }, backoffTime)

    console.log(`[PERSONA PROVIDER] Primary marked as failed. Backoff: ${backoffTime}ms`)
  }

  /**
   * Reset failure state (useful for manual recovery)
   */
  resetFailureState() {
    this.primaryFailed = false
    this.failureCount = 0
    this.lastFailureTime = 0
    console.log('[PERSONA PROVIDER] Failure state reset')
  }

  /**
   * Get provider health status
   */
  getHealthStatus() {
    return {
      primaryAvailable: !this.primaryFailed,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      backoffActive: this.shouldUseFallback(),
      timestamp: Date.now()
    }
  }

  /**
   * Get provider registry untuk direct access jika diperlukan (server-side only)
   */
  getPublicRegistry() {
    return this.getRegistry()
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

// Singleton instance
export const personaAwareProvider = PersonaAwareProviderManager.getInstance()

// Helper function untuk get model berdasarkan chat mode
export async function getPersonaAwareModel(
  chatMode: 'formal' | 'casual' | null,
  personaTemplate?: PersonaTemplate | null,
  sessionId?: string | null
) {
  return personaAwareProvider.getModelForPersona({
    chatMode,
    personaTemplate,
    sessionId
  })
}

// Compatibility dengan existing provider interface
export async function getAvailableModel(personaContext?: {
  chatMode?: 'formal' | 'casual' | null
  personaTemplate?: PersonaTemplate | null
  sessionId?: string | null
}) {
  if (personaContext) {
    return getPersonaAwareModel(
      personaContext.chatMode || null,
      personaContext.personaTemplate,
      personaContext.sessionId
    )
  }
  
  // Fallback to original logic
  return getPersonaAwareModel('formal')
}

// Provider validation dengan persona awareness
export async function validatePersonaAwareProviderConfiguration() {
  const results = {
    primaryProvider: {
      configured: false,
      apiKeyPresent: false,
      modelValid: false,
      error: null as string | null,
      personaModesSupported: [] as string[]
    },
    fallbackProvider: {
      configured: false,
      apiKeyPresent: false,
      modelValid: false,
      error: null as string | null,
      personaModesSupported: [] as string[]
    },
    registry: {
      initialized: false,
      modelsAvailable: [] as string[]
    }
  }

  // Validate OpenRouter configuration
  try {
    results.primaryProvider.apiKeyPresent = !!process.env.OPENROUTER_API_KEY
    results.primaryProvider.modelValid = !!(personaAwareModels.formal.primary && personaAwareModels.casual.primary)
    results.primaryProvider.configured = results.primaryProvider.apiKeyPresent && results.primaryProvider.modelValid
    results.primaryProvider.personaModesSupported = ['formal', 'casual']
    
    if (!results.primaryProvider.apiKeyPresent) {
      results.primaryProvider.error = 'OPENROUTER_API_KEY not found in environment'
    }
  } catch (error) {
    results.primaryProvider.error = error instanceof Error ? error.message : 'Unknown error'
  }

  // Validate OpenAI configuration  
  try {
    results.fallbackProvider.apiKeyPresent = !!process.env.OPENAI_API_KEY
    results.fallbackProvider.modelValid = !!(personaAwareModels.formal.fallback && personaAwareModels.casual.fallback)
    results.fallbackProvider.configured = results.fallbackProvider.apiKeyPresent && results.fallbackProvider.modelValid
    results.fallbackProvider.personaModesSupported = ['formal', 'casual']
    
    if (!results.fallbackProvider.apiKeyPresent) {
      results.fallbackProvider.error = 'OPENAI_API_KEY not found in environment'
    }
  } catch (error) {
    results.fallbackProvider.error = error instanceof Error ? error.message : 'Unknown error'
  }

  // Validate registry
  try {
    const registry = personaAwareProvider.getRegistry()
    results.registry.initialized = true
    results.registry.modelsAvailable = [
      'openrouter:formal-primary',
      'openrouter:casual-primary', 
      'openai:formal-fallback',
      'openai:casual-fallback'
    ]
  } catch (error) {
    console.error('[PERSONA PROVIDER] Registry validation failed:', error)
  }

  console.log('[PERSONA PROVIDER VALIDATION]', results)
  return results
}

// Initialize validation on module load (server-side only)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  // Only run validation on server side during development
  validatePersonaAwareProviderConfiguration().catch(error => {
    console.warn('[PERSONA PROVIDER] Validation failed during module load:', error)
  })
}