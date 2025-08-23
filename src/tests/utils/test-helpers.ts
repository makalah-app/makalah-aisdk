/**
 * Test Utilities dan Helper Functions
 * Reusable utilities untuk comprehensive testing framework
 */

import { Page, expect } from '@playwright/test';

export interface StreamingMetrics {
  timeToFirstChunk: number;
  totalStreamingTime: number;
  chunkCount: number;
  averageChunkLatency: number;
  wordsPerSecond: number;
  characterCount: number;
  phaseTransitions: string[];
}

export interface PerformanceSnapshot {
  timestamp: number;
  fps: number;
  memoryUsage: number;
  networkLatency: number;
  renderTime: number;
}

export class TestHelpers {
  
  /**
   * Wait for streaming to start dengan comprehensive checks
   */
  static async waitForStreamingStart(page: Page, timeout = 15000): Promise<boolean> {
    try {
      // Multiple conditions untuk detect streaming start
      await Promise.race([
        page.waitForSelector('[data-testid="streaming-text"]', { 
          state: 'visible', 
          timeout 
        }),
        page.waitForSelector('[data-testid="status-indicator"]', { 
          state: 'visible', 
          timeout 
        }),
        page.waitForSelector('[data-testid="tool-feedback"]', { 
          state: 'visible', 
          timeout 
        })
      ]);
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Monitor streaming performance metrics
   */
  static async monitorStreamingMetrics(
    page: Page, 
    maxDuration = 30000
  ): Promise<StreamingMetrics> {
    const startTime = Date.now();
    const metrics: StreamingMetrics = {
      timeToFirstChunk: 0,
      totalStreamingTime: 0,
      chunkCount: 0,
      averageChunkLatency: 0,
      wordsPerSecond: 0,
      characterCount: 0,
      phaseTransitions: []
    };

    const chunkLatencies: number[] = [];
    let firstChunkRecorded = false;
    let previousTextLength = 0;
    let previousStatus = '';

    const streamingElement = page.locator('[data-testid="streaming-text"]');
    const statusElement = page.locator('[data-testid="status-indicator"]');

    // Monitor untuk specified duration
    const endTime = startTime + maxDuration;
    
    while (Date.now() < endTime) {
      const chunkStartTime = Date.now();
      
      // Check streaming text
      const currentText = await streamingElement.textContent() || '';
      const currentTextLength = currentText.length;
      
      if (currentTextLength > previousTextLength) {
        metrics.chunkCount++;
        
        if (!firstChunkRecorded) {
          metrics.timeToFirstChunk = Date.now() - startTime;
          firstChunkRecorded = true;
        }
        
        const chunkLatency = Date.now() - chunkStartTime;
        chunkLatencies.push(chunkLatency);
        
        previousTextLength = currentTextLength;
      }
      
      // Check status transitions
      const currentStatus = await statusElement.textContent() || '';
      if (currentStatus !== previousStatus && currentStatus) {
        metrics.phaseTransitions.push(currentStatus);
        previousStatus = currentStatus;
      }
      
      // Check if streaming completed
      const isComplete = await page.locator('[data-testid="message-complete"]').count() > 0;
      if (isComplete) break;
      
      await page.waitForTimeout(200);
    }

    // Calculate final metrics
    metrics.totalStreamingTime = Date.now() - startTime;
    metrics.characterCount = previousTextLength;
    
    if (chunkLatencies.length > 0) {
      metrics.averageChunkLatency = chunkLatencies.reduce((a, b) => a + b, 0) / chunkLatencies.length;
    }
    
    if (metrics.totalStreamingTime > 0 && previousTextLength > 0) {
      const words = previousTextLength / 5; // Estimate words
      metrics.wordsPerSecond = (words * 1000) / metrics.totalStreamingTime;
    }

    return metrics;
  }

  /**
   * Capture performance snapshot
   */
  static async capturePerformanceSnapshot(page: Page): Promise<PerformanceSnapshot> {
    const snapshot = await page.evaluate(() => {
      const now = performance.now();
      
      // Get FPS if available
      const fps = (window as any).currentFPS || 0;
      
      // Get memory usage if available
      const memory = 'memory' in performance 
        ? (performance as any).memory.usedJSHeapSize 
        : 0;
      
      // Get navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const networkLatency = navigation ? navigation.responseEnd - navigation.requestStart : 0;
      const renderTime = navigation ? navigation.loadEventEnd - navigation.responseEnd : 0;
      
      return {
        timestamp: now,
        fps,
        memoryUsage: memory,
        networkLatency,
        renderTime
      };
    });
    
    return snapshot;
  }

  /**
   * Validate Indonesian language content
   */
  static validateIndonesianContent(text: string): {
    isIndonesian: boolean;
    confidence: number;
    detectedWords: string[];
  } {
    const indonesianWords = [
      'berpikir', 'mencari', 'menganalisis', 'membuat', 'menyusun',
      'menulis', 'memproses', 'memeriksa', 'agent', 'sedang',
      'dalam', 'proses', 'untuk', 'dan', 'yang', 'dengan',
      'tentang', 'dari', 'pada', 'akan', 'telah', 'sudah',
      'menjelajah', 'internet', 'referensi', 'informasi'
    ];
    
    const lowerText = text.toLowerCase();
    const detectedWords: string[] = [];
    
    for (const word of indonesianWords) {
      if (lowerText.includes(word)) {
        detectedWords.push(word);
      }
    }
    
    const confidence = detectedWords.length / Math.min(10, text.split(' ').length);
    const isIndonesian = confidence > 0.3;
    
    return {
      isIndonesian,
      confidence,
      detectedWords
    };
  }

  /**
   * Wait untuk element dengan custom timeout dan retry
   */
  static async waitForElementWithRetry(
    page: Page, 
    selector: string, 
    options: {
      timeout?: number;
      retries?: number;
      state?: 'attached' | 'detached' | 'visible' | 'hidden';
    } = {}
  ): Promise<boolean> {
    const { timeout = 5000, retries = 3, state = 'visible' } = options;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await page.waitForSelector(selector, { state, timeout });
        return true;
      } catch (error) {
        if (attempt === retries - 1) {
          console.log(`❌ Failed to find ${selector} after ${retries} attempts`);
          return false;
        }
        
        console.log(`⚠️ Attempt ${attempt + 1} failed for ${selector}, retrying...`);
        await page.waitForTimeout(1000);
      }
    }
    
    return false;
  }

