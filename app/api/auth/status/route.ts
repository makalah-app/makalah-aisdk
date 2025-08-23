// Authentication Status Check API Route
// Secure session validation dan user status checking

import { NextRequest } from 'next/server'
import { JWTSecurity } from '@/lib/jwt-security'
import { getClientIdentifier } from '@/lib/rate-limiting'
import { securityHeaders } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const clientId = getClientIdentifier(req)
  
  try {
    // 🛡️ SECURITY: Validate current session
    const authResult = await JWTSecurity.AuthenticationMiddleware.validateRequest(req)
    
    if (!authResult.authenticated || !authResult.payload) {
      return new Response(
        JSON.stringify({
          authenticated: false,
          message: 'No valid session found',
        }),
        {
          status: 200, // Return 200 even for unauthenticated state
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders,
          },
        }
      )
    }

    const payload = authResult.payload

    // 🛡️ SECURITY: Return safe user information (no sensitive data)
    return new Response(
      JSON.stringify({
        authenticated: true,
        user: {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          permissions: payload.permissions,
          sessionId: payload.sessionId,
          expiresAt: payload.exp * 1000, // Convert to milliseconds
        },
        shouldRefresh: JWTSecurity.JWTValidator.shouldRefreshToken(payload),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders,
        },
      }
    )

  } catch (error) {
    console.error('[AUTH] Status check error:', error)

    return new Response(
      JSON.stringify({
        authenticated: false,
        message: 'Authentication check failed',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders,
        },
      }
    )
  }
}