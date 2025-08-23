'use client'

import { useState } from 'react'
import { ChatMode, ChatModeSelection, Project } from '@/types'
import { useChatStore } from '@/store/chat'
import { useSidebarStore } from '@/store/sidebar'

interface JenisChatSelectorProps {
  isOpen: boolean
  onClose: () => void
  onChatCreate: (config: ChatCreationConfig) => void
}

interface ChatCreationConfig {
  mode: ChatMode
  chatType: 'conversation' | 'project'
  projectId?: string
  newProject?: {
    title: string
    description: string
    discipline: string
    academicLevel: 'undergraduate' | 'graduate' | 'postgraduate'
    citationStyle: 'APA' | 'MLA' | 'Chicago' | 'IEEE'
  }
}

// 🚀 DUAL MODE DEFINITIONS - P01 PERSONA REVISION
const AVAILABLE_MODES: ChatModeSelection[] = [
  {
    mode: 'formal',
    displayName: 'Mode Akademik Formal',
    description: 'Untuk pembuatan makalah, thesis, atau penelitian dengan workflow 8-fase. Mendukung sitasi otomatis, manajemen referensi, dan structured academic writing process.',
    icon: '🎓',
    language: 'formal',
    workflow: 'academic-8-phase'
  },
  {
    mode: 'casual',
    displayName: 'Mode Percakapan Santai',
    description: 'Gaya bahasa gue-lo Jakarta untuk diskusi bebas, brainstorming, atau tanya-jawab umum. Tidak terikat workflow akademik.',
    icon: '💬',
    language: 'jakarta-gue-lo',
    workflow: 'free-conversation'
  }
]

type Step = 'mode-selection' | 'chat-type' | 'project-config'