  /**
   * Test responsive design across viewports
   */
  static async testResponsiveLayout(
    page: Page,
    viewports: Array<{ width: number; height: number; name: string }>
  ): Promise<{ viewport: string; passed: boolean; issues: string[] }[]> {
    const results: Array<{ viewport: string; passed: boolean; issues: string[] }> = [];
    
    for (const viewport of viewports) {
      console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      const issues: string[] = [];
      
      // Check for horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      if (hasHorizontalOverflow) {
        issues.push('Horizontal overflow detected');
      }
      
      // Check critical elements visibility
      const criticalElements = [
        '[data-testid="chat-area"]',
        '[data-testid="chat-input"]',
        '[data-testid="send-button"]'
      ];
      
      for (const selector of criticalElements) {
        const isVisible = await page.locator(selector).isVisible();
        if (!isVisible) {
          issues.push(`${selector} not visible`);
        }
      }
      
      // Check minimum tap target sizes on mobile
      if (viewport.width <= 768) {
        const buttons = page.locator('button, [role="button"]');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < Math.min(5, buttonCount); i++) {
          const button = buttons.nth(i);
          const box = await button.boundingBox();
          
          if (box && (box.width < 44 || box.height < 44)) {
            issues.push(`Button ${i} too small for touch (${box.width}x${box.height})`);
          }
        }
      }
      
      results.push({
        viewport: viewport.name,
        passed: issues.length === 0,
        issues
      });
    }
    
    return results;
  }

  /**
   * Monitor network requests during test
   */
  static async monitorNetworkRequests(
    page: Page,
    filterPattern?: string
  ): Promise<Array<{
    url: string;
    method: string;
    status: number;
    duration: number;
    size: number;
  }>> {
    const requests: any[] = [];
    
    page.on('request', request => {
      if (!filterPattern || request.url().includes(filterPattern)) {
        requests.push({
          url: request.url(),
          method: request.method(),
          startTime: Date.now()
        });
      }
    });
    
    page.on('response', response => {
      const matchingRequest = requests.find(req => 
        req.url === response.url() && !req.endTime
      );
      
      if (matchingRequest) {
        matchingRequest.endTime = Date.now();
        matchingRequest.status = response.status();
        matchingRequest.duration = matchingRequest.endTime - matchingRequest.startTime;
      }
    });
    
    return requests;
  }

  /**
   * Generate test report summary
   */
  static generateTestSummary(
    testName: string,
    metrics: StreamingMetrics,
    performance: PerformanceSnapshot[],
    issues: string[] = []
  ): string {
    const report = [
      `📊 TEST SUMMARY: ${testName}`,
      `=`.repeat(50),
      `⚡ Performance Metrics:`,
      `   Time to First Chunk: ${metrics.timeToFirstChunk}ms`,
      `   Total Streaming Time: ${metrics.totalStreamingTime}ms`,
      `   Chunk Count: ${metrics.chunkCount}`,
      `   Average Chunk Latency: ${metrics.averageChunkLatency.toFixed(2)}ms`,
      `   Words per Second: ${metrics.wordsPerSecond.toFixed(2)}`,
      `   Character Count: ${metrics.characterCount}`,
      `   Phase Transitions: ${metrics.phaseTransitions.length}`,
      ``
    ];
    
    if (performance.length > 0) {
      const avgFPS = performance.reduce((sum, p) => sum + p.fps, 0) / performance.length;
      const maxMemory = Math.max(...performance.map(p => p.memoryUsage));
      
      report.push(
        `🖥️ System Performance:`,
        `   Average FPS: ${avgFPS.toFixed(1)}`,
        `   Peak Memory: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`,
        ``
      );
    }
    
    if (issues.length > 0) {
      report.push(
        `⚠️ Issues Found:`,
        ...issues.map(issue => `   - ${issue}`),
        ``
      );
    }
    
    report.push(
      `✅ Test Status: ${issues.length === 0 ? 'PASSED' : 'COMPLETED WITH ISSUES'}`,
      `📅 Completed: ${new Date().toISOString()}`
    );
    
    return report.join('\n');
  }

  /**
   * Validate performance targets
   */
  static validatePerformanceTargets(metrics: StreamingMetrics): {
    passed: boolean;
    results: Array<{ target: string; actual: number; expected: number; passed: boolean }>;
  } {
    const targets = [
      { name: 'Time to First Chunk', actual: metrics.timeToFirstChunk, expected: 1000 },
      { name: 'Average Chunk Latency', actual: metrics.averageChunkLatency, expected: 100 },
      { name: 'Words per Second', actual: metrics.wordsPerSecond, expected: 1, isMin: true },
      { name: 'Phase Transitions', actual: metrics.phaseTransitions.length, expected: 2, isMin: true }
    ];
    
    const results = targets.map(target => ({
      target: target.name,
      actual: target.actual,
      expected: target.expected,
      passed: target.isMin 
        ? target.actual >= target.expected 
        : target.actual <= target.expected
    }));
    
    const passed = results.every(result => result.passed);
    
    return { passed, results };
  }
}

export default TestHelpers;