// ============================================
// MAKALAH AI: Admin Role-Based Access Control
// ============================================
// Task P06.1: Role-based Admin Authentication
// Created: August 2025
// Purpose: Admin-only access control for persona template management

import { NextRequest } from 'next/server'
import { JWTSecurity, type JWTPayload } from './jwt-security'

// ============================================
// ADMIN ROLE DEFINITIONS
// ============================================

export type AdminRole = 'super_admin' | 'admin' | 'moderator'
export type UserRole = 'user' | 'premium' | AdminRole

export interface AdminPermissions {
  canCreateTemplate: boolean
  canUpdateTemplate: boolean
  canDeleteTemplate: boolean
  canManageUsers: boolean
  canViewAnalytics: boolean
  canExportData: boolean
  canImportData: boolean
  canManageVersions: boolean
}

// ============================================
// ROLE-BASED PERMISSIONS MATRIX
// ============================================

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  super_admin: {
    canCreateTemplate: true,
    canUpdateTemplate: true,
    canDeleteTemplate: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canExportData: true,
    canImportData: true,
    canManageVersions: true,
  },
  admin: {
    canCreateTemplate: true,
    canUpdateTemplate: true,
    canDeleteTemplate: true,
    canManageUsers: false,
    canViewAnalytics: true,
    canExportData: true,
    canImportData: true,
    canManageVersions: true,
  },
  moderator: {
    canCreateTemplate: false,
    canUpdateTemplate: true,
    canDeleteTemplate: false,
    canManageUsers: false,
    canViewAnalytics: true,
    canExportData: false,
    canImportData: false,
    canManageVersions: false,
  },
}

// ============================================
// ADMIN ACCESS VALIDATION
// ============================================

export class AdminRBAC {
  /**
   * Check if user has admin privileges
   */
  static isAdmin(user: JWTPayload | null): boolean {
    if (!user || !user.role) return false
    return ['super_admin', 'admin', 'moderator'].includes(user.role)
  }

  /**
   * Get user permissions based on role
   */
  static getPermissions(role: UserRole): AdminPermissions | null {
    if (!this.isAdminRole(role)) return null
    return ROLE_PERMISSIONS[role as AdminRole]
  }

  /**
   * Check if role is admin role
   */
  static isAdminRole(role: UserRole): role is AdminRole {
    return ['super_admin', 'admin', 'moderator'].includes(role)
  }

  /**
   * Check specific permission for user
   */
  static hasPermission(
    user: JWTPayload | null,
    permission: keyof AdminPermissions
  ): boolean {
    if (!user || !this.isAdmin(user)) return false

    const permissions = this.getPermissions(user.role)
    return permissions ? permissions[permission] : false
  }

  /**
   * Validate admin access from request
   */
  static async validateAdminFromRequest(
    request: NextRequest
  ): Promise<{ isValid: boolean; user: JWTPayload | null; error?: string }> {
    try {
      // Get token from Authorization header or cookies
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.substring(7)
        : request.cookies.get('auth-token')?.value

      if (!token) {
        return {
          isValid: false,
          user: null,
          error: 'No authentication token provided',
        }
      }

      // Validate and decode token
      const payload = JWTSecurity.JWTValidator.validateAndDecode(token)
      
      if (!payload) {
        return {
          isValid: false,
          user: null,
          error: 'Invalid or expired token',
        }
      }

      // Check if user is admin
      if (!this.isAdmin(payload)) {
        return {
          isValid: false,
          user: payload,
          error: 'Admin privileges required',
        }
      }

      return {
        isValid: true,
        user: payload,
      }

    } catch (error) {
      console.error('[ADMIN RBAC] Validation failed:', error)
      return {
        isValid: false,
        user: null,
        error: error instanceof Error ? error.message : 'Authentication failed',
      }
    }
  }

  /**
   * Create admin middleware for API routes
   */
  static createAdminMiddleware(requiredPermission?: keyof AdminPermissions) {
    return async (request: NextRequest) => {
      const validation = await this.validateAdminFromRequest(request)

      if (!validation.isValid) {
        return {
          isAuthorized: false,
          error: validation.error,
          user: null,
        }
      }

      // Check specific permission if required
      if (requiredPermission && !this.hasPermission(validation.user, requiredPermission)) {
        return {
          isAuthorized: false,
          error: `Permission '${requiredPermission}' required`,
          user: validation.user,
        }
      }

      return {
        isAuthorized: true,
        user: validation.user,
      }
    }
  }
}

// ============================================
// ADMIN AUDIT LOGGING
// ============================================

export interface AdminAuditEntry {
  admin_id: string
  admin_email: string
  admin_role: AdminRole
  action: string
  resource: string
  resource_id?: string
  details: Record<string, any>
  ip_address?: string
  user_agent?: string
  timestamp: string
}

