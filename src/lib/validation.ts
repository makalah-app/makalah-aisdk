import { z } from 'zod'

// Comprehensive input validation schemas dengan security-first approach

// AI SDK v5 UI MESSAGE PART SCHEMA - Based on official docs/reference/ai-sdk-core/ui-message.mdx
export const MessagePartSchema = z.object({
  // OFFICIAL AI SDK v5 UI MESSAGE PART TYPES - Based on docs/reference/ai-sdk-core/ui-message.mdx
  type: z.string()
    .refine(
      (type) => {
        // OFFICIAL UI MESSAGE PART TYPES from AI SDK v5 documentation
        const uiMessagePartTypes = [
          // Core content parts
          'text',           // TextUIPart - main text content
          'reasoning',      // ReasoningUIPart - reasoning text with provider metadata
          'file',           // FileUIPart - file references with mediaType and URL
          
          // Source reference parts
          'source-url',     // SourceUrlUIPart - URL sources with metadata
          'source-document',// SourceDocumentUIPart - document sources with mediaType
          
          // Step boundary parts
          'step-start',     // StepStartUIPart - step boundaries in multi-step flows
        ]
        
        // Check official UI message part types first
        if (uiMessagePartTypes.includes(type)) return true
        
        // DYNAMIC UI MESSAGE PART PATTERNS from AI SDK v5 documentation
        const dynamicPatterns = [
          /^tool-.+$/,        // ToolUIPart: tool-{NAME} (e.g., tool-web_search, tool-calculateSum)
          /^data-.+$/,        // DataUIPart: data-{NAME} (e.g., data-weather, data-stockPrice)
        ]
        
        // Accept dynamic patterns for tools and custom data
        return dynamicPatterns.some(pattern => pattern.test(type))
      },
      'Invalid AI SDK v5 UI message part type'
    ),
  
  // OFFICIAL UI MESSAGE PART FIELDS - Based on AI SDK v5 documentation
  
  // TextUIPart & ReasoningUIPart fields
  text: z.string().optional(),           // Text content for text and reasoning parts
  
  // State field - supports all UI message part states
  state: z.enum([
    // TextUIPart & ReasoningUIPart states
    'streaming', 'done',
    
    // ToolUIPart states
    'input-streaming', 'input-available', 
    'output-available', 'output-error'
  ]).optional(),
  
  // ToolUIPart fields
  toolCallId: z.string().optional(),     // Tool call identifier for ToolUIPart
  input: z.any().optional(),             // Tool input (can be partial during streaming)
  output: z.any().optional(),            // Tool output when available
  errorText: z.string().optional(),      // Error text for failed tool calls
  providerExecuted: z.boolean().optional(), // Whether provider executed the tool
  
  // SourceUrlUIPart fields
  sourceId: z.string().optional(),       // Source identifier
  url: z.string().optional(),            // URL for source-url parts
  title: z.string().optional(),          // Title for sources
  
  // SourceDocumentUIPart fields
  mediaType: z.string().optional(),      // IANA media type for documents and files
  filename: z.string().optional(),       // Optional filename
  
  // DataUIPart fields
  data: z.any().optional(),              // Custom data payload for data-{NAME} parts
  
  // Common metadata field
  providerMetadata: z.record(z.string(), z.any()).optional(), // Provider-specific metadata
  
  // Additional part identifiers
  id: z.string().optional(),             // Optional part identifier
  
  // Catch-all for future AI SDK v5 fields - CRITICAL for forward compatibility
}).passthrough() // ESSENTIAL: Allow additional fields as AI SDK evolves

// Legacy message format (for backward compatibility)
export const LegacyChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
    .min(1, 'Message content cannot be empty')
    .max(8000, 'Message content exceeds maximum length (8000 characters)')
    .refine(
      (content) => !containsMaliciousContent(content),
      'Message contains potentially malicious content'
    ),
  id: z.string().optional(),
})

