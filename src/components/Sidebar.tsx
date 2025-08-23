'use client'

import { useSidebarStore } from '@/store/sidebar'
import { useChatStore } from '@/store/chat'
import { ChatHistory } from './ChatHistory'
import { ArtifactList } from './ArtifactList'
import { ProjectList } from './ProjectList'
import { useState } from 'react'
import { ChatMode } from '@/types'

// Static chat mode options - moved outside component untuk avoid recreation on every render
const chatModeOptions = [
  {
    id: 'formal-mode',
    mode: 'formal' as ChatMode,
    label: 'Mode Akademik Formal',
    description: 'Paper 8 fase, Bahasa Indonesia formal',
    icon: '🎓'
  },
  {
    id: 'casual-mode',
    mode: 'casual' as ChatMode,
    label: 'Mode Santai Jakarta',
    description: 'Ngobrol bebas akademik, gue-lo style',
    icon: '💬'
  }
]

export function Sidebar() {
  const { isCollapsed, setCollapsed } = useSidebarStore()
  const { currentProject, createSession, setCurrentChatMode } = useChatStore()
  
  // Accordion panel states - all closed by default
  const [expandedPanels, setExpandedPanels] = useState({
    newChat: false,
    projects: false,
    history: false,
    artifacts: false,
  })

  const togglePanel = (panel: keyof typeof expandedPanels) => {
    setExpandedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }))
  }

  const handleChatCreate = (mode: ChatMode) => {
    setCurrentChatMode(mode)
    createSession(false, undefined, mode)
  }


  // CollapsedButton component untuk eliminate code duplication
  const CollapsedButton = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <button
      onClick={() => setCollapsed(false)}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-sm"
      title={title}
    >
      {children}
    </button>
  )

  if (isCollapsed) {
    return (
      <div className="w-12 min-h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col items-center py-4 space-y-3 shadow-sm">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Buka Sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        
        
        <CollapsedButton title="Chat Baru">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <circle cx="9" cy="9" r="1"/>
            <circle cx="15" cy="9" r="1"/>
            <circle cx="12" cy="13" r="1"/>
          </svg>
        </CollapsedButton>
        
        <CollapsedButton title="Proyek">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </CollapsedButton>
        
        <CollapsedButton title="Riwayat Chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        </CollapsedButton>
        
        <CollapsedButton title="Daftar Artefak">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <line x1="10" y1="9" x2="8" y2="9"/>
          </svg>
        </CollapsedButton>
      </div>
    )
  }

  const AccordionPanel = ({ 
    title, 
    isExpanded, 
    onToggle, 
    children 
  }: {
    title: string
    isExpanded: boolean
    onToggle: () => void
    children: React.ReactNode
  }) => (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className={`text-slate-400 transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`}
        >
          <path d="m9 18 6-6-6-6"/>
        </svg>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</span>
      </button>
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  )

  return (
    <div className="w-80 min-h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-sm">
      {/* Sidebar Header */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-end">
          <button
            onClick={() => setCollapsed(true)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            title="Tutup Sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 19l-7-7 7-7M21 19l-7-7 7-7"/>
            </svg>
          </button>
        </div>
        
        
        {/* Project Context */}
        {currentProject && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400">Proyek Aktif:</p>
            <p className="text-sm font-medium truncate mt-1">{currentProject.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Fase {currentProject.currentPhase}/8 - {currentProject.discipline}
            </p>
          </div>
        )}
      </div>

      {/* Accordion Panels */}
      <div className="flex-1 overflow-y-auto">

        {/* New Chat Panel */}
        <AccordionPanel
          title="Chat Baru"
          isExpanded={expandedPanels.newChat}
          onToggle={() => togglePanel('newChat')}
        >
          <div className="p-3 space-y-2">
            {chatModeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleChatCreate(option.mode)}
                className="w-full p-2 text-left rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{option.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {option.label}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {option.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </AccordionPanel>

        {/* Proyek Panel */}
        <AccordionPanel
          title="Proyek"
          isExpanded={expandedPanels.projects}
          onToggle={() => togglePanel('projects')}
        >
          <ProjectList />
        </AccordionPanel>

        {/* Riwayat Chat Panel */}
        <AccordionPanel
          title="Riwayat Chat"
          isExpanded={expandedPanels.history}
          onToggle={() => togglePanel('history')}
        >
          <ChatHistory />
        </AccordionPanel>

        {/* Daftar Artefak Panel */}
        <AccordionPanel
          title="Daftar Artefak"
          isExpanded={expandedPanels.artifacts}
          onToggle={() => togglePanel('artifacts')}
        >
          <ArtifactList />
        </AccordionPanel>
      </div>

    </div>
  )
}