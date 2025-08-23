// ============================================
// MAKALAH AI: Persona Preferences API Endpoints
// ============================================
// Task P07.2 Implementation: User persona preference management endpoints
// Created: August 2025
// Features: CRUD operations for user preferences, session management

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { personaSessionManager, type PersonaUserPreferences } from '@/lib/auth/persona-session'
import { validateRequest, sanitizeInput, securityHeaders } from '@/lib/validation'
import { getClientIdentifier, burstProtection, createRateLimitResponse } from '@/lib/rate-limiting'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const UserPreferencesSchema = z.object({
  defaultChatMode: z.enum(['formal', 'casual']).optional(),
  preferredPersonas: z.record(z.string(), z.string()).optional(),
  workflowSettings: z.object({
    enableAutoWorkflow: z.boolean().optional(),
    preferredCitationStyle: z.enum(['APA', 'MLA', 'Chicago']).optional(),
    autoSaveEnabled: z.boolean().optional(),
    skipIntroPhases: z.boolean().optional()
  }).optional(),
  uiSettings: z.object({
    showPersonaModeIndicator: z.boolean().optional(),
    enableQuickModeSwitch: z.boolean().optional(),
    preferredTheme: z.enum(['light', 'dark', 'system']).optional(),
    compactMode: z.boolean().optional()
  }).optional(),
  analyticsPreferences: z.object({
    trackUsage: z.boolean().optional(),
    shareAnonymousData: z.boolean().optional(),
    enablePersonalization: z.boolean().optional()
  }).optional()
})

const SetPreferredPersonaSchema = z.object({
  mode: z.enum(['formal', 'casual', 'Research', 'Writing', 'Review']),
  personaId: z.string().min(1)
})

const SessionUpdateSchema = z.object({
  sessionId: z.string().min(1),
  chatMode: z.enum(['formal', 'casual']).nullable().optional(),
  preferredPersonaId: z.string().nullable().optional(),
  currentWorkflowPhase: z.number().min(1).max(8).nullable().optional(),
  totalMessages: z.number().min(0).optional(),
  totalTokens: z.number().min(0).optional()
})

// ============================================
// HELPER FUNCTIONS
// ============================================

function getUserIdFromRequest(request: NextRequest): string | null {
  // In a real implementation, extract from JWT token or session
  // For now, use a header or query parameter
  const userId = request.headers.get('x-user-id') || 
                 request.nextUrl.searchParams.get('userId')
  
  if (!userId) {
    console.warn('[PERSONA PREFERENCES API] No user ID provided')
    return null
  }
  
  return userId
}

function createErrorResponse(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { 
      status,
      headers: securityHeaders
    }
  )
}

function createSuccessResponse(data: any, status = 200) {
  return NextResponse.json(
    data,
    { 
      status,
      headers: securityHeaders
    }
  )
}

// ============================================
// GET - Get User Preferences
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await burstProtection(clientId, 'persona-preferences-read', {
      maxRequests: 100,
      windowMs: 60000,
      skipHeaders: true
    })

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, securityHeaders)
    }

    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return createErrorResponse('User ID is required', 401)
    }

    const preferences = personaSessionManager.getUserPreferences(userId)
    
    if (!preferences) {
      // Return default preferences
      const defaultPreferences: PersonaUserPreferences = {
        userId,
        defaultChatMode: 'formal',
        preferredPersonas: {},
        workflowSettings: {
          enableAutoWorkflow: true,
          preferredCitationStyle: 'APA',
          autoSaveEnabled: true,
          skipIntroPhases: false
        },
        uiSettings: {
          showPersonaModeIndicator: true,
          enableQuickModeSwitch: true,
          preferredTheme: 'system',
          compactMode: false
        },
        analyticsPreferences: {
          trackUsage: true,
          shareAnonymousData: true,
          enablePersonalization: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      return createSuccessResponse({
        preferences: defaultPreferences,
        isDefault: true
      })
    }

    console.log('[PERSONA PREFERENCES API] Retrieved preferences:', {
      userId,
      defaultChatMode: preferences.defaultChatMode,
      preferredPersonasCount: Object.keys(preferences.preferredPersonas).length
    })

    return createSuccessResponse({
      preferences,
      isDefault: false
    })

  } catch (error) {
    console.error('[PERSONA PREFERENCES API] GET error:', error)
    return createErrorResponse('Failed to retrieve preferences', 500)
  }
}

