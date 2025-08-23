'use client'

import { ArtifactAttachment } from '@/types'
import { useState, useEffect } from 'react'
import { useChatStore } from '@/store/chat'
import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'

interface ArtifactPopupProps {
  artifact: ArtifactAttachment
  isOpen: boolean
  onClose: () => void
}

export function ArtifactPopup({ artifact, isOpen, onClose }: ArtifactPopupProps) {
  const { artifacts } = useChatStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  // Find current artifact index in the artifacts array
  useEffect(() => {
    const index = artifacts.findIndex(a => a.id === artifact.id)
    setCurrentIndex(index >= 0 ? index : 0)
  }, [artifact.id, artifacts])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          navigateToPrevious()
          break
        case 'ArrowRight':
          navigateToNext()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex])

  // Prevent body scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const navigateToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const navigateToNext = () => {
    if (currentIndex < artifacts.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const downloadArtifact = async (format: 'txt' | 'md' | 'pdf' | 'docx') => {
    const currentArtifact = artifacts[currentIndex] || artifact
    const content = currentArtifact.content
    const title = currentArtifact.title
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_')
    
    try {
      switch (format) {
        case 'txt':
          {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
            saveAs(blob, `${sanitizedTitle}.txt`)
          }
          break
          
        case 'md':
          {
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
            saveAs(blob, `${sanitizedTitle}.md`)
          }
          break
          
        case 'pdf':
          {
            const pdf = new jsPDF('p', 'mm', 'a4')
            
            // Set font (use built-in font that supports UTF-8)
            pdf.setFont('helvetica')
            pdf.setFontSize(12)
            
            // Add title
            pdf.setFontSize(16)
            pdf.text(title, 20, 20)
            
            // Add metadata
            pdf.setFontSize(10)
            let yPos = 35
            if (currentArtifact.metadata?.discipline) {
              pdf.text(`Disiplin: ${currentArtifact.metadata.discipline}`, 20, yPos)
              yPos += 7
            }
            if (currentArtifact.metadata?.academicLevel) {
              pdf.text(`Tingkat: ${currentArtifact.metadata.academicLevel}`, 20, yPos)
              yPos += 7
            }
            pdf.text(`Fase: ${currentArtifact.phase}`, 20, yPos)
            pdf.text(`Dibuat: ${new Date(currentArtifact.createdAt).toLocaleDateString('id-ID')}`, 120, yPos)
            yPos += 15
            
            // Add content
            pdf.setFontSize(11)
            const lines = content.split('\n')
            const maxWidth = 170
            
            for (const line of lines) {
              if (yPos > 270) {
                pdf.addPage()
                yPos = 20
              }
              
              if (line.trim() === '') {
                yPos += 5
                continue
              }
              
              const wrappedLines = pdf.splitTextToSize(line, maxWidth)
              
              for (const wrappedLine of wrappedLines) {
                if (yPos > 270) {
                  pdf.addPage()
                  yPos = 20
                }
                pdf.text(wrappedLine, 20, yPos)
                yPos += 6
              }
            }
            
            pdf.save(`${sanitizedTitle}.pdf`)
          }
          break
          
        case 'docx':
          {
            // Split content into paragraphs
            const paragraphs = content.split('\n').map(line => {
              if (line.trim() === '') {
                return new Paragraph({
                  children: [new TextRun({ text: '', break: 1 })],
                })
              }
              
              // Check if it's a heading (starts with #)
              const isHeading = line.startsWith('#')
              const text = isHeading ? line.replace(/^#+\s*/, '') : line
              
              return new Paragraph({
                children: [
                  new TextRun({
                    text: text,
                    bold: isHeading,
                    size: isHeading ? 28 : 24, // 14pt for heading, 12pt for normal
                  }),
                ],
                alignment: isHeading ? AlignmentType.CENTER : AlignmentType.LEFT,
                spacing: {
                  after: isHeading ? 400 : 200, // Spacing after paragraph
                }
              })
            })
            
            // Create document
            const doc = new Document({
              sections: [
                {
                  properties: {},
                  children: [
                    // Title
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: title,
                          bold: true,
                          size: 32, // 16pt
                        }),
                      ],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 400 },
                    }),
                    
                    // Metadata
                    ...(currentArtifact.metadata ? [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Disiplin: ${currentArtifact.metadata.discipline || 'N/A'} | `,
                            size: 20,
                          }),
                          new TextRun({
                            text: `Tingkat: ${currentArtifact.metadata.academicLevel || 'N/A'} | `,
                            size: 20,
                          }),
                          new TextRun({
                            text: `Fase: ${currentArtifact.phase}`,
                            size: 20,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 600 },
                      }),
                    ] : []),
                    
                    // Content paragraphs
                    ...paragraphs,
                  ],
                },
              ],
            })
            
            const buffer = await Packer.toBuffer(doc)
            const blob = new Blob([new Uint8Array(buffer)], { 
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            })
            saveAs(blob, `${sanitizedTitle}.docx`)
          }
          break
          
        default:
          return
      }
    } catch (error) {
      console.error(`Error exporting ${format}:`, error)
      alert(`Gagal mengexport sebagai ${format.toUpperCase()}. Silakan coba lagi.`)
    }
  }

  const filteredContent = searchTerm
    ? artifact.content.split('\n').filter(line => 
        line.toLowerCase().includes(searchTerm.toLowerCase())
      ).join('\n')
    : artifact.content

  const currentArtifact = artifacts[currentIndex] || artifact

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {currentArtifact.type === 'markdown' ? '📝' : 
               currentArtifact.type === 'code' ? '💻' : '📄'}
            </div>
            
            <div>
              <h2 className="font-semibold text-lg truncate max-w-md">
                {currentArtifact.title}
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                  Fase {currentArtifact.phase}
                </span>
                <span>{currentArtifact.type}</span>
                {currentArtifact.wordCount && (
                  <span>{currentArtifact.wordCount.toLocaleString()} kata</span>
                )}
                <span>
                  {new Date(currentArtifact.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation */}
            {artifacts.length > 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button
                  onClick={navigateToPrevious}
                  disabled={currentIndex === 0}
                  className="p-1 rounded hover:bg-secondary transition-colors disabled:opacity-50"
                  title="Artefak sebelumnya (←)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18L9 12l6-6"/>
                  </svg>
                </button>
                
                <span className="px-2 py-1 bg-secondary rounded text-xs">
                  {currentIndex + 1} / {artifacts.length}
                </span>
                
                <button
                  onClick={navigateToNext}
                  disabled={currentIndex === artifacts.length - 1}
                  className="p-1 rounded hover:bg-secondary transition-colors disabled:opacity-50"
                  title="Artefak berikutnya (→)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-secondary transition-colors"
              title="Tutup (Esc)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/20">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari dalam konten..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pl-9 bg-background border border-border rounded-md text-sm"
              />
              <svg 
                className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </div>
          </div>

          {/* Export Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Export:</span>
            <button
              onClick={() => downloadArtifact('txt')}
              className="px-3 py-1 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
              title="Download sebagai TXT"
            >
              TXT
            </button>
            <button
              onClick={() => downloadArtifact('md')}
              className="px-3 py-1 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
              title="Download sebagai Markdown"
            >
              MD
            </button>
            <button
              onClick={() => downloadArtifact('pdf')}
              className="px-3 py-1 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
              title="Download sebagai PDF"
            >
              PDF
            </button>
            <button
              onClick={() => downloadArtifact('docx')}
              className="px-3 py-1 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
              title="Download sebagai DOCX"
            >
              DOCX
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-transparent border-none p-0">
              {filteredContent}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              {currentArtifact.metadata && (
                <>
                  {currentArtifact.metadata.discipline && (
                    <span>Disiplin: {currentArtifact.metadata.discipline}</span>
                  )}
                  {currentArtifact.metadata.academicLevel && (
                    <span>Tingkat: {currentArtifact.metadata.academicLevel}</span>
                  )}
                  {currentArtifact.metadata.citationStyle && (
                    <span>Sitasi: {currentArtifact.metadata.citationStyle}</span>
                  )}
                </>
              )}
            </div>
            
            <div>
              Gunakan ← → untuk navigasi • Esc untuk tutup
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}