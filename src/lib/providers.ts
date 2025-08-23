import { openai } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
// 🚀 P07.1: PERSONA-AWARE PROVIDER INTEGRATION
import { 
  getPersonaAwareModel, 
  personaAwareProvider,
  validatePersonaAwareProviderConfiguration 
} from '@/lib/providers/persona-aware-provider'
import type { PersonaTemplate } from '@/types/persona'

// Model configurations
export const models = {
  primary: process.env.PRIMARY_MODEL || 'google/gemini-2.5-pro',
  fallback: process.env.FALLBACK_MODEL || 'gpt-4o',
}

// Primary provider function
export function getPrimaryModel() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not found in environment variables')
  }
  
  // Safe logging - masking API key untuk security
  if (process.env.NODE_ENV === 'development') {
    const maskedKey = apiKey ? `${apiKey.slice(0, 4)}${'*'.repeat(20)}` : 'NOT_SET'
    console.log('[PROVIDER] OpenRouter API Key configured:', maskedKey)
  }
  
  const openrouter = createOpenRouter({
    apiKey,
  })
  return openrouter.chat(models.primary)
}

// Fallback provider function  
export function getFallbackModel() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables')
  }
  
  // Safe logging - masking API key untuk security
  if (process.env.NODE_ENV === 'development') {
    const maskedKey = apiKey ? `${apiKey.slice(0, 4)}${'*'.repeat(16)}` : 'NOT_SET'
    console.log('[PROVIDER] OpenAI API Key configured:', maskedKey)
    console.log('[PROVIDER] Using OpenAI fallback model:', models.fallback)
  }
  
  // Use explicit chat method to ensure chat API usage
  return openai.chat(models.fallback)
}

// 🚀 P07.1: ENHANCED PROVIDER REGISTRY WITH PERSONA AWARENESS
export class ProviderRegistry {
  private static instance: ProviderRegistry
  private primaryFailed = false

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!this.instance) {
      this.instance = new ProviderRegistry()
    }
    return this.instance
  }

  // 🚀 P07.1: ENHANCED PERSONA-AWARE MODEL SELECTION WITH IMPROVED ERROR HANDLING
  async getAvailableModel(personaContext?: {
    chatMode?: 'formal' | 'casual' | null
    personaTemplate?: PersonaTemplate | null
    sessionId?: string | null
  }) {
    // Use persona-aware provider if context is provided (P07.1 enhancement)
    if (personaContext) {
      try {
        console.log('[P07.1 PROVIDER REGISTRY] Using enhanced persona-aware provider:', {
          chatMode: personaContext.chatMode,
          personaId: personaContext.personaTemplate?.id,
          sessionId: personaContext.sessionId
        })
        
        // Import persona-aware provider dynamically to avoid circular dependencies
        const { getPersonaAwareModel } = await import('@/lib/providers/persona-aware-provider')
        
        const model = await getPersonaAwareModel(
          personaContext.chatMode,
          personaContext.personaTemplate,
          personaContext.sessionId
        )
        
        // Reset legacy failure state when persona-aware provider succeeds
        this.primaryFailed = false
        
        console.log('[P07.1 SUCCESS] Persona-aware model obtained successfully')
        return model
        
      } catch (personaError) {
        console.error('[P07.1 PERSONA ERROR] Persona-aware provider failed:', {
          error: personaError instanceof Error ? personaError.message : 'Unknown error',
          chatMode: personaContext.chatMode,
          personaId: personaContext.personaTemplate?.id,
          fallbackStrategy: 'legacy-provider'
        })
        
        // Mark persona provider as failed and continue to legacy fallback
        // This ensures seamless fallback without breaking the user experience
      }
    }

    // Enhanced legacy fallback logic (P07.1 improvement)
    console.log('[P07.1 LEGACY FALLBACK] Using enhanced legacy provider logic:', {
      primaryFailed: this.primaryFailed,
      hasPersonaContext: !!personaContext
    })

    if (this.primaryFailed) {
      console.warn('[P07.1 PROVIDER] Using fallback provider due to primary provider failure')
      try {
        const fallbackModel = getFallbackModel()
        console.log('[P07.1 SUCCESS] Fallback model obtained')
        return fallbackModel
      } catch (fallbackError) {
        console.error('[P07.1 CRITICAL] Even fallback provider failed:', fallbackError)
        throw new Error('All providers failed - check API keys and network connectivity')
      }
    }

    try {
      const model = getPrimaryModel()
      console.log('[P07.1 SUCCESS] Primary provider (OpenRouter) obtained')
      
      this.primaryFailed = false
      return model
    } catch (error) {
      console.error('[P07.1 PRIMARY FAIL] Primary provider failed, attempting fallback:', error)
      this.primaryFailed = true
      
      try {
        const fallbackModel = getFallbackModel()
        console.log('[P07.1 RECOVERY] Successfully recovered with fallback provider')
        return fallbackModel
      } catch (fallbackError) {
        console.error('[P07.1 CRITICAL] Complete provider failure:', {
          primaryError: error instanceof Error ? error.message : 'Unknown primary error',
          fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error'
        })
        throw new Error('Complete provider system failure - all providers unavailable')
      }
    }
  }

  getFallbackModel() {
    return getFallbackModel()
  }

  markPrimaryFailed() {
    this.primaryFailed = true
    // Reset after 5 minutes to allow retry
    setTimeout(() => {
      this.primaryFailed = false
    }, 5 * 60 * 1000)
  }

  resetFailureState() {
    this.primaryFailed = false
  }

  // Mock provider untuk testing UI functionality
  getMockModel() {
    return {
      // Mock the model interface for testing
      stream: async function* () {
        yield { type: 'text-delta', textDelta: 'Halo! ' }
        await new Promise(resolve => setTimeout(resolve, 500))
        yield { type: 'text-delta', textDelta: 'Saya adalah ' }
        await new Promise(resolve => setTimeout(resolve, 500))
        yield { type: 'text-delta', textDelta: 'asisten akademik AI. ' }
        await new Promise(resolve => setTimeout(resolve, 500))
        yield { type: 'text-delta', textDelta: 'Chat functionality berhasil ditest! ' }
        await new Promise(resolve => setTimeout(resolve, 500))
        yield { type: 'text-delta', textDelta: 'Streaming UI berfungsi dengan baik.' }
        yield { type: 'finish', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 } }
      }
    }
  }
}

