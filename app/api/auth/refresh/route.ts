// Secure Token Refresh API Route
// Production-ready token refresh dengan security validation

import { NextRequest } from 'next/server'
import { JWTSecurity, type JWTPayload } from '@/lib/jwt-security'
import { getClientIdentifier, getClientFingerprint } from '@/lib/rate-limiting'
import { securityHeaders } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const clientId = getClientIdentifier(req)
  const clientInfo = getClientFingerprint(req)
  
  try {
    // 🛡️ SECURITY: Validate current session
    const authResult = await JWTSecurity.AuthenticationMiddleware.validateRequest(req)
    
    if (!authResult.authenticated || !authResult.payload) {
      console.warn(`[AUTH] Token refresh failed - invalid session from ${clientId}`)
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid or expired session',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders,
          },
        }
      )
    }

    const currentPayload = authResult.payload

    // 🛡️ SECURITY: Check if refresh is needed
    if (!JWTSecurity.JWTValidator.shouldRefreshToken(currentPayload)) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Token refresh not needed',
          payload: currentPayload,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders,
          },
        }
      )
    }

    // 🛡️ SECURITY: Generate new token with updated expiry
    const now = Math.floor(Date.now() / 1000)
    const newPayload: JWTPayload = {
      ...currentPayload,
      iat: now,
      exp: now + JWTSecurity.JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
      sessionId: crypto.randomUUID(), // New session ID for security
    }

    // 🛡️ SECURITY: Encrypt and store new token
    const secureStorage = await JWTSecurity.SecureTokenManager.storeSecureToken(newPayload)
    
    console.log(`[AUTH] Token refreshed for user ${currentPayload.email} from ${clientId}`)

    const response = new Response(
      JSON.stringify({
        success: true,
        message: 'Token refreshed successfully',
        payload: {
          userId: newPayload.userId,
          email: newPayload.email,
          role: newPayload.role,
          sessionId: newPayload.sessionId,
          iat: newPayload.iat,
          exp: newPayload.exp,
        },
        // For demo purposes - in production, use httpOnly cookies
        encryptedToken: secureStorage.encryptedPayload,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders,
        },
      }
    )

    // 🛡️ SECURITY: Set new secure httpOnly cookie
    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Set-Cookie',
        `auth_session=${secureStorage.encryptedPayload}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${JWTSecurity.JWT_CONFIG.ACCESS_TOKEN_EXPIRY}`
      )
    }

    return response

  } catch (error) {
    console.error('[AUTH] Token refresh error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Token refresh failed',
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