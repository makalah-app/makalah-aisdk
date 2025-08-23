'use client'

import { marked } from 'marked'
import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'

// 🚀 Parse markdown into discrete blocks for optimal memoization
function parseMarkdownIntoBlocks(markdown: string): string[] {
  try {
    const tokens = marked.lexer(markdown)
    return tokens.map(token => token.raw)
  } catch (error) {
    console.warn('[MemoizedMarkdown] Failed to parse markdown:', error)
    // Fallback to splitting by paragraphs
    return markdown.split('\n\n').filter(block => block.trim())
  }
}

// 🚀 Memoized markdown block component for performance optimization
const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return (
      <ReactMarkdown
        components={{
          // Custom styling for better integration with Tailwind
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-medium mb-2 text-foreground">{children}</h3>,
          p: ({ children }) => <p className="mb-2 text-foreground leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic text-foreground">{children}</em>,
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground border">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-3 border">
              {children}
            </pre>
          ),
          ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-foreground">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted/50 rounded-r mb-3 italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if content actually changed
    return prevProps.content === nextProps.content
  }
)

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock'

// 🚀 Main memoized markdown component following AI SDK patterns
export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    // Parse markdown into blocks only when content changes
    const blocks = useMemo(() => {
      if (!content || typeof content !== 'string') {
        return []
      }
      return parseMarkdownIntoBlocks(content.trim())
    }, [content])

    // Handle empty or invalid content
    if (!content || blocks.length === 0) {
      return <div className="text-muted-foreground">No content</div>
    }

    return (
      <div className="markdown-content">
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock 
            content={block} 
            key={`${id}-block_${index}`} 
          />
        ))}
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if content or id changed
    return prevProps.content === nextProps.content && prevProps.id === nextProps.id
  }
)

MemoizedMarkdown.displayName = 'MemoizedMarkdown'

// 🚀 Compact version for streaming text with progressive markdown parsing
export const StreamingMemoizedMarkdown = memo(
  ({ content, id, isStreaming = false }: { content: string; id: string; isStreaming?: boolean }) => {
    // For streaming, we want to update more frequently but still optimize
    const blocks = useMemo(() => {
      if (!content || typeof content !== 'string') {
        return []
      }
      
      // For streaming content, split by paragraphs for better real-time updates
      if (isStreaming) {
        return content.split('\n\n').filter(block => block.trim())
      }
      
      // For complete content, use full markdown parsing
      return parseMarkdownIntoBlocks(content.trim())
    }, [content, isStreaming])

    if (!content || blocks.length === 0) {
      return null
    }

    return (
      <div className="streaming-markdown-content">
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock 
            content={block} 
            key={`${id}-streaming-block_${index}`} 
          />
        ))}
      </div>
    )
  }
)

StreamingMemoizedMarkdown.displayName = 'StreamingMemoizedMarkdown'