export const providerRegistry = ProviderRegistry.getInstance()

// Usage tracking utility
export function trackUsage(usage: any, provider: 'primary' | 'fallback') {
  console.log(`[${provider.toUpperCase()} PROVIDER] Token usage:`, {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    timestamp: new Date().toISOString(),
  })
}

// 🚀 P07.1: ENHANCED PROVIDER VALIDATION WITH PERSONA AWARENESS
export async function validateProviderConfiguration() {
  // Use persona-aware validation as primary
  try {
    const personaAwareResults = await validatePersonaAwareProviderConfiguration()
    
    // Return enhanced results with persona awareness info
    return {
      ...personaAwareResults,
      personaAware: true,
      legacyFallback: {
        available: true,
        primary: !!process.env.OPENROUTER_API_KEY,
        fallback: !!process.env.OPENAI_API_KEY
      }
    }
  } catch (error) {
    console.warn('[PROVIDER VALIDATION] Persona-aware validation failed, using legacy:', error)
  }

  // Legacy validation fallback
  const results = {
    primaryProvider: {
      configured: false,
      apiKeyPresent: false,
      modelValid: false,
      error: null as string | null,
      personaAware: false
    },
    fallbackProvider: {
      configured: false,
      apiKeyPresent: false,
      modelValid: false,
      error: null as string | null,
      personaAware: false
    },
    personaAware: false
  }

  // Check OpenRouter configuration
  try {
    results.primaryProvider.apiKeyPresent = !!process.env.OPENROUTER_API_KEY
    results.primaryProvider.modelValid = !!models.primary
    results.primaryProvider.configured = results.primaryProvider.apiKeyPresent && results.primaryProvider.modelValid
    
    if (!results.primaryProvider.apiKeyPresent) {
      results.primaryProvider.error = 'OPENROUTER_API_KEY not found in environment'
    } else if (!results.primaryProvider.modelValid) {
      results.primaryProvider.error = 'PRIMARY_MODEL not configured'
    }
  } catch (error) {
    results.primaryProvider.error = error instanceof Error ? error.message : 'Unknown error'
  }

  // Check OpenAI configuration
  try {
    results.fallbackProvider.apiKeyPresent = !!process.env.OPENAI_API_KEY
    results.fallbackProvider.modelValid = !!models.fallback
    results.fallbackProvider.configured = results.fallbackProvider.apiKeyPresent && results.fallbackProvider.modelValid
    
    if (!results.fallbackProvider.apiKeyPresent) {
      results.fallbackProvider.error = 'OPENAI_API_KEY not found in environment'
    } else if (!results.fallbackProvider.modelValid) {
      results.fallbackProvider.error = 'FALLBACK_MODEL not configured'
    }
  } catch (error) {
    results.fallbackProvider.error = error instanceof Error ? error.message : 'Unknown error'
  }

  console.log('[PROVIDER VALIDATION]', results)
  return results
}

// Initialize validation on module load (server-side only)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  // Run validation on server side during development
  validateProviderConfiguration().catch(error => {
    console.warn('[PROVIDER] Validation failed during module load:', error)
  })
}