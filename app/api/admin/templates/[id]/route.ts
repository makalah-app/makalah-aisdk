// ============================================
// MAKALAH AI: Admin Template Individual Operations
// ============================================
// Task P06.2: Individual template operations (GET/PUT/DELETE)
// Created: August 2025
// Purpose: CRUD operations for specific templates

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAPI, AdminRouteConfig } from '@/middleware/admin-auth'
import type { JWTPayload } from '@/lib/jwt-security'
import type { 
  SimplifiedPersonaTemplate,
  UpdatePersonaTemplateRequest 
} from '@/types/persona-simplified'

interface RouteParams {
  params: {
    id: string
  }
}

// ============================================
// GET SINGLE TEMPLATE (Admin Only)
// ============================================

async function handleGetTemplate(
  request: NextRequest,
  user: JWTPayload,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const templateId = params.id

    if (!templateId) {
      return NextResponse.json({
        error: 'Template ID is required',
        code: 'MISSING_TEMPLATE_ID'
      }, { status: 400 })
    }

    // TODO: In production, query from Supabase
    // const { data, error } = await supabase
    //   .from('persona_templates')
    //   .select('*')
    //   .eq('id', templateId)
    //   .single()

    // Mock template lookup for development
    const mockTemplate: SimplifiedPersonaTemplate | null = templateId === 'template-formal-1' ? {
      id: 'template-formal-1',
      name: 'Academic Research Assistant',
      chat_mode: 'formal',
      system_prompt: 'Anda adalah asisten penelitian akademik yang menggunakan bahasa Indonesia formal dan mengikuti standar akademik tinggi. Fokus pada metodologi penelitian yang rigorous dan analisis literatur yang mendalam.',
      description: 'Template untuk membantu penelitian akademik dengan standar formal',
      is_active: true,
      is_default: true,
      version: 2,
      created_at: '2025-08-20T10:00:00Z',
      updated_at: '2025-08-22T15:30:00Z',
      created_by: user.userId,
    } : null

    if (!mockTemplate) {
      return NextResponse.json({
        error: 'Template not found',
        code: 'TEMPLATE_NOT_FOUND'
      }, { status: 404 })
    }

    return NextResponse.json({
      template: mockTemplate,
      retrieved_at: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[ADMIN TEMPLATE] GET error:', error)
    
    return NextResponse.json({
      error: 'Failed to retrieve template',
      code: 'TEMPLATE_RETRIEVAL_ERROR'
    }, { status: 500 })
  }
}

// ============================================
// UPDATE TEMPLATE (Admin Only)
// ============================================

async function handleUpdateTemplate(
  request: NextRequest,
  user: JWTPayload,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const templateId = params.id
    const body = await request.json() as UpdatePersonaTemplateRequest

    if (!templateId) {
      return NextResponse.json({
        error: 'Template ID is required',
        code: 'MISSING_TEMPLATE_ID'
      }, { status: 400 })
    }

    // Validate updates
    if (body.updates.name !== undefined) {
      if (!body.updates.name.trim()) {
        return NextResponse.json({
          error: 'Template name cannot be empty',
          code: 'VALIDATION_ERROR'
        }, { status: 400 })
      }
    }

    if (body.updates.system_prompt !== undefined) {
      const promptLength = body.updates.system_prompt.length
      if (promptLength < 50 || promptLength > 4000) {
        return NextResponse.json({
          error: 'System prompt must be between 50 and 4000 characters',
          code: 'VALIDATION_ERROR'
        }, { status: 400 })
      }
    }

    // TODO: In production, check if template exists first
    // const { data: existing } = await supabase
    //   .from('persona_templates')
    //   .select('*')
    //   .eq('id', templateId)
    //   .single()

    // Mock existing template
    const existingTemplate: SimplifiedPersonaTemplate = {
      id: templateId,
      name: 'Academic Research Assistant',
      chat_mode: 'formal',
      system_prompt: 'Original system prompt...',
      description: 'Original description',
      is_active: true,
      is_default: true,
      version: 2,
      created_at: '2025-08-20T10:00:00Z',
      updated_at: '2025-08-22T15:30:00Z',
      created_by: user.userId,
    }

    // Apply updates
    const updatedTemplate: SimplifiedPersonaTemplate = {
      ...existingTemplate,
      name: body.updates.name?.trim() ?? existingTemplate.name,
      system_prompt: body.updates.system_prompt?.trim() ?? existingTemplate.system_prompt,
      description: body.updates.description?.trim() ?? existingTemplate.description,
      is_active: body.updates.is_active ?? existingTemplate.is_active,
      version: existingTemplate.version + 1, // Increment version
      updated_at: new Date().toISOString(),
    }

    // TODO: In production, update in Supabase
    // const { data, error } = await supabase
    //   .from('persona_templates')
    //   .update(updatedTemplate)
    //   .eq('id', templateId)
    //   .select()
    //   .single()

    console.log('[ADMIN TEMPLATE] Updated template:', {
      id: templateId,
      updated_by: user.email,
      changes: body.updates
    })

    return NextResponse.json({
      template: updatedTemplate,
      message: 'Template updated successfully'
    })

  } catch (error) {
    console.error('[ADMIN TEMPLATE] UPDATE error:', error)
    
    return NextResponse.json({
      error: 'Failed to update template',
      code: 'TEMPLATE_UPDATE_ERROR'
    }, { status: 500 })
  }
}