// AI SDK v5 message format (with parts array)
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(MessagePartSchema).optional(),
  content: z.string().optional(), // Legacy support
  id: z.string().optional(),
}).refine(
  (message) => {
    // Must have either parts or content
    const hasContent = message.content && message.content.length > 0
    const hasParts = message.parts && message.parts.length > 0
    return hasContent || hasParts
  },
  'Message must have either content or parts'
).refine(
  (message) => {
    // Skip malicious content validation for AI SDK v5 streaming messages
    // These messages contain legitimate tool and streaming data
    if (message.parts && message.parts.length > 0) {
      const hasStreamingParts = message.parts.some(part => 
        part.type?.startsWith('tool-') || 
        part.type?.startsWith('data-') ||
        part.type?.includes('delta') ||
        part.type?.includes('start') ||
        part.type?.includes('end') ||
        ['reasoning', 'source-url', 'source-document', 'file'].includes(part.type)
      )
      
      // If this is a streaming message, only validate text content, not structural data
      if (hasStreamingParts) {
        for (const part of message.parts) {
          if (part.type === 'text' && part.text && part.text.length > 100) {
            // Only check long text content for malicious patterns
            if (containsMaliciousContent(part.text)) {
              return false
            }
          }
        }
        return true
      }
    }
    
    // Standard validation for non-streaming messages
    if (message.content) {
      return !containsMaliciousContent(message.content)
    }
    if (message.parts) {
      for (const part of message.parts) {
        if (part.type === 'text' && part.text) {
          if (containsMaliciousContent(part.text)) {
            return false
          }
        }
      }
    }
    return true
  },
  'Message contains potentially malicious content'
)

// Chat request validation schema  
export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema)
    .min(1, 'At least one message is required')
    .max(100, 'Too many messages in conversation (max 100)'),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
  stream: z.boolean().optional(),
})

// Security validation functions - OPTIMIZED FOR AI SDK v5 STREAMING
export function containsMaliciousContent(content: string): boolean {
  // FIRST: Check if this is AI SDK v5 streaming data (JSON structures)
  const isStreamingData = (() => {
    try {
      // If content can be parsed as JSON, it's likely streaming data
      JSON.parse(content)
      return true
    } catch {
      // If content contains AI SDK patterns, it's streaming data
      return /^(tool-|data-|text-|reasoning-|source-)/.test(content) ||
             content.includes('"type":') ||
             content.includes('"toolCallId":') ||
             content.includes('"delta":')
    }
  })()
  
  // Skip validation for AI SDK streaming data
  if (isStreamingData) {
    return false
  }

  const maliciousPatterns = [
    // CRITICAL prompt injection patterns only
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /forget\s+(everything|all\s+previous)/i,
    /you\s+are\s+now\s+a\s+/i,
    
    // CRITICAL script injection patterns
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /javascript\s*:/i,
    
    // CRITICAL SQL injection patterns (refined)
    /(\bDROP\s+TABLE\b)/i,
    /(\bUNION\s+SELECT\b)/i,
    
    // CRITICAL command injection (refined to avoid academic false positives)
    /[;&|`](?![)\s\w])/,  // More lenient for academic writing
    
    // Path traversal (critical only)
    /\.\.[\/\\]/,
  ]

  // ENHANCED ACADEMIC CONTENT ALLOWLIST
  const academicTerms = [
    /\b(referensi|academic|journals?|machine\s+learning|AI|artificial\s+intelligence)\b/i,
    /\b(pendidikan|penelitian|makalah|artikel|jurnal|universitas)\b/i,
    /\b(terima\s+kasih|tolong|fokuskan|tentang|bagaimana|kenapa)\b/i,
    /\b(analisis|metodologi|hipotesis|kesimpulan|diskusi)\b/i,
    /\b(streamText|useChat|tool|function|component|React)\b/i, // Technical terms
  ]
  
  // If content contains academic/technical terms, be very lenient
  const isAcademicContent = academicTerms.some(term => term.test(content))
  if (isAcademicContent) {
    // Only check the most critical patterns for academic content
    const criticalPatterns = maliciousPatterns.slice(0, 3) // Only top 3 critical patterns
    return criticalPatterns.some(pattern => pattern.test(content))
  }

  // Standard validation for other content
  return maliciousPatterns.some(pattern => pattern.test(content))
}

// Sanitize input content
export function sanitizeInput(content: string): string {
  return content
    // Remove potential HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove potential script content
    .replace(/javascript\s*:/gi, '')
    // Remove potential command injection characters  
    .replace(/[;&|`$()]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim()
}

// Rate limiting helpers
export interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Max requests per window
  identifier?: string  // Custom identifier (IP, user ID, etc.)
}

