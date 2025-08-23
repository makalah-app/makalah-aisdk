'use client'

import { useChatStore } from '@/store/chat'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import { useState } from 'react'

interface ArtifactListProps {
  onArtifactClick?: (artifactId: string) => void
}

export function ArtifactList({ onArtifactClick }: ArtifactListProps) {
  const { artifacts, currentProject } = useChatStore()
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null)

  // Filter artifacts based on current project and selected phase
  const filteredArtifacts = artifacts.filter(artifact => {
    const phaseMatch = selectedPhase === null || artifact.phase === selectedPhase
    
    if (currentProject) {
      // In project context, show artifacts related to the project
      // For now, we'll show all artifacts since we don't have project-artifact relationships yet
      return phaseMatch
    }
    
    return phaseMatch
  })

  // Group artifacts by phase
  const artifactsByPhase = filteredArtifacts.reduce((acc, artifact) => {
    const phase = artifact.phase
    if (!acc[phase]) {
      acc[phase] = []
    }
    acc[phase].push(artifact)
    return acc
  }, {} as Record<number, typeof artifacts>)

  const phases = [
    { number: 1, name: 'Klarifikasi Topik' },
    { number: 2, name: 'Riset Dasar' },
    { number: 3, name: 'Perencanaan Struktur' },
    { number: 4, name: 'Pembuatan Konten' },
    { number: 5, name: 'Integrasi Dokumen' },
    { number: 6, name: 'Poles Akhir' },
    { number: 7, name: 'Review Kualitas' },
    { number: 8, name: 'Penyerahan' },
  ]

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'markdown': return '📝'
      case 'code': return '💻'
      case 'text': return '📄'
      default: return '📄'
    }
  }

  const handleArtifactClick = (artifactId: string) => {
    if (onArtifactClick) {
      onArtifactClick(artifactId)
    }
  }

  if (artifacts.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
        <div className="mb-2 text-2xl">📄</div>
        <p className="text-sm">Belum ada artefak tersimpan</p>
        <p className="text-xs mt-1">
          Artefak akan muncul saat AI menyimpan dokumen
        </p>
      </div>
    )
  }

  return (
    <div className="p-3">
      {/* Phase Filter */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedPhase(null)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedPhase === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            Semua
          </button>
          {phases.map((phase) => {
            const count = artifactsByPhase[phase.number]?.length || 0
            return (
              <button
                key={phase.number}
                onClick={() => setSelectedPhase(phase.number)}
                disabled={count === 0}
                className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  selectedPhase === phase.number
                    ? 'bg-primary text-primary-foreground'
                    : count > 0
                    ? 'bg-secondary hover:bg-secondary/80'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                <span className="font-medium">{phase.number}</span>
                {count > 0 && (
                  <span className="bg-primary/20 text-primary px-1 rounded-full text-xs min-w-[16px] text-center">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Artifacts List */}
      <div className="space-y-3">
        {Object.entries(artifactsByPhase)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([phaseNum, phaseArtifacts]) => (
            <div key={phaseNum}>
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground font-medium">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                  Fase {phaseNum}
                </span>
                <span>{phases.find(p => p.number === Number(phaseNum))?.name}</span>
              </div>
              
              <div className="space-y-1">
                {phaseArtifacts
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((artifact) => (
                    <div
                      key={artifact.id}
                      onClick={() => handleArtifactClick(artifact.id)}
                      className="group p-3 rounded-lg cursor-pointer transition-colors hover:bg-secondary/70 border border-transparent hover:border-border"
                    >
                      <div className="flex items-start gap-3">
                        {/* Artifact Icon */}
                        <div className="text-lg mt-0.5">
                          {getArtifactIcon(artifact.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate mb-1">
                            {artifact.title}
                          </h4>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span className="bg-secondary px-1.5 py-0.5 rounded">
                              {artifact.type}
                            </span>
                            <span>
                              {formatDistanceToNow(artifact.createdAt, { 
                                addSuffix: true, 
                                locale: id 
                              })}
                            </span>
                          </div>
                          
                          {artifact.wordCount && (
                            <div className="text-xs text-muted-foreground mb-2">
                              {artifact.wordCount.toLocaleString()} kata
                            </div>
                          )}
                          
                          {artifact.metadata && (
                            <div className="flex flex-wrap gap-1">
                              {artifact.metadata.discipline && (
                                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                  {artifact.metadata.discipline}
                                </span>
                              )}
                              {artifact.metadata.academicLevel && (
                                <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                                  {artifact.metadata.academicLevel}
                                </span>
                              )}
                              {artifact.metadata.citationStyle && (
                                <span className="text-xs bg-accent px-1.5 py-0.5 rounded">
                                  {artifact.metadata.citationStyle}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Content Preview */}
                          <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {artifact.content.substring(0, 100)}
                            {artifact.content.length > 100 && '...'}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArtifactClick(artifact.id)
                            }}
                            className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                            title="Buka artefak"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}