// ============================================
// DELETE TEMPLATE (Admin Only)
// ============================================

async function handleDeleteTemplate(
  request: NextRequest,
  user: JWTPayload,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const templateId = params.id

    if (!templateId) {
      return NextResponse.json({
        error: 'Template ID is required',
        code: 'MISSING_TEMPLATE_ID'
      }, { status: 400 })
    }

    // TODO: In production, check if template exists and can be deleted
    // const { data: existing } = await supabase
    //   .from('persona_templates')
    //   .select('*')
    //   .eq('id', templateId)
    //   .single()

    // Check if template is default - prevent deletion of default templates
    const isDefault = templateId === 'template-formal-1' // Mock check
    if (isDefault) {
      return NextResponse.json({
        error: 'Cannot delete default template. Please set another template as default first.',
        code: 'DELETE_DEFAULT_TEMPLATE'
      }, { status: 400 })
    }

    // TODO: Check if template is currently in use
    // const { data: associations } = await supabase
    //   .from('chat_mode_associations')
    //   .select('id')
    //   .eq('persona_template_id', templateId)
    //   .limit(1)

    // const isInUse = associations && associations.length > 0
    const isInUse = false // Mock check

    if (isInUse) {
      return NextResponse.json({
        error: 'Template is currently in use and cannot be deleted',
        code: 'TEMPLATE_IN_USE'
      }, { status: 400 })
    }

    // TODO: In production, soft delete or hard delete based on policy
    // const { error } = await supabase
    //   .from('persona_templates')
    //   .delete()
    //   .eq('id', templateId)

    console.log('[ADMIN TEMPLATE] Deleted template:', {
      id: templateId,
      deleted_by: user.email,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      message: 'Template deleted successfully',
      deleted_id: templateId
    })

  } catch (error) {
    console.error('[ADMIN TEMPLATE] DELETE error:', error)
    
    return NextResponse.json({
      error: 'Failed to delete template',
      code: 'TEMPLATE_DELETE_ERROR'
    }, { status: 500 })
  }
}

// Export protected endpoints with specific permissions
export const GET = withAdminAPI(handleGetTemplate, AdminRouteConfig.ANALYTICS_VIEW)
export const PUT = withAdminAPI(handleUpdateTemplate, AdminRouteConfig.TEMPLATE_UPDATE)
export const DELETE = withAdminAPI(handleDeleteTemplate, AdminRouteConfig.TEMPLATE_DELETE)