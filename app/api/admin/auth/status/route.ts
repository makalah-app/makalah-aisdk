// ============================================
// MAKALAH AI: Admin Authentication Status API
// ============================================
// Task P06.1: Admin authentication status endpoint
// Created: August 2025
// Purpose: Check admin authentication status and permissions

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAPI } from '@/middleware/admin-auth'
import { AdminRBAC } from '@/lib/admin-rbac'
import type { JWTPayload } from '@/lib/jwt-security'

interface AdminStatusResponse {
  isAuthenticated: boolean
  isAdmin: boolean
  user: {
    id: string
    email: string
    role: string
  }
  permissions: import('@/lib/admin-rbac').AdminPermissions
  session: {
    created_at?: string
    last_activity?: string
    expires_at?: string
  }
}

async function handleAdminStatus(
  request: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    // Get user permissions based on role
    const permissions = AdminRBAC.getPermissions(user.role)

    if (!permissions) {
      return NextResponse.json({
        error: 'Unable to determine permissions',
        code: 'PERMISSION_ERROR'
      }, { status: 500 })
    }

    const response: AdminStatusResponse = {
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
      permissions,
      session: {
        // These would come from session manager in production
        created_at: new Date(user.iat * 1000).toISOString(),
        expires_at: new Date(user.exp * 1000).toISOString(),
        last_activity: new Date().toISOString(),
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[ADMIN STATUS] Error:', error)
    
    return NextResponse.json({
      error: 'Failed to get admin status',
      code: 'ADMIN_STATUS_ERROR'
    }, { status: 500 })
  }
}

// Export protected admin status endpoint
export const GET = withAdminAPI(handleAdminStatus, {
  enableAuditLog: false, // Don't log status checks to reduce noise
  enableRateLimit: false, // Allow frequent status checks
})