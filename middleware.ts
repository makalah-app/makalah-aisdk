/**
 * Enhanced Production Middleware for Makalah AI Streaming Optimization
 * Provides streaming-specific headers, compression, and connection management
 */

import { NextRequest, NextResponse } from 'next/server'
import type { NextMiddleware } from 'next/server'

// CORS configuration untuk streaming endpoints
const STREAMING_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://makalah-ai.vercel.app',
  'https://*.vercel.app',
  'https://makalah.app',
]

// Streaming-optimized headers
const STREAMING_HEADERS = {
  // Connection management
  'Connection': 'keep-alive',
  'Keep-Alive': 'timeout=120, max=1000',
  
  // Compression and caching
  'Content-Encoding': 'identity', // Disable compression untuk streaming
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  
  // Security headers
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Streaming-specific headers
  'X-Accel-Buffering': 'no', // Disable nginx buffering
  'Transfer-Encoding': 'chunked',
}

function validateStreamingOrigin(origin: string | null): boolean {
  if (!origin) return false
  
  // Check exact matches
  if (STREAMING_ORIGINS.includes(origin)) return true
  
  // Check wildcard patterns for Vercel deployments
  if (origin.match(/https:\/\/.*\.vercel\.app$/)) return true
  
  // Allow localhost untuk development
  if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
    return true
  }
  
  return false
}

const middleware: NextMiddleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl
  
  // Apply streaming optimization untuk chat API endpoints
  if (pathname.startsWith('/api/chat')) {
    const origin = request.headers.get('origin')
    const isValidOrigin = validateStreamingOrigin(origin)
    
    // Block invalid origins dalam production
    if (!isValidOrigin && process.env.NODE_ENV === 'production') {
      console.warn(`[MIDDLEWARE] Blocked streaming request from invalid origin: ${origin}`)
      
      return new NextResponse(
        JSON.stringify({ 
          error: 'CORS: Origin not allowed for streaming endpoint',
          code: 'STREAMING_CORS_VIOLATION' 
        }), 
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'null',
          }
        }
      )
    }
    
    // Handle CORS preflight untuk streaming
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin || STREAMING_ORIGINS[0],
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Client-Id, X-Session-Id',
          'Access-Control-Max-Age': '86400',
          'Access-Control-Allow-Credentials': 'true',
          ...STREAMING_HEADERS,
        },
      })
    }
    
    // Continue dengan enhanced headers untuk actual requests
    const response = NextResponse.next()
    
    // Add streaming-optimized headers
    Object.entries(STREAMING_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', origin || STREAMING_ORIGINS[0])
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    
    // Add performance monitoring headers
    response.headers.set('X-Streaming-Optimization', 'enabled')
    response.headers.set('X-Buffer-Size', '4096')
    response.headers.set('X-Chunk-Size', '256')
    
    console.log(`[MIDDLEWARE] Enhanced streaming headers applied untuk ${pathname}`)
    
    return response
  }
  
  // Default behavior untuk non-streaming routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Apply middleware to all API routes
    '/api/:path*',
    
    // Apply to specific streaming endpoints
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}

export default middleware