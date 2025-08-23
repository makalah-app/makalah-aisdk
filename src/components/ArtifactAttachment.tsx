'use client'

import { ArtifactAttachment as ArtifactType } from '@/types'
import { useState } from 'react'
import { ArtifactPopup } from './ArtifactPopup'

interface ArtifactAttachmentProps {
  artifact: ArtifactType
  onClick?: () => void
}

export function ArtifactAttachment({ artifact, onClick }: ArtifactAttachmentProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'markdown': return '📝'
      case 'code': return '💻'
      case 'text': return '📄'
      default: return '📄'
    }
  }

  const getPhaseColor = (phase: number) => {
    const colors = [
      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',        // Phase 1
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', // Phase 2
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', // Phase 3
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',     // Phase 4
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',         // Phase 5
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200', // Phase 6
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', // Phase 7
      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',         // Phase 8
    ]
    return colors[phase - 1] || colors[0]
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      setIsPopupOpen(true)
    }
  }

  return (
    <>
      <div 
        onClick={handleClick}
        className="artifact-attachment group"
      >
        {/* Paper Icon */}
        <div className="flex items-center gap-2">
          <div className="text-lg group-hover:scale-110 transition-transform">
            {getArtifactIcon(artifact.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">
                {artifact.title}
              </span>
              
              {/* Phase Badge */}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPhaseColor(artifact.phase)}`}>
                Fase {artifact.phase}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="bg-secondary px-1.5 py-0.5 rounded">
                {artifact.type}
              </span>
              
              {artifact.wordCount && (
                <span>{artifact.wordCount.toLocaleString()} kata</span>
              )}
              
              <span>
                {new Date(artifact.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
          
          {/* View Icon */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
        </div>
        
        {/* Metadata Tags */}
        {artifact.metadata && (
          <div className="flex flex-wrap gap-1 mt-2">
            {artifact.metadata.discipline && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
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
      </div>

      {/* Artifact Popup */}
      <ArtifactPopup
        artifact={artifact}
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
      />
    </>
  )
}