// ============================================
// MAKALAH AI: Admin Template Toggle Status
// ============================================
// Task P06.2: Toggle template active/inactive status
// Created: August 2025
// Purpose: Quick activation/deactivation of templates

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAPI, AdminRouteConfig } from '@/middleware/admin-auth'
import type { JWTPayload } from '@/lib/jwt-security'
import type { SimplifiedPersonaTemplate } from '@/types/persona-simplified'

interface RouteParams {
  params: {
    id: string
  }
}

interface ToggleStatusRequest {
  is_active: boolean
  admin_id?: string
  notes?: string
}

// ============================================
// TOGGLE TEMPLATE STATUS (Admin Only)
// ============================================

async function handleToggleStatus(
  request: NextRequest,
  user: JWTPayload,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const templateId = params.id
    const body = await request.json() as ToggleStatusRequest

    if (!templateId) {
      return NextResponse.json({
        error: 'Template ID is required',
        code: 'MISSING_TEMPLATE_ID'
      }, { status: 400 })
    }

    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({
        error: 'is_active must be a boolean value',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // TODO: In production, get existing template from Supabase
    // const { data: existing, error: fetchError } = await supabase
    //   .from('persona_templates')
    //   .select('*')
    //   .eq('id', templateId)
    //   .single()

    // Mock existing template for development
    const existingTemplate: SimplifiedPersonaTemplate | null = {
      id: templateId,
      name: 'Academic Research Assistant',
      chat_mode: 'formal',
      system_prompt: 'System prompt content...',
      description: 'Template description',
      is_active: !body.is_active, // Opposite of what we want to set
      is_default: false,
      version: 2,
      created_at: '2025-08-20T10:00:00Z',
      updated_at: '2025-08-22T15:30:00Z',
      created_by: user.userId,
    }

    if (!existingTemplate) {
      return NextResponse.json({
        error: 'Template not found',
        code: 'TEMPLATE_NOT_FOUND'
      }, { status: 404 })
    }

    // Special validation for deactivating default templates
    if (existingTemplate.is_default && !body.is_active) {
      return NextResponse.json({
        error: 'Cannot deactivate default template. Please set another template as default first.',
        code: 'DEACTIVATE_DEFAULT_TEMPLATE'
      }, { status: 400 })
    }

    // Check if this is the last active template for its chat mode
    if (!body.is_active) {
      // TODO: In production, check if there are other active templates for the same chat mode
      // const { data: otherActiveTemplates } = await supabase
      //   .from('persona_templates')
      //   .select('id')
      //   .eq('chat_mode', existingTemplate.chat_mode)
      //   .eq('is_active', true)
      //   .neq('id', templateId)

      const hasOtherActiveTemplates = true // Mock - assume there are others

      if (!hasOtherActiveTemplates) {
        return NextResponse.json({
          error: `Cannot deactivate the last active template for ${existingTemplate.chat_mode} mode`,
          code: 'LAST_ACTIVE_TEMPLATE'
        }, { status: 400 })
      }
    }

    // Update template status
    const updatedTemplate: SimplifiedPersonaTemplate = {
      ...existingTemplate,
      is_active: body.is_active,
      version: existingTemplate.version + 1,
      updated_at: new Date().toISOString(),
    }

    // TODO: In production, update in Supabase
    // const { data, error: updateError } = await supabase
    //   .from('persona_templates')
    //   .update({
    //     is_active: body.is_active,
    //     version: existingTemplate.version + 1,
    //     updated_at: new Date().toISOString()
    //   })
    //   .eq('id', templateId)
    //   .select()
    //   .single()

    // TODO: In production, log admin action
    // await supabase.from('template_admin_actions').insert({
    //   persona_template_id: templateId,
    //   action_type: body.is_active ? 'activated' : 'deactivated',
    //   old_values: { is_active: existingTemplate.is_active },
    //   new_values: { is_active: body.is_active },
    //   performed_by: user.userId,
    //   performed_at: new Date().toISOString(),
    //   notes: body.notes || `Template ${body.is_active ? 'activated' : 'deactivated'} by admin`
    // })

    console.log('[ADMIN TEMPLATE] Toggled status:', {
      id: templateId,
      from: existingTemplate.is_active,
      to: body.is_active,
      by: user.email,
      notes: body.notes
    })

    return NextResponse.json({
      template: updatedTemplate,
      message: `Template ${body.is_active ? 'activated' : 'deactivated'} successfully`,
      action: {
        type: body.is_active ? 'activated' : 'deactivated',
        performed_by: user.email,
        performed_at: new Date().toISOString(),
        notes: body.notes
      }
    })

  } catch (error) {
    console.error('[ADMIN TEMPLATE] TOGGLE error:', error)
    
    return NextResponse.json({
      error: 'Failed to toggle template status',
      code: 'TEMPLATE_TOGGLE_ERROR'
    }, { status: 500 })
  }
}

// Export protected endpoint
export const POST = withAdminAPI(handleToggleStatus, AdminRouteConfig.TEMPLATE_UPDATE)