export class AdminAuditLogger {
  /**
   * Log admin action for audit trail
   */
  static async logAdminAction(entry: Omit<AdminAuditEntry, 'timestamp'>) {
    try {
      const auditEntry: AdminAuditEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
      }

      // In production, this would save to database
      console.log('[ADMIN AUDIT]', JSON.stringify(auditEntry, null, 2))

      // TODO: Save to Supabase admin_audit_logs table
      // await supabase.from('admin_audit_logs').insert(auditEntry)

    } catch (error) {
      console.error('[ADMIN AUDIT] Failed to log action:', error)
    }
  }

  /**
   * Get audit log for admin review
   */
  static async getAuditLog(filters: {
    admin_id?: string
    action?: string
    resource?: string
    date_from?: string
    date_to?: string
    limit?: number
  }): Promise<AdminAuditEntry[]> {
    // TODO: Implement database query with filters
    return []
  }
}

// ============================================
// ADMIN SESSION MANAGEMENT
// ============================================

export interface AdminSession {
  session_id: string
  admin_id: string
  admin_role: AdminRole
  created_at: string
  last_activity: string
  expires_at: string
  ip_address: string
  is_active: boolean
}

export class AdminSessionManager {
  private static readonly SESSION_DURATION_HOURS = 8 // Admin sessions expire in 8 hours
  private static readonly ACTIVITY_TIMEOUT_MINUTES = 60 // Auto-logout after 60 minutes inactivity

  /**
   * Create new admin session
   */
  static async createSession(
    admin: JWTPayload,
    ip_address: string
  ): Promise<AdminSession> {
    const now = new Date()
    const expires_at = new Date(now.getTime() + (this.SESSION_DURATION_HOURS * 60 * 60 * 1000))

    const session: AdminSession = {
      session_id: crypto.randomUUID(),
      admin_id: admin.userId,
      admin_role: admin.role as AdminRole,
      created_at: now.toISOString(),
      last_activity: now.toISOString(),
      expires_at: expires_at.toISOString(),
      ip_address,
      is_active: true,
    }

    // Log session creation
    await AdminAuditLogger.logAdminAction({
      admin_id: admin.userId,
      admin_email: admin.email,
      admin_role: admin.role as AdminRole,
      action: 'session_created',
      resource: 'admin_session',
      resource_id: session.session_id,
      details: { ip_address, expires_at: session.expires_at },
    })

    return session
  }

  /**
   * Update session activity
   */
  static async updateActivity(session_id: string): Promise<void> {
    const now = new Date()

    // TODO: Update last_activity in database
    console.log(`[ADMIN SESSION] Updated activity for session ${session_id} at ${now.toISOString()}`)
  }

  /**
   * Validate session is active and not expired
   */
  static async validateSession(session_id: string): Promise<{
    isValid: boolean
    session?: AdminSession
    reason?: string
  }> {
    // TODO: Get session from database
    // For now, return mock validation
    return {
      isValid: true, // Assume valid for development
    }
  }

  /**
   * End admin session
   */
  static async endSession(session_id: string, admin: JWTPayload): Promise<void> {
    // Log session end
    await AdminAuditLogger.logAdminAction({
      admin_id: admin.userId,
      admin_email: admin.email,
      admin_role: admin.role as AdminRole,
      action: 'session_ended',
      resource: 'admin_session',
      resource_id: session_id,
      details: { ended_at: new Date().toISOString() },
    })

    // TODO: Mark session as inactive in database
    console.log(`[ADMIN SESSION] Session ${session_id} ended`)
  }
}

// ============================================
// SECURITY UTILITIES
// ============================================

export class AdminSecurity {
  /**
   * Check if IP address is in allowed admin IP range
   */
  static isAllowedIP(ip_address: string): boolean {
    // TODO: Implement IP whitelist check
    // For development, allow all IPs
    return true
  }

  /**
   * Check if user agent is suspicious
   */
  static isSuspiciousUserAgent(user_agent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
    ]

    return suspiciousPatterns.some(pattern => pattern.test(user_agent))
  }

  /**
   * Rate limiting for admin actions
   */
  static async checkRateLimit(
    admin_id: string,
    action: string
  ): Promise<{ allowed: boolean; remaining?: number; resetTime?: Date }> {
    // TODO: Implement Redis-based rate limiting
    // For development, always allow
    return { allowed: true }
  }

  /**
   * Generate secure session token
   */
  static generateSessionToken(): string {
    return crypto.randomUUID() + '_' + Date.now().toString(36)
  }
}

// ============================================
// ADMIN ROLE HIERARCHY
// ============================================

export class AdminHierarchy {
  private static readonly ROLE_LEVELS: Record<AdminRole, number> = {
    super_admin: 3,
    admin: 2,
    moderator: 1,
  }

  /**
   * Check if admin can perform action on target admin
   */
  static canManageAdmin(actor_role: AdminRole, target_role: AdminRole): boolean {
    return this.ROLE_LEVELS[actor_role] > this.ROLE_LEVELS[target_role]
  }

  /**
   * Get admin role level
   */
  static getRoleLevel(role: AdminRole): number {
    return this.ROLE_LEVELS[role]
  }

  /**
   * Get higher roles than given role
   */
  static getHigherRoles(role: AdminRole): AdminRole[] {
    const currentLevel = this.ROLE_LEVELS[role]
    return Object.entries(this.ROLE_LEVELS)
      .filter(([_, level]) => level > currentLevel)
      .map(([role, _]) => role as AdminRole)
  }
}