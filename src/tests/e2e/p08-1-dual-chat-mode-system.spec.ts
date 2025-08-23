/**
 * P08.1: End-to-End Dual Chat Mode System Testing
 * Comprehensive validation of dual chat mode functionality from selection to AI responses
 * 
 * Test Scenarios:
 * - Modal interaction and mode selection
 * - System prompt injection validation  
 * - AI response behavior verification
 * - Cross-browser compatibility
 * - Mobile responsive functionality
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('P08.1: Dual Chat Mode System - End-to-End Testing', () => {
  
  // Test data dan helper functions
  const CHAT_MODES = {
    formal: {
      displayName: 'Percakapan yang harus bikin proyek',
      description: 'Mode akademik formal dengan workflow 8-fase',
      icon: '🎓',
      expectedSystemBehavior: 'academic',
      testQuery: 'Saya butuh bantuan menulis makalah tentang machine learning',
      expectedResponsePattern: /(?:akademik|formal|struktur|metodologi|referensi|sitasi)/i
    },
    casual: {
      displayName: 'Percakapan bebas tanpa proyek', 
      description: 'Mode santai dengan gaya bahasa gue-lo Jakarta',
      icon: '💬',
      expectedSystemBehavior: 'casual',
      testQuery: 'Gimana sih cara belajar machine learning yang efektif?',
      expectedResponsePattern: /(?:gue|lo|gimana|sih|banget|keren|asik)/i
    }
  };

  // Helper untuk wait loading states
  async function waitForChatReady(page: Page) {
    await page.waitForSelector('[data-testid="chat-area"]', { state: 'visible' });
    await page.waitForLoadState('networkidle');
  }

  // Helper untuk open modal dan select mode
  async function selectChatMode(page: Page, mode: 'formal' | 'casual') {
    // Click new chat button to open modal
    await page.click('[data-testid="new-chat-button"]');
    
    // Wait for modal to appear
    await expect(page.locator('.modal-backdrop')).toBeVisible();
    await expect(page.locator('text=Pilih Jenis Chat')).toBeVisible();
    
    // Verify modal content
    const modeData = CHAT_MODES[mode];
    await expect(page.locator(`text=${modeData.displayName}`)).toBeVisible();
    await expect(page.locator(`text=${modeData.description}`)).toBeVisible();
    
    // Select the mode
    await page.click(`button:has-text("${modeData.displayName}")`);
    
    // Wait for modal to close
    await expect(page.locator('.modal-backdrop')).not.toBeVisible();
    
    return modeData;
  }

  // Helper untuk send message dan verify response
  async function sendMessageAndVerifyResponse(page: Page, message: string, expectedPattern: RegExp) {
    // Send message
    await page.fill('[data-testid="chat-input"]', message);
    await page.click('[data-testid="send-button"]');
    
    // Wait for streaming to complete
    await page.waitForSelector('[data-testid="ai-response"]', { 
      state: 'visible',
      timeout: 30000
    });
    
    // Wait for streaming indicators to disappear
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="streaming-indicator"]'),
      {},
      { timeout: 30000 }
    );
    
    // Get the response
    const responseElement = page.locator('[data-testid="ai-response"]').last();
    const responseText = await responseElement.textContent();
    
    // Verify response matches expected pattern
    expect(responseText).toMatch(expectedPattern);
    
    return responseText;
  }

  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('/');
    
    // Wait for app to load
    await waitForChatReady(page);
    
    // Clear any existing chat state
    const storage = await page.evaluate(() => localStorage.getItem('makalah-chat-store'));
    if (storage) {
      await page.evaluate(() => {
        localStorage.removeItem('makalah-chat-store');
        localStorage.removeItem('makalah-chat-mode');
      });
      await page.reload();
      await waitForChatReady(page);
    }
  });

  // ============================================
  // BASIC MODAL INTERACTION TESTS
  // ============================================

  test('should display modal with both chat mode options', async ({ page }) => {
    await page.click('[data-testid="new-chat-button"]');
    
    // Verify modal appears
    await expect(page.locator('.modal-backdrop')).toBeVisible();
    await expect(page.locator('text=Pilih Jenis Chat')).toBeVisible();
    
    // Verify both modes are displayed
    await expect(page.locator('text=Percakapan yang harus bikin proyek')).toBeVisible();
    await expect(page.locator('text=Percakapan bebas tanpa proyek')).toBeVisible();
    
    // Verify mode icons and badges
    await expect(page.locator('text=🎓')).toBeVisible();
    await expect(page.locator('text=💬')).toBeVisible();
    await expect(page.locator('text=Formal')).toBeVisible();
    await expect(page.locator('text=Gue-Lo')).toBeVisible();
  });

  test('should allow closing modal without selection', async ({ page }) => {
    await page.click('[data-testid="new-chat-button"]');
    await expect(page.locator('.modal-backdrop')).toBeVisible();
    
    // Close with X button
    await page.click('button[aria-label="Tutup dialog"]');
    await expect(page.locator('.modal-backdrop')).not.toBeVisible();
    
    // Open again and close with "Batal" button
    await page.click('[data-testid="new-chat-button"]');
    await expect(page.locator('.modal-backdrop')).toBeVisible();
    
    await page.click('button:has-text("Batal")');
    await expect(page.locator('.modal-backdrop')).not.toBeVisible();
  });

  test('should persist selected mode in session storage', async ({ page }) => {
    const modeData = await selectChatMode(page, 'formal');
    
    // Verify mode is stored
    const storedMode = await page.evaluate(() => localStorage.getItem('makalah-chat-mode'));
    expect(storedMode).toEqual('"formal"');
    
    // Verify page reload preserves selection
    await page.reload();
    await waitForChatReady(page);
    
    const restoredMode = await page.evaluate(() => localStorage.getItem('makalah-chat-mode'));
    expect(restoredMode).toEqual('"formal"');
  });

  // ============================================
  // FORMAL MODE TESTING
  // ============================================

  test('should properly initialize formal chat mode', async ({ page }) => {
    const modeData = await selectChatMode(page, 'formal');
    
    // Verify UI updates reflect formal mode
    await expect(page.locator('[data-testid="chat-mode-indicator"]')).toContainText('🎓');
    
    // Verify academic workflow components are visible
    await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="artifact-list"]')).toBeVisible();
  });

  test('should handle formal mode AI interactions', async ({ page }) => {
    const modeData = await selectChatMode(page, 'formal');
    
    // Send test query and verify academic response
    const response = await sendMessageAndVerifyResponse(
      page, 
      modeData.testQuery,
      modeData.expectedResponsePattern
    );
    
    // Verify academic tone and structure
    expect(response).toMatch(/(?:langkah-langkah|metodologi|struktur|referensi|akademik)/i);
    
    // Verify no casual language patterns
    expect(response).not.toMatch(/(?:gue|lo|gimana|sih|banget)/i);
  });

  test('should show 8-phase workflow in formal mode', async ({ page }) => {
    await selectChatMode(page, 'formal');
    
    // Verify workflow phases are visible
    const phases = [
      'Topic/Scope',
      'Research Notes', 
      'Literature Review',
      'Outline',
      'First Draft',
      'Citations/References',
      'Final Draft',
      'Final Paper'
    ];
    
    for (const phase of phases) {
      await expect(page.locator(`text=${phase}`)).toBeVisible();
    }
  });

  // ============================================
  // CASUAL MODE TESTING
  // ============================================

  test('should properly initialize casual chat mode', async ({ page }) => {
    const modeData = await selectChatMode(page, 'casual');
    
    // Verify UI updates reflect casual mode
    await expect(page.locator('[data-testid="chat-mode-indicator"]')).toContainText('💬');
    
    // Verify academic workflow components are hidden
    await expect(page.locator('[data-testid="workflow-progress"]')).not.toBeVisible();
  });

  test('should handle casual mode AI interactions', async ({ page }) => {
    const modeData = await selectChatMode(page, 'casual');
    
    // Send test query and verify casual response
    const response = await sendMessageAndVerifyResponse(
      page,
      modeData.testQuery, 
      modeData.expectedResponsePattern
    );
    
    // Verify casual tone and Jakarta slang
    expect(response).toMatch(/(?:gue|lo|bisa|nih|kayak|banget)/i);
    
    // Verify no overly formal academic language
    expect(response).not.toMatch(/(?:metodologi|sistematik|komprehensif|signifikan)/i);
  });

  test('should allow free conversation in casual mode', async ({ page }) => {
    await selectChatMode(page, 'casual');
    
    // Test various casual conversation types
    const casualQueries = [
      'Halo, gimana kabarnya?',
      'Apa sih machine learning itu sebenernya?',
      'Lo tau gak cara belajar programming yang efektif?'
    ];
    
    for (const query of casualQueries) {
      const response = await sendMessageAndVerifyResponse(
        page,
        query,
        /(?:gue|lo|bisa|nih|kayak|banget|sih)/i
      );
      
      expect(response.length).toBeGreaterThan(50); // Ensure substantial responses
    }
  });

  // ============================================
  // MODE SWITCHING TESTS
  // ============================================

  test('should allow switching between modes in same session', async ({ page }) => {
    // Start with formal mode
    await selectChatMode(page, 'formal');
    await sendMessageAndVerifyResponse(
      page,
      'Jelaskan metodologi penelitian kualitatif',
      /(?:metodologi|kualitatif|penelitian|akademik)/i
    );
    
    // Switch to casual mode
    await selectChatMode(page, 'casual');
    await sendMessageAndVerifyResponse(
      page,
      'Jelasin dong apa itu penelitian kualitatif',
      /(?:gue|lo|jadi|sih|gimana)/i
    );
    
    // Verify mode persistence
    const currentMode = await page.evaluate(() => localStorage.getItem('makalah-chat-mode'));
    expect(currentMode).toEqual('"casual"');
  });

  test('should maintain separate conversation history per mode', async ({ page }) => {
    // Create formal conversation
    await selectChatMode(page, 'formal');
    await sendMessageAndVerifyResponse(
      page,
      'Bantu saya membuat outline makalah',
      /(?:outline|struktur|makalah)/i
    );
    
    const formalHistory = await page.locator('[data-testid="chat-message"]').count();
    
    // Switch to casual and create different conversation
    await selectChatMode(page, 'casual');
    await sendMessageAndVerifyResponse(
      page,
      'Gimana sih cara nulis yang bagus?',
      /(?:gue|lo|nulis)/i
    );
    
    // Switch back to formal and verify history separation
    await selectChatMode(page, 'formal');
    
    const restoredHistory = await page.locator('[data-testid="chat-message"]').count();
    expect(restoredHistory).toEqual(formalHistory);
  });

  // ============================================
  // PERFORMANCE & RELIABILITY TESTS
  // ============================================

  test('should complete mode selection under 100ms', async ({ page }) => {
    const startTime = Date.now();
    
    await page.click('[data-testid="new-chat-button"]');
    await expect(page.locator('.modal-backdrop')).toBeVisible();
    
    await page.click('button:has-text("Percakapan yang harus bikin proyek")');
    await expect(page.locator('.modal-backdrop')).not.toBeVisible();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(100);
  });

  test('should handle rapid mode switching without errors', async ({ page }) => {
    // Rapidly switch between modes multiple times
    for (let i = 0; i < 5; i++) {
      await selectChatMode(page, 'formal');
      await page.waitForTimeout(100);
      
      await selectChatMode(page, 'casual');
      await page.waitForTimeout(100);
    }
    
    // Verify final state is consistent
    const finalMode = await page.evaluate(() => localStorage.getItem('makalah-chat-mode'));
    expect(finalMode).toEqual('"casual"');
  });

  // ============================================
  // ERROR HANDLING TESTS  
  // ============================================

  test('should gracefully handle network errors during mode selection', async ({ page }) => {
    // Simulate network failure
    await page.route('**/*', route => {
      if (route.request().url().includes('/api/')) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    await selectChatMode(page, 'formal');
    
    // Should still show error state gracefully
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Clear network issues and retry
    await page.unroute('**/*');
    
    const response = await sendMessageAndVerifyResponse(
      page,
      'Test message after network recovery',
      /.+/
    );
    
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
  });

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  test('should be fully keyboard accessible', async ({ page }) => {
    // Tab to new chat button
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="new-chat-button"]')).toBeFocused();
    
    // Enter to open modal
    await page.keyboard.press('Enter');
    await expect(page.locator('.modal-backdrop')).toBeVisible();
    
    // Tab to first mode option
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Enter to select mode
    await page.keyboard.press('Enter');
    await expect(page.locator('.modal-backdrop')).not.toBeVisible();
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.click('[data-testid="new-chat-button"]');
    
    // Check modal accessibility
    const modal = page.locator('.modal-backdrop');
    await expect(modal).toHaveAttribute('role', 'dialog');
    
    // Check mode buttons accessibility  
    const modeButtons = page.locator('button:has-text("Percakapan")');
    for (let i = 0; i < await modeButtons.count(); i++) {
      const button = modeButtons.nth(i);
      await expect(button).toHaveAttribute('type', 'button');
      await expect(button).toBeVisible();
    }
  });

  // ============================================
  // MOBILE RESPONSIVE TESTS
  // ============================================

  test('should work properly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('[data-testid="new-chat-button"]');
    
    // Verify modal is responsive
    const modal = page.locator('.modal-backdrop > div');
    const modalBox = await modal.boundingBox();
    expect(modalBox!.width).toBeLessThanOrEqual(375 * 0.9); // Max 90% of viewport
    
    // Test mode selection on mobile
    await selectChatMode(page, 'casual');
    
    // Verify chat interface works on mobile
    await sendMessageAndVerifyResponse(
      page,
      'Test mobile interaction',
      /.+/
    );
  });
});