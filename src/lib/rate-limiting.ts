// Enhanced rate limiting implementation dengan enterprise-grade features
// Production-ready dengan persistence simulation dan advanced monitoring

interface RateLimitEntry {
  count: number
  resetTime: number
  windowStart: number
  violations: number  // Track repeated violations
  lastViolation: number
  clientInfo?: {
    userAgent: string | null
    fingerprint: string
  }
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  identifier: string
  violationThreshold: number  // Ban after N violations
  banDurationMs: number       // Ban duration for repeated violations
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  reason?: string
  retryAfter?: number
  isBanned?: boolean
}

class EnhancedRateLimit {
  private store = new Map<string, RateLimitEntry>()
  private banList = new Map<string, number>() // identifier -> ban expiry time
  private readonly config: RateLimitConfig
  
  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequests: 30,
      windowMs: 60000,
      identifier: 'default',
      violationThreshold: 5,
      banDurationMs: 15 * 60 * 1000, // 15 minutes ban
      ...config
    }
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }
  
  check(identifier: string, clientInfo?: { userAgent: string | null; fingerprint: string }): RateLimitResult {
    const now = Date.now()
    const key = identifier
    
    // Check if client is banned
    const banExpiry = this.banList.get(key)
    if (banExpiry && now < banExpiry) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: banExpiry,
        reason: 'Client banned for repeated violations',
        retryAfter: Math.ceil((banExpiry - now) / 1000),
        isBanned: true
      }
    }
    
    // Remove expired ban
    if (banExpiry && now >= banExpiry) {
      this.banList.delete(key)
    }
    
    let entry = this.store.get(key)
    
    // Initialize or reset window if expired
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        windowStart: now,
        violations: entry?.violations || 0,
        lastViolation: entry?.lastViolation || 0,
        clientInfo
      }
    }
    
    // Update client info if provided
    if (clientInfo) {
      entry.clientInfo = clientInfo
    }
    
    entry.count++
    const allowed = entry.count <= this.config.maxRequests
    
    // Track violations
    if (!allowed) {
      entry.violations++
      entry.lastViolation = now
      
      // Ban client if too many violations
      if (entry.violations >= this.config.violationThreshold) {
        this.banList.set(key, now + this.config.banDurationMs)
        console.warn(`[RATE LIMIT] Client ${key} banned for ${this.config.banDurationMs/1000}s due to ${entry.violations} violations`)
      }
    }
    
    this.store.set(key, entry)
    
    const remaining = Math.max(0, this.config.maxRequests - entry.count)
    
    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      reason: !allowed ? `Rate limit exceeded for ${this.config.identifier}` : undefined,
      retryAfter: !allowed ? Math.ceil((entry.resetTime - now) / 1000) : undefined
    }
  }
  
  private cleanup() {
    const now = Date.now()
    
    // Clean expired rate limit entries
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key)
      }
    }
    
    // Clean expired bans
    for (const [key, expiry] of this.banList.entries()) {
      if (now >= expiry) {
        this.banList.delete(key)
      }
    }
  }
  
  // Reset limits for a specific identifier (useful for testing)
  reset(identifier?: string) {
    if (identifier) {
      this.store.delete(identifier)
      this.banList.delete(identifier)
    } else {
      this.store.clear()
      this.banList.clear()
    }
  }
  
  // Get statistics for monitoring
  getStats() {
    return {
      activeEntries: this.store.size,
      bannedClients: this.banList.size,
      config: this.config
    }
  }
  
  // Manual ban/unban methods for admin controls
  banClient(identifier: string, durationMs?: number) {
    const banDuration = durationMs || this.config.banDurationMs
    this.banList.set(identifier, Date.now() + banDuration)
    console.warn(`[RATE LIMIT] Manually banned client ${identifier} for ${banDuration/1000}s`)
  }
  
  unbanClient(identifier: string) {
    const wasBanned = this.banList.delete(identifier)
    if (wasBanned) {
      console.info(`[RATE LIMIT] Manually unbanned client ${identifier}`)
    }
    return wasBanned
  }
}

// API-specific rate limiting configurations
const API_RATE_CONFIGS = {
  chat: {
    identifier: 'chat-api',
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    violationThreshold: 3,
    banDurationMs: 10 * 60 * 1000, // 10 minutes
  },
  heavy: {
    identifier: 'heavy-api',
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    violationThreshold: 2,
    banDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  general: {
    identifier: 'general-api',
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    violationThreshold: 5,
    banDurationMs: 15 * 60 * 1000, // 15 minutes
  }
}

// Global enhanced rate limiter instances
export const chatRateLimit = new EnhancedRateLimit(API_RATE_CONFIGS.chat)
export const heavyApiRateLimit = new EnhancedRateLimit(API_RATE_CONFIGS.heavy)  
export const generalApiRateLimit = new EnhancedRateLimit(API_RATE_CONFIGS.general)

// Enhanced rate limiting middleware helper
export function createRateLimitResponse(result: RateLimitResult) {
  const resetDate = new Date(result.resetTime).toISOString()
  const status = result.isBanned ? 403 : 429 // 403 for banned clients, 429 for rate limited
  
  const responseBody = {
    error: result.isBanned ? 'Client banned' : 'Rate limit exceeded',
    message: result.reason || 'Too many requests. Please try again later.',
    resetTime: resetDate,
    retryAfter: result.retryAfter,
    isBanned: result.isBanned || false,
    remaining: result.remaining
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  }
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }
  
  return new Response(JSON.stringify(responseBody), { status, headers })
}

