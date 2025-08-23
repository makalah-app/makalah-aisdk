/**
 * P08.2: System Prompt Persona Behavior Validation
 * Comprehensive testing of persona-as-system-prompt injection and behavior consistency
 * 
 * Test Scenarios:
 * - System prompt injection accuracy
 * - Persona behavior consistency
 * - Mode-specific response validation
 * - Context-aware prompt generation
 * - Tool instruction integration
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('P08.2: System Prompt Persona Behavior Validation', () => {

  // Test personas and expected behaviors
  const PERSONA_TEST_SCENARIOS = {
    formal_research: {
      mode: 'formal',
      expectedSystemPrompt: {
        contains: ['RESEARCH ASSISTANT', 'Literature search', 'systematic', 'methodology'],
        language: 'formal_indonesian',
        tools: ['web_search', 'artifact_store', 'cite_manager']
      },
      testQueries: [
        {
          input: 'Saya butuh bantuan mencari referensi tentang artificial intelligence',
          expectedBehaviors: [
            'systematic literature search approach',
            'academic database suggestions',
            'source credibility assessment',
            'research methodology guidance'
          ],
          expectedLanguage: /(?:metodologi|sistematik|komprehensif|kredibilitas|akademik)/i,
          shouldNotContain: /(?:gue|lo|gimana|sih|banget)/i
        },
        {
          input: 'Bagaimana cara membuat outline yang baik?',
          expectedBehaviors: [
            'structured approach to outlining',
            'academic writing principles',
            'logical flow guidance',
            'section organization tips'
          ],
          expectedLanguage: /(?:struktur|outline|organisasi|alur|logis)/i,
          shouldNotContain: /(?:kayak|dong|nih|asik)/i
        }
      ]
    },
    casual_conversation: {
      mode: 'casual',
      expectedSystemPrompt: {
        contains: ['gue-lo', 'Jakarta', 'santai', 'bebas'],
        language: 'jakarta_slang',
        tools: ['web_search'] // Limited tools in casual mode
      },
      testQueries: [
        {
          input: 'Gimana sih cara belajar AI yang efektif?',
          expectedBehaviors: [
            'casual conversational tone',
            'jakarta slang usage',
            'practical advice',
            'relatable examples'
          ],
          expectedLanguage: /(?:gue|lo|gimana|sih|bisa|nih|kayak)/i,
          shouldNotContain: /(?:metodologi|sistematik|komprehensif|signifikan)/i
        },
        {
          input: 'Lo tau gak apa bedanya machine learning sama deep learning?',
          expectedBehaviors: [
            'informal explanation style',
            'conversational flow',
            'easy-to-understand language',
            'practical comparisons'
          ],
          expectedLanguage: /(?:gue|lo|tau|bedanya|kayak|jadi)/i,
          shouldNotContain: /(?:teoretis|epistemologi|paradigma|komprehensif)/i
        }
      ]
    }
  };

  // Helper functions
  async function waitForChatReady(page: Page) {
    await page.waitForSelector('[data-testid="chat-area"]', { state: 'visible' });
    await page.waitForLoadState('networkidle');
  }

  async function selectChatMode(page: Page, mode: 'formal' | 'casual') {
    await page.click('[data-testid="new-chat-button"]');
    
    const modeText = mode === 'formal' 
      ? 'Percakapan yang harus bikin proyek'
      : 'Percakapan bebas tanpa proyek';
    
    await page.click(`button:has-text("${modeText}")`);
    await expect(page.locator('.modal-backdrop')).not.toBeVisible();
  }

  async function sendMessageAndGetResponse(page: Page, message: string): Promise<string> {
    await page.fill('[data-testid="chat-input"]', message);
    await page.click('[data-testid="send-button"]');
    
    // Wait for streaming to complete
    await page.waitForSelector('[data-testid="ai-response"]', { 
      state: 'visible',
      timeout: 30000 
    });
    
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="streaming-indicator"]'),
      {},
      { timeout: 30000 }
    );
    
    const responseElement = page.locator('[data-testid="ai-response"]').last();
    return await responseElement.textContent() || '';
  }

  async function interceptSystemPrompt(page: Page): Promise<string> {
    let capturedPrompt = '';
    
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postData();
        if (postData) {
          const requestBody = JSON.parse(postData);
          if (requestBody.messages && requestBody.messages[0]?.role === 'system') {
            capturedPrompt = requestBody.messages[0].content;
          }
        }
      }
      await route.continue();
    });
    
    return capturedPrompt;
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForChatReady(page);
    
    // Clear any existing state
    await page.evaluate(() => {
      localStorage.removeItem('makalah-chat-store');
      localStorage.removeItem('makalah-chat-mode');
    });
    
    await page.reload();
    await waitForChatReady(page);
  });

  // ============================================
  // SYSTEM PROMPT INJECTION VALIDATION
  // ============================================

  test('should inject correct system prompt for formal research mode', async ({ page }) => {
    let capturedPrompt = '';
    
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postData();
        if (postData) {
          const requestBody = JSON.parse(postData);
          if (requestBody.messages && requestBody.messages[0]?.role === 'system') {
            capturedPrompt = requestBody.messages[0].content;
          }
        }
      }
      await route.continue();
    });

    await selectChatMode(page, 'formal');
    await sendMessageAndGetResponse(page, 'Test message for prompt capture');
    
    // Verify system prompt contains formal research elements
    expect(capturedPrompt).toMatch(/RESEARCH|Research|research/);
    expect(capturedPrompt).toMatch(/akademik|academic/i);
    expect(capturedPrompt).toMatch(/literature|literatur/i);
    expect(capturedPrompt).toMatch(/methodology|metodologi/i);
    
    // Should not contain casual elements
    expect(capturedPrompt).not.toMatch(/gue-lo|santai|bebas/i);
  });

  test('should inject correct system prompt for casual conversation mode', async ({ page }) => {
    let capturedPrompt = '';
    
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postData();
        if (postData) {
          const requestBody = JSON.parse(postData);
          if (requestBody.messages && requestBody.messages[0]?.role === 'system') {
            capturedPrompt = requestBody.messages[0].content;
          }
        }
      }
      await route.continue();
    });

    await selectChatMode(page, 'casual');
    await sendMessageAndGetResponse(page, 'Test message for prompt capture');
    
    // Verify system prompt contains casual elements
    expect(capturedPrompt).toMatch(/gue-lo|Jakarta|santai|bebas|casual/i);
    
    // Should not contain formal research elements  
    expect(capturedPrompt).not.toMatch(/RESEARCH ASSISTANT|methodology|systematic/i);
  });

  test('should update system prompt when switching modes', async ({ page }) => {
    const capturedPrompts: string[] = [];
    
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postData();
        if (postData) {
          const requestBody = JSON.parse(postData);
          if (requestBody.messages && requestBody.messages[0]?.role === 'system') {
            capturedPrompts.push(requestBody.messages[0].content);
          }
        }
      }
      await route.continue();
    });

    // Start with formal mode
    await selectChatMode(page, 'formal');
    await sendMessageAndGetResponse(page, 'First formal message');
    
    // Switch to casual mode
    await selectChatMode(page, 'casual');  
    await sendMessageAndGetResponse(page, 'First casual message');
    
    // Verify we captured different prompts
    expect(capturedPrompts.length).toBeGreaterThanOrEqual(2);
    expect(capturedPrompts[0]).not.toEqual(capturedPrompts[1]);
    
    // Verify prompts match their respective modes
    expect(capturedPrompts[0]).toMatch(/akademik|research|methodology/i);
    expect(capturedPrompts[1]).toMatch(/gue-lo|santai|Jakarta/i);
  });

  // ============================================
  // PERSONA BEHAVIOR CONSISTENCY
  // ============================================

  test('should maintain consistent formal behavior across multiple interactions', async ({ page }) => {
    await selectChatMode(page, 'formal');
    
    const scenario = PERSONA_TEST_SCENARIOS.formal_research;
    
    for (const testQuery of scenario.testQueries) {
      const response = await sendMessageAndGetResponse(page, testQuery.input);
      
      // Verify expected language patterns
      expect(response).toMatch(testQuery.expectedLanguage);
      expect(response).not.toMatch(testQuery.shouldNotContain);
      
      // Verify response demonstrates expected behaviors
      const lowerResponse = response.toLowerCase();
      let behaviorMatch = false;
      
      for (const behavior of testQuery.expectedBehaviors) {
        if (lowerResponse.includes(behavior.toLowerCase()) || 
            response.match(new RegExp(behavior.replace(/\s+/g, '\\s+'), 'i'))) {
          behaviorMatch = true;
          break;
        }
      }
      
      expect(behaviorMatch).toBeTruthy(`Response should demonstrate academic behavior for query: ${testQuery.input}`);
    }
  });

  test('should maintain consistent casual behavior across multiple interactions', async ({ page }) => {
    await selectChatMode(page, 'casual');
    
    const scenario = PERSONA_TEST_SCENARIOS.casual_conversation;
    
    for (const testQuery of scenario.testQueries) {
      const response = await sendMessageAndGetResponse(page, testQuery.input);
      
      // Verify expected language patterns
      expect(response).toMatch(testQuery.expectedLanguage);
      expect(response).not.toMatch(testQuery.shouldNotContain);
      
      // Verify casual, conversational tone
      expect(response.length).toBeGreaterThan(50); // Substantial response
      expect(response.length).toBeLessThan(2000); // Not overly verbose
    }
  });

  // ============================================
  // MODE-SPECIFIC RESPONSE VALIDATION  
  // ============================================

  test('should provide academic guidance in formal mode', async ({ page }) => {
    await selectChatMode(page, 'formal');
    
    const academicQueries = [
      'Bagaimana cara menulis metodologi penelitian yang baik?',
      'Apa saja kriteria sumber referensi yang kredibel?', 
      'Jelaskan struktur paper akademik yang standar'
    ];
    
    for (const query of academicQueries) {
      const response = await sendMessageAndGetResponse(page, query);
      
      // Should contain academic guidance
      expect(response).toMatch(/(?:langkah|tahap|kriteria|struktur|metodologi|akademik)/i);
      
      // Should maintain formal tone
      expect(response).not.toMatch(/(?:gue|lo|gimana|sih|banget)/i);
      
      // Should be comprehensive 
      expect(response.split(' ').length).toBeGreaterThan(50);
    }
  });

  test('should provide conversational responses in casual mode', async ({ page }) => {
    await selectChatMode(page, 'casual');
    
    const casualQueries = [
      'Gimana caranya supaya gue bisa fokus belajar?',
      'Lo punya tips buat manajemen waktu yang efektif?',
      'Apa sih yang bikin orang susah memahami programming?'
    ];
    
    for (const query of casualQueries) {
      const response = await sendMessageAndGetResponse(page, query);
      
      // Should use Jakarta slang
      expect(response).toMatch(/(?:gue|lo|bisa|nih|kayak|jadi|sih)/i);
      
      // Should not be overly academic
      expect(response).not.toMatch(/(?:metodologi|sistematik|komprehensif|paradigma)/i);
      
      // Should be conversational length
      expect(response.split(' ').length).toBeGreaterThan(30);
      expect(response.split(' ').length).toBeLessThan(200);
    }
  });

  // ============================================
  // CONTEXT-AWARE PROMPT GENERATION
  // ============================================

  test('should adapt prompts based on conversation context', async ({ page }) => {
    let promptCount = 0;
    const capturedPrompts: string[] = [];
    
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postData();
        if (postData) {
          const requestBody = JSON.parse(postData);
          if (requestBody.messages && requestBody.messages[0]?.role === 'system') {
            promptCount++;
            capturedPrompts.push(requestBody.messages[0].content);
          }
        }
      }
      await route.continue();
    });

    await selectChatMode(page, 'formal');
    
    // First interaction - general academic query
    await sendMessageAndGetResponse(page, 'Saya butuh bantuan menulis makalah');
    
    // Second interaction - more specific query
    await sendMessageAndGetResponse(page, 'Khususnya untuk bagian metodologi penelitian kualitatif');
    
    // Verify context adaptation
    expect(promptCount).toBeGreaterThan(0);
    if (capturedPrompts.length > 1) {
      // Later prompts might include additional context
      expect(capturedPrompts[1].length).toBeGreaterThanOrEqual(capturedPrompts[0].length * 0.8);
    }
  });

  // ============================================
  // TOOL INSTRUCTION INTEGRATION
  // ============================================

  test('should include appropriate tool instructions in system prompts', async ({ page }) => {
    let capturedPrompt = '';
    
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postData();
        if (postData) {
          const requestBody = JSON.parse(postData);
          if (requestBody.messages && requestBody.messages[0]?.role === 'system') {
            capturedPrompt = requestBody.messages[0].content;
          }
        }
      }
      await route.continue();
    });

    await selectChatMode(page, 'formal');
    await sendMessageAndGetResponse(page, 'Test for tool instructions');
    
    // Should include tool usage guidance for formal mode
    expect(capturedPrompt).toMatch(/tool|web_search|artifact|cite/i);
    
    // Switch to casual and check tool instructions are minimal
    await selectChatMode(page, 'casual');
    await sendMessageAndGetResponse(page, 'Test casual tool instructions');
    
    // Casual mode should have limited tool instructions
    expect(capturedPrompt).not.toMatch(/cite_manager|artifact_store/i);
  });

  // ============================================
  // PERFORMANCE & RELIABILITY
  // ============================================

  test('should generate system prompts consistently under load', async ({ page }) => {
    const prompts: string[] = [];
    
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postData();
        if (postData) {
          const requestBody = JSON.parse(postData);
          if (requestBody.messages && requestBody.messages[0]?.role === 'system') {
            prompts.push(requestBody.messages[0].content);
          }
        }
      }
      await route.continue();
    });

    await selectChatMode(page, 'formal');
    
    // Send multiple rapid requests
    const testMessages = [
      'First test message',
      'Second test message', 
      'Third test message'
    ];
    
    for (const message of testMessages) {
      await sendMessageAndGetResponse(page, message);
      await page.waitForTimeout(100); // Small delay
    }
    
    // All prompts should be consistent for same mode
    expect(prompts.length).toBeGreaterThanOrEqual(testMessages.length);
    
    // Check consistency (allowing for minor variations due to context)
    const basePrompt = prompts[0];
    for (let i = 1; i < prompts.length; i++) {
      // Core prompt elements should remain consistent
      expect(prompts[i]).toContain('RESEARCH');
      expect(prompts[i]).toMatch(/akademik|academic/i);
    }
  });

  test('should handle prompt generation errors gracefully', async ({ page }) => {
    // Simulate persona service failure
    await page.route('**/api/persona/**', route => route.abort());
    
    await selectChatMode(page, 'formal');
    
    // Should fall back to default prompt
    const response = await sendMessageAndGetResponse(page, 'Test with persona service error');
    
    // Should still get a response (using fallback)
    expect(response.length).toBeGreaterThan(10);
    
    // Should maintain basic academic assistance
    expect(response).toMatch(/(?:bantu|membantu|akademik|makalah|penelitian)/i);
  });

  // ============================================
  // PROMPT VALIDATION TESTS
  // ============================================

  test('should validate generated prompts meet quality standards', async ({ page }) => {
    let capturedPrompt = '';
    
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postData();
        if (postData) {
          const requestBody = JSON.parse(postData);
          if (requestBody.messages && requestBody.messages[0]?.role === 'system') {
            capturedPrompt = requestBody.messages[0].content;
          }
        }
      }
      await route.continue();
    });

    await selectChatMode(page, 'formal');
    await sendMessageAndGetResponse(page, 'Test prompt quality validation');
    
    // Validate prompt quality
    expect(capturedPrompt.length).toBeGreaterThan(100); // Not too short
    expect(capturedPrompt.length).toBeLessThan(4000); // Not too long
    
    // Should contain clear role definition
    expect(capturedPrompt).toMatch(/(?:PERAN|ROLE|MODE)/i);
    
    // Should contain communication style guidance
    expect(capturedPrompt).toMatch(/(?:GAYA|STYLE|bahasa|komunikasi)/i);
    
    // Should be well-structured
    expect(capturedPrompt).toMatch(/(?:\n\n|\n-|\n•)/); // Has formatting
  });
});