'use client'

// ============================================
// MAKALAH AI: Persona Admin Management Interface
// ============================================
// Task 02 Implementation: Database-Driven Academic Persona System  
// Created: August 2025
// Features: Full CRUD interface for persona management

import React, { useState, useEffect, useCallback } from 'react'
import type { 
  PersonaTemplate, 
  PersonaMode, 
  CreatePersonaRequest, 
  PersonaTestResult,
  DisciplineCategory,
  PersonaConfiguration,
  AcademicLevel,
  CitationStyle 
} from '@/types/persona'
import { personaService } from '@/lib/persona-service'

// ============================================
// ADMIN INTERFACE MAIN COMPONENT
// ============================================

export default function PersonaAdmin() {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'test' | 'analytics'>('list')
  const [personas, setPersonas] = useState<PersonaTemplate[]>([])
  const [disciplines, setDisciplines] = useState<DisciplineCategory[]>([])
  const [selectedPersona, setSelectedPersona] = useState<PersonaTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<PersonaTestResult | null>(null)

  // Load initial data
  useEffect(() => {
    loadPersonas()
    loadDisciplines()
  }, [])

  const loadPersonas = async () => {
    try {
      setIsLoading(true)
      const response = await personaService.getPersonas(undefined, undefined, false)
      setPersonas(response.personas)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load personas')
    } finally {
      setIsLoading(false)
    }
  }

  const loadDisciplines = async () => {
    try {
      const disciplines = await personaService.getDisciplines()
      setDisciplines(disciplines)
    } catch (err) {
      console.error('Failed to load disciplines:', err)
    }
  }

  const handleDeletePersona = async (personaId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus persona ini?')) return

    try {
      setIsLoading(true)
      await personaService.deletePersona(personaId)
      await loadPersonas()
      if (selectedPersona?.id === personaId) {
        setSelectedPersona(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete persona')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (persona: PersonaTemplate) => {
    try {
      setIsLoading(true)
      await personaService.updatePersona({
        id: persona.id,
        is_active: !persona.is_active
      })
      await loadPersonas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle persona status')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Persona Management System
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Kelola persona akademik untuk sistem AI yang responsif dan context-aware
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
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
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'list', name: 'Daftar Persona', icon: '📋' },
            { id: 'create', name: 'Buat Persona', icon: '➕' },
            { id: 'test', name: 'Test Persona', icon: '🧪' },
            { id: 'analytics', name: 'Analytics', icon: '📊' }
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
      <div className="min-h-96">
        {activeTab === 'list' && (
          <PersonaList
            personas={personas}
            disciplines={disciplines}
            selectedPersona={selectedPersona}
            onSelectPersona={setSelectedPersona}
            onDeletePersona={handleDeletePersona}
            onToggleActive={handleToggleActive}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'create' && (
          <PersonaForm
            disciplines={disciplines}
            selectedPersona={selectedPersona}
            onSave={async (personaData) => {
              try {
                setIsLoading(true)
                if (selectedPersona) {
                  await personaService.updatePersona({
                    ...personaData,
                    id: selectedPersona.id
                  })
                } else {
                  await personaService.createPersona(personaData)
                }
                await loadPersonas()
                setSelectedPersona(null)
                setActiveTab('list')
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to save persona')
              } finally {
                setIsLoading(false)
              }
            }}
            onCancel={() => {
              setSelectedPersona(null)
              setActiveTab('list')
            }}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'test' && (
          <PersonaTest
            personas={personas}
            onTest={async (personaId, testQuery) => {
              try {
                setIsLoading(true)
                const result = await personaService.testPersona(personaId, testQuery)
                setTestResult(result)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to test persona')
              } finally {
                setIsLoading(false)
              }
            }}
            testResult={testResult}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'analytics' && (
          <PersonaAnalytics
            personas={personas}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}

// ============================================
// PERSONA LIST COMPONENT
// ============================================

interface PersonaListProps {
  personas: PersonaTemplate[]
  disciplines: DisciplineCategory[]
  selectedPersona: PersonaTemplate | null
  onSelectPersona: (persona: PersonaTemplate | null) => void
  onDeletePersona: (personaId: string) => void
  onToggleActive: (persona: PersonaTemplate) => void
  isLoading: boolean
}

function PersonaList({ 
  personas, 
  disciplines, 
  selectedPersona, 
  onSelectPersona, 
  onDeletePersona, 
  onToggleActive, 
  isLoading 
}: PersonaListProps) {
  const [filterMode, setFilterMode] = useState<PersonaMode | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const filteredPersonas = personas.filter(persona => {
    if (filterMode !== 'all' && persona.mode !== filterMode) return false
    if (filterStatus === 'active' && !persona.is_active) return false
    if (filterStatus === 'inactive' && persona.is_active) return false
    return true
  })

  const getDisciplineName = (disciplineId: string | null) => {
    if (!disciplineId) return 'Umum'
    const discipline = disciplines.find(d => d.id === disciplineId)
    return discipline?.name || 'Unknown'
  }

  const getModeColor = (mode: PersonaMode) => {
    switch (mode) {
      case 'Research': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'Writing': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'Review': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mode
            </label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as PersonaMode | 'all')}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">Semua Mode</option>
              <option value="Research">Research</option>
              <option value="Writing">Writing</option>
              <option value="Review">Review</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          <div className="flex-1"></div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            {filteredPersonas.length} dari {personas.length} persona
          </div>
        </div>
      </div>

      {/* Persona List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading personas...</p>
          </div>
        ) : filteredPersonas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Tidak ada persona yang ditemukan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPersonas.map((persona) => (
              <div
                key={persona.id}
                className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  selectedPersona?.id === persona.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                        {persona.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getModeColor(persona.mode)}`}>
                        {persona.mode}
                      </span>
                      {persona.is_default && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                          Default
                        </span>
                      )}
                      {!persona.is_active && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300">
                          Nonaktif
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {persona.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Disiplin: {getDisciplineName(persona.discipline_id)}</span>
                      <span>Level: {persona.academic_level}</span>
                      <span>Citation: {persona.citation_style}</span>
                      <span>Usage: {persona.usage_count}x</span>
                      <span>Success: {persona.success_rate}%</span>
                    </div>
                  </div>

                  <div className="ml-4 flex items-center space-x-2">
                    <button
                      onClick={() => onSelectPersona(persona)}
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
                      {persona.is_active ? 'Deaktivasi' : 'Aktivasi'}
                    </button>
                    <button
                      onClick={() => onDeletePersona(persona.id)}
                      className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// PERSONA FORM COMPONENT
// ============================================

interface PersonaFormProps {
  disciplines: DisciplineCategory[]
  selectedPersona: PersonaTemplate | null
  onSave: (data: CreatePersonaRequest) => void
  onCancel: () => void
  isLoading: boolean
}

function PersonaForm({ disciplines, selectedPersona, onSave, onCancel, isLoading }: PersonaFormProps) {
  const [formData, setFormData] = useState<CreatePersonaRequest>({
    name: '',
    mode: 'Research',
    system_prompt: '',
    description: '',
    discipline_id: '',
    academic_level: 'graduate',
    citation_style: 'APA',
    configuration: {
      temperature: 0.1,
      max_tokens: 2000,
      tools_enabled: ['web_search', 'artifact_store', 'cite_manager']
    }
  })

  // Populate form when editing existing persona
  useEffect(() => {
    if (selectedPersona) {
      setFormData({
        name: selectedPersona.name,
        mode: selectedPersona.mode,
        system_prompt: selectedPersona.system_prompt,
        description: selectedPersona.description || '',
        discipline_id: selectedPersona.discipline_id || '',
        academic_level: selectedPersona.academic_level,
        citation_style: selectedPersona.citation_style,
        configuration: selectedPersona.configuration
      })
    }
  }, [selectedPersona])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleConfigurationChange = (key: keyof PersonaConfiguration, value: any) => {
    setFormData(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        [key]: value
      }
    }))
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {selectedPersona ? 'Edit Persona' : 'Buat Persona Baru'}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Konfigurasi persona akademik dengan system prompt dan parameter yang tepat
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nama Persona *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Academic Researcher"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mode *
              </label>
              <select
                required
                value={formData.mode}
                onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value as PersonaMode }))}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="Research">Research</option>
                <option value="Writing">Writing</option>
                <option value="Review">Review</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Disiplin Ilmu
              </label>
              <select
                value={formData.discipline_id}
                onChange={(e) => setFormData(prev => ({ ...prev, discipline_id: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Umum</option>
                {disciplines.map(discipline => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Academic Level
              </label>
              <select
                value={formData.academic_level}
                onChange={(e) => setFormData(prev => ({ ...prev, academic_level: e.target.value as AcademicLevel }))}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="undergraduate">Undergraduate</option>
                <option value="graduate">Graduate</option>
                <option value="postgraduate">Postgraduate</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Deskripsi
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Deskripsi singkat tentang persona ini..."
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              System Prompt *
            </label>
            <textarea
              required
              value={formData.system_prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
              rows={12}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
              placeholder="Masukkan system prompt yang detail untuk persona ini..."
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              System prompt akan menentukan bagaimana AI berperilaku dalam mode ini
            </p>
          </div>

          {/* Configuration */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Konfigurasi Advanced
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperature
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.configuration?.temperature || 0.1}
                  onChange={(e) => handleConfigurationChange('temperature', parseFloat(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="100"
                  max="4000"
                  step="100"
                  value={formData.configuration?.max_tokens || 2000}
                  onChange={(e) => handleConfigurationChange('max_tokens', parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Citation Style
                </label>
                <select
                  value={formData.citation_style}
                  onChange={(e) => setFormData(prev => ({ ...prev, citation_style: e.target.value as CitationStyle }))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="APA">APA</option>
                  <option value="MLA">MLA</option>
                  <option value="Chicago">Chicago</option>
                  <option value="IEEE">IEEE</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Menyimpan...' : selectedPersona ? 'Update Persona' : 'Buat Persona'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================
// PERSONA TEST COMPONENT
// ============================================

interface PersonaTestProps {
  personas: PersonaTemplate[]
  onTest: (personaId: string, testQuery: string) => void
  testResult: PersonaTestResult | null
  isLoading: boolean
}

function PersonaTest({ personas, onTest, testResult, isLoading }: PersonaTestProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState('')
  const [testQuery, setTestQuery] = useState('')

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPersonaId && testQuery.trim()) {
      onTest(selectedPersonaId, testQuery.trim())
    }
  }

  const selectedPersona = personas.find(p => p.id === selectedPersonaId)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Test Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Test Persona Response
        </h2>

        <form onSubmit={handleTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pilih Persona
            </label>
            <select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="">Pilih persona untuk ditest...</option>
              {personas.filter(p => p.is_active).map(persona => (
                <option key={persona.id} value={persona.id}>
                  {persona.name} ({persona.mode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Test Query
            </label>
            <textarea
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Masukkan pertanyaan atau task untuk ditest pada persona..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !selectedPersonaId || !testQuery.trim()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Testing persona...
              </div>
            ) : (
              'Test Persona'
            )}
          </button>
        </form>
      </div>

      {/* Persona Details */}
      {selectedPersona && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Persona Details: {selectedPersona.name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-500 dark:text-gray-400">Mode:</span>
              <p className="text-gray-900 dark:text-gray-100">{selectedPersona.mode}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500 dark:text-gray-400">Usage:</span>
              <p className="text-gray-900 dark:text-gray-100">{selectedPersona.usage_count}x</p>
            </div>
            <div>
              <span className="font-medium text-gray-500 dark:text-gray-400">Success Rate:</span>
              <p className="text-gray-900 dark:text-gray-100">{selectedPersona.success_rate}%</p>
            </div>
            <div>
              <span className="font-medium text-gray-500 dark:text-gray-400">Avg Response Time:</span>
              <p className="text-gray-900 dark:text-gray-100">{selectedPersona.avg_response_time}ms</p>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResult && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Test Results
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-500 dark:text-gray-400">Response Time:</span>
                <p className="text-gray-900 dark:text-gray-100">{testResult.response_time}ms</p>
              </div>
              <div>
                <span className="font-medium text-gray-500 dark:text-gray-400">Quality Score:</span>
                <p className="text-gray-900 dark:text-gray-100">{testResult.quality_score}/5.0</p>
              </div>
              <div>
                <span className="font-medium text-gray-500 dark:text-gray-400">Mode Adherence:</span>
                <p className={testResult.mode_adherence ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {testResult.mode_adherence ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-500 dark:text-gray-400">Style Compliance:</span>
                <p className={testResult.style_compliance ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {testResult.style_compliance ? 'Yes' : 'No'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Test Query:</h4>
              <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded border italic">
                "{testResult.test_query}"
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">AI Response:</h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded border">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {testResult.response}
                </p>
              </div>
            </div>

            {testResult.tool_usage.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Tools Used:</h4>
                <div className="flex flex-wrap gap-2">
                  {testResult.tool_usage.map((tool, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// PERSONA ANALYTICS COMPONENT  
// ============================================

interface PersonaAnalyticsProps {
  personas: PersonaTemplate[]
  isLoading: boolean
}

function PersonaAnalytics({ personas, isLoading }: PersonaAnalyticsProps) {
  // Calculate basic analytics
  const totalPersonas = personas.length
  const activePersonas = personas.filter(p => p.is_active).length
  const totalUsage = personas.reduce((sum, p) => sum + p.usage_count, 0)
  const avgSuccessRate = personas.length > 0 
    ? personas.reduce((sum, p) => sum + p.success_rate, 0) / personas.length 
    : 0

  const modeDistribution = personas.reduce((acc, p) => {
    acc[p.mode] = (acc[p.mode] || 0) + 1
    return acc
  }, {} as Record<PersonaMode, number>)

  const topPerformers = personas
    .filter(p => p.usage_count > 0)
    .sort((a, b) => b.success_rate - a.success_rate)
    .slice(0, 5)

  const mostUsed = personas
    .filter(p => p.usage_count > 0)
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 5)

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Total Personas</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalPersonas}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{activePersonas} aktif</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Total Usage</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalUsage}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">total executions</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Avg Success Rate</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{avgSuccessRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">across all personas</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Mode Distribution</h3>
          <div className="space-y-1 text-sm">
            {Object.entries(modeDistribution).map(([mode, count]) => (
              <div key={mode} className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{mode}:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers and Most Used */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Top Performers (Success Rate)
          </h3>
          {topPerformers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No usage data available</p>
          ) : (
            <div className="space-y-3">
              {topPerformers.map((persona, index) => (
                <div key={persona.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{persona.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{persona.mode}</p>
                    </div>
                  </div>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {persona.success_rate}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Most Used Personas
          </h3>
          {mostUsed.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No usage data available</p>
          ) : (
            <div className="space-y-3">
              {mostUsed.map((persona, index) => (
                <div key={persona.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{persona.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{persona.mode}</p>
                    </div>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {persona.usage_count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Personas Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Detailed Performance Metrics
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Persona
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {personas.map((persona) => (
                <tr key={persona.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {persona.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        v{persona.version}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      persona.mode === 'Research' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                        : persona.mode === 'Writing'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                    }`}>
                      {persona.mode}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {persona.usage_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {persona.success_rate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {persona.avg_response_time}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      persona.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                    }`}>
                      {persona.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}