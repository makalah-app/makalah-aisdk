'use client'

import { useChatStore } from '@/store/chat'
import { ChatTypeDropdown } from './ChatTypeDropdown'
import { ChatMode } from '@/types'

export function NewChatButton() {
  const { createSession, setCurrentChatMode } = useChatStore()

  const handleChatCreate = (mode: ChatMode) => {
    // Set current chat mode in store
    setCurrentChatMode(mode)
    // Always create conversation session for simplified dropdown
    createSession(false, undefined, mode)
  }

  return (
    <ChatTypeDropdown onChatCreate={handleChatCreate} />
  )
}