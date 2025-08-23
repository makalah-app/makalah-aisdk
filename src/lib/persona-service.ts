// ============================================
// MAKALAH AI: Persona Service Layer
// ============================================
// Task 02 Implementation: Database-Driven Academic Persona System
// Created: August 2025
// Features: API layer for persona CRUD operations

import type { 
  PersonaTemplate, 
  PersonaMode, 
  CreatePersonaRequest, 
  UpdatePersonaRequest,
  GetPersonasResponse,
  PersonaTestResult,
  DisciplineCategory,
  PersonaConfiguration
} from '@/types/persona'
import { DEFAULT_PERSONA_CONFIGURATION } from '@/types/persona'

// ============================================
// MOCK DATA FOR DEVELOPMENT
// ============================================
// This will be replaced with actual Supabase calls once write access is available

const MOCK_DISCIPLINES: DisciplineCategory[] = [
  {
    id: '1',
    name: 'STEM',
    description: 'Science, Technology, Engineering, Mathematics',
    parent_discipline_id: null,
    code: 'STEM',
    is_active: true,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Humaniora',
    description: 'Humanities and Social Sciences',
    parent_discipline_id: null,
    code: 'HUM',
    is_active: true,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Ilmu Sosial',
    description: 'Social Sciences',
    parent_discipline_id: null,
    code: 'SOC',
    is_active: true,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// 🚀 P02: ACADEMIC MODE PERSONA TEMPLATES - FORMAL CHAT MODE
const MOCK_PERSONAS: PersonaTemplate[] = [
  {
    id: 'persona-formal-research-1',
    name: 'Formal Academic Researcher',
    mode: 'Research',
    chat_mode_type: 'formal',
    discipline_id: '1',
    system_prompt: `Anda adalah asisten peneliti akademik yang menggunakan bahasa Indonesia formal untuk membantu dalam metodologi penelitian, pencarian literatur, dan analisis sumber akademik dengan standar akademik tertinggi.

PERAN UTAMA - MODE RESEARCH FORMAL:
- Membantu pencarian dan evaluasi sumber akademik berkualitas tinggi dengan metodologi yang rigorous
- Memberikan panduan metodologi penelitian yang tepat sesuai standar akademik internasional
- Menganalisis tren dan gap penelitian dalam bidang tertentu dengan critical thinking mendalam
- Menyusun kerangka teoritis yang solid dan evidence-based
- Fokus pada integritas akademik dan validitas research

GAYA KOMUNIKASI FORMAL:
- Objektif dan berbasis evidensi dengan scholarly discourse
- Mengutamakan sumber primer dan sekunder yang credible dan peer-reviewed
- Memberikan multiple perspectives pada isu penelitian dengan analytical approach
- Fokus pada validitas, reliabilitas, dan generalizability data
- Menggunakan terminologi akademik yang tepat dan precise

KEMAMPUAN RESEARCH SPECIALIST:
- Literature review komprehensif dengan systematic approach
- Gap analysis dan research question formulation yang sophisticated
- Metodologi kuantitatif dan kualitatif dengan rigorous standards
- Critical thinking dan analisis mendalam berbasis teori
- Statistical analysis dan data interpretation guidance

WORKFLOW AKADEMIK:
- Mendukung fase 1-3 dari 8-fase workflow akademik (Topic Definition, Research Notes, Literature Review)
- Specialized dalam source evaluation dan credibility assessment
- Expert dalam database academic search dan citation management
- Fokus pada methodology development dan research design`,
    description: 'Persona formal untuk mode Research - fokus pada pencarian literatur akademik dengan standar formal tinggi',
    version: 1,
    is_default: true,
    is_active: true,
    status: 'active',
    academic_level: 'graduate',
    citation_style: 'APA',
    usage_count: 45,
    success_rate: 87.5,
    avg_response_time: 2300,
    configuration: {
      search_depth: 'comprehensive',
      source_quality: 'peer_reviewed_only',
      methodology_focus: true,
      temperature: 0.1,
      max_tokens: 2000,
      tools_enabled: ['web_search', 'artifact_store', 'cite_manager']
    },
    metadata: {},
    created_by: 'admin',
    updated_by: 'admin',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'persona-formal-writing-1',
    name: 'Formal Academic Writer',
    mode: 'Writing',
    chat_mode_type: 'formal',
    discipline_id: '2',
    system_prompt: `Anda adalah asisten penulis akademik yang menggunakan bahasa Indonesia formal untuk membantu dalam struktur penulisan ilmiah, argument development, dan academic style dengan standar publikasi tinggi.

PERAN UTAMA - MODE WRITING FORMAL:
- Membantu strukturing dan organizing ide akademik dengan systematic approach
- Mengembangkan argumen yang logis, coherent, dan evidence-based
- Memastikan academic writing style yang sesuai standar publikasi internasional
- Memberikan feedback konstruktif pada draft writing dengan detailed analysis
- Fokus pada clarity, precision, dan scholarly voice

GAYA KOMUNIKASI FORMAL:
- Clear, concise, dan well-structured dengan academic discourse markers
- Menggunakan academic vocabulary yang tepat dan discipline-specific
- Mempertahankan objective tone dengan scholarly authority
- Fokus pada logical flow, coherence, dan persuasive argumentation
- Integrate citations seamlessly dengan proper attribution

KEMAMPUAN WRITING SPECIALIST:
- Paragraph development dan effective transitions dengan rhetorical strategies
- Thesis statement formulation dan comprehensive argument structure
- Academic language precision dan style guide compliance
- Draft revision dengan improvement suggestions yang actionable
- Abstract writing, conclusion crafting, dan scholarly presentation

WORKFLOW AKADEMIK:
- Mendukung fase 4-6 dari 8-fase workflow akademik (Outline, First Draft, Citations/References)
- Specialized dalam academic argumentation dan evidence integration
- Expert dalam various citation styles dan academic formatting
- Fokus pada content development dan scholarly writing conventions`,
    description: 'Persona formal untuk mode Writing - fokus pada penulisan akademik dengan standar formal tinggi',
    version: 1,
    is_default: true,
    is_active: true,
    status: 'active',
    academic_level: 'graduate',
    citation_style: 'APA',
    usage_count: 62,
    success_rate: 91.2,
    avg_response_time: 1800,
    configuration: {
      writing_style: 'analytical',
      structure_focus: true,
      language_precision: 'domain_specific',
      temperature: 0.1,
      max_tokens: 2000,
      tools_enabled: ['artifact_store', 'cite_manager']
    },
    metadata: {},
    created_by: 'admin',
    updated_by: 'admin',
    created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'persona-formal-review-1',
    name: 'Formal Academic Reviewer',
    mode: 'Review',
    chat_mode_type: 'formal',
    discipline_id: '3',
    system_prompt: `Anda adalah reviewer akademik yang menggunakan bahasa Indonesia formal untuk evaluasi kualitas penelitian, konsistensi argumen, dan standar publikasi dengan rigorous academic standards.

PERAN UTAMA - MODE REVIEW FORMAL:
- Mengevaluasi kualitas dan konsistensi academic writing dengan expert-level standards
- Memeriksa citations, references, dan academic integrity dengan thoroughness
- Memberikan feedback detail untuk improvement yang actionable dan specific
- Memastikan compliance dengan academic standards dan publication requirements
- Fokus pada quality assurance dan scholarly excellence

GAYA KOMUNIKASI FORMAL:
- Constructive dan detail-oriented dengan professional academic tone
- Objective dalam memberikan kritik dengan evidence-based assessment
- Fokus pada quality improvement dengan systematic evaluation approach
- Memberikan specific, actionable feedback dengan clear recommendations
- Maintain scholarly discourse dengan respectful critical analysis

KEMAMPUAN REVIEW SPECIALIST:
- Comprehensive quality assessment dengan established evaluation criteria
- Advanced citation checking dan reference validation dengan format compliance
- Grammar, style, dan format review dengan publication standards
- Academic integrity verification dan plagiarism awareness
- Peer-review standards application dengan journal submission readiness

WORKFLOW AKADEMIK:
- Mendukung fase 7-8 dari 8-fase workflow akademik (Final Draft, Final Paper)
- Specialized dalam final quality assurance dan publication preparation
- Expert dalam academic standards compliance dan format verification
- Fokus pada scholarly presentation dan professional manuscript preparation`,
    description: 'Persona formal untuk mode Review - fokus pada evaluasi akademik dengan standar formal tinggi',
    version: 1,
    is_default: true,
    is_active: true,
    status: 'active',
    academic_level: 'graduate',
    citation_style: 'APA',
    usage_count: 31,
    success_rate: 94.1,
    avg_response_time: 2100,
    configuration: {
      review_depth: 'expert',
      quality_standards: 'publication_ready',
      citation_validation: true,
      temperature: 0.1,
      max_tokens: 2000,
      tools_enabled: ['cite_manager', 'artifact_store']
    },
    metadata: {},
    created_by: 'admin',
    updated_by: 'admin',
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },

  // 🚀 P02: CASUAL CONVERSATION MODE PERSONA - GUE-LO JAKARTA STYLE
  {
    id: 'persona-casual-general-1',
    name: 'Casual AI Assistant',
    mode: 'Research', // Default mode for casual - can handle all types
    chat_mode_type: 'casual',
    discipline_id: null,
    system_prompt: `Lo lagi ngobrol sama AI yang bisa bantuin lo dengan berbagai hal. Gue akan pake bahasa santai ala Jakarta biar lebih enak ngobrolnya!

SIAPA GUE - CASUAL MODE:
- AI assistant yang bisa bantuin lo diskusi berbagai topik dengan santai
- Gue bakal pake bahasa gue-lo yang natural dan enak didengar
- Meski santai, gue tetep helpful dan informatif banget
- Bisa ngobrol bebas tanpa harus formal-formal banget
- Tetep smart tapi approachable dan fun

GAYA NGOBROL GUE:
- Pake bahasa Jakarta yang natural (gue-lo, nih, sih, dong, kan, etc.)
- Santai tapi tetep sopan dan respectful sama lo
- Kasih info yang bermanfaat dengan cara yang enak dipahami
- Bisa bercanda dikit tapi tetep on point dan helpful
- Adaptif sama mood dan style ngobrol lo

BISA BANTUIN APA AJA:
- Diskusi topik umum atau brainstorming ide-ide keren
- Kasih saran atau pendapat tentang sesuatu yang lo tanyain
- Jelasin konsep atau info yang lo butuhin dengan bahasa simple
- Bantuin problem solving dengan pendekatan yang santai tapi efektif
- Ngobrol bebas tentang hal-hal yang lo penasaran atau mau tau
- Support akademik juga bisa, tapi dengan gaya yang lebih relaxed

TOOLS YANG BISA GUE PAKE:
- web_search: Nyari info terbaru di internet kalo lo butuh
- artifact_store: Simpen catetan atau dokumen penting lo
- cite_manager: Bantuin urusan referensi kalo diperluin (meski jarang sih)

YANG PERLU LO TAU:
- Gue tetep AI, jadi ada batasan kemampuan gue
- Kalo lo butuh bantuan akademik super formal, mending switch ke mode formal
- Gue bakal ngasih respon yang helpful tapi tetep santai dan friendly
- Feel free aja ngobrol tentang apa yang lo mau - gue siap dengerin!
- Gue ngerti konteks Jakarta dan budaya Indonesia, jadi bisa relate sama lo`,
    description: 'Persona casual untuk free conversation - gue-lo Jakarta style yang friendly dan helpful',
    version: 1,
    is_default: true,
    is_active: true,
    status: 'active',
    academic_level: 'graduate',
    citation_style: 'APA',
    usage_count: 78,
    success_rate: 89.3,
    avg_response_time: 1500,
    configuration: {
      conversation_style: 'casual',
      language_style: 'jakarta_gue_lo',
      formality_level: 'low',
      humor_enabled: true,
      context_awareness: 'indonesian_culture',
      temperature: 0.3, // Higher for more natural conversation
      max_tokens: 2000,
      tools_enabled: ['web_search', 'artifact_store', 'cite_manager']
    },
    metadata: {
      language_features: ['gue_lo_pronouns', 'jakarta_slang', 'informal_markers'],
      cultural_context: 'indonesian_jakarta',
      interaction_style: 'friendly_conversational'
    },
    created_by: 'admin',
    updated_by: 'admin',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

// ============================================
// PERSONA SERVICE CLASS
// ============================================

export class PersonaService {
  private baseUrl: string;
  private mockMode: boolean;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api/personas';
    this.mockMode = !baseUrl; // Use mock mode if no baseUrl provided
  }

  // ============================================
  // PERSONA CRUD OPERATIONS
  // ============================================

  // 🚀 P02: ENHANCED PERSONA FETCHING WITH CHAT MODE SUPPORT
  async getPersonas(
    mode?: PersonaMode, 
    disciplineId?: string, 
    activeOnly = true,
    chatModeType?: 'formal' | 'casual' // P02: New parameter for chat mode filtering
  ): Promise<GetPersonasResponse> {
    if (this.mockMode) {
      let filtered = MOCK_PERSONAS;

      if (mode) {
        filtered = filtered.filter(p => p.mode === mode);
      }

      if (disciplineId) {
        filtered = filtered.filter(p => p.discipline_id === disciplineId);
      }

      if (activeOnly) {
        filtered = filtered.filter(p => p.is_active);
      }

      // 🚀 P02: Chat mode filtering
      if (chatModeType) {
        filtered = filtered.filter(p => p.chat_mode_type === chatModeType);
      }

      return {
        personas: filtered,
        total: filtered.length,
        page: 1,
        has_more: false
      };
    }

    const params = new URLSearchParams();
    if (mode) params.append('mode', mode);
    if (disciplineId) params.append('discipline_id', disciplineId);
    if (activeOnly) params.append('active_only', 'true');
    if (chatModeType) params.append('chat_mode_type', chatModeType); // P02: New parameter

    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch personas: ${response.statusText}`);
    }

    return response.json();
  }

  // 🚀 P02: NEW METHOD - Get persona by chat mode and academic mode
  async getPersonaByChatMode(
    chatModeType: 'formal' | 'casual',
    academicMode?: PersonaMode,
    disciplineId?: string
  ): Promise<PersonaTemplate | null> {
    if (this.mockMode) {
      let candidates = MOCK_PERSONAS.filter(p => 
        p.chat_mode_type === chatModeType && 
        p.is_active
      );

      // Filter by academic mode if specified
      if (academicMode) {
        candidates = candidates.filter(p => p.mode === academicMode);
      }

      // Filter by discipline if specified
      if (disciplineId) {
        candidates = candidates.filter(p => p.discipline_id === disciplineId);
      }

      // Return default persona first, then best performing
      const defaultPersona = candidates.find(p => p.is_default);
      if (defaultPersona) return defaultPersona;

      // Fallback to best performing persona
      if (candidates.length > 0) {
        return candidates.sort((a, b) => b.success_rate - a.success_rate)[0];
      }

      return null;
    }

    const params = new URLSearchParams();
    params.append('chat_mode_type', chatModeType);
    if (academicMode) params.append('mode', academicMode);
    if (disciplineId) params.append('discipline_id', disciplineId);

    const response = await fetch(`${this.baseUrl}/by-chat-mode?${params}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch persona by chat mode: ${response.statusText}`);
    }

    return response.json();
  }

  // 🚀 P02: NEW METHOD - Get default persona for chat mode
  async getDefaultPersonaForChatMode(chatModeType: 'formal' | 'casual'): Promise<PersonaTemplate | null> {
    if (this.mockMode) {
      const defaultPersona = MOCK_PERSONAS.find(p => 
        p.chat_mode_type === chatModeType && 
        p.is_default && 
        p.is_active
      );
      return defaultPersona || null;
    }

    const response = await fetch(`${this.baseUrl}/default/${chatModeType}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch default persona for chat mode: ${response.statusText}`);
    }

    return response.json();
  }

  async getPersonaById(id: string): Promise<PersonaTemplate> {
    if (this.mockMode) {
      const persona = MOCK_PERSONAS.find(p => p.id === id);
      if (!persona) {
        throw new Error(`Persona with id ${id} not found`);
      }
      return persona;
    }

    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch persona: ${response.statusText}`);
    }

    return response.json();
  }

  async createPersona(data: CreatePersonaRequest): Promise<PersonaTemplate> {
    if (this.mockMode) {
      const newPersona: PersonaTemplate = {
        id: `persona-${data.mode.toLowerCase()}-${Date.now()}`,
        name: data.name,
        mode: data.mode,
        chat_mode_type: data.chat_mode_type,
        discipline_id: data.discipline_id || null,
        system_prompt: data.system_prompt,
        description: data.description || null,
        version: 1,
        is_default: false,
        is_active: true,
        status: 'draft',
        academic_level: data.academic_level || 'graduate',
        citation_style: data.citation_style || 'APA',
        usage_count: 0,
        success_rate: 0,
        avg_response_time: 0,
        configuration: { ...DEFAULT_PERSONA_CONFIGURATION, ...data.configuration },
        metadata: {},
        created_by: 'current_user',
        updated_by: 'current_user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      MOCK_PERSONAS.push(newPersona);
      return newPersona;
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to create persona: ${response.statusText}`);
    }

    return response.json();
  }

  async updatePersona(data: UpdatePersonaRequest): Promise<PersonaTemplate> {
    if (this.mockMode) {
      const index = MOCK_PERSONAS.findIndex(p => p.id === data.id);
      if (index === -1) {
        throw new Error(`Persona with id ${data.id} not found`);
      }

      const updatedPersona = {
        ...MOCK_PERSONAS[index],
        ...data,
        updated_at: new Date().toISOString(),
        version: MOCK_PERSONAS[index].version + 1
      };

      MOCK_PERSONAS[index] = updatedPersona;
      return updatedPersona;
    }

    const response = await fetch(`${this.baseUrl}/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to update persona: ${response.statusText}`);
    }

    return response.json();
  }

  async deletePersona(id: string): Promise<void> {
    if (this.mockMode) {
      const index = MOCK_PERSONAS.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error(`Persona with id ${id} not found`);
      }

      MOCK_PERSONAS.splice(index, 1);
      return;
    }

    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete persona: ${response.statusText}`);
    }
  }

  // ============================================
  // PERSONA TESTING
  // ============================================

  async testPersona(
    personaId: string, 
    testQuery: string,
    context?: Record<string, any>
  ): Promise<PersonaTestResult> {
    if (this.mockMode) {
      const persona = MOCK_PERSONAS.find(p => p.id === personaId);
      if (!persona) {
        throw new Error(`Persona with id ${personaId} not found`);
      }

      // Simulate AI response based on persona mode
      let mockResponse = '';
      const responseTime = Math.random() * 2000 + 1000; // 1-3 seconds
      const qualityScore = 3.5 + Math.random() * 1.5; // 3.5-5.0

      switch (persona.mode) {
        case 'Research':
          mockResponse = `Berdasarkan analisis sebagai Academic Researcher, untuk pertanyaan "${testQuery}", saya merekomendasikan pendekatan metodologi sebagai berikut:

1. **Literature Review**: Pencarian sumber akademik terkait topik ini
2. **Gap Analysis**: Identifikasi kesenjangan penelitian yang ada
3. **Research Questions**: Formulasi pertanyaan penelitian yang spesifik
4. **Metodologi**: Pemilihan metode kuantitatif/kualitatif yang tepat

Sumber yang perlu ditelusuri meliputi: Google Scholar, ResearchGate, IEEE Xplore untuk mendapatkan perspektif komprehensif.`;
          break;

        case 'Writing':
          mockResponse = `Sebagai Academic Writer, untuk mengembangkan "${testQuery}", saya sarankan struktur sebagai berikut:

1. **Introduction**: Latar belakang dan thesis statement yang clear
2. **Body Paragraphs**: Argument development dengan logical flow
3. **Evidence Integration**: Penggunaan sumber yang kredible untuk mendukung argumen
4. **Conclusion**: Synthesis dan implications yang meaningful

Fokus pada academic tone, clear transitions, dan konsistensi dalam citation style.`;
          break;

        case 'Review':
          mockResponse = `Dalam peran Academic Reviewer, evaluasi untuk "${testQuery}" mencakup:

1. **Content Quality**: Kedalaman analisis dan originalitas pemikiran
2. **Structure Assessment**: Logical organization dan coherence
3. **Citation Check**: Validitas dan akurasi referensi
4. **Academic Standards**: Compliance dengan style guide dan format

Rekomendasi improvement: strengthening argument structure, adding more current sources, improving transition sentences.`;
          break;
      }

      return {
        persona_id: personaId,
        test_query: testQuery,
        response: mockResponse,
        response_time: Math.round(responseTime),
        quality_score: Math.round(qualityScore * 100) / 100,
        mode_adherence: true,
        style_compliance: true,
        tool_usage: persona.configuration.tools_enabled || []
      };
    }

    const response = await fetch(`${this.baseUrl}/${personaId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test_query: testQuery, context })
    });

    if (!response.ok) {
      throw new Error(`Failed to test persona: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================
  // DISCIPLINE CATEGORIES
  // ============================================

  async getDisciplines(): Promise<DisciplineCategory[]> {
    if (this.mockMode) {
      return MOCK_DISCIPLINES;
    }

    const response = await fetch('/api/disciplines');
    if (!response.ok) {
      throw new Error(`Failed to fetch disciplines: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================
  // PERSONA RECOMMENDATIONS
  // ============================================

  async getPersonaRecommendations(
    academicPhase: number,
    disciplineId?: string,
    context?: Record<string, any>
  ): Promise<PersonaTemplate[]> {
    if (this.mockMode) {
      // Simple recommendation logic based on phase
      let recommendedMode: PersonaMode;

      if (academicPhase <= 3) {
        recommendedMode = 'Research'; // Research phases
      } else if (academicPhase <= 6) {
        recommendedMode = 'Writing'; // Writing phases  
      } else {
        recommendedMode = 'Review'; // Review phases
      }

      return MOCK_PERSONAS.filter(p => 
        p.mode === recommendedMode && 
        p.is_active &&
        (!disciplineId || p.discipline_id === disciplineId)
      );
    }

    const params = new URLSearchParams();
    params.append('academic_phase', academicPhase.toString());
    if (disciplineId) params.append('discipline_id', disciplineId);
    if (context) params.append('context', JSON.stringify(context));

    const response = await fetch(`${this.baseUrl}/recommendations?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to get recommendations: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================
  // PERSONA ANALYTICS
  // ============================================

  async getPersonaAnalytics(personaId: string): Promise<{
    usage_stats: Record<string, number>;
    performance_metrics: Record<string, number>;
    user_feedback: Record<string, any>;
  }> {
    if (this.mockMode) {
      const persona = MOCK_PERSONAS.find(p => p.id === personaId);
      if (!persona) {
        throw new Error(`Persona with id ${personaId} not found`);
      }

      return {
        usage_stats: {
          total_usage: persona.usage_count,
          daily_average: Math.round(persona.usage_count / 30),
          peak_hour: 14, // 2 PM
          most_used_tools: 3
        },
        performance_metrics: {
          success_rate: persona.success_rate,
          avg_response_time: persona.avg_response_time,
          quality_score: 4.2,
          user_satisfaction: 87.5
        },
        user_feedback: {
          positive_feedback: 78,
          improvement_suggestions: 12,
          reported_issues: 3
        }
      };
    }

    const response = await fetch(`${this.baseUrl}/${personaId}/analytics`);
    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  async bulkUpdatePersonas(
    personaIds: string[],
    updates: Partial<PersonaTemplate>
  ): Promise<PersonaTemplate[]> {
    if (this.mockMode) {
      const updatedPersonas = [];

      for (const id of personaIds) {
        const index = MOCK_PERSONAS.findIndex(p => p.id === id);
        if (index !== -1) {
          MOCK_PERSONAS[index] = {
            ...MOCK_PERSONAS[index],
            ...updates,
            updated_at: new Date().toISOString()
          };
          updatedPersonas.push(MOCK_PERSONAS[index]);
        }
      }

      return updatedPersonas;
    }

    const response = await fetch(`${this.baseUrl}/bulk`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ persona_ids: personaIds, updates })
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk update personas: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================
  // IMPORT/EXPORT
  // ============================================

  async exportPersona(personaId: string): Promise<Record<string, any>> {
    if (this.mockMode) {
      const persona = MOCK_PERSONAS.find(p => p.id === personaId);
      if (!persona) {
        throw new Error(`Persona with id ${personaId} not found`);
      }

      return {
        version: '1.0',
        exported_at: new Date().toISOString(),
        persona: persona
      };
    }

    const response = await fetch(`${this.baseUrl}/${personaId}/export`);
    if (!response.ok) {
      throw new Error(`Failed to export persona: ${response.statusText}`);
    }

    return response.json();
  }

  async importPersona(personaData: Record<string, any>): Promise<PersonaTemplate> {
    if (this.mockMode) {
      const importedPersona = personaData.persona as PersonaTemplate;
      const newPersona = {
        ...importedPersona,
        id: `imported-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'current_user',
        updated_by: 'current_user',
        usage_count: 0 // Reset usage stats on import
      };

      MOCK_PERSONAS.push(newPersona);
      return newPersona;
    }

    const response = await fetch(`${this.baseUrl}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(personaData)
    });

    if (!response.ok) {
      throw new Error(`Failed to import persona: ${response.statusText}`);
    }

    return response.json();
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================

// Create singleton instance with mock mode for development
export const personaService = new PersonaService();

// Export for testing with different configurations  
// PersonaService already exported in class declaration above