export const defaultRateLimits: Record<string, RateLimitConfig> = {
  chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes  
    maxRequests: 100, // 100 requests per 15 minutes
  },
  heavy: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 heavy requests per hour
  }
}

// Content filtering for academic context
export function validateAcademicContent(content: string): { valid: boolean; reason?: string } {
  // Check minimum academic quality
  if (content.length < 10) {
    return { valid: false, reason: 'Content too short for academic discussion' }
  }
  
  // Check for inappropriate content
  const inappropriatePatterns = [
    /\b(spam|scam|phishing)\b/i,
    /\b(hack|crack|piracy)\b/i,
    /[^\x00-\x7F]{50,}/, // Excessive non-ASCII characters
  ]
  
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(content)) {
      return { valid: false, reason: 'Content contains inappropriate material' }
    }
  }
  
  return { valid: true }
}

// Environment validation
export function validateEnvironmentVariables(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const requiredEnvVars = [
    'OPENROUTER_API_KEY',
    'NODE_ENV',
  ]
  
  const optionalEnvVars = [
    'OPENAI_API_KEY', // Fallback provider
    'PRIMARY_MODEL',
    'FALLBACK_MODEL',
  ]
  
  // Check required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`)
    }
  }
  
  // Validate API key format (basic check)
  if (process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.startsWith('sk-')) {
    errors.push('OPENROUTER_API_KEY format appears invalid')
  }
  
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    errors.push('OPENAI_API_KEY format appears invalid')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Security headers untuk API responses
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY', 
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
}

// Enhanced utility function to extract text content from message (AI SDK v5 compatible)
export function extractMessageText(message: any): string {
  if (message.content && typeof message.content === 'string') {
    return message.content
  }
  
  if (message.parts && Array.isArray(message.parts)) {
    const textParts: string[] = []
    
    for (const part of message.parts) {
      switch (part.type) {
        case 'text':
          if (part.text) textParts.push(part.text)
          break
        case 'reasoning':
          if (part.reasoning) textParts.push(part.reasoning)
          if (part.text) textParts.push(part.text)
          break
        case 'tool-call':
        case 'tool-invocation':
          if (part.args && typeof part.args === 'object') {
            // Extract text from tool arguments
            const argsText = JSON.stringify(part.args)
            if (argsText.length < 500) textParts.push(argsText) // Only short args for validation
          }
          break
        default:
          // For any other parts that might contain text
          if (part.text) textParts.push(part.text)
          break
      }
    }
    
    return textParts.join(' ')
  }
  
  return ''
}

// Enhanced input validation middleware dengan detailed error logging
export function validateRequest(req: any) {
  try {
    console.log('[VALIDATION] Request structure:', {
      hasMessages: !!req.messages,
      messageCount: req.messages?.length || 0,
      firstMessageStructure: req.messages?.[0] ? {
        role: req.messages[0].role,
        hasContent: !!req.messages[0].content,
        hasParts: !!req.messages[0].parts,
        contentLength: req.messages[0].content?.length || 0,
        partsLength: req.messages[0].parts?.length || 0,
      } : null
    })
    
    const validatedRequest = ChatRequestSchema.parse(req)
    
    // Additional security validation for all text content
    for (const message of validatedRequest.messages) {
      const textContent = extractMessageText(message)
      if (textContent.length > 8000) {
        throw new Error(`Message content exceeds maximum length (8000 characters): ${textContent.length} characters`)
      }
    }
    
    console.log('[VALIDATION] Request validated successfully')
    return validatedRequest
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[VALIDATION ERROR] Zod validation failed:', {
        issues: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        })),
        input: req
      })
      throw new Error(`Validation failed: ${error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`)
    }
    console.error('[VALIDATION ERROR] Unknown validation error:', error)
    throw new Error('Invalid request format')
  }
}