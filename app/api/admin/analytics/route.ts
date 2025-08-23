// ============================================
// MAKALAH AI: Admin Analytics API
// ============================================
// Task P06.4: Template analytics and metrics endpoint
// Created: August 2025
// Purpose: Comprehensive analytics data for admin dashboard

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAPI, AdminRouteConfig } from '@/middleware/admin-auth'
import type { JWTPayload } from '@/lib/jwt-security'

// ============================================
// ANALYTICS INTERFACES
// ============================================

interface AnalyticsQuery {
  range: '7d' | '30d' | '90d' | '1y'
  mode?: 'formal' | 'casual' | 'all'
  include_trends?: boolean
  include_performance?: boolean
}

interface AnalyticsResponse {
  overview: {
    total_templates: number
    active_templates: number
    total_usage: number
    avg_quality_score: number
    last_updated: string
  }
  mode_distribution: {
    formal: number
    casual: number
  }
  quality_distribution: {
    excellent: number // 90-100
    good: number // 70-89
    fair: number // 50-69
    poor: number // 0-49
  }
  usage_trends: Array<{
    date: string
    formal_usage: number
    casual_usage: number
    total_usage: number
    quality_score: number
  }>
  top_performers: Array<{
    template_id: string
    template_name: string
    chat_mode: string
    usage_count: number
    quality_score: number
    effectiveness: number
    last_used: string
  }>
  performance_alerts: Array<{
    id: string
    type: 'quality' | 'usage' | 'performance' | 'error'
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    template_id?: string
    template_name?: string
    timestamp: string
    auto_resolve: boolean
  }>
  comparative_metrics: {
    period_comparison: {
      usage_change: number
      quality_change: number
      template_count_change: number
    }
    benchmarks: {
      industry_avg_quality: number
      optimal_usage_per_template: number
      recommended_template_count: number
    }
  }
  generated_at: string
  cache_expires_at: string
}

// ============================================
// GET ANALYTICS DATA
// ============================================

