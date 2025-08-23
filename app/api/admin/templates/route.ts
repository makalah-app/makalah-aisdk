// ============================================
// MAKALAH AI: Admin Templates API
// ============================================
// Task P06.2: Admin template CRUD operations
// Created: August 2025
// Purpose: Complete template management for administrators

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAPI, AdminRouteConfig } from '@/middleware/admin-auth'
import type { JWTPayload } from '@/lib/jwt-security'
import type { 
  SimplifiedPersonaTemplate,
  CreatePersonaTemplateRequest,
  ChatModeType 
} from '@/types/persona-simplified'

// ============================================
// GET ALL TEMPLATES (Admin Only)
// ============================================

async function handleGetTemplates(
  request: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    // Parse query parameters
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const chat_mode = searchParams.get('chat_mode') as ChatModeType | null
    const active_only = searchParams.get('active_only') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // TODO: In production, this would query Supabase database
    // For now, return mock data matching P05 schema
    const mockTemplates: SimplifiedPersonaTemplate[] = [
      {
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
      },
      {
        id: 'template-casual-1',
        name: 'Jakarta Helper Buddy',
        chat_mode: 'casual',
        system_prompt: 'Gue adalah temen lo yang suka bantu-bantu soal akademik! Gue bakal jelasin dengan bahasa Jakarta yang santai tapi tetep informatif. Gue bisa bantuin lo brainstorming, jelasin konsep yang rumit jadi gampang, dan ngasih motivasi.',
        description: 'Template casual Jakarta untuk obrolan santai dan bantuan akademik',
        is_active: true,
        is_default: true,
        version: 1,
        created_at: '2025-08-21T09:15:00Z',
        updated_at: '2025-08-21T09:15:00Z',
        created_by: user.userId,
      }
    ]

    // Apply filters
    let filteredTemplates = mockTemplates

    if (search) {
      const searchLower = search.toLowerCase()
      filteredTemplates = filteredTemplates.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      )
    }

    if (chat_mode) {
      filteredTemplates = filteredTemplates.filter(t => t.chat_mode === chat_mode)
    }

    if (active_only) {
      filteredTemplates = filteredTemplates.filter(t => t.is_active)
    }

    // Apply pagination
    const paginatedTemplates = filteredTemplates.slice(offset, offset + limit)

    return NextResponse.json({
      templates: paginatedTemplates,
      total_count: filteredTemplates.length,
      page_info: {
        limit,
        offset,
        has_more: offset + limit < filteredTemplates.length,
      },
      retrieved_at: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[ADMIN TEMPLATES] GET error:', error)
    
    return NextResponse.json({
      error: 'Failed to retrieve templates',
      code: 'TEMPLATE_RETRIEVAL_ERROR'
    }, { status: 500 })
  }
}

// ============================================
// CREATE NEW TEMPLATE (Admin Only)
// ============================================

async function handleCreateTemplate(
  request: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    const body = await request.json() as CreatePersonaTemplateRequest

    // Validate required fields
    if (!body.name || !body.chat_mode || !body.system_prompt) {
      return NextResponse.json({
        error: 'Missing required fields: name, chat_mode, system_prompt',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Validate chat mode
    if (!['formal', 'casual'].includes(body.chat_mode)) {
      return NextResponse.json({
        error: 'Invalid chat_mode. Must be "formal" or "casual"',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Validate system prompt length
    if (body.system_prompt.length < 50) {
      return NextResponse.json({
        error: 'System prompt must be at least 50 characters long',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    if (body.system_prompt.length > 4000) {
      return NextResponse.json({
        error: 'System prompt cannot exceed 4000 characters',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Create new template
    const now = new Date().toISOString()
    const newTemplate: SimplifiedPersonaTemplate = {
      id: `template-${body.chat_mode}-${Date.now()}`,
      name: body.name.trim(),
      chat_mode: body.chat_mode,
      system_prompt: body.system_prompt.trim(),
      description: body.description?.trim() || null,
      is_active: true, // New templates are active by default
      is_default: body.is_default || false,
      version: 1,
      created_at: now,
      updated_at: now,
      created_by: user.userId,
    }

    // TODO: In production, save to Supabase database
    // await supabase.from('persona_templates').insert(newTemplate)

    console.log('[ADMIN TEMPLATES] Created template:', {
      id: newTemplate.id,
      name: newTemplate.name,
      chat_mode: newTemplate.chat_mode,
      created_by: user.email
    })

    return NextResponse.json({
      template: newTemplate,
      message: 'Template created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('[ADMIN TEMPLATES] CREATE error:', error)
    
    return NextResponse.json({
      error: 'Failed to create template',
      code: 'TEMPLATE_CREATION_ERROR'
    }, { status: 500 })
  }
}

// Export protected endpoints
export const GET = withAdminAPI(handleGetTemplates, AdminRouteConfig.ANALYTICS_VIEW)
export const POST = withAdminAPI(handleCreateTemplate, AdminRouteConfig.TEMPLATE_CREATE)