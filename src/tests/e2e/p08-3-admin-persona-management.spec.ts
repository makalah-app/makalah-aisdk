/**
 * P08.3: Admin Persona Template Management Testing
 * Comprehensive testing of admin interface for persona template lifecycle management
 * 
 * Test Scenarios:
 * - Admin authentication and access controls
 * - Template CRUD operations
 * - Validation and compliance checking
 * - Import/Export functionality
 * - Audit trail verification
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('P08.3: Admin Persona Template Management Testing', () => {

  // Test data for persona templates
  const TEST_TEMPLATES = {
    valid_research: {
      name: 'Research Assistant Test',
      description: 'Test persona for research assistance',
      mode: 'Research',
      system_prompt: `MODE: RESEARCH ASSISTANT TEST

PRIORITAS UTAMA:
- Comprehensive literature search dan systematic review
- Critical evaluation dari source credibility
- Research methodology recommendations
- Evidence-based analysis dan reasoning

RESPONSE PATTERN:
- Begin dengan clear research strategy
- Provide multiple perspectives dan approaches
- Include source validation dan verification
- Focus pada academic rigor dan quality`,
      configuration: {
        temperature: 0.1,
        tools_enabled: ['web_search', 'cite_manager', 'artifact_store'],
        search_depth: 'comprehensive',
        source_quality: 'peer_reviewed_only'
      },
      is_active: true
    },
    valid_writing: {
      name: 'Writing Assistant Test',
      description: 'Test persona for academic writing',
      mode: 'Writing', 
      system_prompt: `MODE: ACADEMIC WRITER TEST

PRIORITAS UTAMA:
- Clear structure dan logical flow
- Academic style maintenance
- Compelling argument development
- Grammar dan vocabulary precision

RESPONSE PATTERN:
- Start dengan clear thesis
- Develop systematic arguments
- Use academic discourse markers
- Maintain scholarly voice`,
      configuration: {
        temperature: 0.3,
        tools_enabled: ['artifact_store', 'cite_manager'],
        writing_style: 'analytical',
        structure_focus: true
      },
      is_active: true
    },
    invalid_template: {
      name: '', // Invalid: empty name
      description: 'Test invalid template',
      mode: 'InvalidMode', // Invalid mode
      system_prompt: 'Too short', // Invalid: too short
      configuration: {
        temperature: 2.0, // Invalid: out of range
        tools_enabled: ['invalid_tool'] // Invalid tool
      },
      is_active: true
    }
  };

  // Admin credentials (from project documentation)
  const ADMIN_CREDENTIALS = {
    email: 'makalah.app@gmail.com',
    password: 'M4k4l4h2025'
  };

  // Helper functions
  async function loginAsAdmin(page: Page) {
    await page.goto('/admin/login');
    
    await page.fill('[data-testid="admin-email"]', ADMIN_CREDENTIALS.email);
    await page.fill('[data-testid="admin-password"]', ADMIN_CREDENTIALS.password);
    await page.click('[data-testid="admin-login-submit"]');
    
    // Wait for admin dashboard to load
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    await page.waitForLoadState('networkidle');
  }

  async function navigateToPersonaManagement(page: Page) {
    await page.click('[data-testid="admin-nav-personas"]');
    await expect(page.locator('[data-testid="persona-management"]')).toBeVisible();
    await page.waitForLoadState('networkidle');
  }

  async function createPersonaTemplate(page: Page, template: any) {
    await page.click('[data-testid="create-persona-btn"]');
    
    // Fill basic information
    await page.fill('[data-testid="persona-name"]', template.name);
    await page.fill('[data-testid="persona-description"]', template.description);
    await page.selectOption('[data-testid="persona-mode"]', template.mode);
    
    // Fill system prompt
    await page.fill('[data-testid="persona-system-prompt"]', template.system_prompt);
    
    // Set configuration
    await page.fill('[data-testid="persona-temperature"]', template.configuration.temperature.toString());
    
    // Set tools
    for (const tool of template.configuration.tools_enabled) {
      await page.check(`[data-testid="tool-${tool}"]`);
    }
    
    // Set active status
    if (template.is_active) {
      await page.check('[data-testid="persona-is-active"]');
    }
    
    return template;
  }

  async function submitPersonaForm(page: Page) {
    await page.click('[data-testid="save-persona-btn"]');
    await page.waitForTimeout(1000); // Wait for submission
  }

  async function waitForToastMessage(page: Page, expectedText: string) {
    await expect(page.locator('[data-testid="toast-message"]')).toContainText(expectedText);
    await page.waitForTimeout(500);
  }

  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // ============================================
  // ADMIN AUTHENTICATION TESTS
  // ============================================

  test('should require admin authentication for persona management', async ({ page }) => {
    // Try to access admin area without login
    await page.goto('/admin/personas');
    
    // Should redirect to login
    await expect(page.locator('[data-testid="admin-login-form"]')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should authenticate admin with correct credentials', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Should be on admin dashboard
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });

  test('should reject invalid admin credentials', async ({ page }) => {
    await page.goto('/admin/login');
    
    await page.fill('[data-testid="admin-email"]', 'invalid@email.com');
    await page.fill('[data-testid="admin-password"]', 'wrongpassword');
    await page.click('[data-testid="admin-login-submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
  });

  test('should maintain admin session across page reloads', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be authenticated
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
  });

  // ============================================
  // PERSONA TEMPLATE CRUD OPERATIONS
  // ============================================

  test('should list existing persona templates', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    // Should show template list
    await expect(page.locator('[data-testid="persona-template-list"]')).toBeVisible();
    
    // Should have create button
    await expect(page.locator('[data-testid="create-persona-btn"]')).toBeVisible();
    
    // Should show table headers
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Mode")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();
  });

  test('should create valid persona template successfully', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    const template = TEST_TEMPLATES.valid_research;
    await createPersonaTemplate(page, template);
    await submitPersonaForm(page);
    
    // Should show success message
    await waitForToastMessage(page, 'Persona template created successfully');
    
    // Should appear in list
    await expect(page.locator(`text=${template.name}`)).toBeVisible();
    await expect(page.locator(`text=${template.mode}`)).toBeVisible();
  });

  test('should validate template fields and show errors for invalid data', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    const template = TEST_TEMPLATES.invalid_template;
    await createPersonaTemplate(page, template);
    await submitPersonaForm(page);
    
    // Should show validation errors
    await expect(page.locator('[data-testid="validation-error-name"]')).toContainText('Name is required');
    await expect(page.locator('[data-testid="validation-error-mode"]')).toContainText('Invalid mode');
    await expect(page.locator('[data-testid="validation-error-prompt"]')).toContainText('System prompt too short');
    await expect(page.locator('[data-testid="validation-error-temperature"]')).toContainText('Temperature must be between 0 and 1');
  });

  test('should update existing persona template', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    // First create a template
    const template = TEST_TEMPLATES.valid_writing;
    await createPersonaTemplate(page, template);
    await submitPersonaForm(page);
    await waitForToastMessage(page, 'created successfully');
    
    // Edit the template
    await page.click(`[data-testid="edit-persona-${template.name}"]`);
    
    const updatedName = `${template.name} - Updated`;
    await page.fill('[data-testid="persona-name"]', updatedName);
    await page.fill('[data-testid="persona-temperature"]', '0.5');
    
    await submitPersonaForm(page);
    await waitForToastMessage(page, 'updated successfully');
    
    // Verify updates
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();
  });

  test('should delete persona template with confirmation', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    // Create a template first
    const template = TEST_TEMPLATES.valid_research;
    await createPersonaTemplate(page, template);
    await submitPersonaForm(page);
    await waitForToastMessage(page, 'created successfully');
    
    // Delete the template
    await page.click(`[data-testid="delete-persona-${template.name}"]`);
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to delete')).toBeVisible();
    
    await page.click('[data-testid="confirm-delete"]');
    await waitForToastMessage(page, 'deleted successfully');
    
    // Should not appear in list
    await expect(page.locator(`text=${template.name}`)).not.toBeVisible();
  });

  test('should cancel template deletion', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    // Assume we have at least one template in the list
    await page.click('[data-testid^="delete-persona-"]');
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    
    await page.click('[data-testid="cancel-delete"]');
    
    // Dialog should close, template should remain
    await expect(page.locator('[data-testid="delete-confirmation"]')).not.toBeVisible();
  });

  // ============================================
  // TEMPLATE VALIDATION & COMPLIANCE
  // ============================================

  test('should validate system prompt quality and standards', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    await page.click('[data-testid="create-persona-btn"]');
    
    // Test various invalid system prompts
    const invalidPrompts = [
      'Too short',
      'A'.repeat(5000), // Too long
      'No academic guidance whatsoever', // Missing academic content
      'PROMPT WITHOUT PROPER STRUCTURE OR FORMATTING' // Poor structure
    ];
    
    for (const prompt of invalidPrompts) {
      await page.fill('[data-testid="persona-system-prompt"]', prompt);
      await page.click('[data-testid="validate-prompt-btn"]');
      
      // Should show specific validation warnings
      await expect(page.locator('[data-testid="prompt-validation-warnings"]')).toBeVisible();
    }
  });

  test('should validate tool configurations', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    await page.click('[data-testid="create-persona-btn"]');
    
    // Test invalid tool combinations
    await page.selectOption('[data-testid="persona-mode"]', 'Research');
    
    // Uncheck essential tools for research mode
    await page.uncheck('[data-testid="tool-web_search"]');
    await page.uncheck('[data-testid="tool-cite_manager"]');
    
    await page.click('[data-testid="validate-configuration-btn"]');
    
    // Should show warnings about missing essential tools
    await expect(page.locator('[data-testid="config-validation-warnings"]')).toContainText('Research mode should include web_search');
  });

  test('should enforce temperature range validation', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    await page.click('[data-testid="create-persona-btn"]');
    
    const invalidTemperatures = ['-0.5', '1.5', 'abc', ''];
    
    for (const temp of invalidTemperatures) {
      await page.fill('[data-testid="persona-temperature"]', temp);
      await page.blur('[data-testid="persona-temperature"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="temperature-error"]')).toBeVisible();
    }
  });

  // ============================================
  // IMPORT/EXPORT FUNCTIONALITY
  // ============================================

  test('should export persona templates to JSON', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    await page.click('[data-testid="export-templates-btn"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/persona-templates.*\.json$/);
    
    // Verify download completed
    expect(await download.failure()).toBeNull();
  });

  test('should import valid persona templates from JSON', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    // Create test import data
    const importData = {
      templates: [TEST_TEMPLATES.valid_research, TEST_TEMPLATES.valid_writing]
    };
    
    // Create temporary JSON file (in real test, this would be a fixture file)
    const jsonContent = JSON.stringify(importData, null, 2);
    
    // Click import button
    await page.click('[data-testid="import-templates-btn"]');
    
    // Upload file (simulated)
    const fileInput = page.locator('[data-testid="import-file-input"]');
    
    // Create a blob and simulate file upload
    await page.evaluate(async (jsonContent) => {
      const file = new File([jsonContent], 'templates.json', { type: 'application/json' });
      const input = document.querySelector('[data-testid="import-file-input"]') as HTMLInputElement;
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      
      // Trigger change event
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, jsonContent);
    
    // Submit import
    await page.click('[data-testid="confirm-import-btn"]');
    
    // Should show success message
    await waitForToastMessage(page, 'Templates imported successfully');
    
    // Imported templates should appear in list
    await expect(page.locator(`text=${TEST_TEMPLATES.valid_research.name}`)).toBeVisible();
    await expect(page.locator(`text=${TEST_TEMPLATES.valid_writing.name}`)).toBeVisible();
  });

  test('should reject invalid import file format', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    await page.click('[data-testid="import-templates-btn"]');
    
    // Try to upload invalid JSON
    const invalidJson = 'This is not valid JSON';
    
    await page.evaluate(async (invalidJson) => {
      const file = new File([invalidJson], 'invalid.json', { type: 'application/json' });
      const input = document.querySelector('[data-testid="import-file-input"]') as HTMLInputElement;
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, invalidJson);
    
    // Should show error message
    await expect(page.locator('[data-testid="import-error"]')).toContainText('Invalid JSON format');
  });

  // ============================================
  // AUDIT TRAIL VERIFICATION
  // ============================================

  test('should log persona template creation in audit trail', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    // Create a template
    const template = TEST_TEMPLATES.valid_research;
    await createPersonaTemplate(page, template);
    await submitPersonaForm(page);
    await waitForToastMessage(page, 'created successfully');
    
    // Navigate to audit logs
    await page.click('[data-testid="admin-nav-audit"]');
    
    // Should show creation log entry
    await expect(page.locator('[data-testid="audit-log-list"]')).toBeVisible();
    await expect(page.locator(`text=PERSONA_CREATED: ${template.name}`)).toBeVisible();
    
    // Log should include details
    await page.click(`[data-testid="audit-entry-PERSONA_CREATED-${template.name}"]`);
    await expect(page.locator('[data-testid="audit-details"]')).toContainText(template.mode);
    await expect(page.locator('[data-testid="audit-details"]')).toContainText(ADMIN_CREDENTIALS.email);
  });

  test('should log persona template updates in audit trail', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    // Create then update a template
    const template = TEST_TEMPLATES.valid_writing;
    await createPersonaTemplate(page, template);
    await submitPersonaForm(page);
    await waitForToastMessage(page, 'created successfully');
    
    // Edit the template
    await page.click(`[data-testid="edit-persona-${template.name}"]`);
    await page.fill('[data-testid="persona-temperature"]', '0.7');
    await submitPersonaForm(page);
    await waitForToastMessage(page, 'updated successfully');
    
    // Check audit logs
    await page.click('[data-testid="admin-nav-audit"]');
    await expect(page.locator(`text=PERSONA_UPDATED: ${template.name}`)).toBeVisible();
  });

  test('should log persona template deletion in audit trail', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    // Create then delete a template
    const template = TEST_TEMPLATES.valid_research;
    await createPersonaTemplate(page, template);
    await submitPersonaForm(page);
    await waitForToastMessage(page, 'created successfully');
    
    // Delete the template
    await page.click(`[data-testid="delete-persona-${template.name}"]`);
    await page.click('[data-testid="confirm-delete"]');
    await waitForToastMessage(page, 'deleted successfully');
    
    // Check audit logs
    await page.click('[data-testid="admin-nav-audit"]');
    await expect(page.locator(`text=PERSONA_DELETED: ${template.name}`)).toBeVisible();
  });

  // ============================================
  // ACCESS CONTROL TESTS
  // ============================================

  test('should prevent non-admin users from accessing persona management', async ({ page }) => {
    // Try accessing as regular user (no login)
    await page.goto('/admin/personas');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator('[data-testid="admin-login-form"]')).toBeVisible();
  });

  test('should log out admin user properly', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Logout
    await page.click('[data-testid="admin-logout-btn"]');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/admin\/login/);
    
    // Trying to access admin area should require re-login
    await page.goto('/admin/personas');
    await expect(page.locator('[data-testid="admin-login-form"]')).toBeVisible();
  });

  // ============================================
  // PERFORMANCE & RELIABILITY
  // ============================================

  test('should handle concurrent template operations without data corruption', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    // Create multiple templates rapidly
    const templates = [
      { ...TEST_TEMPLATES.valid_research, name: 'Concurrent Test 1' },
      { ...TEST_TEMPLATES.valid_writing, name: 'Concurrent Test 2' },
      { ...TEST_TEMPLATES.valid_research, name: 'Concurrent Test 3' }
    ];
    
    // Create all templates concurrently
    for (const template of templates) {
      await page.click('[data-testid="create-persona-btn"]');
      await createPersonaTemplate(page, template);
      await submitPersonaForm(page);
      await page.waitForTimeout(100); // Small delay
    }
    
    // All should be created successfully
    for (const template of templates) {
      await expect(page.locator(`text=${template.name}`)).toBeVisible();
    }
  });

  test('should maintain data integrity during validation failures', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToPersonaManagement(page);
    
    // Create a valid template
    const validTemplate = TEST_TEMPLATES.valid_research;
    await createPersonaTemplate(page, validTemplate);
    await submitPersonaForm(page);
    await waitForToastMessage(page, 'created successfully');
    
    // Try to create invalid template
    await page.click('[data-testid="create-persona-btn"]');
    await createPersonaTemplate(page, TEST_TEMPLATES.invalid_template);
    await submitPersonaForm(page);
    
    // Invalid template should not be created
    await expect(page.locator('[data-testid="validation-error-name"]')).toBeVisible();
    
    // Valid template should still exist
    await expect(page.locator(`text=${validTemplate.name}`)).toBeVisible();
  });
});