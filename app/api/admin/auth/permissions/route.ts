// ============================================
// MAKALAH AI: Admin Permissions Check API
// ============================================
// Task P06.1: Check specific admin permissions
// Created: August 2025
// Purpose: Validate admin permissions for specific actions

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAPI } from '@/middleware/admin-auth'
import { AdminRBAC } from '@/lib/admin-rbac'
import type { JWTPayload } from '@/lib/jwt-security'

interface PermissionCheckRequest {
  permissions: Array<keyof import('@/lib/admin-rbac').AdminPermissions>
}

interface PermissionCheckResponse {
  results: Record<string, boolean>
  overall: boolean
  user_role: string
}

async function handlePermissionCheck(
  request: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    const body = await request.json() as PermissionCheckRequest
    
    if (!body.permissions || !Array.isArray(body.permissions)) {
      return NextResponse.json({
        error: 'Invalid request body. Expected array of permissions.',
        code: 'INVALID_REQUEST'
      }, { status: 400 })
    }

    const results: Record<string, boolean> = {}
    let overall = true

    // Check each requested permission
    for (const permission of body.permissions) {
      const hasPermission = AdminRBAC.hasPermission(user, permission)
      results[permission] = hasPermission
      
      if (!hasPermission) {
        overall = false
      }
    }

    const response: PermissionCheckResponse = {
      results,
      overall,
      user_role: user.role,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[PERMISSION CHECK] Error:', error)
    
    return NextResponse.json({
      error: 'Failed to check permissions',
      code: 'PERMISSION_CHECK_ERROR'
    }, { status: 500 })
  }
}

// Export protected permissions check endpoint
export const POST = withAdminAPI(handlePermissionCheck, {
  enableAuditLog: false, // Don't log permission checks to reduce noise
  enableRateLimit: true, // Prevent abuse of permission checking
})