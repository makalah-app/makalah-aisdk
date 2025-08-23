'use client'

import { useEffect } from 'react'
import { useThemeStore, initializeTheme } from '@/store/theme'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { StreamingDebugger } from './StreamingDebugger'
// Utilities file removed to fix webpack error

export function MainLayout() {
  const { theme, setTheme } = useThemeStore()

  // Initialize theme on mount
  useEffect(() => {
    initializeTheme()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Header */}
      <Header />
      
      {/* Main Content Area - AI SDK Cookbook Pattern */}
      <div className="flex min-h-[calc(100vh-4rem)] relative">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Chat Area - Professional Layout Container */}
        <div className="flex-1 flex flex-col relative">
          <ChatArea />
        </div>
      </div>

      {/* Streaming Debugger */}
      <StreamingDebugger />
    </div>
  )
}