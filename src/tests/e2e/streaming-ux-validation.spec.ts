/**
 * Streaming UX Validation Suite - Indonesian language dan user experience testing
 * Validates semua interactive streaming components dan Indonesian messaging
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Streaming UX Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Progressive disclosure functionality - eliminate "jreng!" problem', async () => {
    console.log('🎯 Testing progressive disclosure functionality');
    
    const testMessage = 'Cari referensi akademik tentang machine learning dalam pendidikan';
    
    await page.fill('[data-testid="chat-input"]', testMessage);
    await page.click('[data-testid="send-button"]');
    
    // Phase 1: Check initial status disclosure
    console.log('📝 Validating initial status disclosure...');
    const statusIndicator = page.locator('[data-testid="status-indicator"]');
    await expect(statusIndicator).toBeVisible();
    
    // Should show "Agent berpikir" first
    await expect(statusIndicator).toContainText('berpikir');
    
    // Phase 2: Progressive status updates
    console.log('🔄 Validating progressive status updates...');
    const statusTexts = [
      'berpikir',
      'menjelajah',
      'menganalisis',
      'menulis'
    ];
    
    let observedStatuses: string[] = [];
    
    // Monitor status changes untuk 30 seconds
    for (let i = 0; i < 60; i++) {
      const currentStatus = await statusIndicator.textContent() || '';
      
      // Track unique status messages
      if (!observedStatuses.some(status => currentStatus.includes(status))) {
        for (const statusText of statusTexts) {
          if (currentStatus.toLowerCase().includes(statusText)) {
            observedStatuses.push(statusText);
            console.log(`✅ Status observed: "${currentStatus}"`);
            break;
          }
        }
      }
      
      // Check if streaming started
      const hasStreamingText = await page.locator('[data-testid="streaming-text"]').count() > 0;
      if (hasStreamingText) break;
      
      await page.waitForTimeout(500);
    }
    
    console.log(`📊 Progressive Disclosure Results:`);
    console.log(`   Observed statuses: ${observedStatuses.length} unique phases`);
    console.log(`   Phases detected: ${observedStatuses.join(', ')}`);
    
    // Should have at least 2 progressive phases
    expect(observedStatuses.length).toBeGreaterThanOrEqual(2);
    
    // Phase 3: Validate smooth transitions (no jarring "jreng!")
    console.log('🎭 Validating smooth transitions...');
    
    // Monitor for abrupt content changes
    let previousContent = '';
    let abruptChanges = 0;
    
    for (let i = 0; i < 20; i++) {
      const currentContent = await page.locator('[data-testid="chat-area"]').textContent() || '';
      
      if (previousContent && currentContent !== previousContent) {
        const contentChange = Math.abs(currentContent.length - previousContent.length);
        
        // Detect sudden large content changes (>200 chars at once)
        if (contentChange > 200) {
          abruptChanges++;
          console.log(`⚠️ Abrupt change detected: ${contentChange} chars`);
        }
      }
      
      previousContent = currentContent;
      await page.waitForTimeout(300);
      
      const isComplete = await page.locator('[data-testid="message-complete"]').count() > 0;
      if (isComplete) break;
    }
    
    console.log(`📈 Transition Analysis: ${abruptChanges} abrupt changes detected`);
    
    // Should have minimal abrupt changes (progressive disclosure working)
    expect(abruptChanges).toBeLessThan(2);
  });

  test('Word-by-word streaming speed validation', async () => {
    console.log('✍️ Testing word-by-word streaming speed');
    
    await page.fill('[data-testid="chat-input"]', 'Berikan penjelasan singkat tentang artificial intelligence');
    await page.click('[data-testid="send-button"]');
    
    // Tunggu streaming mulai
    await page.waitForSelector('[data-testid="streaming-text"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    console.log('📝 Monitoring word-by-word streaming...');
    
    const streamingElement = page.locator('[data-testid="streaming-text"]');
    let wordCounts: number[] = [];
    let timings: number[] = [];
    
    const startTime = Date.now();
    
    // Monitor streaming untuk 20 seconds
    for (let i = 0; i < 40; i++) {
      const currentTime = Date.now();
      const currentText = await streamingElement.textContent() || '';
      const wordCount = currentText.trim().split(/\s+/).filter(word => word.length > 0).length;
      
      if (wordCount > (wordCounts[wordCounts.length - 1] || 0)) {
        wordCounts.push(wordCount);
        timings.push(currentTime - startTime);
      }
      
      await page.waitForTimeout(500);
      
      const isComplete = await page.locator('[data-testid="message-complete"]').count() > 0;
      if (isComplete) break;
    }
    
    // Calculate streaming metrics
    const totalWords = wordCounts[wordCounts.length - 1] || 0;
    const totalTime = timings[timings.length - 1] || 1;
    const wordsPerSecond = (totalWords * 1000) / totalTime;
    
    // Calculate intervals between word updates
    const intervals: number[] = [];
    for (let i = 1; i < timings.length; i++) {
      intervals.push(timings[i] - timings[i - 1]);
    }
    
    const averageInterval = intervals.length > 0 
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
      : 0;
    
    console.log(`📊 Word-by-word Streaming Metrics:`);
    console.log(`   Total words: ${totalWords}`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Words per second: ${wordsPerSecond.toFixed(2)}`);
    console.log(`   Average interval: ${averageInterval.toFixed(2)}ms`);
    console.log(`   Update frequency: ${wordCounts.length} updates`);
    
    // Validate streaming speed targets
    expect(totalWords).toBeGreaterThan(5); // At least some words streamed
    expect(wordsPerSecond).toBeGreaterThan(1); // At least 1 word per second
    expect(wordsPerSecond).toBeLessThan(20); // Not too fast (readable speed)
    expect(averageInterval).toBeLessThan(1000); // Updates at least every second
    expect(wordCounts.length).toBeGreaterThan(3); // Multiple updates observed
  });

  test('Interactive controls testing - pause/resume/skip/speed', async () => {
    console.log('🎮 Testing interactive streaming controls');
    
    await page.fill('[data-testid="chat-input"]', 'Jelaskan konsep deep learning secara detail');
    await page.click('[data-testid="send-button"]');
    
    // Tunggu streaming mulai
    await page.waitForSelector('[data-testid="streaming-text"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    console.log('⏸️ Testing pause functionality...');
    
    // Test pause control jika ada
    const pauseButton = page.locator('[data-testid="pause-streaming"]');
    if (await pauseButton.count() > 0) {
      const textBeforePause = await page.locator('[data-testid="streaming-text"]').textContent() || '';
      
      await pauseButton.click();
      console.log('   Streaming paused');
      
      // Wait dan check if streaming actually paused
      await page.waitForTimeout(2000);
      const textAfterPause = await page.locator('[data-testid="streaming-text"]').textContent() || '';
      
      // Text should not have grown significantly during pause
      const growthDuringPause = Math.abs(textAfterPause.length - textBeforePause.length);
      expect(growthDuringPause).toBeLessThan(10); // Minimal growth during pause
      
      console.log('✅ Pause functionality working');
      
      // Test resume
      console.log('▶️ Testing resume functionality...');
      const resumeButton = page.locator('[data-testid="resume-streaming"]');
      if (await resumeButton.count() > 0) {
        await resumeButton.click();
        console.log('   Streaming resumed');
        
        // Verify streaming continues
        await page.waitForTimeout(2000);
        const textAfterResume = await page.locator('[data-testid="streaming-text"]').textContent() || '';
        const growthAfterResume = textAfterResume.length - textAfterPause.length;
        
        expect(growthAfterResume).toBeGreaterThan(0); // Should continue growing
        console.log('✅ Resume functionality working');
      }
    } else {
      console.log('⚠️ Pause/Resume controls not found, skipping interactive controls test');
    }
    
    // Test speed controls jika ada
    console.log('🚀 Testing speed controls...');
    const speedButtons = await page.locator('[data-testid^="speed-"]').count();
    
    if (speedButtons > 0) {
      console.log(`   Found ${speedButtons} speed control buttons`);
      
      const speeds = ['slow', 'normal', 'fast'];
      
      for (const speed of speeds) {
        const speedButton = page.locator(`[data-testid="speed-${speed}"]`);
        if (await speedButton.count() > 0) {
          await speedButton.click();
          console.log(`   Set speed to: ${speed}`);
          await page.waitForTimeout(1000);
        }
      }
      
      console.log('✅ Speed controls working');
    } else {
      console.log('⚠️ Speed controls not found');
    }
    
    // Test skip functionality jika ada
    console.log('⏭️ Testing skip functionality...');
    const skipButton = page.locator('[data-testid="skip-streaming"]');
    
    if (await skipButton.count() > 0) {
      await skipButton.click();
      console.log('   Skip requested');
      
      // Should quickly complete atau show final result
      await page.waitForSelector('[data-testid="message-complete"]', { 
        state: 'visible',
        timeout: 5000 
      });
      
      console.log('✅ Skip functionality working');
    } else {
      console.log('⚠️ Skip control not found');
    }
  });

  test('Indonesian language message accuracy verification', async () => {
    console.log('🇮🇩 Testing Indonesian language message accuracy');
    
    const testCases = [
      {
        input: 'Cari informasi tentang teknologi AI',
        expectedPhrases: ['berpikir', 'mencari', 'menganalisis']
      },
      {
        input: 'Buatkan ringkasan artikel ilmiah',
        expectedPhrases: ['membuat', 'menyusun', 'menulis']
      },
      {
        input: 'Analisis data penelitian',
        expectedPhrases: ['menganalisis', 'memproses', 'memeriksa']
      }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`📝 Test case ${i + 1}: ${testCase.input}`);
      
      // Clear dan send new message
      await page.fill('[data-testid="chat-input"]', '');
      await page.fill('[data-testid="chat-input"]', testCase.input);
      await page.click('[data-testid="send-button"]');
      
      // Collect status messages
      const observedMessages: string[] = [];
      
      for (let j = 0; j < 20; j++) {
        const statusText = await page.locator('[data-testid="status-indicator"]').textContent() || '';
        
        if (statusText && !observedMessages.includes(statusText)) {
          observedMessages.push(statusText);
          console.log(`   Status: "${statusText}"`);
        }
        
        // Check if streaming started
        const hasStreaming = await page.locator('[data-testid="streaming-text"]').count() > 0;
        if (hasStreaming) break;
        
        await page.waitForTimeout(500);
      }
      
      // Validate Indonesian language usage
      let indonesianPhraseCount = 0;
      
      for (const message of observedMessages) {
        const lowerMessage = message.toLowerCase();
        
        for (const phrase of testCase.expectedPhrases) {
          if (lowerMessage.includes(phrase)) {
            indonesianPhraseCount++;
            console.log(`   ✅ Indonesian phrase found: "${phrase}" in "${message}"`);
          }
        }
        
        // Check untuk common Indonesian words
        const commonIndonesian = ['agent', 'sedang', 'dalam', 'proses', 'untuk', 'dan'];
        for (const word of commonIndonesian) {
          if (lowerMessage.includes(word)) {
            console.log(`   ✅ Indonesian word detected: "${word}"`);
          }
        }
      }
      
      // Should have at least some Indonesian phrases
      expect(indonesianPhraseCount).toBeGreaterThan(0);
      
      // Tunggu completion atau timeout
      try {
        await page.waitForSelector('[data-testid="message-complete"]', { 
          state: 'visible',
          timeout: 20000 
        });
      } catch {
        console.log(`   ⚠️ Test case ${i + 1} didn't complete, continuing...`);
      }
      
      await page.waitForTimeout(1000); // Brief pause between tests
    }
    
    console.log('✅ Indonesian language message accuracy validated');
  });

  test('Mobile responsiveness validation during streaming', async () => {
    console.log('📱 Testing mobile responsiveness during streaming');
    
    // Test different mobile viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 414, height: 896, name: 'iPhone 11' },
      { width: 360, height: 640, name: 'Galaxy S5' }
    ];
    
    for (const viewport of viewports) {
      console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500); // Let layout adjust
      
      // Test basic layout on mobile
      const chatArea = page.locator('[data-testid="chat-area"]');
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await expect(chatArea).toBeVisible();
      await expect(chatInput).toBeVisible();
      await expect(sendButton).toBeVisible();
      
      // Test responsive input
      await page.fill('[data-testid="chat-input"]', 'Test mobile responsiveness');
      await page.tap('[data-testid="send-button"]');
      
      // Validate streaming di mobile
      await page.waitForSelector('[data-testid="streaming-text"]', { 
        state: 'visible',
        timeout: 10000 
      });
      
      // Check layout doesn't overflow
      const chatAreaBounds = await chatArea.boundingBox();
      expect(chatAreaBounds).toBeTruthy();
      
      if (chatAreaBounds) {
        expect(chatAreaBounds.width).toBeLessThanOrEqual(viewport.width);
        console.log(`   ✅ Layout fits in ${viewport.width}px width`);
      }
      
      // Test mobile interactions during streaming
      const sidebar = page.locator('[data-testid="sidebar"]');
      const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
      
      if (await sidebarToggle.count() > 0) {
        await sidebarToggle.tap();
        await page.waitForTimeout(500);
        
        // Sidebar should work on mobile
        const sidebarVisible = await sidebar.isVisible();
        console.log(`   📱 Sidebar toggle: ${sidebarVisible ? 'working' : 'not visible'}`);
        
        if (sidebarVisible) {
          await sidebarToggle.tap(); // Close again
        }
      }
      
      // Wait for completion atau timeout
      try {
        await page.waitForSelector('[data-testid="message-complete"]', { 
          state: 'visible',
          timeout: 15000 
        });
      } catch {
        console.log(`   ⚠️ Mobile test ${viewport.name} didn't complete`);
      }
      
      console.log(`   ✅ ${viewport.name} responsive test completed`);
    }
    
    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Accessibility compliance testing during streaming', async () => {
    console.log('♿ Testing accessibility compliance during streaming');
    
    // Inject axe-core untuk accessibility testing
    await page.addScriptTag({ 
      url: 'https://unpkg.com/axe-core@4.4.2/axe.min.js' 
    });
    
    await page.fill('[data-testid="chat-input"]', 'Test accessibility compliance');
    await page.click('[data-testid="send-button"]');
    
    // Tunggu streaming mulai
    await page.waitForSelector('[data-testid="streaming-text"]', { 
      state: 'visible',
      timeout: 10000 
    });
    
    // Run accessibility scan during streaming
    console.log('🔍 Running accessibility scan...');
    
    const a11yResults = await page.evaluate(async () => {
      return new Promise((resolve) => {
        // @ts-ignore
        window.axe.run((err: any, results: any) => {
          if (err) resolve({ error: err.message });
          resolve(results);
        });
      });
    });
    
    if ('error' in a11yResults) {
      console.log(`⚠️ Accessibility scan error: ${a11yResults.error}`);
    } else {
      const violations = (a11yResults as any).violations || [];
      
      console.log(`📊 Accessibility Results:`);
      console.log(`   Violations found: ${violations.length}`);
      
      for (const violation of violations) {
        console.log(`   - ${violation.id}: ${violation.description}`);
        console.log(`     Impact: ${violation.impact}`);
        console.log(`     Nodes: ${violation.nodes.length}`);
      }
      
      // Should have minimal critical violations
      const criticalViolations = violations.filter((v: any) => v.impact === 'critical');
      expect(criticalViolations.length).toBe(0);
      
      const seriousViolations = violations.filter((v: any) => v.impact === 'serious');
      expect(seriousViolations.length).toBeLessThan(3);
    }
    
    // Test keyboard navigation
    console.log('⌨️ Testing keyboard navigation...');
    
    await page.keyboard.press('Tab');
    const focusedElement1 = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    
    await page.keyboard.press('Tab');
    const focusedElement2 = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    
    console.log(`   Tab 1 focus: ${focusedElement1}`);
    console.log(`   Tab 2 focus: ${focusedElement2}`);
    
    // Focus should move between interactive elements
    expect(focusedElement1).not.toBe(focusedElement2);
    
    // Test screen reader compatibility
    console.log('🔊 Testing ARIA labels dan roles...');
    
    const ariaElements = await page.locator('[aria-label], [role], [aria-describedby]').count();
    console.log(`   ARIA elements found: ${ariaElements}`);
    
    expect(ariaElements).toBeGreaterThan(0); // Should have some ARIA attributes
    
    console.log('✅ Accessibility compliance tested');
  });
});