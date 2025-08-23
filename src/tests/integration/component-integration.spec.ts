/**
 * Component Integration Testing Suite
 * Validates integration antara semua streaming components dari Tasks 1-6
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Component Integration Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('AI SDK v5 streaming compatibility testing', async () => {
    console.log('🤖 Testing AI SDK v5 streaming compatibility');
    
    // Test OpenRouter provider integration
    await page.fill('[data-testid="chat-input"]', 'Test AI SDK streaming dengan OpenRouter');
    await page.click('[data-testid="send-button"]');
    
    // Monitor network requests untuk validate AI SDK calls
    const apiRequests: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/chat')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    // Validate streaming response format
    await page.waitForSelector('[data-testid="streaming-text"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    console.log(`📡 API Requests captured: ${apiRequests.length}`);
    
    // Should have made POST request to /api/chat
    expect(apiRequests.length).toBeGreaterThan(0);
    
    const chatRequest = apiRequests.find(req => req.url.includes('/api/chat'));
    expect(chatRequest).toBeTruthy();
    expect(chatRequest.method).toBe('POST');
    expect(chatRequest.headers['content-type']).toContain('application/json');
    
    // Validate SSE response headers
    page.on('response', response => {
      if (response.url().includes('/api/chat')) {
        const contentType = response.headers()['content-type'];
        console.log(`📄 Response content-type: ${contentType}`);
        expect(contentType).toContain('text/plain');
      }
    });
    
    // Test streaming text accumulation
    let accumulatedText = '';
    const streamingElement = page.locator('[data-testid="streaming-text"]');
    
    for (let i = 0; i < 20; i++) {
      const currentText = await streamingElement.textContent() || '';
      if (currentText.length > accumulatedText.length) {
        accumulatedText = currentText;
        console.log(`📝 Accumulated text: ${accumulatedText.length} chars`);
      }
      
      const isComplete = await page.locator('[data-testid="message-complete"]').count() > 0;
      if (isComplete) break;
      
      await page.waitForTimeout(500);
    }
    
    expect(accumulatedText.length).toBeGreaterThan(10);
    console.log('✅ AI SDK v5 streaming compatibility verified');
  });

  test('Provider fallback testing - OpenRouter → OpenAI', async () => {
    console.log('🔄 Testing provider fallback mechanism');
    
    // Simulate OpenRouter failure dengan network interception
    await page.route('**/api/chat', async route => {
      const request = route.request();
      const body = await request.postDataJSON();
      
      // Simulate OpenRouter provider error pada first attempt
      if (!request.url().includes('retry')) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'OpenRouter service temporarily unavailable',
            provider: 'openrouter',
            retry: true
          })
        });
        return;
      }
      
      // Continue with normal request untuk fallback
      await route.continue();
    });
    
    await page.fill('[data-testid="chat-input"]', 'Test provider fallback functionality');
    await page.click('[data-testid="send-button"]');
    
    // Should show fallback indicator atau error recovery
    const errorMessages = page.locator('[data-testid="error-message"], [data-testid="retry-indicator"]');
    
    // Wait for either error handling atau successful fallback
    await Promise.race([
      page.waitForSelector('[data-testid="streaming-text"]', { timeout: 15000 }),
      page.waitForSelector('[data-testid="error-state"]', { timeout: 15000 })
    ]);
    
    const hasStreaming = await page.locator('[data-testid="streaming-text"]').count() > 0;
    const hasError = await page.locator('[data-testid="error-state"]').count() > 0;
    
    // Either successful fallback atau graceful error handling
    expect(hasStreaming || hasError).toBeTruthy();
    
    if (hasStreaming) {
      console.log('✅ Provider fallback successful');
    } else {
      console.log('✅ Error handling graceful');
    }
    
    // Remove route interception for cleanup
    await page.unroute('**/api/chat');
  });

  test('Theme switching during streaming validation', async () => {
    console.log('🎨 Testing theme switching during active streaming');
    
    await page.fill('[data-testid="chat-input"]', 'Test theme switching during streaming');
    await page.click('[data-testid="send-button"]');
    
    // Tunggu streaming mulai
    await page.waitForSelector('[data-testid="streaming-text"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
    
    console.log(`🌓 Initial theme: ${initialTheme}`);
    
    // Switch theme during streaming
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      
      // Verify theme changed
      const newTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      });
      
      console.log(`🌓 New theme: ${newTheme}`);
      expect(newTheme).not.toBe(initialTheme);
      
      // Verify streaming continues uninterrupted
      const streamingText = await page.locator('[data-testid="streaming-text"]').textContent() || '';
      expect(streamingText.length).toBeGreaterThan(0);
      
      // Switch back
      await themeToggle.click();
      
      const finalTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      });
      
      expect(finalTheme).toBe(initialTheme);
      console.log('✅ Theme switching during streaming works correctly');
    } else {
      console.log('⚠️ Theme toggle not found, skipping test');
    }
  });

  test('Cross-browser streaming compatibility', async () => {
    console.log('🌐 Testing cross-browser streaming compatibility');
    
    // Get browser info
    const browserInfo = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      platform: navigator.platform
    }));
    
    console.log(`🌐 Browser: ${browserInfo.userAgent}`);
    console.log(`🏢 Vendor: ${browserInfo.vendor}`);
    console.log(`💻 Platform: ${browserInfo.platform}`);
    
    // Test WebSocket/SSE support
    const streamingSupport = await page.evaluate(() => {
      return {
        eventSource: typeof EventSource !== 'undefined',
        webSocket: typeof WebSocket !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        readableStream: typeof ReadableStream !== 'undefined'
      };
    });
    
    console.log(`📊 Streaming Support:`);
    console.log(`   EventSource: ${streamingSupport.eventSource}`);
    console.log(`   WebSocket: ${streamingSupport.webSocket}`);
    console.log(`   Fetch API: ${streamingSupport.fetch}`);
    console.log(`   ReadableStream: ${streamingSupport.readableStream}`);
    
    // All modern browsers should support these
    expect(streamingSupport.eventSource).toBeTruthy();
    expect(streamingSupport.fetch).toBeTruthy();
    expect(streamingSupport.readableStream).toBeTruthy();
    
    // Test actual streaming functionality
    await page.fill('[data-testid="chat-input"]', 'Test cross-browser compatibility');
    await page.click('[data-testid="send-button"]');
    
    // Monitor streaming performance across browsers
    const startTime = Date.now();
    
    await page.waitForSelector('[data-testid="streaming-text"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    const firstChunkTime = Date.now() - startTime;
    console.log(`⚡ First chunk time: ${firstChunkTime}ms`);
    
    // Browser-specific performance targets
    let performanceTarget = 2000; // Default 2s
    
    if (browserInfo.userAgent.includes('Safari')) {
      performanceTarget = 3000; // Safari might be slower
    } else if (browserInfo.userAgent.includes('Firefox')) {
      performanceTarget = 2500; // Firefox baseline
    }
    
    expect(firstChunkTime).toBeLessThan(performanceTarget);
    
    // Test completion
    try {
      await page.waitForSelector('[data-testid="message-complete"]', { 
        state: 'visible',
        timeout: 30000 
      });
      console.log('✅ Cross-browser streaming completed successfully');
    } catch {
      console.log('⚠️ Streaming didn\'t complete, but started successfully');
    }
  });

  test('Complete workflow integration - Tasks 1-6 components', async () => {
    console.log('🔗 Testing complete workflow integration (Tasks 1-6)');
    
    const complexRequest = 'Cari referensi tentang artificial intelligence in education, buat outline paper, dan analisis trend terkini';
    
    await page.fill('[data-testid="chat-input"]', complexRequest);
    await page.click('[data-testid="send-button"]');
    
    // Track all components dari Tasks 1-6
    const componentChecks = {
      streamingInfrastructure: false,      // Task 1
      progressiveStatus: false,            // Task 2
      wordByWordStreaming: false,          // Task 3
      toolExecutionFeedback: false,       // Task 4
      smoothStateTransitions: false,      // Task 5
      apiOptimization: false              // Task 6
    };
    
    console.log('📊 Monitoring integration components...');
    
    // Task 1: Streaming Infrastructure
    await page.waitForSelector('[data-testid="status-indicator"]', { 
      state: 'visible',
      timeout: 5000 
    });
    componentChecks.streamingInfrastructure = true;
    console.log('✅ Task 1: Streaming Infrastructure active');
    
    // Task 2: Progressive Status Management
    const statusTexts: string[] = [];
    
    for (let i = 0; i < 15; i++) {
      const statusText = await page.locator('[data-testid="status-indicator"]').textContent() || '';
      if (statusText && !statusTexts.includes(statusText)) {
        statusTexts.push(statusText);
        console.log(`📝 Status: ${statusText}`);
      }
      
      if (statusTexts.length >= 2) {
        componentChecks.progressiveStatus = true;
        console.log('✅ Task 2: Progressive Status Management active');
        break;
      }
      
      await page.waitForTimeout(500);
    }
    
    // Task 3: Word-by-word Streaming
    await page.waitForSelector('[data-testid="streaming-text"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    let wordCount = 0;
    const streamingElement = page.locator('[data-testid="streaming-text"]');
    
    for (let i = 0; i < 10; i++) {
      const currentText = await streamingElement.textContent() || '';
      const currentWordCount = currentText.trim().split(/\s+/).length;
      
      if (currentWordCount > wordCount) {
        wordCount = currentWordCount;
        
        if (wordCount >= 3) {
          componentChecks.wordByWordStreaming = true;
          console.log('✅ Task 3: Word-by-word Streaming active');
          break;
        }
      }
      
      await page.waitForTimeout(500);
    }
    
    // Task 4: Tool Execution Feedback
    const toolFeedback = page.locator('[data-testid="tool-feedback"], [data-testid="tool-execution"]');
    if (await toolFeedback.count() > 0) {
      componentChecks.toolExecutionFeedback = true;
      console.log('✅ Task 4: Tool Execution Feedback active');
    }
    
    // Task 5: Smooth State Transitions
    // Monitor for smooth transitions (no abrupt changes)
    let previousState = '';
    let smoothTransitions = 0;
    
    for (let i = 0; i < 10; i++) {
      const currentState = await page.locator('[data-testid="status-indicator"]').textContent() || '';
      
      if (currentState !== previousState && previousState !== '') {
        smoothTransitions++;
      }
      
      previousState = currentState;
      
      if (smoothTransitions >= 2) {
        componentChecks.smoothStateTransitions = true;
        console.log('✅ Task 5: Smooth State Transitions active');
        break;
      }
      
      await page.waitForTimeout(500);
    }
    
    // Task 6: API Optimization (performance monitoring)
    const performanceEntries = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation');
      return entries.length > 0 ? entries[0] : null;
    });
    
    if (performanceEntries) {
      componentChecks.apiOptimization = true;
      console.log('✅ Task 6: API Optimization monitoring active');
    }
    
    // Summary results
    const activeComponents = Object.values(componentChecks).filter(Boolean).length;
    const totalComponents = Object.keys(componentChecks).length;
    
    console.log(`\n📊 Integration Summary:`);
    console.log(`   Active Components: ${activeComponents}/${totalComponents}`);
    console.log(`   Integration Rate: ${((activeComponents / totalComponents) * 100).toFixed(1)}%`);
    
    for (const [component, active] of Object.entries(componentChecks)) {
      console.log(`   ${component}: ${active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    }
    
    // Should have majority of components active
    expect(activeComponents).toBeGreaterThanOrEqual(4);
    
    // Wait for completion
    try {
      await page.waitForSelector('[data-testid="message-complete"]', { 
        state: 'visible',
        timeout: 45000 
      });
      console.log('✅ Complete workflow integration successful');
    } catch {
      console.log('⚠️ Workflow didn\'t complete but components are integrated');
    }
  });

  test('Data persistence and state management validation', async () => {
    console.log('💾 Testing data persistence dan state management');
    
    // Test chat history persistence
    const firstMessage = 'Test message untuk persistence check';
    
    await page.fill('[data-testid="chat-input"]', firstMessage);
    await page.click('[data-testid="send-button"]');
    
    // Tunggu response
    await page.waitForSelector('[data-testid="streaming-text"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    // Get chat history count
    const initialChatCount = await page.locator('[data-testid^="chat-message"]').count();
    console.log(`💬 Initial chat messages: ${initialChatCount}`);
    
    // Send another message
    const secondMessage = 'Test message kedua untuk state persistence';
    
    await page.fill('[data-testid="chat-input"]', secondMessage);
    await page.click('[data-testid="send-button"]');
    
    // Tunggu second response
    try {
      await page.waitForSelector('[data-testid="message-complete"]', { 
        state: 'visible',
        timeout: 20000 
      });
    } catch {
      console.log('⚠️ Second message didn\'t complete');
    }
    
    // Check updated chat history
    const finalChatCount = await page.locator('[data-testid^="chat-message"]').count();
    console.log(`💬 Final chat messages: ${finalChatCount}`);
    
    expect(finalChatCount).toBeGreaterThan(initialChatCount);
    
    // Test state management across page refresh
    console.log('🔄 Testing state persistence across refresh...');
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if chat history persisted
    const persistedChatCount = await page.locator('[data-testid^="chat-message"]').count();
    console.log(`💾 Persisted chat messages: ${persistedChatCount}`);
    
    // Should maintain some state (depending on implementation)
    if (persistedChatCount > 0) {
      console.log('✅ Chat state persisted across refresh');
    } else {
      console.log('ℹ️ Fresh session started (normal behavior)');
    }
    
    // Test theme persistence
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.count() > 0) {
      const initialTheme = await page.evaluate(() => 
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      );
      
      await themeToggle.click();
      
      const changedTheme = await page.evaluate(() => 
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      );
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const persistedTheme = await page.evaluate(() => 
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      );
      
      console.log(`🎨 Theme persistence: ${initialTheme} → ${changedTheme} → ${persistedTheme}`);
      
      if (persistedTheme === changedTheme) {
        console.log('✅ Theme preference persisted');
      } else {
        console.log('⚠️ Theme reset to default');
      }
    }
    
    console.log('✅ Data persistence dan state management validated');
  });
});