/**
 * P08.4: Integration Point Compatibility Verification
 * Comprehensive testing of persona system integration with all existing features
 * 
 * Test Scenarios:
 * - AI SDK v5 streaming integration
 * - Provider fallback compatibility (OpenRouter → OpenAI)
 * - Theme switching during persona usage
 * - Workflow engine integration
 * - Artifact management integration
 * - Chat history persistence
 * - State management consistency
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('P08.4: Integration Point Compatibility Verification', () => {

  // Integration test scenarios
  const INTEGRATION_SCENARIOS = {
    streaming_compatibility: {
      description: 'AI SDK v5 streaming with persona injection',
      testCases: [
        {
          mode: 'formal',
          query: 'Jelaskan metodologi penelitian kuantitatif secara detail',
          expectedStreaming: true,
          expectedChunks: 5, // Minimum chunks expected
          maxLatency: 1000 // First chunk within 1s
        },
        {
          mode: 'casual', 
          query: 'Gimana sih cara belajar programming yang efektif?',
          expectedStreaming: true,
          expectedChunks: 3,
          maxLatency: 1000
        }
      ]
    },
    provider_fallback: {
      description: 'Provider switching with persona consistency',
      testCases: [
        {
          mode: 'formal',
          simulateOpenRouterFailure: true,
          query: 'Bagaimana cara menvalidasi hipotesis penelitian?',
          expectedFallbackToOpenAI: true,
          expectedPersonaBehavior: 'academic'
        },
        {
          mode: 'casual',
          simulateOpenRouterFailure: true, 
          query: 'Lo tau gak perbedaan kualitatif sama kuantitatif?',
          expectedFallbackToOpenAI: true,
          expectedPersonaBehavior: 'conversational'
        }
      ]
    },
    theme_switching: {
      description: 'Theme changes during persona usage',
      testCases: [
        {
          mode: 'formal',
          startTheme: 'light',
          switchToTheme: 'dark',
          query: 'Test theme switching with formal mode',
          expectedPersonaPreservation: true
        },
        {
          mode: 'casual',
          startTheme: 'dark', 
          switchToTheme: 'light',
          query: 'Test theme switching dengan casual mode',
          expectedPersonaPreservation: true
        }
      ]
    },
    workflow_integration: {
      description: '8-phase workflow with persona awareness',
      testCases: [
        {
          mode: 'formal',
          phase: 1, // Topic Definition
          query: 'Bantu saya menentukan topik penelitian tentang AI ethics',
          expectedWorkflowProgression: true,
          expectedArtifactGeneration: true
        },
        {
          mode: 'formal',
          phase: 3, // Literature Review
          query: 'Buatkan literature review untuk topik AI ethics',
          expectedWorkflowProgression: true,
          expectedCitationGeneration: true
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

  async function sendMessageAndTrackStreaming(page: Page, message: string) {
    const streamingMetrics = {
      chunks: 0,
      firstChunkTime: 0,
      totalTime: 0,
      content: ''
    };

    // Set up streaming tracking
    const startTime = Date.now();
    let firstChunk = false;

    await page.fill('[data-testid="chat-input"]', message);
    await page.click('[data-testid="send-button"]');

    // Track streaming indicators and content updates
    while (true) {
      try {
        const streamingIndicator = await page.locator('[data-testid="streaming-indicator"]').isVisible();
        
        if (streamingIndicator && !firstChunk) {
          streamingMetrics.firstChunkTime = Date.now() - startTime;
          firstChunk = true;
        }

        const responseElement = page.locator('[data-testid="ai-response"]').last();
        const currentContent = await responseElement.textContent() || '';
        
        if (currentContent !== streamingMetrics.content) {
          streamingMetrics.chunks++;
          streamingMetrics.content = currentContent;
        }

        if (!streamingIndicator && currentContent.length > 0) {
          break;
        }

        await page.waitForTimeout(100);
      } catch (error) {
        // Streaming completed or error occurred
        break;
      }
    }

    streamingMetrics.totalTime = Date.now() - startTime;
    return streamingMetrics;
  }

  async function switchTheme(page: Page, theme: 'light' | 'dark') {
    await page.click('[data-testid="theme-toggle"]');
    
    // Verify theme change
    const html = page.locator('html');
    if (theme === 'dark') {
      await expect(html).toHaveClass(/dark/);
    } else {
      await expect(html).not.toHaveClass(/dark/);
    }
  }

  async function simulateProviderFailure(page: Page, provider: 'openrouter' | 'openai') {
    // Intercept and fail specific provider requests
    await page.route('**/api/chat', async (route) => {
      const request = route.request();
      const postData = request.postData();
      
      if (postData) {
        const body = JSON.parse(postData);
        // Check if request is for the failed provider
        if (body.provider === provider) {
          await route.abort('failed');
          return;
        }
      }
      
      await route.continue();
    });
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForChatReady(page);
    
    // Clear any existing state
    await page.evaluate(() => {
      localStorage.removeItem('makalah-chat-store');
      localStorage.removeItem('makalah-chat-mode');
      localStorage.removeItem('makalah-theme');
    });
    
    await page.reload();
    await waitForChatReady(page);
  });

  // ============================================
  // AI SDK V5 STREAMING INTEGRATION
  // ============================================

  test('should maintain streaming functionality with persona injection', async ({ page }) => {
    const scenarios = INTEGRATION_SCENARIOS.streaming_compatibility.testCases;
    
    for (const scenario of scenarios) {
      await selectChatMode(page, scenario.mode);
      
      const metrics = await sendMessageAndTrackStreaming(page, scenario.query);
      
      // Verify streaming occurred
      expect(metrics.chunks).toBeGreaterThanOrEqual(scenario.expectedChunks);
      expect(metrics.firstChunkTime).toBeLessThan(scenario.maxLatency);
      
      // Verify final content is substantial
      expect(metrics.content.length).toBeGreaterThan(100);
      
      // Verify persona behavior in streamed content
      if (scenario.mode === 'formal') {
        expect(metrics.content).toMatch(/(?:metodologi|struktur|akademik|penelitian)/i);
        expect(metrics.content).not.toMatch(/(?:gue|lo|gimana|sih)/i);
      } else {
        expect(metrics.content).toMatch(/(?:gue|lo|bisa|kayak|sih)/i);
        expect(metrics.content).not.toMatch(/(?:metodologi|sistematik|komprehensif)/i);
      }
      
      // Clean up for next scenario
      await page.evaluate(() => {
        localStorage.removeItem('makalah-chat-store');
        localStorage.removeItem('makalah-chat-mode');
      });
      await page.reload();
      await waitForChatReady(page);
    }
  });

  test('should handle SSE events properly with persona context', async ({ page }) => {
    await selectChatMode(page, 'formal');
    
    let sseEvents: any[] = [];
    
    // Intercept SSE events
    page.on('response', async (response) => {
      if (response.url().includes('/api/chat') && response.headers()['content-type']?.includes('text/event-stream')) {
        try {
          const body = await response.text();
          const events = body.split('\n\n').filter(e => e.startsWith('data:'));
          sseEvents.push(...events.map(e => JSON.parse(e.replace('data: ', ''))));
        } catch (error) {
          // Ignore parsing errors for this test
        }
      }
    });
    
    await sendMessageAndTrackStreaming(page, 'Jelaskan komponen utama dalam metodologi penelitian');
    
    // Verify SSE events were received
    expect(sseEvents.length).toBeGreaterThan(0);
    
    // Verify events contain streaming data
    const contentEvents = sseEvents.filter(event => event.type === 'content');
    expect(contentEvents.length).toBeGreaterThan(0);
  });

  // ============================================
  // PROVIDER FALLBACK COMPATIBILITY
  // ============================================

  test('should maintain persona behavior during provider fallback', async ({ page }) => {
    const scenarios = INTEGRATION_SCENARIOS.provider_fallback.testCases;
    
    for (const scenario of scenarios) {
      // Simulate OpenRouter failure
      await simulateProviderFailure(page, 'openrouter');
      
      await selectChatMode(page, scenario.mode);
      
      const metrics = await sendMessageAndTrackStreaming(page, scenario.query);
      
      // Should still get response (from fallback provider)
      expect(metrics.content.length).toBeGreaterThan(50);
      
      // Persona behavior should be maintained regardless of provider
      if (scenario.expectedPersonaBehavior === 'academic') {
        expect(metrics.content).toMatch(/(?:penelitian|metodologi|analisis|akademik)/i);
      } else if (scenario.expectedPersonaBehavior === 'conversational') {
        expect(metrics.content).toMatch(/(?:gue|lo|bisa|sih|kayak)/i);
      }
      
      // Clear route interceptions for next test
      await page.unroute('**/api/chat');
      
      await page.evaluate(() => {
        localStorage.removeItem('makalah-chat-store');
        localStorage.removeItem('makalah-chat-mode');
      });
      await page.reload();
      await waitForChatReady(page);
    }
  });

  test('should log provider fallback events in console', async ({ page }) => {
    const consoleMessages: string[] = [];
    
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    await simulateProviderFailure(page, 'openrouter');
    await selectChatMode(page, 'formal');
    await sendMessageAndTrackStreaming(page, 'Test provider fallback logging');
    
    // Should log fallback event
    const fallbackMessage = consoleMessages.find(msg => 
      msg.includes('Provider fallback') || msg.includes('OpenRouter failed')
    );
    expect(fallbackMessage).toBeDefined();
  });

  // ============================================
  // THEME SWITCHING INTEGRATION
  // ============================================

  test('should preserve persona context during theme switching', async ({ page }) => {
    const scenarios = INTEGRATION_SCENARIOS.theme_switching.testCases;
    
    for (const scenario of scenarios) {
      // Set initial theme
      if (scenario.startTheme === 'dark') {
        await switchTheme(page, 'dark');
      }
      
      await selectChatMode(page, scenario.mode);
      
      // Send message before theme switch
      const beforeMetrics = await sendMessageAndTrackStreaming(page, 'Initial message before theme switch');
      
      // Switch theme mid-conversation
      await switchTheme(page, scenario.switchToTheme);
      
      // Send another message after theme switch
      const afterMetrics = await sendMessageAndTrackStreaming(page, scenario.query);
      
      // Persona behavior should remain consistent
      const beforePersonaPattern = scenario.mode === 'formal' 
        ? /(?:metodologi|struktur|akademik)/i
        : /(?:gue|lo|bisa|kayak)/i;
        
      const afterPersonaPattern = beforePersonaPattern;
      
      expect(beforeMetrics.content).toMatch(beforePersonaPattern);
      expect(afterMetrics.content).toMatch(afterPersonaPattern);
      
      // Theme should have changed
      const html = page.locator('html');
      if (scenario.switchToTheme === 'dark') {
        await expect(html).toHaveClass(/dark/);
      } else {
        await expect(html).not.toHaveClass(/dark/);
      }
      
      // Clean up
      await page.evaluate(() => {
        localStorage.removeItem('makalah-chat-store');
        localStorage.removeItem('makalah-chat-mode');
      });
      await page.reload();
      await waitForChatReady(page);
    }
  });

  // ============================================
  // WORKFLOW ENGINE INTEGRATION
  // ============================================

  test('should integrate persona awareness with 8-phase workflow', async ({ page }) => {
    await selectChatMode(page, 'formal');
    
    // Verify workflow components are visible
    await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="artifact-list"]')).toBeVisible();
    
    // Test Phase 1: Topic Definition
    const phase1Query = 'Bantu saya menentukan topik penelitian tentang machine learning dalam pendidikan';
    const phase1Metrics = await sendMessageAndTrackStreaming(page, phase1Query);
    
    // Should provide academic guidance for topic selection
    expect(phase1Metrics.content).toMatch(/(?:topik|penelitian|scope|ruang lingkup|spesifik)/i);
    
    // Should update workflow progress
    await expect(page.locator('[data-testid="phase-1-indicator"]')).toHaveClass(/active|current/);
    
    // Test Phase 3: Literature Review
    const phase3Query = 'Sekarang bantu saya membuat literature review untuk topik tersebut';
    const phase3Metrics = await sendMessageAndTrackStreaming(page, phase3Query);
    
    // Should provide literature review guidance
    expect(phase3Metrics.content).toMatch(/(?:literature|literatur|referensi|sumber|review)/i);
    
    // Should generate artifacts for literature review
    await expect(page.locator('[data-testid="artifact-literature-review"]')).toBeVisible();
  });

  test('should handle workflow phase transitions with persona consistency', async ({ page }) => {
    await selectChatMode(page, 'formal');
    
    const phaseQueries = [
      'Tentukan topik penelitian saya', // Phase 1
      'Carikan referensi untuk topik ini', // Phase 2
      'Buatkan literature review', // Phase 3
      'Susun outline makalah', // Phase 4
      'Tulis draft pendahuluan' // Phase 5
    ];
    
    for (let i = 0; i < phaseQueries.length; i++) {
      const metrics = await sendMessageAndTrackStreaming(page, phaseQueries[i]);
      
      // All responses should maintain formal academic tone
      expect(metrics.content).toMatch(/(?:penelitian|metodologi|akademik|analisis)/i);
      expect(metrics.content).not.toMatch(/(?:gue|lo|gimana|sih)/i);
      
      // Should show progression in workflow
      await expect(page.locator(`[data-testid="phase-${i + 1}-indicator"]`)).toHaveClass(/active|completed/);
      
      await page.waitForTimeout(500); // Small delay between phases
    }
  });

  // ============================================
  // ARTIFACT MANAGEMENT INTEGRATION
  // ============================================

  test('should generate artifacts with persona-aware content', async ({ page }) => {
    await selectChatMode(page, 'formal');
    
    // Request artifact generation
    const query = 'Buatkan outline lengkap untuk makalah tentang artificial intelligence dalam healthcare';
    await sendMessageAndTrackStreaming(page, query);
    
    // Should generate artifact
    await expect(page.locator('[data-testid="artifact-outline"]')).toBeVisible({ timeout: 10000 });
    
    // Click to view artifact
    await page.click('[data-testid="artifact-outline"]');
    await expect(page.locator('[data-testid="artifact-popup"]')).toBeVisible();
    
    // Artifact content should reflect formal academic style
    const artifactContent = await page.locator('[data-testid="artifact-content"]').textContent();
    expect(artifactContent).toMatch(/(?:pendahuluan|metodologi|hasil|pembahasan|kesimpulan)/i);
    expect(artifactContent).not.toMatch(/(?:gue|lo|gimana)/i);
    
    // Close artifact popup
    await page.click('[data-testid="close-artifact-popup"]');
    await expect(page.locator('[data-testid="artifact-popup"]')).not.toBeVisible();
  });

  test('should maintain artifact associations across persona switches', async ({ page }) => {
    // Start with formal mode and create artifacts
    await selectChatMode(page, 'formal');
    await sendMessageAndTrackStreaming(page, 'Buatkan research notes tentang machine learning');
    
    // Verify artifact is created
    await expect(page.locator('[data-testid="artifact-research-notes"]')).toBeVisible();
    
    // Switch to casual mode (should start new conversation)
    await selectChatMode(page, 'casual');
    await sendMessageAndTrackStreaming(page, 'Gimana sih cara belajar coding?');
    
    // Artifacts should be separate for each mode
    await expect(page.locator('[data-testid="artifact-research-notes"]')).not.toBeVisible();
    
    // Switch back to formal mode
    await selectChatMode(page, 'formal');
    
    // Original artifact should be restored
    await expect(page.locator('[data-testid="artifact-research-notes"]')).toBeVisible();
  });

  // ============================================
  // CHAT HISTORY PERSISTENCE
  // ============================================

  test('should maintain separate chat histories per persona mode', async ({ page }) => {
    // Create formal conversation
    await selectChatMode(page, 'formal');
    await sendMessageAndTrackStreaming(page, 'Bantu saya menulis metodologi penelitian kualitatif');
    
    const formalMessageCount = await page.locator('[data-testid="chat-message"]').count();
    expect(formalMessageCount).toBe(2); // User message + AI response
    
    // Switch to casual mode
    await selectChatMode(page, 'casual');
    
    // Should start fresh conversation
    const casualMessageCount = await page.locator('[data-testid="chat-message"]').count();
    expect(casualMessageCount).toBe(0);
    
    // Add casual conversation
    await sendMessageAndTrackStreaming(page, 'Halo! Gimana cara belajar yang efektif?');
    
    const casualAfterCount = await page.locator('[data-testid="chat-message"]').count();
    expect(casualAfterCount).toBe(2);
    
    // Switch back to formal
    await selectChatMode(page, 'formal');
    
    // Should restore formal conversation
    const restoredFormalCount = await page.locator('[data-testid="chat-message"]').count();
    expect(restoredFormalCount).toBe(formalMessageCount);
  });

  test('should persist persona mode selection across page reloads', async ({ page }) => {
    // Select casual mode
    await selectChatMode(page, 'casual');
    await sendMessageAndTrackStreaming(page, 'Test message');
    
    // Reload page
    await page.reload();
    await waitForChatReady(page);
    
    // Should restore casual mode
    const storedMode = await page.evaluate(() => localStorage.getItem('makalah-chat-mode'));
    expect(storedMode).toBe('"casual"');
    
    // UI should reflect casual mode
    await expect(page.locator('[data-testid="chat-mode-indicator"]')).toContainText('💬');
    
    // Workflow should not be visible (casual mode)
    await expect(page.locator('[data-testid="workflow-progress"]')).not.toBeVisible();
  });

  // ============================================
  // STATE MANAGEMENT CONSISTENCY
  // ============================================

  test('should maintain consistent state across multiple integrations', async ({ page }) => {
    // Complex integration scenario
    await switchTheme(page, 'dark'); // Start with dark theme
    await selectChatMode(page, 'formal'); // Select formal mode
    
    // Create conversation with artifacts
    await sendMessageAndTrackStreaming(page, 'Buatkan outline penelitian tentang AI ethics');
    
    // Verify initial state
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('[data-testid="chat-mode-indicator"]')).toContainText('🎓');
    await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible();
    
    // Switch theme mid-conversation
    await switchTheme(page, 'light');
    
    // Add more content
    await sendMessageAndTrackStreaming(page, 'Lanjutkan dengan literature review');
    
    // All state should be consistent
    await expect(page.locator('html')).not.toHaveClass(/dark/); // Theme changed
    await expect(page.locator('[data-testid="chat-mode-indicator"]')).toContainText('🎓'); // Mode preserved
    await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible(); // Workflow preserved
    
    // Message count should reflect both interactions
    const messageCount = await page.locator('[data-testid="chat-message"]').count();
    expect(messageCount).toBe(4); // 2 user + 2 AI messages
  });

  test('should handle concurrent operations without state corruption', async ({ page }) => {
    await selectChatMode(page, 'formal');
    
    // Start multiple operations simultaneously
    const operations = [
      () => switchTheme(page, 'dark'),
      () => sendMessageAndTrackStreaming(page, 'Test concurrent message 1'),
      () => page.click('[data-testid="sidebar-toggle"]'), // Toggle sidebar
      () => sendMessageAndTrackStreaming(page, 'Test concurrent message 2')
    ];
    
    // Execute operations with slight delays
    const results = await Promise.allSettled([
      operations[0](),
      new Promise(resolve => setTimeout(() => resolve(operations[1]()), 100)),
      new Promise(resolve => setTimeout(() => resolve(operations[2]()), 200)),
      new Promise(resolve => setTimeout(() => resolve(operations[3]()), 300))
    ]);
    
    // Most operations should succeed
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBeGreaterThanOrEqual(3);
    
    // Final state should be consistent
    await expect(page.locator('[data-testid="chat-mode-indicator"]')).toContainText('🎓');
  });
});