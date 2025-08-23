'use client'

import { useChatStore } from '@/store/chat'
import { useSidebarStore } from '@/store/sidebar'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

export function ProjectList() {
  const { 
    projects, 
    currentProject, 
    setCurrentProject, 
    sessions,
    updateProject 
  } = useChatStore()
  const { setSelectedProject } = useSidebarStore()

  const handleProjectClick = (project: any) => {
    setCurrentProject(project)
    setSelectedProject(project.id)
  }

  const getProjectProgress = (project: any) => {
    const progress = (project.currentPhase / 8) * 100
    return Math.round(progress)
  }

  const getProjectConversationCount = (projectId: string) => {
    return sessions.filter(session => session.projectId === projectId).length
  }

  if (projects.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
        <div className="mb-2 text-2xl">📁</div>
        <p className="text-sm">Belum ada proyek</p>
        <p className="text-xs mt-1">
          Buat chat baru dengan opsi "Proyek" untuk memulai
        </p>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="space-y-3">
        {projects
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .map((project) => {
            const conversationCount = getProjectConversationCount(project.id)
            const progress = getProjectProgress(project)
            
            return (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project)}
                className={`group p-4 rounded-lg cursor-pointer transition-colors border ${
                  currentProject?.id === project.id
                    ? 'bg-primary/10 border-primary/20'
                    : 'hover:bg-secondary/70 border-border'
                }`}
              >
                <div className="space-y-3">
                  {/* Project Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate mb-1">
                        {project.title}
                      </h4>
                      
                      <div className="text-xs text-muted-foreground">
                        {project.discipline} • {project.academicLevel}
                      </div>
                    </div>

                    {currentProject?.id === project.id && (
                      <div className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        Aktif
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Fase {project.currentPhase}/8
                      </span>
                      <span className="text-muted-foreground">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Project Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span>{conversationCount}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                        </svg>
                        <span>{project.artifacts.length}</span>
                      </div>

                      {project.totalTokens > 0 && (
                        <div className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                          </svg>
                          <span>{project.totalTokens.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      {formatDistanceToNow(project.updatedAt, { 
                        addSuffix: true, 
                        locale: id 
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {project.description}
                    </div>
                  )}

                  {/* Citation Style Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-accent px-2 py-0.5 rounded">
                        {project.citationStyle}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}