// Backward compatibility function
export function createRateLimitResponseLegacy(resetTime: number) {
  return createRateLimitResponse({
    allowed: false,
    remaining: 0,
    resetTime,
    reason: 'Rate limit exceeded',
    retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
  })
}

// Enhanced client identification dengan fingerprinting
export function getClientIdentifier(req: Request): string {
  // Try to get real IP from various headers
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  
  // Use the first IP from x-forwarded-for (in case of multiple proxies)
  const clientIp = forwarded?.split(',')[0]?.trim() 
    || realIp 
    || cfConnectingIp 
    || 'unknown'
    
  return clientIp
}

// Generate client fingerprint for enhanced tracking
export function getClientFingerprint(req: Request): { userAgent: string | null; fingerprint: string } {
  const userAgent = req.headers.get('user-agent')
  const acceptLanguage = req.headers.get('accept-language')
  const acceptEncoding = req.headers.get('accept-encoding')
  const clientIp = getClientIdentifier(req)
  
  // Create a simple fingerprint based on headers
  const fingerprintData = [
    clientIp,
    userAgent?.slice(0, 100), // Limit length to avoid DoS
    acceptLanguage?.slice(0, 50),
    acceptEncoding?.slice(0, 50)
  ].filter(Boolean).join('|')
  
  // Simple hash for fingerprinting (not cryptographic, just for tracking)
  let hash = 0
  for (let i = 0; i < fingerprintData.length; i++) {
    const char = fingerprintData.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return {
    userAgent,
    fingerprint: Math.abs(hash).toString(36)
  }
}

// Enhanced burst protection dengan multi-layer security
export class EnhancedBurstProtection {
  private shortWindow = new EnhancedRateLimit({
    identifier: 'burst-short',
    maxRequests: 5,
    windowMs: 5 * 1000, // 5 seconds
    violationThreshold: 2,
    banDurationMs: 2 * 60 * 1000, // 2 minutes ban
  })
  
  private mediumWindow = new EnhancedRateLimit({
    identifier: 'burst-medium', 
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    violationThreshold: 3,
    banDurationMs: 5 * 60 * 1000, // 5 minutes ban
  })
  
  private longWindow = new EnhancedRateLimit({
    identifier: 'burst-long',
    maxRequests: 100,
    windowMs: 5 * 60 * 1000, // 5 minutes
    violationThreshold: 5,
    banDurationMs: 30 * 60 * 1000, // 30 minutes ban
  })
  
  check(identifier: string, clientInfo?: { userAgent: string | null; fingerprint: string }): RateLimitResult {
    // Check burst protection (5 seconds window) - most restrictive
    const shortCheck = this.shortWindow.check(identifier, clientInfo)
    if (!shortCheck.allowed) {
      return { 
        ...shortCheck,
        reason: shortCheck.reason || 'Burst limit exceeded (5 requests per 5 seconds)'
      }
    }
    
    // Check medium window (1 minute)
    const mediumCheck = this.mediumWindow.check(identifier, clientInfo)
    if (!mediumCheck.allowed) {
      return { 
        ...mediumCheck,
        reason: mediumCheck.reason || 'Medium rate limit exceeded (20 requests per minute)'
      }
    }
    
    // Check long window (5 minutes)
    const longCheck = this.longWindow.check(identifier, clientInfo)
    if (!longCheck.allowed) {
      return { 
        ...longCheck,
        reason: longCheck.reason || 'Long rate limit exceeded (100 requests per 5 minutes)'
      }
    }
    
    return { 
      allowed: true, 
      remaining: Math.min(shortCheck.remaining, mediumCheck.remaining, longCheck.remaining),
      resetTime: mediumCheck.resetTime 
    }
  }
  
  reset(identifier?: string) {
    this.shortWindow.reset(identifier)
    this.mediumWindow.reset(identifier)
    this.longWindow.reset(identifier)
  }
  
  getStats() {
    return {
      short: this.shortWindow.getStats(),
      medium: this.mediumWindow.getStats(),
      long: this.longWindow.getStats()
    }
  }
}

export const burstProtection = new EnhancedBurstProtection()