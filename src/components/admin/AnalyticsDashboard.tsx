'use client'

// ============================================
// MAKALAH AI: Analytics Dashboard
// ============================================
// Task P06.4: Comprehensive template analytics and metrics visualization
// Created: August 2025
// Features: Template effectiveness tracking, usage analytics, performance metrics

import React, { useState, useEffect, useMemo } from 'react'
import { withAdminComponent } from '@/middleware/admin-auth'
import type { SimplifiedPersonaTemplate } from '@/types/persona-simplified'

// ============================================
// ANALYTICS INTERFACES
// ============================================

interface AnalyticsMetrics {
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
  usage_trends: {
    date: string
    formal_usage: number
    casual_usage: number
  }[]
  top_performers: {
    template_id: string
    template_name: string
    chat_mode: string
    usage_count: number
    quality_score: number
    effectiveness: number
  }[]
  performance_alerts: {
    type: 'quality' | 'usage' | 'performance'
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    template_id?: string
    timestamp: string
  }[]
}

// ============================================
// MAIN ANALYTICS DASHBOARD
// ============================================

interface AnalyticsDashboardProps {
  personas: SimplifiedPersonaTemplate[]
}

function AnalyticsDashboard({ personas }: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [selectedMetric, setSelectedMetric] = useState<'usage' | 'quality' | 'effectiveness'>('usage')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load analytics data
  useEffect(() => {
    loadAnalytics()
  }, [selectedTimeRange])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // TODO: In production, fetch from API
      const response = await fetch(`/api/admin/analytics?range=${selectedTimeRange}`)
      
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      } else {
        // Use mock data for development
        setMetrics(generateMockAnalytics(personas))
      }

    } catch (err) {
      console.error('[ANALYTICS] Failed to load data:', err)
      // Fallback to mock data
      setMetrics(generateMockAnalytics(personas))
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    if (!metrics) return null

    return {
      activeRate: (metrics.overview.active_templates / metrics.overview.total_templates) * 100,
      avgUsagePerTemplate: metrics.overview.total_usage / metrics.overview.total_templates,
      formalDominance: (metrics.mode_distribution.formal / metrics.overview.total_templates) * 100,
      qualityTrend: calculateQualityTrend(metrics.quality_distribution)
    }
  }, [metrics])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-red-800 dark:text-red-200 font-medium">Analytics Loading Error</h3>
        <p className="text-red-700 dark:text-red-300 mt-2">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry Loading
        </button>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Analytics Data Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Analytics data will appear here as templates are used.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Template Analytics Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive analytics untuk persona template performance
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>

          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Performance Alerts */}
      {metrics.performance_alerts.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="text-yellow-800 dark:text-yellow-200 font-medium mb-3 flex items-center">
            <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Performance Alerts ({metrics.performance_alerts.length})
          </h3>
          <div className="space-y-2">
            {metrics.performance_alerts.slice(0, 3).map((alert, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-yellow-700 dark:text-yellow-300">{alert.message}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Templates"
          value={metrics.overview.total_templates.toString()}
          subtitle={`${metrics.overview.active_templates} active`}
          icon="📝"
          trend={derivedMetrics?.activeRate ? {
            value: derivedMetrics.activeRate,
            label: `${derivedMetrics.activeRate.toFixed(1)}% active`
          } : undefined}
        />
        
        <MetricCard
          title="Total Usage"
          value={metrics.overview.total_usage.toLocaleString()}
          subtitle={derivedMetrics ? `${derivedMetrics.avgUsagePerTemplate.toFixed(1)} avg per template` : ''}
          icon="📊"
          trend={{
            value: 12.5,
            label: '+12.5% vs last period',
            isPositive: true
          }}
        />
        
        <MetricCard
          title="Quality Score"
          value={metrics.overview.avg_quality_score.toFixed(1)}
          subtitle="Average across all templates"
          icon="⭐"
          trend={derivedMetrics ? {
            value: derivedMetrics.qualityTrend,
            label: `${derivedMetrics.qualityTrend > 0 ? '+' : ''}${derivedMetrics.qualityTrend.toFixed(1)}% quality trend`,
            isPositive: derivedMetrics.qualityTrend > 0
          } : undefined}
        />
        
        <MetricCard
          title="Mode Distribution"
          value={`${derivedMetrics?.formalDominance.toFixed(0)}%`}
          subtitle="Formal vs Casual ratio"
          icon="🎯"
          trend={{
            value: metrics.mode_distribution.formal,
            label: `${metrics.mode_distribution.formal}F / ${metrics.mode_distribution.casual}C`
          }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quality Distribution
          </h3>
          <QualityDistributionChart data={metrics.quality_distribution} />
        </div>

        {/* Mode Usage Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Chat Mode Usage
          </h3>
          <ModeUsageChart data={metrics.mode_distribution} />
        </div>
      </div>

      {/* Usage Trends Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Usage Trends Over Time
        </h3>
        <UsageTrendsChart 
          data={metrics.usage_trends} 
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
        />
      </div>

      {/* Top Performers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Top Performing Templates
        </h3>
        <TopPerformersTable performers={metrics.top_performers} />
      </div>

      {/* Export Options */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Export Analytics
        </h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => exportAnalytics('csv', metrics)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            📊 Export CSV
          </button>
          <button
            onClick={() => exportAnalytics('pdf', metrics)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            📄 Export PDF Report
          </button>
          <button
            onClick={() => exportAnalytics('json', metrics)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            💾 Export JSON
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// METRIC CARD COMPONENT
// ============================================

interface MetricCardProps {
  title: string
  value: string
  subtitle: string
  icon: string
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
}

function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      
      <div className="mb-2">
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
      
      {trend && (
        <div className={`flex items-center text-sm ${
          trend.isPositive === false ? 'text-red-600 dark:text-red-400' : 
          trend.isPositive === true ? 'text-green-600 dark:text-green-400' :
          'text-gray-600 dark:text-gray-400'
        }`}>
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// CHART COMPONENTS (Simplified)
// ============================================

function QualityDistributionChart({ data }: { data: AnalyticsMetrics['quality_distribution'] }) {
  const total = data.excellent + data.good + data.fair + data.poor
  
  const segments = [
    { name: 'Excellent (90-100)', value: data.excellent, color: 'bg-green-500', percent: (data.excellent / total) * 100 },
    { name: 'Good (70-89)', value: data.good, color: 'bg-blue-500', percent: (data.good / total) * 100 },
    { name: 'Fair (50-69)', value: data.fair, color: 'bg-yellow-500', percent: (data.fair / total) * 100 },
    { name: 'Poor (0-49)', value: data.poor, color: 'bg-red-500', percent: (data.poor / total) * 100 }
  ]

  return (
    <div className="space-y-4">
      {/* Simple bar chart */}
      <div className="space-y-3">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center">
            <div className="w-24 text-sm text-gray-600 dark:text-gray-400">
              {segment.name.split(' ')[0]}
            </div>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 mx-3">
              <div
                className={`h-4 rounded-full ${segment.color}`}
                style={{ width: `${segment.percent}%` }}
              />
            </div>
            <div className="w-16 text-sm text-right text-gray-900 dark:text-gray-100">
              {segment.value} ({segment.percent.toFixed(0)}%)
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        Total: {total} templates analyzed
      </div>
    </div>
  )
}

function ModeUsageChart({ data }: { data: AnalyticsMetrics['mode_distribution'] }) {
  const total = data.formal + data.casual
  const formalPercent = (data.formal / total) * 100
  const casualPercent = (data.casual / total) * 100

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center">
          <div className="w-20 text-sm text-gray-600 dark:text-gray-400">Formal</div>
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 mx-3">
            <div
              className="h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${formalPercent}%` }}
            >
              {formalPercent > 20 ? `${data.formal}` : ''}
            </div>
          </div>
          <div className="w-16 text-sm text-right text-gray-900 dark:text-gray-100">
            {formalPercent.toFixed(1)}%
          </div>
        </div>

        <div className="flex items-center">
          <div className="w-20 text-sm text-gray-600 dark:text-gray-400">Casual</div>
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 mx-3">
            <div
              className="h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${casualPercent}%` }}
            >
              {casualPercent > 20 ? `${data.casual}` : ''}
            </div>
          </div>
          <div className="w-16 text-sm text-right text-gray-900 dark:text-gray-100">
            {casualPercent.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  )
}

function UsageTrendsChart({ 
  data, 
  selectedMetric, 
  onMetricChange 
}: { 
  data: AnalyticsMetrics['usage_trends']
  selectedMetric: 'usage' | 'quality' | 'effectiveness'
  onMetricChange: (metric: 'usage' | 'quality' | 'effectiveness') => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</label>
        <select
          value={selectedMetric}
          onChange={(e) => onMetricChange(e.target.value as any)}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="usage">Usage Trends</option>
          <option value="quality">Quality Trends</option>
          <option value="effectiveness">Effectiveness</option>
        </select>
      </div>

      <div className="h-40 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📈</div>
          <p className="text-sm">Chart visualization</p>
          <p className="text-xs">(Would show {selectedMetric} trends)</p>
          <p className="text-xs mt-1">{data.length} data points available</p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TOP PERFORMERS TABLE
// ============================================

function TopPerformersTable({ performers }: { performers: AnalyticsMetrics['top_performers'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Template
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Mode
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Usage
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Quality
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Effectiveness
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {performers.map((performer, index) => (
            <tr key={performer.template_id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400 mr-3">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {performer.template_name}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  performer.chat_mode === 'formal'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                }`}>
                  {performer.chat_mode}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {performer.usage_count.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                <div className="flex items-center">
                  <span>{performer.quality_score.toFixed(1)}</span>
                  <div className="ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${performer.quality_score}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                <div className="flex items-center">
                  <span>{performer.effectiveness.toFixed(1)}%</span>
                  <div className="ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${performer.effectiveness}%` }}
                    />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateMockAnalytics(personas: SimplifiedPersonaTemplate[]): AnalyticsMetrics {
  const now = new Date()
  const activeTemplates = personas.filter(p => p.is_active).length
  
  return {
    overview: {
      total_templates: personas.length,
      active_templates: activeTemplates,
      total_usage: 1247,
      avg_quality_score: 78.5,
      last_updated: now.toISOString()
    },
    mode_distribution: {
      formal: personas.filter(p => p.chat_mode === 'formal').length,
      casual: personas.filter(p => p.chat_mode === 'casual').length
    },
    quality_distribution: {
      excellent: Math.floor(personas.length * 0.2),
      good: Math.floor(personas.length * 0.4),
      fair: Math.floor(personas.length * 0.3),
      poor: Math.floor(personas.length * 0.1)
    },
    usage_trends: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      formal_usage: Math.floor(Math.random() * 50) + 20,
      casual_usage: Math.floor(Math.random() * 30) + 15
    })).reverse(),
    top_performers: personas.slice(0, 5).map((persona, index) => ({
      template_id: persona.id,
      template_name: persona.name,
      chat_mode: persona.chat_mode,
      usage_count: Math.floor(Math.random() * 200) + 50,
      quality_score: Math.random() * 20 + 80,
      effectiveness: Math.random() * 15 + 85
    })),
    performance_alerts: [
      {
        type: 'quality',
        severity: 'medium',
        message: 'Template "Basic Helper" has quality score below 60',
        template_id: 'template-1',
        timestamp: now.toISOString()
      }
    ]
  }
}

function calculateQualityTrend(distribution: AnalyticsMetrics['quality_distribution']): number {
  // Simple calculation - percentage of high-quality templates
  const total = distribution.excellent + distribution.good + distribution.fair + distribution.poor
  const highQuality = distribution.excellent + distribution.good
  return ((highQuality / total) - 0.6) * 100 // Compare against 60% baseline
}

async function exportAnalytics(format: 'csv' | 'pdf' | 'json', data: AnalyticsMetrics) {
  try {
    const response = await fetch(`/api/admin/analytics/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('auth_token') || ''}`
      },
      body: JSON.stringify({ format, data })
    })

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `template-analytics-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } else {
      throw new Error('Export failed')
    }
  } catch (error) {
    console.error('[EXPORT] Failed:', error)
    alert('Export failed. Please try again.')
  }
}

// ============================================
// ENHANCED TREND CHART COMPONENT
// ============================================

function TrendLineChart({ data, metric }: { 
  data: AnalyticsMetrics['usage_trends']
  metric: 'usage' | 'quality' | 'effectiveness'
}) {
  if (data.length === 0) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">No data available</p>
        </div>
      </div>
    )
  }

  // Calculate chart values based on metric
  const points = data.map((d, i) => {
    const baseValue = d.formal_usage + d.casual_usage
    let value: number
    
    switch (metric) {
      case 'usage':
        value = baseValue
        break
      case 'quality':
        value = Math.min(100, baseValue * 1.2 + Math.random() * 10) // Mock quality
        break
      case 'effectiveness':
        value = Math.min(100, baseValue * 0.9 + Math.random() * 15) // Mock effectiveness
        break
      default:
        value = baseValue
    }
    
    return {
      x: i,
      y: value,
      date: new Date(d.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
      formal: d.formal_usage,
      casual: d.casual_usage,
      label: `${new Date(d.date).getDate()}/${new Date(d.date).getMonth() + 1}`
    }
  })
  
  const maxValue = Math.max(...points.map(p => p.y), 10)
  const minValue = Math.min(...points.map(p => p.y), 0)
  const valueRange = maxValue - minValue || 10
  
  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {metric === 'usage' ? '📈 Usage Trends' :
           metric === 'quality' ? '⭐ Quality Trends' :
           '🎯 Effectiveness Trends'}
        </h4>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last {data.length} days
        </div>
      </div>
      
      {/* Simple Bar Chart */}
      <div className="h-40 relative">
        {/* Y-axis */}
        <div className="absolute left-0 h-full flex flex-col justify-between py-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{Math.round(maxValue)}</span>
          <span>{Math.round((maxValue + minValue) / 2)}</span>
          <span>{Math.round(minValue)}</span>
        </div>
        
        {/* Chart area */}
        <div className="ml-8 h-full bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-700/50 rounded border border-gray-100 dark:border-gray-600 relative overflow-hidden">
          {/* Grid lines */}
          <div className="absolute inset-0">
            <div className="h-full border-l border-gray-200 dark:border-gray-600 absolute left-1/4"></div>
            <div className="h-full border-l border-gray-200 dark:border-gray-600 absolute left-2/4"></div>
            <div className="h-full border-l border-gray-200 dark:border-gray-600 absolute left-3/4"></div>
            <div className="w-full border-t border-gray-200 dark:border-gray-600 absolute top-1/3"></div>
            <div className="w-full border-t border-gray-200 dark:border-gray-600 absolute top-2/3"></div>
          </div>
          
          {/* Data bars */}
          <div className="absolute inset-2 flex items-end justify-between">
            {points.map((point, i) => {
              const height = Math.max(2, ((point.y - minValue) / valueRange) * 100)
              const isLast = i === points.length - 1
              
              return (
                <div key={i} className="flex flex-col items-center group relative">
                  {/* Bar */}
                  <div className="relative">
                    <div
                      className={`w-4 rounded-t-sm transition-all group-hover:opacity-80 ${
                        metric === 'usage' ? 'bg-blue-500' :
                        metric === 'quality' ? 'bg-green-500' :
                        'bg-purple-500'
                      } ${isLast ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                      style={{ height: `${height}%` }}
                      title={`${point.date}: ${Math.round(point.y)}`}
                    />
                    
                    {/* Value tooltip */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {Math.round(point.y)}
                    </div>
                  </div>
                  
                  {/* Date label */}
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {point.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Stats Summary */}
      <div className="mt-4 grid grid-cols-4 gap-3 text-center border-t border-gray-200 dark:border-gray-700 pt-3">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {Math.round(points[points.length - 1]?.y || 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Latest</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {Math.round(points.reduce((sum, p) => sum + p.y, 0) / points.length)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Average</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {Math.round(maxValue)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Peak</div>
        </div>
        <div>
          <div className={`text-sm font-semibold ${
            points[points.length - 1]?.y > points[0]?.y ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {points.length > 1 ? 
              `${points[points.length - 1]?.y > points[0]?.y ? '+' : ''}${Math.round(((points[points.length - 1]?.y - points[0]?.y) / points[0]?.y) * 100)}%` :
              '0%'
            }
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Change</div>
        </div>
      </div>
    </div>
  )
}

// Export as admin-protected component
export default withAdminComponent(AnalyticsDashboard, {
  requirePermission: 'canViewAnalytics',
})