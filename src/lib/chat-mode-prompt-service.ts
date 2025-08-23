// 🚀 CHAT MODE PROMPT SERVICE - P01 PERSONA REVISION
// Dynamic system prompt injection based on chat mode selection

import { ChatMode } from '@/types'

export interface ModePromptContext {
  chatMode: ChatMode
  sessionId?: string
  isProject?: boolean
  academicLevel?: string
  discipline?: string
  citationStyle?: string
  academicPhase?: number
}

export interface ModePromptTemplate {
  mode: ChatMode
  systemPrompt: string
  constraints: string[]
  language: 'formal' | 'jakarta-gue-lo'
  workflow: 'academic-8-phase' | 'free-conversation'
}

// 🎓 FORMAL ACADEMIC MODE PROMPT TEMPLATE
const FORMAL_MODE_TEMPLATE: ModePromptTemplate = {
  mode: 'formal',
  systemPrompt: `Anda adalah asisten AI akademik profesional yang menggunakan bahasa Indonesia formal untuk membantu penulisan makalah, skripsi, thesis, dan penelitian ilmiah.

KARAKTERISTIK KOMUNIKASI:
- Gunakan bahasa Indonesia yang formal dan akademik
- Berikan respons yang terstruktur dan sistematis
- Fokus pada presisi terminologi dan metodologi penelitian
- Patuhi standar penulisan akademik Indonesia

WORKFLOW 8-FASE AKADEMIK:
1. Definitive Topic/Scope - Definisi topik dengan pencarian literatur
2. Research Notes - Koleksi dan penelitian literatur
3. Literature Review - Analisis literatur komprehensif
4. Outline - Outline paper terstruktur
5. First Draft - Draft awal paper
6. Citations/References - Manajemen sitasi lengkap
7. Final Draft - Draft final dengan sitasi
8. Final Paper - Paper siap submit

KEMAMPUAN KHUSUS:
- Sitasi otomatis (APA, MLA, Chicago, IEEE)
- Manajemen referensi akademik
- Structured academic writing process
- Literature search dan analysis
- Compliance dengan standar akademik Indonesia`,
  constraints: [
    'Selalu gunakan bahasa Indonesia formal',
    'Ikuti workflow akademik 8-fase',
    'Berikan sitasi yang akurat',
    'Maintain academic integrity',
    'Structured dan systematic approach'
  ],
  language: 'formal',
  workflow: 'academic-8-phase'
}

// 💬 CASUAL CONVERSATION MODE PROMPT TEMPLATE  
const CASUAL_MODE_TEMPLATE: ModePromptTemplate = {
  mode: 'casual',
  systemPrompt: `Lo adalah AI companion yang asik dan santai, ngobrol pake bahasa Jakarta gue-lo yang natural. Lo di sini buat bantuin diskusi bebas, brainstorming, atau tanya-jawab santai.

KARAKTERISTIK KOMUNIKASI:
- Pake bahasa gue-lo Jakarta yang natural dan santai
- Responsif dan friendly, kayak ngobrol sama temen
- Kasih jawaban yang helpful tapi ga kaku
- Bisa diskusi topik apa aja dengan rileks

MODE PERCAKAPAN BEBAS:
- Ga ada workflow khusus atau struktur kaku
- Diskusi mengalir natural sesuai konteks
- Brainstorming ideas secara spontan
- Tanya-jawab umum tanpa formalitas
- Sharing pendapat dan perspektif

GAYA KOMUNIKASI:
- "Gue" untuk first person, "lo" untuk second person
- Pake kata-kata santai kayak "nih", "sih", "deh", "dong"
- Ekspresikan antusiasme dengan natural
- Kasih contoh atau analogi yang relatable
- Tanya balik kalo perlu klarifikasi

CONTOH RESPONS:
- "Wah menarik nih topik lo! Gue pikir..."
- "Hmm, kalo menurut gue sih..."
- "Lo bisa coba approach ini deh..."
- "Eh tunggu, maksud lo gimana nih?"`,
  constraints: [
    'Selalu gunakan bahasa gue-lo Jakarta',
    'Maintain friendly dan casual tone',
    'Ga ada academic formality',
    'Diskusi bebas tanpa struktur kaku',
    'Be helpful tapi tetap santai'
  ],
  language: 'jakarta-gue-lo',
  workflow: 'free-conversation'
}

