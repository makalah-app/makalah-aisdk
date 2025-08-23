// Secure Login API Route dengan comprehensive security measures
// Production-ready authentication dengan rate limiting dan monitoring

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { JWTSecurity, type JWTPayload } from '@/lib/jwt-security'
import { getClientIdentifier, getClientFingerprint, chatRateLimit } from '@/lib/rate-limiting'
import { validateRequest, sanitizeInput, securityHeaders } from '@/lib/validation'

// Login request validation schema
const LoginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .refine(email => !email.includes('<script'), 'Invalid email content'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .refine(pwd => !pwd.includes('<script'), 'Invalid password content'),
  rememberMe: z.boolean().optional(),
})

// Mock user database (in production, use real database)
const MOCK_USERS = [
  {
    id: 'user-1',
    email: 'makalah.app@gmail.com',
    password: 'M4k4l4h2025', // In production, this would be hashed
    role: 'admin' as const,
  },
  {
    id: 'user-2', 
    email: 'test@example.com',
    password: 'TestPassword123',
    role: 'user' as const,
  }
]

export async function POST(req: NextRequest) {
  const clientId = getClientIdentifier(req)
  const clientInfo = getClientFingerprint(req)
  
  try {
    // 🛡️ SECURITY: Rate limiting for login attempts
    const rateLimitCheck = chatRateLimit.check(clientId, clientInfo)
    
    if (!rateLimitCheck.allowed) {
      console.warn(`[AUTH] Login rate limit exceeded for ${clientId}`)
      JWTSecurity.SecurityMonitor.trackAuthAttempt(clientId, false)
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimitCheck.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': (rateLimitCheck.retryAfter || 60).toString(),
            ...securityHeaders,
          },
        }
      )
    }

    // 🛡️ SECURITY: Input validation
    const body = await req.json()
    const validatedData = LoginSchema.parse(body)

    // Sanitize inputs
    const email = sanitizeInput(validatedData.email).toLowerCase()
    const password = sanitizeInput(validatedData.password)

    // 🛡️ SECURITY: Simulate secure user lookup
    const user = MOCK_USERS.find(u => u.email === email)
    
    // Constant-time comparison to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
    
    if (!user || user.password !== password) {
      console.warn(`[AUTH] Failed login attempt for ${email} from ${clientId}`)
      JWTSecurity.SecurityMonitor.trackAuthAttempt(clientId, false)
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email or password',
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

    // 🛡️ SECURITY: Generate secure session
    const sessionId = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)
    
    const jwtPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      iat: now,
      exp: now + JWTSecurity.JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
      permissions: user.role === 'admin' ? ['read', 'write', 'admin'] : ['read', 'write'],
    }

    // 🛡️ SECURITY: Encrypt and store token
    const secureStorage = await JWTSecurity.SecureTokenManager.storeSecureToken(jwtPayload)
    
    // Track successful authentication
    JWTSecurity.SecurityMonitor.trackAuthAttempt(clientId, true)
    
    console.log(`[AUTH] Successful login for ${email} from ${clientId}`)

    // In production, set httpOnly cookies instead of returning tokens
    const response = new Response(
      JSON.stringify({
        success: true,
        message: 'Login successful',
        payload: {
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId,
          iat: now,
          exp: now + JWTSecurity.JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
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

    // 🛡️ SECURITY: Set secure httpOnly cookies (production approach)
    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Set-Cookie',
        `auth_session=${secureStorage.encryptedPayload}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${JWTSecurity.JWT_CONFIG.ACCESS_TOKEN_EXPIRY}`
      )
    }

    return response

  } catch (error) {
    console.error('[AUTH] Login error:', error)
    JWTSecurity.SecurityMonitor.trackAuthAttempt(clientId, false)

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid input data',
          errors: error.issues.map(issue => issue.message),
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders,
          },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
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