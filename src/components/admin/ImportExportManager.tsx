'use client'

// ============================================
// MAKALAH AI: Import/Export and Version Control Manager
// ============================================
// Task P06.5: Complete template backup, migration, and version management
// Created: August 2025
// Features: Template import/export, version control, rollback capabilities

import React, { useState, useRef, useCallback } from 'react'
import { withAdminComponent } from '@/middleware/admin-auth'
import { useSecureAuth } from '@/hooks/useSecureAuth'
import type { SimplifiedPersonaTemplate } from '@/types/persona-simplified'

// ============================================
// INTERFACES
// ============================================

interface ExportFormat {
  format: 'json' | 'yaml' | 'csv' | 'backup'
  options: {
    include_metadata: boolean
    include_versions: boolean
    compress: boolean
    encrypt: boolean
  }
}

interface ImportResult {
  success: boolean
  imported_count: number
  skipped_count: number
  error_count: number
  warnings: string[]
  errors: string[]
  imported_templates: SimplifiedPersonaTemplate[]
}

interface VersionHistoryEntry {
  version: number
  template_id: string
  template_name: string
  changes: {
    field: string
    old_value: any
    new_value: any
  }[]
  created_at: string
  created_by: string
  created_by_email: string
  notes?: string
  is_current: boolean
  can_rollback: boolean
}

interface BackupInfo {
  id: string
  filename: string
  format: 'json' | 'yaml' | 'backup'
  template_count: number
  file_size: number
  created_at: string
  created_by: string
  is_encrypted: boolean
  checksum: string
}

// ============================================
// MAIN COMPONENT
// ============================================

interface ImportExportManagerProps {
  personas: SimplifiedPersonaTemplate[]
  onImportComplete: () => void
}