// ============================================
// POST/PUT - Update User Preferences
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await burstProtection(clientId, 'persona-preferences-write', {
      maxRequests: 20,
      windowMs: 60000,
      skipHeaders: true
    })

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, securityHeaders)
    }

    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return createErrorResponse('User ID is required', 401)
    }

    const body = await request.json()
    const validationResult = validateRequest(body, UserPreferencesSchema)
    
    if (!validationResult.success) {
      return createErrorResponse(`Invalid preferences: ${validationResult.error}`, 400)
    }

    const sanitizedPreferences = sanitizeInput(validationResult.data)
    
    const updatedPreferences = personaSessionManager.setUserPreferences(
      userId,
      sanitizedPreferences
    )

    console.log('[PERSONA PREFERENCES API] Updated preferences:', {
      userId,
      changes: Object.keys(sanitizedPreferences),
      defaultChatMode: updatedPreferences.defaultChatMode
    })

    return createSuccessResponse({
      preferences: updatedPreferences,
      message: 'Preferences updated successfully'
    })

  } catch (error) {
    console.error('[PERSONA PREFERENCES API] POST error:', error)
    return createErrorResponse('Failed to update preferences', 500)
  }
}

// Handle PUT as alias for POST
export const PUT = POST

// ============================================
// PATCH - Set Preferred Persona for Mode
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await burstProtection(clientId, 'persona-preferences-update', {
      maxRequests: 50,
      windowMs: 60000,
      skipHeaders: true
    })

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, securityHeaders)
    }

    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return createErrorResponse('User ID is required', 401)
    }

    const body = await request.json()
    
    // Check if this is a preferred persona update or session update
    if ('sessionId' in body) {
      // Session update
      const validationResult = validateRequest(body, SessionUpdateSchema)
      
      if (!validationResult.success) {
        return createErrorResponse(`Invalid session update: ${validationResult.error}`, 400)
      }

      const { sessionId, ...updates } = validationResult.data
      const updatedSession = personaSessionManager.updateSession(sessionId, updates)
      
      if (!updatedSession) {
        return createErrorResponse('Session not found or expired', 404)
      }

      console.log('[PERSONA PREFERENCES API] Updated session:', {
        sessionId,
        updates,
        userId
      })

      return createSuccessResponse({
        session: updatedSession,
        message: 'Session updated successfully'
      })
    } else {
      // Preferred persona update
      const validationResult = validateRequest(body, SetPreferredPersonaSchema)
      
      if (!validationResult.success) {
        return createErrorResponse(`Invalid persona preference: ${validationResult.error}`, 400)
      }

      const { mode, personaId } = validationResult.data
      personaSessionManager.setPreferredPersona(userId, mode, personaId)

      console.log('[PERSONA PREFERENCES API] Set preferred persona:', {
        userId,
        mode,
        personaId
      })

      return createSuccessResponse({
        mode,
        personaId,
        message: `Preferred persona for ${mode} mode set successfully`
      })
    }

  } catch (error) {
    console.error('[PERSONA PREFERENCES API] PATCH error:', error)
    return createErrorResponse('Failed to update preference', 500)
  }
}

// ============================================
// DELETE - Reset User Preferences
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await burstProtection(clientId, 'persona-preferences-delete', {
      maxRequests: 5,
      windowMs: 60000,
      skipHeaders: true
    })

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, securityHeaders)
    }

    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return createErrorResponse('User ID is required', 401)
    }

    // Reset to default preferences
    const defaultPreferences = personaSessionManager.setUserPreferences(userId, {
      defaultChatMode: 'formal',
      preferredPersonas: {},
      workflowSettings: {
        enableAutoWorkflow: true,
        preferredCitationStyle: 'APA',
        autoSaveEnabled: true,
        skipIntroPhases: false
      },
      uiSettings: {
        showPersonaModeIndicator: true,
        enableQuickModeSwitch: true,
        preferredTheme: 'system',
        compactMode: false
      },
      analyticsPreferences: {
        trackUsage: true,
        shareAnonymousData: true,
        enablePersonalization: true
      }
    })

    console.log('[PERSONA PREFERENCES API] Reset preferences:', { userId })

    return createSuccessResponse({
      preferences: defaultPreferences,
      message: 'Preferences reset to defaults successfully'
    })

  } catch (error) {
    console.error('[PERSONA PREFERENCES API] DELETE error:', error)
    return createErrorResponse('Failed to reset preferences', 500)
  }
}

// ============================================
// OPTIONS - CORS Support
// ============================================

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
      ...securityHeaders
    }
  })
}