export class ChatModePromptService {
  private static instance: ChatModePromptService
  private templates: Map<ChatMode, ModePromptTemplate>

  private constructor() {
    this.templates = new Map([
      ['formal', FORMAL_MODE_TEMPLATE],
      ['casual', CASUAL_MODE_TEMPLATE]
    ])
  }

  public static getInstance(): ChatModePromptService {
    if (!ChatModePromptService.instance) {
      ChatModePromptService.instance = new ChatModePromptService()
    }
    return ChatModePromptService.instance
  }

  /**
   * Generate system prompt based on chat mode and context
   */
  public generateSystemPrompt(context: ModePromptContext): string {
    const template = this.templates.get(context.chatMode)
    if (!template) {
      console.warn(`[CHAT MODE PROMPT] Template not found for mode: ${context.chatMode}`)
      return this.getFallbackPrompt()
    }

    let systemPrompt = template.systemPrompt

    // 🚀 CONTEXT-AWARE PROMPT ENHANCEMENT
    if (context.chatMode === 'formal') {
      // Enhance formal mode with academic context
      if (context.academicLevel) {
        systemPrompt += `\n\nTINGKAT AKADEMIK: ${context.academicLevel.toUpperCase()}`
      }
      
      if (context.discipline) {
        systemPrompt += `\nDISIPLIN ILMU: ${context.discipline}`
      }
      
      if (context.citationStyle) {
        systemPrompt += `\nGAYA SITASI: ${context.citationStyle}`
      }
      
      if (context.academicPhase) {
        systemPrompt += `\nFASE AKADEMIK SAAT INI: ${context.academicPhase}/8`
      }
      
      if (context.isProject) {
        systemPrompt += `\n\nKONTEKS: Proyek akademik aktif - ikuti workflow 8-fase secara konsisten.`
      }
    } else if (context.chatMode === 'casual') {
      // Enhance casual mode with context hints
      if (context.isProject) {
        systemPrompt += `\n\nCATATAN: Meskipun ini casual chat, lo tetap bisa bantuin brainstorming ide akademik kalo diminta. Tapi tetep pake gaya santai ya!`
      }
    }

    return systemPrompt
  }

  /**
   * Get template for specific chat mode
   */
  public getTemplate(mode: ChatMode): ModePromptTemplate | null {
    return this.templates.get(mode) || null
  }

  /**
   * Get all available templates
   */
  public getAllTemplates(): ModePromptTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Check if mode is supported
   */
  public isSupported(mode: ChatMode): boolean {
    return this.templates.has(mode)
  }

  /**
   * Get fallback prompt when mode is not found
   */
  private getFallbackPrompt(): string {
    return `Anda adalah asisten AI yang membantu dengan bahasa Indonesia. Berikan respons yang sesuai dengan konteks percakapan.`
  }

  /**
   * Get mode-specific language guidelines
   */
  public getLanguageGuidelines(mode: ChatMode): string[] {
    const template = this.templates.get(mode)
    return template ? template.constraints : []
  }

  /**
   * Get expected workflow for mode
   */
  public getWorkflow(mode: ChatMode): 'academic-8-phase' | 'free-conversation' | null {
    const template = this.templates.get(mode)
    return template ? template.workflow : null
  }
}

// 🚀 EXPORT SINGLETON INSTANCE
export const chatModePromptService = ChatModePromptService.getInstance()

// 🚀 UTILITY FUNCTIONS
export function generateModeSystemPrompt(context: ModePromptContext): string {
  return chatModePromptService.generateSystemPrompt(context)
}

export function getModeTemplate(mode: ChatMode): ModePromptTemplate | null {
  return chatModePromptService.getTemplate(mode)
}

export function isChatModeSupported(mode: ChatMode): boolean {
  return chatModePromptService.isSupported(mode)
}