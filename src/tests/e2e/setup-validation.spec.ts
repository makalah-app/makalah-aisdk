/**
 * Setup Validation Test - Basic test to ensure framework is working
 */

import { test, expect } from '@playwright/test';

test.describe('Testing Framework Setup Validation', () => {

  test('Basic page load and component visibility', async ({ page }) => {
    console.log('🧪 Testing basic page load and component visibility');
    
    // Navigate to the app
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if essential components are present
    await expect(page.locator('body')).toBeVisible();
    
    // Take a screenshot for visual verification
    await page.screenshot({ 
      path: './test-artifacts/setup-validation.png',
      fullPage: true 
    });
    
    console.log('✅ Basic page load test completed');
  });

  test('Test framework components availability', async ({ page }) => {
    console.log('🧪 Testing component testid availability');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for main layout components
    const chatArea = page.locator('[data-testid="chat-area"]');
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    if (await chatArea.count() > 0) {
      console.log('✅ ChatArea testid found');
    } else {
      console.log('⚠️ ChatArea testid not found');
    }
    
    if (await chatInput.count() > 0) {
      console.log('✅ ChatInput testid found');
    } else {
      console.log('⚠️ ChatInput testid not found');
    }
    
    if (await sendButton.count() > 0) {
      console.log('✅ SendButton testid found');
    } else {
      console.log('⚠️ SendButton testid not found');
    }
    
    // At least some testids should be present
    const testidCount = await page.locator('[data-testid]').count();
    console.log(`📊 Found ${testidCount} elements with testids`);
    
    expect(testidCount).toBeGreaterThan(0);
    console.log('✅ Test framework setup validated');
  });

});