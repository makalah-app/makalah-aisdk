/**
 * E2E Streaming Flow Tests - Comprehensive streaming scenario validation
 * Tests semua aspects dari streaming UX dengan real environment
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Streaming Flow Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    
    // Tunggu halaman selesai load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="chat-area"]')).toBeVisible();
  });

  test('Complete streaming flow - thinking → browsing → tool execution → text streaming', async () => {
    console.log('🧪 Testing complete streaming flow dengan Indonesian status messages');
    
    // Kirim message yang akan trigger research dan tool execution  
    const testMessage = 'Cari referensi akademik tentang artificial intelligence in education untuk penelitian saya';
    
    await page.fill('[data-testid="chat-input"]', testMessage);
    await page.click('[data-testid="send-button"]');
    
    // Phase 1: Thinking phase
    console.log('📝 Validating thinking phase...');
    const thinkingStatus = page.locator('[data-testid="status-indicator"]');
    await expect(thinkingStatus).toContainText('Agent berpikir');
    
    // Tunggu thinking phase transition
    await page.waitForSelector('[data-testid="phase-thinking"]', { 
      state: 'visible',
      timeout: 5000 
    });
    
    // Phase 2: Browsing phase  
    console.log('🔍 Validating browsing phase...');
    await expect(thinkingStatus).toContainText('Agent menjelajah internet');
    
    await page.waitForSelector('[data-testid="phase-browsing"]', { 
      state: 'visible', 
      timeout: 10000 
    });
    
    // Phase 3: Tool execution feedback
    console.log('🔧 Validating tool execution feedback...');
    const toolFeedback = page.locator('[data-testid="tool-feedback"]');
    await expect(toolFeedback).toBeVisible({ timeout: 15000 });
    
    // Validate tool execution messages  
    const toolMessages = page.locator('[data-testid="tool-message"]');
    await expect(toolMessages.first()).toBeVisible();
    
    // Phase 4: Text streaming
    console.log('✍️ Validating text streaming...');
    const streamingText = page.locator('[data-testid="streaming-text"]');
    await expect(streamingText).toBeVisible({ timeout: 20000 });
    
    // Validate word-by-word streaming
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="streaming-text"]');
      return element && element.textContent && element.textContent.length > 50;
    }, { timeout: 30000 });
    
    // Final validation
    console.log('✅ Validating final response...');
    await page.waitForSelector('[data-testid="message-complete"]', { 
      state: 'visible',
      timeout: 45000 
    });
    
    const finalText = await streamingText.textContent();
    expect(finalText).toBeTruthy();
    expect(finalText!.length).toBeGreaterThan(100);
  });

  test('Multi-phase streaming dengan tool execution sequence', async () => {
    console.log('🧪 Testing multi-phase streaming dengan sequential tools');
    
    const complexMessage = 'Buatkan outline paper tentang AI in education, cari referensi terkait, dan simpan hasilnya';
    
    await page.fill('[data-testid="chat-input"]', complexMessage);
    await page.click('[data-testid="send-button"]');
    
    // Track phase transitions
    const phaseIndicators = [
      'phase-thinking',
      'phase-browsing', 
      'phase-planning',
      'phase-executing',
      'phase-streaming'
    ];
    
    let completedPhases = 0;
    
    for (const phase of phaseIndicators) {
      try {
        await page.waitForSelector(`[data-testid="${phase}"]`, { 
          state: 'visible',
          timeout: 15000 
        });
        completedPhases++;
        console.log(`✅ Phase completed: ${phase} (${completedPhases}/${phaseIndicators.length})`);
      } catch (error) {
        console.log(`⚠️ Phase skipped atau timeout: ${phase}`);
      }
    }
    
    // Minimal 3 phases harus completed untuk complex request
    expect(completedPhases).toBeGreaterThanOrEqual(3);
    
    // Validate multiple tool executions
    const toolExecutions = page.locator('[data-testid="tool-execution"]');
    await expect(toolExecutions).toHaveCount({ min: 2 }, { timeout: 30000 });
    
    // Final streaming text validation
    const finalResponse = page.locator('[data-testid="final-response"]');
    await expect(finalResponse).toBeVisible({ timeout: 45000 });
    
    const responseText = await finalResponse.textContent();
    expect(responseText).toContain('outline');
    expect(responseText).toContain('referensi');
  });

  test('Error recovery scenarios during streaming', async () => {
    console.log('🧪 Testing error recovery mechanisms');
    
    // Test dengan potentially problematic input
    const errorProneMessage = 'Cari informasi tentang topik yang sangat spesifik dan rumit yang mungkin tidak ada referensinya';
    
    await page.fill('[data-testid="chat-input"]', errorProneMessage);
    await page.click('[data-testid="send-button"]');
    
    // Monitor untuk error states
    const errorIndicator = page.locator('[data-testid="error-indicator"]');
    const retryIndicator = page.locator('[data-testid="retry-indicator"]');
    
    // Tunggu sampai ada response atau error
    await Promise.race([
      page.waitForSelector('[data-testid="message-complete"]', { timeout: 60000 }),
      page.waitForSelector('[data-testid="error-state"]', { timeout: 60000 })
    ]);
    
    // Validate bahwa system handle error gracefully
    const hasError = await page.locator('[data-testid="error-state"]').count() > 0;
    const hasResponse = await page.locator('[data-testid="message-complete"]').count() > 0;
    
    // Either successful response atau graceful error handling
    expect(hasError || hasResponse).toBeTruthy();
    
    if (hasError) {
      console.log('✅ Error handled gracefully');
      // Check error message is in Indonesian
      const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorMessage).toContain('maaf');
    } else {
      console.log('✅ Request completed successfully despite complexity');
    }
  });

  test('Network interruption handling during streaming', async () => {
    console.log('🧪 Testing network interruption handling');
    
    await page.fill('[data-testid="chat-input"]', 'Cari referensi tentang machine learning');
    await page.click('[data-testid="send-button"]');
    
    // Tunggu streaming mulai
    await page.waitForSelector('[data-testid="streaming-text"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    // Simulate network interruption
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);
    
    // Restore network
    await page.context().setOffline(false);
    
    // Validate reconnection handling
    const reconnectIndicator = page.locator('[data-testid="reconnect-indicator"]');
    
    // System should either:
    // 1. Complete original request
    // 2. Show reconnection message
    // 3. Allow retry
    
    await Promise.race([
      page.waitForSelector('[data-testid="message-complete"]', { timeout: 30000 }),
      page.waitForSelector('[data-testid="reconnect-message"]', { timeout: 30000 }),
      page.waitForSelector('[data-testid="retry-button"]', { timeout: 30000 })
    ]);
    
    const hasComplete = await page.locator('[data-testid="message-complete"]').count() > 0;
    const hasReconnect = await page.locator('[data-testid="reconnect-message"]').count() > 0;
    const hasRetry = await page.locator('[data-testid="retry-button"]').count() > 0;
    
    expect(hasComplete || hasReconnect || hasRetry).toBeTruthy();
    console.log('✅ Network interruption handled properly');
  });

  test('Long message streaming performance validation', async () => {
    console.log('🧪 Testing long message streaming performance');
    
    const longRequest = 'Buatkan analisis komprehensif tentang perkembangan artificial intelligence dalam pendidikan, termasuk sejarah, metodologi, implementasi, tantangan, dan prospek masa depan dengan referensi akademik yang lengkap';
    
    const startTime = Date.now();
    
    await page.fill('[data-testid="chat-input"]', longRequest);
    await page.click('[data-testid="send-button"]');
    
    // Track streaming metrics
    let chunkCount = 0;
    let firstChunkTime = 0;
    
    // Monitor streaming chunks
    await page.locator('[data-testid="streaming-text"]').waitFor({ 
      state: 'visible',
      timeout: 15000 
    });
    
    firstChunkTime = Date.now() - startTime;
    console.log(`⚡ First chunk received in: ${firstChunkTime}ms`);
    
    // Monitor streaming progress
    let previousLength = 0;
    const streamingElement = page.locator('[data-testid="streaming-text"]');
    
    // Track chunks untuk 30 seconds atau sampai complete
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(500);
      
      const currentText = await streamingElement.textContent() || '';
      if (currentText.length > previousLength) {
        chunkCount++;
        previousLength = currentText.length;
      }
      
      const isComplete = await page.locator('[data-testid="message-complete"]').count() > 0;
      if (isComplete) break;
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log(`📊 Streaming Performance Metrics:`);
    console.log(`   First chunk: ${firstChunkTime}ms (target: <1000ms)`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Chunks received: ${chunkCount}`);
    console.log(`   Final text length: ${previousLength} chars`);
    
    // Performance assertions
    expect(firstChunkTime).toBeLessThan(2000); // First chunk dalam 2 seconds
    expect(chunkCount).toBeGreaterThan(5); // Minimal 5 chunks untuk long response
    expect(previousLength).toBeGreaterThan(500); // Response minimal 500 chars
    expect(totalTime).toBeLessThan(60000); // Complete dalam 60 seconds
  });

  test('Concurrent user interactions during streaming', async () => {
    console.log('🧪 Testing concurrent user interactions during streaming');
    
    await page.fill('[data-testid="chat-input"]', 'Cari informasi tentang deep learning');
    await page.click('[data-testid="send-button"]');
    
    // Tunggu streaming mulai
    await page.waitForSelector('[data-testid="streaming-text"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    // Test concurrent interactions
    console.log('🔄 Testing theme toggle during streaming');
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      await themeToggle.click(); // Toggle back
    }
    
    console.log('📱 Testing sidebar toggle during streaming');
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    if (await sidebarToggle.count() > 0) {
      await sidebarToggle.click();
      await page.waitForTimeout(500);
      await sidebarToggle.click(); // Toggle back
    }
    
    console.log('⏸️ Testing streaming controls if available');
    const pauseButton = page.locator('[data-testid="pause-streaming"]');
    if (await pauseButton.count() > 0) {
      await pauseButton.click();
      await page.waitForTimeout(1000);
      
      const resumeButton = page.locator('[data-testid="resume-streaming"]');
      if (await resumeButton.count() > 0) {
        await resumeButton.click();
      }
    }
    
    // Validate streaming continues properly
    await page.waitForSelector('[data-testid="message-complete"]', { 
      state: 'visible',
      timeout: 30000 
    });
    
    const finalText = await page.locator('[data-testid="streaming-text"]').textContent();
    expect(finalText).toBeTruthy();
    expect(finalText!.length).toBeGreaterThan(50);
    
    console.log('✅ Concurrent interactions handled properly');
  });
});