async function handleGetAnalytics(
  request: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    // Parse query parameters
    const { searchParams } = request.nextUrl
    const query: AnalyticsQuery = {
      range: (searchParams.get('range') as AnalyticsQuery['range']) || '30d',
      mode: (searchParams.get('mode') as AnalyticsQuery['mode']) || 'all',
      include_trends: searchParams.get('include_trends') !== 'false',
      include_performance: searchParams.get('include_performance') !== 'false'
    }

    console.log('[ANALYTICS] Request from:', user.email, 'Query:', query)

    // Get date range
    const { startDate, endDate } = getDateRange(query.range)

    // TODO: In production, these would be actual database queries
    const analyticsData = await generateAnalyticsData(query, startDate, endDate, user.userId)

    // Cache control headers
    const cacheMaxAge = query.range === '7d' ? 300 : 1800 // 5min for 7d, 30min for others
    
    const response = NextResponse.json(analyticsData)
    response.headers.set('Cache-Control', `private, max-age=${cacheMaxAge}`)
    response.headers.set('X-Analytics-Generated', new Date().toISOString())

    return response

  } catch (error) {
    console.error('[ANALYTICS] Error:', error)
    
    return NextResponse.json({
      error: 'Failed to generate analytics data',
      code: 'ANALYTICS_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================
// ANALYTICS DATA GENERATION
// ============================================

async function generateAnalyticsData(
  query: AnalyticsQuery,
  startDate: Date,
  endDate: Date,
  userId: string
): Promise<AnalyticsResponse> {
  const now = new Date()

  // TODO: Replace with actual Supabase queries
  
  // Mock template data
  const mockTemplates = [
    {
      id: 'template-1',
      name: 'Academic Research Assistant',
      chat_mode: 'formal',
      usage_count: 245,
      quality_score: 87.5,
      effectiveness: 92.3,
      is_active: true,
      last_used: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'template-2', 
      name: 'Jakarta Helper Buddy',
      chat_mode: 'casual',
      usage_count: 189,
      quality_score: 84.2,
      effectiveness: 89.1,
      is_active: true,
      last_used: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'template-3',
      name: 'Literature Review Specialist',
      chat_mode: 'formal',
      usage_count: 156,
      quality_score: 91.8,
      effectiveness: 94.7,
      is_active: true,
      last_used: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'template-4',
      name: 'Casual Study Buddy',
      chat_mode: 'casual',
      usage_count: 98,
      quality_score: 76.4,
      effectiveness: 81.2,
      is_active: false,
      last_used: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString()
    }
  ]

  // Filter by mode if specified
  const filteredTemplates = query.mode === 'all' 
    ? mockTemplates 
    : mockTemplates.filter(t => t.chat_mode === query.mode)

  // Calculate overview metrics
  const activeTemplates = filteredTemplates.filter(t => t.is_active)
  const totalUsage = filteredTemplates.reduce((sum, t) => sum + t.usage_count, 0)
  const avgQualityScore = filteredTemplates.reduce((sum, t) => sum + t.quality_score, 0) / filteredTemplates.length

  // Mode distribution
  const formalCount = filteredTemplates.filter(t => t.chat_mode === 'formal').length
  const casualCount = filteredTemplates.filter(t => t.chat_mode === 'casual').length

  // Quality distribution
  const qualityDistribution = {
    excellent: filteredTemplates.filter(t => t.quality_score >= 90).length,
    good: filteredTemplates.filter(t => t.quality_score >= 70 && t.quality_score < 90).length,
    fair: filteredTemplates.filter(t => t.quality_score >= 50 && t.quality_score < 70).length,
    poor: filteredTemplates.filter(t => t.quality_score < 50).length
  }

  // Generate usage trends
  const usageTrends = generateUsageTrends(query.range, startDate, endDate)

  // Top performers
  const topPerformers = filteredTemplates
    .sort((a, b) => (b.effectiveness * b.usage_count) - (a.effectiveness * a.usage_count))
    .slice(0, 10)
    .map(t => ({
      template_id: t.id,
      template_name: t.name,
      chat_mode: t.chat_mode,
      usage_count: t.usage_count,
      quality_score: t.quality_score,
      effectiveness: t.effectiveness,
      last_used: t.last_used
    }))

  // Performance alerts
  const performanceAlerts = generatePerformanceAlerts(filteredTemplates)

  // Comparative metrics
  const comparativeMetrics = {
    period_comparison: {
      usage_change: 12.5, // Mock: +12.5% vs previous period
      quality_change: 3.2, // Mock: +3.2% quality improvement
      template_count_change: 1 // Mock: +1 new template
    },
    benchmarks: {
      industry_avg_quality: 72.0, // Mock industry average
      optimal_usage_per_template: 150, // Mock optimal usage
      recommended_template_count: Math.max(5, Math.ceil(totalUsage / 200)) // Mock recommendation
    }
  }

  const cacheExpiresAt = new Date(now.getTime() + (query.range === '7d' ? 5 * 60 * 1000 : 30 * 60 * 1000))

  return {
    overview: {
      total_templates: filteredTemplates.length,
      active_templates: activeTemplates.length,
      total_usage: totalUsage,
      avg_quality_score: parseFloat(avgQualityScore.toFixed(1)),
      last_updated: now.toISOString()
    },
    mode_distribution: {
      formal: formalCount,
      casual: casualCount
    },
    quality_distribution: qualityDistribution,
    usage_trends: usageTrends,
    top_performers: topPerformers,
    performance_alerts: performanceAlerts,
    comparative_metrics: comparativeMetrics,
    generated_at: now.toISOString(),
    cache_expires_at: cacheExpiresAt.toISOString()
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDateRange(range: AnalyticsQuery['range']): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  const startDate = new Date()

  switch (range) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7)
      break
    case '30d':
      startDate.setDate(endDate.getDate() - 30)
      break
    case '90d':
      startDate.setDate(endDate.getDate() - 90)
      break
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1)
      break
  }

  return { startDate, endDate }
}

function generateUsageTrends(
  range: AnalyticsQuery['range'],
  startDate: Date,
  endDate: Date
): AnalyticsResponse['usage_trends'] {
  const trends: AnalyticsResponse['usage_trends'] = []
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  
  // Generate data points
  const dataPoints = Math.min(daysDiff, 30) // Max 30 data points for performance

  for (let i = 0; i < dataPoints; i++) {
    const date = new Date(startDate.getTime() + (i * (daysDiff / dataPoints)) * 24 * 60 * 60 * 1000)
    
    // Mock trending data with some variability
    const baseFormalUsage = 30 + Math.sin(i * 0.2) * 10
    const baseCasualUsage = 20 + Math.sin(i * 0.15) * 8
    const variation = (Math.random() - 0.5) * 0.2

    const formalUsage = Math.floor(baseFormalUsage * (1 + variation))
    const casualUsage = Math.floor(baseCasualUsage * (1 + variation))
    
    trends.push({
      date: date.toISOString().split('T')[0],
      formal_usage: formalUsage,
      casual_usage: casualUsage,
      total_usage: formalUsage + casualUsage,
      quality_score: 75 + Math.random() * 20 // Mock quality score 75-95
    })
  }

  return trends
}

function generatePerformanceAlerts(templates: any[]): AnalyticsResponse['performance_alerts'] {
  const alerts: AnalyticsResponse['performance_alerts'] = []
  const now = new Date()

  // Check for low quality templates
  const lowQualityTemplates = templates.filter(t => t.quality_score < 70)
  lowQualityTemplates.forEach(template => {
    alerts.push({
      id: `quality-${template.id}`,
      type: 'quality',
      severity: template.quality_score < 50 ? 'critical' : 'medium',
      message: `Template "${template.name}" has quality score ${template.quality_score.toFixed(1)} below recommended threshold`,
      template_id: template.id,
      template_name: template.name,
      timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      auto_resolve: false
    })
  })

  // Check for low usage templates
  const lowUsageTemplates = templates.filter(t => t.usage_count < 10 && t.is_active)
  lowUsageTemplates.forEach(template => {
    alerts.push({
      id: `usage-${template.id}`,
      type: 'usage',
      severity: 'low',
      message: `Template "${template.name}" has very low usage (${template.usage_count} times)`,
      template_id: template.id,
      template_name: template.name,
      timestamp: new Date(now.getTime() - Math.random() * 12 * 60 * 60 * 1000).toISOString(),
      auto_resolve: true
    })
  })

  // Check for inactive default templates
  const inactiveDefaults = templates.filter(t => !t.is_active && t.is_default)
  if (inactiveDefaults.length > 0) {
    alerts.push({
      id: 'inactive-default',
      type: 'performance',
      severity: 'high',
      message: `${inactiveDefaults.length} default template(s) are inactive`,
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      auto_resolve: false
    })
  }

  // Mock system performance alert
  if (Math.random() > 0.8) {
    alerts.push({
      id: 'system-performance',
      type: 'performance',
      severity: 'medium',
      message: 'Average template response time increased by 15% in last hour',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      auto_resolve: true
    })
  }

  return alerts.sort((a, b) => {
    // Sort by severity and timestamp
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return severityOrder[b.severity] - severityOrder[a.severity] || 
           new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}

// Export protected endpoint
export const GET = withAdminAPI(handleGetAnalytics, AdminRouteConfig.ANALYTICS_VIEW)