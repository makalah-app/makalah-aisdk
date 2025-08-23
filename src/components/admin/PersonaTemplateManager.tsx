'use client'

// ============================================
// MAKALAH AI: Enhanced Admin Template Manager
// ============================================
// Task P06.2: AI SDK compliant admin template management interface
// Created: August 2025
// Features: Real-time preview, dual chat mode support, comprehensive CRUD

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useChat } from 'ai/react'
import { withAdminComponent } from '@/middleware/admin-auth'
import { useSecureAuth } from '@/hooks/useSecureAuth'
import ImportExportManager from './ImportExportManager'
import type { 
  SimplifiedPersonaTemplate,
  ChatModeType,
  CreatePersonaTemplateRequest,
  UpdatePersonaTemplateRequest 
} from '@/types/persona-simplified'

// ============================================
// MAIN ADMIN TEMPLATE MANAGER
// ============================================

interface PersonaTemplateManagerProps {
  initialPersonas?: SimplifiedPersonaTemplate[]
}

function PersonaTemplateManager({ initialPersonas = [] }: PersonaTemplateManagerProps) {
  const { user } = useSecureAuth()
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'analytics' | 'import-export'>('list')
  const [personas, setPersonas] = useState<SimplifiedPersonaTemplate[]>(initialPersonas)
  const [selectedPersona, setSelectedPersona] = useState<SimplifiedPersonaTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<ChatModeType | 'all'>('all')

  // Load personas on component mount
  useEffect(() => {
    loadPersonas()
  }, [])

  const loadPersonas = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/templates', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load persona templates')
      }

      const data = await response.json()
      setPersonas(data.templates || [])

    } catch (err) {
      console.error('[TEMPLATE MANAGER] Failed to load personas:', err)
      setError(err instanceof Error ? err.message : 'Failed to load personas')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Helper function to get auth token
  const getAuthToken = useCallback(async (): Promise<string> => {
    // In production, this would get token from secure storage
    return sessionStorage.getItem('auth_token') || ''
  }, [])

  // Filter personas based on search and mode
  const filteredPersonas = useMemo(() => {
    return personas.filter(persona => {
      const matchesSearch = !searchTerm || 
        persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        persona.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesMode = filterMode === 'all' || persona.chat_mode === filterMode
      
      return matchesSearch && matchesMode
    })
  }, [personas, searchTerm, filterMode])

  const handleCreatePersona = useCallback(async (request: CreatePersonaTemplateRequest) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...request, admin_id: user?.userId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create template')
      }

      const data = await response.json()
      setPersonas(prev => [...prev, data.template])
      setActiveTab('list')

    } catch (err) {
      console.error('[TEMPLATE MANAGER] Failed to create persona:', err)
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setIsLoading(false)
    }
  }, [user?.userId, getAuthToken])

  const handleUpdatePersona = useCallback(async (request: UpdatePersonaTemplateRequest) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/templates/${request.template_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...request, admin_id: user?.userId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update template')
      }

      const data = await response.json()
      setPersonas(prev => prev.map(p => p.id === request.template_id ? data.template : p))
      setSelectedPersona(null)
      setActiveTab('list')

    } catch (err) {
      console.error('[TEMPLATE MANAGER] Failed to update persona:', err)
      setError(err instanceof Error ? err.message : 'Failed to update template')
    } finally {
      setIsLoading(false)
    }
  }, [user?.userId, getAuthToken])

  const handleDeletePersona = useCallback(async (personaId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus persona template ini? Aksi ini tidak dapat dibatalkan.')) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/templates/${personaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete template')
      }

      setPersonas(prev => prev.filter(p => p.id !== personaId))
      if (selectedPersona?.id === personaId) {
        setSelectedPersona(null)
      }

    } catch (err) {
      console.error('[TEMPLATE MANAGER] Failed to delete persona:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    } finally {
      setIsLoading(false)
    }
  }, [selectedPersona?.id, getAuthToken])

  const handleToggleActive = useCallback(async (persona: SimplifiedPersonaTemplate) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/templates/${persona.id}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          is_active: !persona.is_active,
          admin_id: user?.userId 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to toggle template status')
      }

      const data = await response.json()
      setPersonas(prev => prev.map(p => p.id === persona.id ? data.template : p))

    } catch (err) {
      console.error('[TEMPLATE MANAGER] Failed to toggle persona:', err)
      setError(err instanceof Error ? err.message : 'Failed to toggle template status')
    } finally {
      setIsLoading(false)
    }
  }, [user?.userId, getAuthToken])

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Admin Template Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Kelola persona template untuk dual chat mode (formal & casual) dengan real-time preview
            </p>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
            <span>👤 {user?.email}</span>
            <span>|</span>
            <span>🛡️ {user?.role}</span>
            <span>|</span>
            <span>📊 {personas.length} templates</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'list', name: 'Daftar Template', icon: '📋', count: filteredPersonas.length },
              { id: 'create', name: 'Buat Template', icon: '➕' },
              { id: 'analytics', name: 'Analytics', icon: '📊' },
              { id: 'import-export', name: 'Import/Export', icon: '📦' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  setSelectedPersona(null)
                }}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
                {tab.count !== undefined && (
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 min-h-[600px]">
          {activeTab === 'list' && (
            <TemplateList
              personas={filteredPersonas}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterMode={filterMode}
              onFilterChange={setFilterMode}
              onEdit={(persona) => {
                setSelectedPersona(persona)
                setActiveTab('edit')
              }}
              onDelete={handleDeletePersona}
              onToggleActive={handleToggleActive}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'create' && (
            <TemplateForm
              mode="create"
              onSave={handleCreatePersona}
              onCancel={() => setActiveTab('list')}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'edit' && selectedPersona && (
            <TemplateForm
              mode="edit"
              initialData={selectedPersona}
              onSave={(data) => handleUpdatePersona({
                template_id: selectedPersona.id,
                updates: data,
              })}
              onCancel={() => {
                setSelectedPersona(null)
                setActiveTab('list')
              }}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard personas={personas} />
          )}

          {activeTab === 'import-export' && (
            <ImportExportManager
              personas={personas}
              onImportComplete={loadPersonas}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// TEMPLATE LIST COMPONENT
// ============================================

interface TemplateListProps {
  personas: SimplifiedPersonaTemplate[]
  searchTerm: string
  onSearchChange: (term: string) => void
  filterMode: ChatModeType | 'all'
  onFilterChange: (mode: ChatModeType | 'all') => void
  onEdit: (persona: SimplifiedPersonaTemplate) => void
  onDelete: (personaId: string) => void
  onToggleActive: (persona: SimplifiedPersonaTemplate) => void
  isLoading: boolean
}

function TemplateList({
  personas,
  searchTerm,
  onSearchChange,
  filterMode,
  onFilterChange,
  onEdit,
  onDelete,
  onToggleActive,
  isLoading
}: TemplateListProps) {
  const getModeColor = (mode: ChatModeType) => {
    switch (mode) {
      case 'formal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'casual': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
    }
  }

  const getModeLabel = (mode: ChatModeType) => {
    switch (mode) {
      case 'formal': return 'Formal Academic'
      case 'casual': return 'Casual Jakarta'
    }
  }

  if (isLoading && personas.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading template data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari template berdasarkan nama atau deskripsi..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <select
            value={filterMode}
            onChange={(e) => onFilterChange(e.target.value as ChatModeType | 'all')}
            className="block px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Semua Mode</option>
            <option value="formal">Mode Formal</option>
            <option value="casual">Mode Casual</option>
          </select>
        </div>
      </div>

      {/* Template Grid */}
      {personas.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchTerm || filterMode !== 'all' ? 'Tidak ada template yang cocok' : 'Belum ada template'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm || filterMode !== 'all' 
              ? 'Coba ubah pencarian atau filter untuk melihat template lain'
              : 'Mulai dengan membuat template persona pertama Anda'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {personas.map((persona) => (
            <div
              key={persona.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {persona.name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getModeColor(persona.chat_mode)}`}>
                      {getModeLabel(persona.chat_mode)}
                    </span>
                    {persona.is_default && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                        Default
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {persona.description || 'Tidak ada deskripsi'}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>📅 v{persona.version}</span>
                    <span>📝 {new Date(persona.created_at).toLocaleDateString('id-ID')}</span>
                    <span className={persona.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {persona.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => onEdit(persona)}
                  className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => onToggleActive(persona)}
                  className={`text-sm font-medium ${
                    persona.is_active
                      ? 'text-orange-600 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300'
                      : 'text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300'
                  }`}
                >
                  {persona.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button
                  onClick={() => onDelete(persona.id)}
                  className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// TEMPLATE FORM COMPONENT WITH AI SDK INTEGRATION
// ============================================

interface TemplateFormProps {
  mode: 'create' | 'edit'
  initialData?: SimplifiedPersonaTemplate
  onSave: (data: CreatePersonaTemplateRequest) => void
  onCancel: () => void
  isLoading: boolean
}

function TemplateForm({ mode, initialData, onSave, onCancel, isLoading }: TemplateFormProps) {
  const [formData, setFormData] = useState<CreatePersonaTemplateRequest>({
    name: initialData?.name || '',
    chat_mode: initialData?.chat_mode || 'formal',
    system_prompt: initialData?.system_prompt || '',
    description: initialData?.description || '',
    is_default: initialData?.is_default || false,
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [previewMode, setPreviewMode] = useState(false)
  const [testMessage, setTestMessage] = useState('Halo, tolong jelaskan tentang metodologi penelitian kualitatif.')

  // AI SDK integration for real-time system prompt testing
  const { messages, input, handleInputChange, handleSubmit, isLoading: isTestingPrompt } = useChat({
    api: '/api/chat',
    initialMessages: [],
    body: {
      systemPrompt: formData.system_prompt,
      chatMode: formData.chat_mode,
      isTestMode: true
    },
  })

  // Real-time validation
  useEffect(() => {
    const errors: Record<string, string> = {}
    
    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Nama template wajib diisi'
    } else if (formData.name.length < 3) {
      errors.name = 'Nama template minimal 3 karakter'
    } else if (formData.name.length > 100) {
      errors.name = 'Nama template maksimal 100 karakter'
    }

    // System prompt validation
    if (!formData.system_prompt.trim()) {
      errors.system_prompt = 'System prompt wajib diisi'
    } else if (formData.system_prompt.length < 50) {
      errors.system_prompt = `System prompt minimal 50 karakter (saat ini: ${formData.system_prompt.length})`
    } else if (formData.system_prompt.length > 4000) {
      errors.system_prompt = `System prompt maksimal 4000 karakter (saat ini: ${formData.system_prompt.length})`
    }

    // Chat mode specific validation
    if (formData.chat_mode === 'formal') {
      if (!formData.system_prompt.includes('formal') && !formData.system_prompt.includes('akademik')) {
        errors.system_prompt_style = 'System prompt mode formal sebaiknya mencantumkan kata "formal" atau "akademik"'
      }
    } else if (formData.chat_mode === 'casual') {
      if (!formData.system_prompt.includes('gue') && !formData.system_prompt.includes('lo')) {
        errors.system_prompt_style = 'System prompt mode casual sebaiknya menggunakan bahasa Jakarta (gue-lo)'
      }
    }

    setValidationErrors(errors)
  }, [formData])

  const handleFieldChange = (field: keyof CreatePersonaTemplateRequest, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTestPrompt = () => {
    if (formData.system_prompt.length < 50) {
      alert('System prompt harus minimal 50 karakter untuk dapat ditest')
      return
    }
    
    setPreviewMode(true)
    // Send test message
    handleSubmit({ preventDefault: () => {} } as any, {
      data: { testMessage }
    })
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Final validation
    if (Object.keys(validationErrors).some(key => !key.includes('_style'))) {
      alert('Silakan perbaiki kesalahan validasi sebelum menyimpan')
      return
    }

    onSave(formData)
  }

  const isFormValid = Object.keys(validationErrors).every(key => key.includes('_style')) // Only style warnings allowed

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {mode === 'create' ? 'Buat Template Baru' : 'Edit Template'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Template persona untuk {formData.chat_mode === 'formal' ? 'mode formal akademik' : 'mode casual Jakarta'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              previewMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {previewMode ? '📝 Edit' : '👁️ Preview'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nama Template *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Contoh: Academic Research Assistant"
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.name
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
                } dark:bg-gray-700 dark:text-white`}
                disabled={isLoading}
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.name}</p>
              )}
            </div>

            {/* Chat Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chat Mode *
              </label>
              <div className="grid grid-cols-2 gap-4">
                {([{mode: 'formal', label: 'Formal Academic', desc: 'Bahasa Indonesia formal untuk akademik'}, {mode: 'casual', label: 'Casual Jakarta', desc: 'Bahasa Jakarta gue-lo untuk santai'}] as const).map((option) => (
                  <label
                    key={option.mode}
                    className={`cursor-pointer border-2 rounded-lg p-4 text-center transition-all ${
                      formData.chat_mode === option.mode
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="chat_mode"
                      value={option.mode}
                      checked={formData.chat_mode === option.mode}
                      onChange={(e) => handleFieldChange('chat_mode', e.target.value as ChatModeType)}
                      className="sr-only"
                      disabled={isLoading}
                    />
                    <div className="font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{option.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                System Prompt *
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({formData.system_prompt.length}/4000 karakter)
                </span>
              </label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => handleFieldChange('system_prompt', e.target.value)}
                placeholder={formData.chat_mode === 'formal' 
                  ? 'Anda adalah asisten akademik yang menggunakan bahasa Indonesia formal...'
                  : 'Gue adalah temen lo yang suka bantu-bantu soal akademik...'}
                rows={8}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.system_prompt
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
                } dark:bg-gray-700 dark:text-white`}
                disabled={isLoading}
              />
              {validationErrors.system_prompt && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.system_prompt}</p>
              )}
              {validationErrors.system_prompt_style && (
                <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ {validationErrors.system_prompt_style}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deskripsi (Opsional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Deskripsi singkat tentang kegunaan template ini..."
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isLoading}
              />
            </div>

            {/* Default Template */}
            <div className="flex items-center">
              <input
                id="is_default"
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => handleFieldChange('is_default', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                disabled={isLoading}
              />
              <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                Jadikan sebagai template default untuk mode {formData.chat_mode}
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Template default akan digunakan secara otomatis untuk chat mode ini
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleTestPrompt}
                disabled={isLoading || formData.system_prompt.length < 50}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🧪 Test Prompt
              </button>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{mode === 'create' ? 'Buat Template' : 'Update Template'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Preview Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            🔍 Real-time Preview
          </h3>
          
          {!previewMode ? (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Template Summary</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600 dark:text-gray-400">Nama:</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{formData.name || 'Belum diisi'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600 dark:text-gray-400">Mode:</dt>
                    <dd className={`font-medium ${
                      formData.chat_mode === 'formal' 
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>{formData.chat_mode}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600 dark:text-gray-400">Prompt Length:</dt>
                    <dd className={`${formData.system_prompt.length < 50 ? 'text-red-600' : 'text-green-600'}`}>
                      {formData.system_prompt.length} chars
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600 dark:text-gray-400">Status:</dt>
                    <dd className={isFormValid ? 'text-green-600' : 'text-red-600'}>
                      {isFormValid ? '✅ Valid' : '❌ Perlu diperbaiki'}
                    </dd>
                  </div>
                </dl>
              </div>
              
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="text-4xl mb-2">👁️</div>
                <p>Klik "Preview" untuk test real-time dengan AI SDK</p>
                <p className="text-sm mt-2">System prompt harus minimal 50 karakter</p>
              </div>
            </div>
          ) : (
            <TemplatePreviewChat
              systemPrompt={formData.system_prompt}
              chatMode={formData.chat_mode}
              testMessage={testMessage}
              onTestMessageChange={setTestMessage}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function AnalyticsDashboard({ personas }: any) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Analytics Dashboard</h3>
      <p className="text-gray-600 dark:text-gray-400">Akan diimplementasikan di P06.4</p>
    </div>
  )
}

// ============================================
// TEMPLATE PREVIEW CHAT COMPONENT
// ============================================

interface TemplatePreviewChatProps {
  systemPrompt: string
  chatMode: ChatModeType
  testMessage: string
  onTestMessageChange: (message: string) => void
}

function TemplatePreviewChat({ 
  systemPrompt, 
  chatMode, 
  testMessage, 
  onTestMessageChange 
}: TemplatePreviewChatProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: [],
    body: {
      systemPrompt,
      chatMode,
      isTestMode: true
    },
  })

  const sendTestMessage = () => {
    if (!testMessage.trim()) return
    
    handleSubmit({ preventDefault: () => {} } as any, {
      data: { message: testMessage }
    })
  }

  return (
    <div className="space-y-4">
      {/* Test Message Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Test Message
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => onTestMessageChange(e.target.value)}
            placeholder="Masukkan pesan untuk test system prompt..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendTestMessage()
              }
            }}
          />
          <button
            onClick={sendTestMessage}
            disabled={isLoading || !testMessage.trim() || systemPrompt.length < 50}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>

      {/* Chat Preview */}
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg h-80 flex flex-col">
        {/* Chat Header */}
        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Test Chat - {chatMode === 'formal' ? 'Mode Formal' : 'Mode Casual'}
            </span>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {systemPrompt.length < 50 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <div className="text-3xl mb-2">⚠️</div>
              <p>System prompt harus minimal 50 karakter untuk preview</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <div className="text-3xl mb-2">💬</div>
              <p>Kirim pesan test untuk melihat respons AI</p>
              <p className="text-sm mt-2">System prompt: {systemPrompt.slice(0, 100)}...</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}>
                  <div className="text-sm">{message.content}</div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">AI sedang berpikir...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Preview Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">Real-time Preview</p>
            <p className="mt-1">Ini adalah simulasi bagaimana AI akan berperilaku dengan system prompt yang Anda buat. Test beberapa pesan untuk memastikan persona bekerja sesuai harapan.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ImportExportManager is now imported as a separate component

// Export as admin-protected component
export default withAdminComponent(PersonaTemplateManager, {
  requirePermission: 'canViewAnalytics', // Minimum permission to view admin interface
})