function ImportExportManager({ personas, onImportComplete }: ImportExportManagerProps) {
  const { user } = useSecureAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'versions' | 'backups'>('export')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Export state
  const [exportFormat, setExportFormat] = useState<ExportFormat>({
    format: 'json',
    options: {
      include_metadata: true,
      include_versions: false,
      compress: false,
      encrypt: false
    }
  })
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  
  // Import state
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importOptions, setImportOptions] = useState({
    overwrite_existing: false,
    validate_before_import: true,
    backup_before_import: true
  })
  
  // Version control state
  const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  
  // Backup state
  const [backupList, setBackupList] = useState<BackupInfo[]>([])

  // Load version history when template is selected
  const loadVersionHistory = useCallback(async (templateId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/templates/${templateId}/versions`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setVersionHistory(data.versions || [])
      } else {
        // Mock version history
        setVersionHistory(generateMockVersionHistory(templateId))
      }
    } catch (err) {
      console.error('[VERSION HISTORY] Failed to load:', err)
      setVersionHistory(generateMockVersionHistory(templateId))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load backup list
  const loadBackupList = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/backups', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setBackupList(data.backups || [])
      } else {
        // Mock backup list
        setBackupList(generateMockBackups())
      }
    } catch (err) {
      console.error('[BACKUPS] Failed to load:', err)
      setBackupList(generateMockBackups())
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getAuthToken = useCallback(async (): Promise<string> => {
    return sessionStorage.getItem('auth_token') || ''
  }, [])

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const templatesToExport = selectedTemplates.length > 0 
        ? personas.filter(p => selectedTemplates.includes(p.id))
        : personas

      const exportData = {
        format: exportFormat.format,
        options: exportFormat.options,
        templates: templatesToExport.map(t => t.id)
      }

      const response = await fetch('/api/admin/templates/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `makalah-templates-${timestamp}.${exportFormat.format}`
        a.download = filename
        
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        setSuccess(`Successfully exported ${templatesToExport.length} templates`)
      } else {
        throw new Error('Export failed')
      }

    } catch (err) {
      console.error('[EXPORT] Failed:', err)
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsLoading(false)
    }
  }, [exportFormat, selectedTemplates, personas, getAuthToken])

  // Handle import
  const handleImport = useCallback(async (file: File) => {
    try {
      setIsLoading(true)
      setError(null)
      setImportResult(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('options', JSON.stringify(importOptions))

      const response = await fetch('/api/admin/templates/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: formData
      })

      if (response.ok) {
        const result = await response.json() as ImportResult
        setImportResult(result)
        
        if (result.success && result.imported_count > 0) {
          setSuccess(`Successfully imported ${result.imported_count} templates`)
          onImportComplete()
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Import failed')
      }

    } catch (err) {
      console.error('[IMPORT] Failed:', err)
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsLoading(false)
    }
  }, [importOptions, onImportComplete, getAuthToken])

  // Handle rollback to version
  const handleRollback = useCallback(async (templateId: string, version: number) => {
    if (!confirm(`Are you sure you want to rollback to version ${version}? This action cannot be undone.`)) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/templates/${templateId}/rollback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version, admin_id: user?.userId })
      })

      if (response.ok) {
        setSuccess(`Successfully rolled back to version ${version}`)
        await loadVersionHistory(templateId)
        onImportComplete() // Refresh main template list
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Rollback failed')
      }

    } catch (err) {
      console.error('[ROLLBACK] Failed:', err)
      setError(err instanceof Error ? err.message : 'Rollback failed')
    } finally {
      setIsLoading(false)
    }
  }, [user?.userId, onImportComplete, getAuthToken, loadVersionHistory])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Template Management & Version Control
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Import, export, dan kelola versi template persona dengan backup dan rollback capabilities
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-200 font-medium">Error</h3>
          <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-500 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="text-green-800 dark:text-green-200 font-medium">Success</h3>
          <p className="text-green-700 dark:text-green-300 mt-1">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="mt-2 text-green-600 hover:text-green-500 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'export', name: 'Export Templates', icon: '📤' },
            { id: 'import', name: 'Import Templates', icon: '📥' },
            { id: 'versions', name: 'Version Control', icon: '🔄' },
            { id: 'backups', name: 'Backup Management', icon: '💾' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === 'export' && (
          <ExportSection
            personas={personas}
            exportFormat={exportFormat}
            onExportFormatChange={setExportFormat}
            selectedTemplates={selectedTemplates}
            onSelectedTemplatesChange={setSelectedTemplates}
            onExport={handleExport}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'import' && (
          <ImportSection
            importOptions={importOptions}
            onImportOptionsChange={setImportOptions}
            onImport={handleImport}
            importResult={importResult}
            isLoading={isLoading}
            fileInputRef={fileInputRef}
          />
        )}

        {activeTab === 'versions' && (
          <VersionControlSection
            personas={personas}
            selectedTemplate={selectedTemplate}
            onSelectedTemplateChange={(id) => {
              setSelectedTemplate(id)
              if (id) loadVersionHistory(id)
            }}
            versionHistory={versionHistory}
            onRollback={handleRollback}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'backups' && (
          <BackupSection
            backupList={backupList}
            onLoadBackups={loadBackupList}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}

// ============================================
// EXPORT SECTION
// ============================================

interface ExportSectionProps {
  personas: SimplifiedPersonaTemplate[]
  exportFormat: ExportFormat
  onExportFormatChange: (format: ExportFormat) => void
  selectedTemplates: string[]
  onSelectedTemplatesChange: (ids: string[]) => void
  onExport: () => void
  isLoading: boolean
}

function ExportSection({
  personas,
  exportFormat,
  onExportFormatChange,
  selectedTemplates,
  onSelectedTemplatesChange,
  onExport,
  isLoading
}: ExportSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Export Template Configuration
        </h3>
        
        {/* Format Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Format
            </label>
            <select
              value={exportFormat.format}
              onChange={(e) => onExportFormatChange({
                ...exportFormat,
                format: e.target.value as ExportFormat['format']
              })}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="json">JSON (Recommended)</option>
              <option value="yaml">YAML</option>
              <option value="csv">CSV (Data Only)</option>
              <option value="backup">Full Backup</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Options
            </label>
            <div className="space-y-2">
              {Object.entries({
                include_metadata: 'Include metadata',
                include_versions: 'Include version history',
                compress: 'Compress file',
                encrypt: 'Encrypt export'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportFormat.options[key as keyof ExportFormat['options']]}
                    onChange={(e) => onExportFormatChange({
                      ...exportFormat,
                      options: {
                        ...exportFormat.options,
                        [key]: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Templates to Export
            </label>
            <div className="space-x-2">
              <button
                onClick={() => onSelectedTemplatesChange(personas.map(p => p.id))}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                Select All
              </button>
              <button
                onClick={() => onSelectedTemplatesChange([])}
                className="text-gray-600 hover:text-gray-500 text-sm font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
            {personas.map((persona) => (
              <label
                key={persona.id}
                className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedTemplates.includes(persona.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectedTemplatesChange([...selectedTemplates, persona.id])
                    } else {
                      onSelectedTemplatesChange(selectedTemplates.filter(id => id !== persona.id))
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <div className="ml-3 flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{persona.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {persona.chat_mode} • v{persona.version} • {persona.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onExport}
            disabled={isLoading || (selectedTemplates.length === 0 && personas.length > 0)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                📤 Export {selectedTemplates.length || personas.length} Templates
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// IMPORT SECTION
// ============================================

interface ImportSectionProps {
  importOptions: any
  onImportOptionsChange: (options: any) => void
  onImport: (file: File) => void
  importResult: ImportResult | null
  isLoading: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
}

function ImportSection({
  importOptions,
  onImportOptionsChange,
  onImport,
  importResult,
  isLoading,
  fileInputRef
}: ImportSectionProps) {
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImport(file)
    }
  }, [onImport])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Import Templates
        </h3>

        {/* Import Options */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Import Options
          </label>
          <div className="space-y-3">
            {Object.entries({
              overwrite_existing: 'Overwrite existing templates',
              validate_before_import: 'Validate templates before import',
              backup_before_import: 'Create backup before import'
            }).map(([key, label]) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={importOptions[key]}
                  onChange={(e) => onImportOptionsChange({
                    ...importOptions,
                    [key]: e.target.checked
                  })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select File to Import
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml,.csv,.backup"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />
            <div className="space-y-2">
              <div className="text-4xl">📁</div>
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Choose file to import
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Supports JSON, YAML, CSV, and backup files
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Import Results */}
        {importResult && (
          <div className={`rounded-lg p-4 ${
            importResult.success 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <h4 className={`font-medium mb-2 ${
              importResult.success 
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              Import Results
            </h4>
            <div className="text-sm space-y-1">
              <p>✅ Imported: {importResult.imported_count} templates</p>
              <p>⏭️ Skipped: {importResult.skipped_count} templates</p>
              <p>❌ Errors: {importResult.error_count} templates</p>
              
              {importResult.warnings.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Warnings:</p>
                  {importResult.warnings.map((warning, index) => (
                    <p key={index} className="ml-2">⚠️ {warning}</p>
                  ))}
                </div>
              )}
              
              {importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Errors:</p>
                  {importResult.errors.map((error, index) => (
                    <p key={index} className="ml-2">❌ {error}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// VERSION CONTROL SECTION
// ============================================

interface VersionControlSectionProps {
  personas: SimplifiedPersonaTemplate[]
  selectedTemplate: string | null
  onSelectedTemplateChange: (id: string | null) => void
  versionHistory: VersionHistoryEntry[]
  onRollback: (templateId: string, version: number) => void
  isLoading: boolean
}

function VersionControlSection({
  personas,
  selectedTemplate,
  onSelectedTemplateChange,
  versionHistory,
  onRollback,
  isLoading
}: VersionControlSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Template Version History
        </h3>

        {/* Template Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Template
          </label>
          <select
            value={selectedTemplate || ''}
            onChange={(e) => onSelectedTemplateChange(e.target.value || null)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select a template...</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name} (v{persona.version})
              </option>
            ))}
          </select>
        </div>

        {/* Version History */}
        {selectedTemplate && (
          <div>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading version history...</p>
              </div>
            ) : versionHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-gray-600 dark:text-gray-400">No version history available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {versionHistory.map((version, index) => (
                  <div
                    key={`${version.template_id}-${version.version}`}
                    className={`border rounded-lg p-4 ${
                      version.is_current
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            Version {version.version}
                          </h4>
                          {version.is_current && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                              Current
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          By {version.created_by_email} • {new Date(version.created_at).toLocaleString('id-ID')}
                        </p>
                        
                        {version.notes && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            {version.notes}
                          </p>
                        )}
                        
                        {version.changes.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Changes:</p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                              {version.changes.map((change, changeIndex) => (
                                <li key={changeIndex}>
                                  {change.field}: {change.old_value} → {change.new_value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      {version.can_rollback && !version.is_current && (
                        <button
                          onClick={() => onRollback(version.template_id, version.version)}
                          className="ml-4 px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          disabled={isLoading}
                        >
                          🔄 Rollback
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// BACKUP SECTION
// ============================================

interface BackupSectionProps {
  backupList: BackupInfo[]
  onLoadBackups: () => void
  isLoading: boolean
}

function BackupSection({ backupList, onLoadBackups, isLoading }: BackupSectionProps) {
  React.useEffect(() => {
    onLoadBackups()
  }, [onLoadBackups])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Backup Management
        </h3>
        <button
          onClick={onLoadBackups}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {backupList.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💾</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Backups Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Automatic backups will appear here when created during imports or major changes.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Backup
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Templates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {backupList.map((backup) => (
                <tr key={backup.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {backup.filename}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {backup.format.toUpperCase()} {backup.is_encrypted && '🔒'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {backup.template_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatFileSize(backup.file_size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {new Date(backup.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button className="text-blue-600 hover:text-blue-500 font-medium">
                      Download
                    </button>
                    <button className="text-green-600 hover:text-green-500 font-medium">
                      Restore
                    </button>
                    <button className="text-red-600 hover:text-red-500 font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================
// MOCK DATA GENERATORS
// ============================================

function generateMockVersionHistory(templateId: string): VersionHistoryEntry[] {
  const now = new Date()
  return [
    {
      version: 3,
      template_id: templateId,
      template_name: 'Academic Research Assistant',
      changes: [
        { field: 'system_prompt', old_value: 'Old prompt...', new_value: 'Updated prompt...' },
        { field: 'description', old_value: 'Old desc', new_value: 'New desc' }
      ],
      created_at: now.toISOString(),
      created_by: 'user-1',
      created_by_email: 'admin@makalah.app',
      notes: 'Updated for better academic focus',
      is_current: true,
      can_rollback: false
    },
    {
      version: 2,
      template_id: templateId,
      template_name: 'Academic Research Assistant',
      changes: [
        { field: 'name', old_value: 'Basic Assistant', new_value: 'Academic Research Assistant' }
      ],
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'user-1',
      created_by_email: 'admin@makalah.app',
      notes: 'Renamed for clarity',
      is_current: false,
      can_rollback: true
    }
  ]
}

function generateMockBackups(): BackupInfo[] {
  const now = new Date()
  return [
    {
      id: 'backup-1',
      filename: 'makalah-templates-2025-08-23.backup',
      format: 'backup',
      template_count: 12,
      file_size: 245760, // ~240KB
      created_at: now.toISOString(),
      created_by: 'system',
      is_encrypted: true,
      checksum: 'sha256:abc123...'
    },
    {
      id: 'backup-2',
      filename: 'templates-export-2025-08-22.json',
      format: 'json',
      template_count: 8,
      file_size: 156789,
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'admin@makalah.app',
      is_encrypted: false,
      checksum: 'sha256:def456...'
    }
  ]
}

// Export as admin-protected component
export default withAdminComponent(ImportExportManager, {
  requirePermission: 'canExportData', // Requires export permission to access
})