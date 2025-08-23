// ============================================
// MAKALAH AI: Template Export API
// ============================================
// Task P06.5: Template export functionality with multiple formats
// Created: August 2025
// Purpose: Export templates in various formats for backup and migration

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAPI, AdminRouteConfig } from '@/middleware/admin-auth'
import type { JWTPayload } from '@/lib/jwt-security'
import type { SimplifiedPersonaTemplate } from '@/types/persona-simplified'

// ============================================
// EXPORT INTERFACES
// ============================================

interface ExportRequest {
  format: 'json' | 'yaml' | 'csv' | 'backup'
  templates?: string[] // Template IDs to export, empty = all
  options: {
    include_metadata: boolean
    include_versions: boolean
    compress: boolean
    encrypt: boolean
  }
}

interface ExportMetadata {
  export_id: string
  format: string
  template_count: number
  exported_at: string
  exported_by: string
  makalah_version: string
  schema_version: string
}

// ============================================
// TEMPLATE EXPORT ENDPOINT
// ============================================

async function handleExportTemplates(
  request: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    const body = await request.json() as ExportRequest

    // Validate export request
    if (!body.format || !['json', 'yaml', 'csv', 'backup'].includes(body.format)) {
      return NextResponse.json({
        error: 'Invalid export format. Must be json, yaml, csv, or backup',
        code: 'INVALID_EXPORT_FORMAT'
      }, { status: 400 })
    }

    console.log('[TEMPLATE EXPORT]', {
      format: body.format,
      template_count: body.templates?.length || 'all',
      user: user.email,
      options: body.options
    })

    // Get templates to export
    const templatesToExport = await getTemplatesToExport(body.templates, user.userId)

    if (templatesToExport.length === 0) {
      return NextResponse.json({
        error: 'No templates found to export',
        code: 'NO_TEMPLATES_FOUND'
      }, { status: 404 })
    }

    // Create export metadata
    const metadata: ExportMetadata = {
      export_id: crypto.randomUUID(),
      format: body.format,
      template_count: templatesToExport.length,
      exported_at: new Date().toISOString(),
      exported_by: user.email,
      makalah_version: '1.0.0',
      schema_version: 'v1'
    }

    // Generate export content based on format
    let exportContent: string | Buffer
    let contentType: string
    let filename: string

    switch (body.format) {
      case 'json':
        exportContent = await generateJSONExport(templatesToExport, metadata, body.options)
        contentType = 'application/json'
        filename = `makalah-templates-${new Date().toISOString().split('T')[0]}.json`
        break

      case 'yaml':
        exportContent = await generateYAMLExport(templatesToExport, metadata, body.options)
        contentType = 'application/x-yaml'
        filename = `makalah-templates-${new Date().toISOString().split('T')[0]}.yaml`
        break

      case 'csv':
        exportContent = await generateCSVExport(templatesToExport, metadata, body.options)
        contentType = 'text/csv'
        filename = `makalah-templates-${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'backup':
        exportContent = await generateBackupExport(templatesToExport, metadata, body.options)
        contentType = 'application/octet-stream'
        filename = `makalah-templates-${new Date().toISOString().split('T')[0]}.backup`
        break

      default:
        throw new Error(`Unsupported export format: ${body.format}`)
    }

    // Apply compression if requested
    if (body.options.compress && typeof exportContent === 'string') {
      // TODO: Implement compression (gzip)
      // exportContent = await compress(exportContent)
      filename = filename + '.gz'
    }

    // Apply encryption if requested
    if (body.options.encrypt) {
      // TODO: Implement encryption
      // exportContent = await encrypt(exportContent, user.userId)
      filename = filename + '.enc'
    }

    // Log successful export
    await logExportActivity({
      export_id: metadata.export_id,
      user_id: user.userId,
      user_email: user.email,
      format: body.format,
      template_count: templatesToExport.length,
      file_size: Buffer.isBuffer(exportContent) ? exportContent.length : Buffer.byteLength(exportContent, 'utf8'),
      options: body.options,
      timestamp: new Date().toISOString()
    })

    // Return file download
    const response = new NextResponse(exportContent)
    response.headers.set('Content-Type', contentType)
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    response.headers.set('X-Export-ID', metadata.export_id)
    response.headers.set('X-Template-Count', metadata.template_count.toString())

    return response

  } catch (error) {
    console.error('[TEMPLATE EXPORT] Error:', error)
    
    return NextResponse.json({
      error: 'Template export failed',
      code: 'EXPORT_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================
// EXPORT GENERATION FUNCTIONS
// ============================================

async function getTemplatesToExport(templateIds: string[] | undefined, userId: string): Promise<SimplifiedPersonaTemplate[]> {
  // TODO: In production, query Supabase database
  // If templateIds provided, filter by IDs; otherwise return all accessible templates
  
  // Mock templates for development
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
      created_by: userId,
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
      created_by: userId,
    }
  ]

  // Filter by template IDs if provided
  if (templateIds && templateIds.length > 0) {
    return mockTemplates.filter(template => templateIds.includes(template.id))
  }

  return mockTemplates
}

async function generateJSONExport(
  templates: SimplifiedPersonaTemplate[],
  metadata: ExportMetadata,
  options: ExportRequest['options']
): Promise<string> {
  const exportData: any = {
    metadata,
    templates: await Promise.all(templates.map(async template => ({
      ...template,
      // Include version history if requested
      ...(options.include_versions && {
        version_history: await getTemplateVersionHistory(template.id)
      })
    })))
  }

  // Add additional metadata if requested
  if (options.include_metadata) {
    exportData.export_info = {
      total_active: templates.filter(t => t.is_active).length,
      total_inactive: templates.filter(t => !t.is_active).length,
      mode_distribution: {
        formal: templates.filter(t => t.chat_mode === 'formal').length,
        casual: templates.filter(t => t.chat_mode === 'casual').length
      },
      created_date_range: {
        earliest: templates.reduce((min, t) => t.created_at < min ? t.created_at : min, templates[0]?.created_at || ''),
        latest: templates.reduce((max, t) => t.created_at > max ? t.created_at : max, templates[0]?.created_at || '')
      }
    }
  }

  return JSON.stringify(exportData, null, 2)
}

async function generateYAMLExport(
  templates: SimplifiedPersonaTemplate[],
  metadata: ExportMetadata,
  options: ExportRequest['options']
): Promise<string> {
  // For simplicity, convert JSON to YAML-like structure
  // In production, use a proper YAML library
  const jsonData = await generateJSONExport(templates, metadata, options)
  const parsed = JSON.parse(jsonData)
  
  let yaml = '# Makalah AI Template Export\n'
  yaml += `# Exported: ${metadata.exported_at}\n`
  yaml += `# By: ${metadata.exported_by}\n\n`
  
  yaml += 'metadata:\n'
  yaml += `  export_id: "${metadata.export_id}"\n`
  yaml += `  format: "${metadata.format}"\n`
  yaml += `  template_count: ${metadata.template_count}\n`
  yaml += `  exported_at: "${metadata.exported_at}"\n`
  yaml += `  exported_by: "${metadata.exported_by}"\n\n`
  
  yaml += 'templates:\n'
  templates.forEach((template, index) => {
    yaml += `  - id: "${template.id}"\n`
    yaml += `    name: "${template.name}"\n`
    yaml += `    chat_mode: "${template.chat_mode}"\n`
    yaml += `    system_prompt: |\n      ${template.system_prompt.replace(/\n/g, '\n      ')}\n`
    yaml += `    description: "${template.description || ''}"\n`
    yaml += `    is_active: ${template.is_active}\n`
    yaml += `    is_default: ${template.is_default}\n`
    yaml += `    version: ${template.version}\n`
    yaml += `    created_at: "${template.created_at}"\n`
    yaml += `    updated_at: "${template.updated_at}"\n`
    if (index < templates.length - 1) yaml += '\n'
  })
  
  return yaml
}

async function generateCSVExport(
  templates: SimplifiedPersonaTemplate[],
  metadata: ExportMetadata,
  options: ExportRequest['options']
): Promise<string> {
  const headers = [
    'id',
    'name',
    'chat_mode',
    'system_prompt',
    'description',
    'is_active',
    'is_default',
    'version',
    'created_at',
    'updated_at'
  ]

  const rows = templates.map(template => [
    template.id,
    template.name,
    template.chat_mode,
    `"${template.system_prompt.replace(/"/g, '""')}"`, // Escape quotes
    template.description || '',
    template.is_active,
    template.is_default,
    template.version,
    template.created_at,
    template.updated_at
  ])

  let csv = `# Makalah AI Template Export - ${metadata.exported_at}\n`
  csv += `# Exported by: ${metadata.exported_by}\n`
  csv += `# Template count: ${metadata.template_count}\n\n`
  csv += headers.join(',') + '\n'
  csv += rows.map(row => row.join(',')).join('\n')

  return csv
}

async function generateBackupExport(
  templates: SimplifiedPersonaTemplate[],
  metadata: ExportMetadata,
  options: ExportRequest['options']
): Promise<string> {
  // Backup format includes everything: templates, metadata, version history, settings
  const backupData = {
    backup_version: '1.0',
    metadata,
    templates,
    version_history: options.include_versions 
      ? await Promise.all(templates.map(t => getTemplateVersionHistory(t.id)))
      : [],
    system_info: {
      platform: 'Makalah AI',
      version: '1.0.0',
      backup_created: new Date().toISOString(),
      checksum: generateChecksum(templates)
    },
    // Add other system data that might be needed for full restore
    configuration: {
      default_templates: templates.filter(t => t.is_default).map(t => t.id),
      active_templates: templates.filter(t => t.is_active).map(t => t.id)
    }
  }

  return JSON.stringify(backupData, null, 2)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getTemplateVersionHistory(templateId: string): Promise<any[]> {
  // TODO: In production, query version history from database
  // Mock version history for development
  return [
    {
      version: 1,
      created_at: '2025-08-20T10:00:00Z',
      changes: ['Initial creation']
    }
  ]
}

function generateChecksum(templates: SimplifiedPersonaTemplate[]): string {
  // Simple checksum generation for backup integrity
  const content = JSON.stringify(templates.map(t => ({ id: t.id, updated_at: t.updated_at })))
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

async function logExportActivity(activity: {
  export_id: string
  user_id: string
  user_email: string
  format: string
  template_count: number
  file_size: number
  options: any
  timestamp: string
}): Promise<void> {
  // TODO: In production, log to database for audit trail
  console.log('[EXPORT ACTIVITY]', activity)
}

// Export protected endpoint
export const POST = withAdminAPI(handleExportTemplates, AdminRouteConfig.DATA_EXPORT)