export function JenisChatSelector({ isOpen, onClose, onChatCreate }: JenisChatSelectorProps) {
  const { projects, createSession, createProject, setCurrentProject, setCurrentChatMode } = useChatStore()
  const { setSelectedProject } = useSidebarStore()
  
  const [currentStep, setCurrentStep] = useState<Step>('mode-selection')
  const [selectedMode, setSelectedMode] = useState<ChatMode | null>(null)
  const [chatType, setChatType] = useState<'conversation' | 'project'>('conversation')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    discipline: '',
    academicLevel: 'undergraduate' as const,
    citationStyle: 'APA' as const,
  })
  const [hoveredMode, setHoveredMode] = useState<ChatMode | null>(null)

  if (!isOpen) return null

  const handleModeSelect = (mode: ChatMode) => {
    setSelectedMode(mode)
    setCurrentStep('chat-type')
  }

  const handleChatTypeSelect = (type: 'conversation' | 'project') => {
    setChatType(type)
    if (type === 'conversation') {
      handleCreateChat()
    } else {
      setCurrentStep('project-config')
    }
  }

  const handleCreateChat = () => {
    if (!selectedMode) return

    setCurrentChatMode(selectedMode)

    if (chatType === 'conversation') {
      const sessionId = createSession(false, undefined, selectedMode)
      onClose()
      resetForm()
    } else {
      if (selectedProjectId) {
        const project = projects.find(p => p.id === selectedProjectId)
        if (project) {
          const sessionId = createSession(true, selectedProjectId, selectedMode)
          setCurrentProject(project)
          setSelectedProject(selectedProjectId)
          onClose()
          resetForm()
        }
      } else if (newProject.title && newProject.discipline) {
        const projectId = createProject({
          ...newProject,
          currentPhase: 1,
        })
        const sessionId = createSession(true, projectId, selectedMode)
        setSelectedProject(projectId)
        onClose()
        resetForm()
      }
    }
  }

  const resetForm = () => {
    setCurrentStep('mode-selection')
    setSelectedMode(null)
    setChatType('conversation')
    setSelectedProjectId('')
    setNewProject({
      title: '',
      description: '',
      discipline: '',
      academicLevel: 'undergraduate',
      citationStyle: 'APA',
    })
  }

  const handleBack = () => {
    if (currentStep === 'chat-type') {
      setCurrentStep('mode-selection')
    } else if (currentStep === 'project-config') {
      setCurrentStep('chat-type')
    }
  }

  const canProceedWithProject = selectedProjectId || (newProject.title && newProject.discipline)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 modal-backdrop">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 w-[640px] max-w-[90vw] max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {currentStep === 'mode-selection' ? '💬' : currentStep === 'chat-type' ? '📋' : '📁'}
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">
                {currentStep === 'mode-selection' && 'Pilih Mode Chat'}
                {currentStep === 'chat-type' && 'Pilih Jenis Chat'}  
                {currentStep === 'project-config' && 'Konfigurasi Proyek'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentStep === 'mode-selection' && 'Tentukan mode percakapan yang sesuai dengan kebutuhan lo'}
                {currentStep === 'chat-type' && `Mode ${selectedMode === 'formal' ? 'Akademik Formal' : 'Percakapan Santai'} dipilih`}
                {currentStep === 'project-config' && 'Pilih proyek existing atau buat yang baru'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => { onClose(); resetForm(); }}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:rotate-90"
            aria-label="Tutup dialog"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Step 1: Mode Selection */}
        {currentStep === 'mode-selection' && (
          <div className="space-y-4">
            {AVAILABLE_MODES.map((modeOption) => {
              const isSelected = selectedMode === modeOption.mode
              const isHovered = hoveredMode === modeOption.mode
              
              return (
                <button
                  key={modeOption.mode}
                  onClick={() => handleModeSelect(modeOption.mode)}
                  onMouseEnter={() => setHoveredMode(modeOption.mode)}
                  onMouseLeave={() => setHoveredMode(null)}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all duration-300 transform ${
                    isSelected
                      ? 'border-blue-600 bg-gradient-to-r from-blue-50 to-blue-100/70 dark:from-blue-900/30 dark:to-blue-900/10 shadow-lg scale-[1.02]'
                      : isHovered
                      ? 'border-blue-300 dark:border-blue-600 bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-900/10 shadow-md scale-[1.01]'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0">
                      {modeOption.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-base">
                          {modeOption.displayName}
                        </h4>
                        
                        <div className="flex gap-1">
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {modeOption.language === 'formal' ? 'Formal' : 'Gue-Lo'}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {modeOption.workflow === 'academic-8-phase' ? '8-Fase' : 'Bebas'}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {modeOption.description}
                      </p>
                      
                      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        {modeOption.mode === 'formal' ? (
                          <div className="flex flex-wrap gap-2">
                            <span>• Sitasi otomatis</span>
                            <span>• Manajemen referensi</span>
                            <span>• Workflow terstruktur</span>
                            <span>• Academic compliance</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <span>• Bahasa santai</span>
                            <span>• Diskusi bebas</span>
                            <span>• Brainstorming</span>
                            <span>• Tanya-jawab umum</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2: Chat Type Selection */}
        {currentStep === 'chat-type' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleChatTypeSelect('conversation')}
                className="p-4 rounded-xl border-2 text-center transition-all duration-200 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <div className="text-3xl mb-2">💬</div>
                <h4 className="font-semibold mb-1">Percakapan Bebas</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chat langsung tanpa proyek
                </p>
              </button>
              
              <button
                onClick={() => handleChatTypeSelect('project')}
                className="p-4 rounded-xl border-2 text-center transition-all duration-200 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <div className="text-3xl mb-2">📁</div>
                <h4 className="font-semibold mb-1">Proyek Akademik</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chat dalam konteks proyek terstruktur
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Project Configuration */}
        {currentStep === 'project-config' && (
          <div className="space-y-4">
            {projects.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Pilih Proyek Existing:</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value="">-- Buat Proyek Baru --</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title} ({project.discipline})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!selectedProjectId && (
              <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <h4 className="font-medium">Buat Proyek Baru:</h4>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Judul Proyek:</label>
                  <input
                    type="text"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    placeholder="Contoh: Analisis Dampak AI terhadap Pendidikan"
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Disiplin Ilmu:</label>
                  <input
                    type="text"
                    value={newProject.discipline}
                    onChange={(e) => setNewProject({ ...newProject, discipline: e.target.value })}
                    placeholder="Contoh: Teknologi Pendidikan"
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tingkat:</label>
                    <select
                      value={newProject.academicLevel}
                      onChange={(e) => setNewProject({ ...newProject, academicLevel: e.target.value as any })}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    >
                      <option value="undergraduate">Sarjana</option>
                      <option value="graduate">Magister</option>
                      <option value="postgraduate">Doktor</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Gaya Sitasi:</label>
                    <select
                      value={newProject.citationStyle}
                      onChange={(e) => setNewProject({ ...newProject, citationStyle: e.target.value as any })}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    >
                      <option value="APA">APA</option>
                      <option value="MLA">MLA</option>
                      <option value="Chicago">Chicago</option>
                      <option value="IEEE">IEEE</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          {currentStep !== 'mode-selection' && (
            <button
              onClick={handleBack}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ← Kembali
            </button>
          )}
          
          <button
            onClick={() => { onClose(); resetForm(); }}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          
          {currentStep === 'project-config' && (
            <button
              onClick={handleCreateChat}
              disabled={!canProceedWithProject}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buat Chat
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export { AVAILABLE_MODES }