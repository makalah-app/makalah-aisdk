// ============================================
// MAKALAH AI: Integration Testing Framework  
// ============================================
// Task P07.5 Implementation: Comprehensive testing framework untuk persona compatibility validation
// Created: August 2025
// Features: Cross-component integration testing, persona compatibility validation, automated test execution

import type { PersonaTemplate } from '@/types/persona'
import { PersonaAwareProviderManager } from '@/lib/providers/persona-aware-provider'
import { PersonaAwareDatabaseManager } from '@/lib/database/persona-context'
import { PersonaSessionManager } from '@/lib/auth/persona-session'
import { PersonaAuditLogger } from '@/lib/audit/persona-logging'
import { personaApprovalGates } from '@/lib/approval/persona-gates'
import { ApprovalWorkflowMiddleware } from '@/middleware/approval-workflow'

// ============================================
// INTEGRATION TEST TYPES
// ============================================

export interface IntegrationTestResult {
  testId: string
  testName: string
  component: string
  persona: PersonaTemplate | null
  chatMode: 'formal' | 'casual'
  passed: boolean
  duration: number
  error?: string
  details?: Record<string, any>
  metrics?: {
    responseTime: number
    memoryUsage: number
    apiCalls: number
    tokenUsage?: number
  }
}

export interface IntegrationTestSuite {
  suiteId: string
  suiteName: string  
  description: string
  tests: IntegrationTestCase[]
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
  beforeEach?: () => Promise<void>
  afterEach?: () => Promise<void>
}

export interface IntegrationTestCase {
  testId: string
  testName: string
  component: string
  description: string
  expectedBehavior: string
  testFunction: (context: IntegrationTestContext) => Promise<IntegrationTestResult>
  timeout?: number
  retries?: number
  dependencies?: string[]
}

export interface IntegrationTestContext {
  sessionId: string
  userId: string
  persona: PersonaTemplate | null
  chatMode: 'formal' | 'casual'
  mockEnvironment: boolean
  testData: Record<string, any>
  helpers: IntegrationTestHelpers
}

export interface IntegrationTestHelpers {
  createMockPersona: (mode: 'academic' | 'casual') => PersonaTemplate
  createMockSession: (persona?: PersonaTemplate) => string
  simulateUserInteraction: (action: string, data: any) => Promise<any>
  validatePersonaContext: (expected: any, actual: any) => boolean
  measurePerformance: <T>(fn: () => Promise<T>) => Promise<{ result: T; metrics: any }>
}

// ============================================
// MAIN INTEGRATION TEST FRAMEWORK
// ============================================

export class IntegrationTestFramework {
  private static instance: IntegrationTestFramework
  private testSuites: Map<string, IntegrationTestSuite> = new Map()
  private results: IntegrationTestResult[] = []
  private isRunning = false
  private abortController?: AbortController

  private constructor() {}

  static getInstance(): IntegrationTestFramework {
    if (!this.instance) {
      this.instance = new IntegrationTestFramework()
    }
    return this.instance
  }

  // ============================================
  // TEST SUITE MANAGEMENT
  // ============================================

  registerTestSuite(suite: IntegrationTestSuite): void {
    this.testSuites.set(suite.suiteId, suite)
    console.log(`[INTEGRATION TEST] Registered test suite: ${suite.suiteName}`)
  }

  async runTestSuite(suiteId: string): Promise<IntegrationTestResult[]> {
    const suite = this.testSuites.get(suiteId)
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteId}`)
    }

    console.log(`[INTEGRATION TEST] Running suite: ${suite.suiteName}`)
    console.log(`[INTEGRATION TEST] Description: ${suite.description}`)
    console.log(`[INTEGRATION TEST] Tests to run: ${suite.tests.length}`)

    const suiteResults: IntegrationTestResult[] = []
    const startTime = Date.now()

    try {
      // Suite setup
      if (suite.setup) {
        await suite.setup()
      }

      // Run each test
      for (const testCase of suite.tests) {
        // Check dependencies
        if (testCase.dependencies) {
          const depResults = this.results.filter(r => 
            testCase.dependencies!.includes(r.testId) && r.passed
          )
          if (depResults.length !== testCase.dependencies.length) {
            const failResult: IntegrationTestResult = {
              testId: testCase.testId,
              testName: testCase.testName,
              component: testCase.component,
              persona: null,
              chatMode: 'formal',
              passed: false,
              duration: 0,
              error: 'Test dependencies not met'
            }
            suiteResults.push(failResult)
            continue
          }
        }

        // Run test with retries
        const maxRetries = testCase.retries || 1
        let testResult: IntegrationTestResult | null = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            if (suite.beforeEach) {
              await suite.beforeEach()
            }

            testResult = await this.runSingleTest(testCase, suiteId)

            if (suite.afterEach) {
              await suite.afterEach()
            }

            if (testResult.passed || attempt === maxRetries) {
              break
            }
          } catch (error) {
            if (attempt === maxRetries) {
              testResult = {
                testId: testCase.testId,
                testName: testCase.testName,
                component: testCase.component,
                persona: null,
                chatMode: 'formal',
                passed: false,
                duration: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          }
        }

        if (testResult) {
          suiteResults.push(testResult)
          this.results.push(testResult)
        }
      }

      // Suite teardown
      if (suite.teardown) {
        await suite.teardown()
      }

    } catch (error) {
      console.error(`[INTEGRATION TEST] Suite setup/teardown error:`, error)
    }

    const duration = Date.now() - startTime
    console.log(`[INTEGRATION TEST] Suite completed in ${duration}ms`)
    console.log(`[INTEGRATION TEST] Results: ${suiteResults.filter(r => r.passed).length}/${suiteResults.length} passed`)

    return suiteResults
  }

  async runSingleTest(testCase: IntegrationTestCase, suiteId: string): Promise<IntegrationTestResult> {
    const context = this.createTestContext(suiteId)
    const startTime = Date.now()

    try {
      console.log(`[INTEGRATION TEST] Running: ${testCase.testName}`)
      
      // Set timeout
      const timeout = testCase.timeout || 30000
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), timeout)
      })

      // Run test
      const result = await Promise.race([
        testCase.testFunction(context),
        timeoutPromise
      ])

      result.duration = Date.now() - startTime
      console.log(`[INTEGRATION TEST] ✅ ${testCase.testName} - ${result.duration}ms`)
      return result

    } catch (error) {
      const duration = Date.now() - startTime
      console.log(`[INTEGRATION TEST] ❌ ${testCase.testName} - ${duration}ms - ${error}`)
      
      return {
        testId: testCase.testId,
        testName: testCase.testName,
        component: testCase.component,
        persona: null,
        chatMode: 'formal',
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // ============================================
  // TEST CONTEXT CREATION
  // ============================================

  private createTestContext(suiteId: string): IntegrationTestContext {
    const sessionId = `test-session-${Date.now()}`
    const userId = `test-user-${Date.now()}`

    return {
      sessionId,
      userId,
      persona: null,
      chatMode: 'formal',
      mockEnvironment: true,
      testData: {},
      helpers: this.createTestHelpers()
    }
  }

  private createTestHelpers(): IntegrationTestHelpers {
    return {
      createMockPersona: (mode: 'academic' | 'casual') => {
        return {
          id: `test-persona-${mode}-${Date.now()}`,
          name: mode === 'academic' ? 'Test Academic Assistant' : 'Test Casual Assistant',
          description: `Test persona for ${mode} mode`,
          mode: mode === 'academic' ? 'formal' : 'casual',
          system_prompt: `You are a test ${mode} assistant`,
          configuration: {
            temperature: mode === 'academic' ? 0.1 : 0.3,
            max_tokens: 2000,
            tools_enabled: ['web_search', 'artifact_store']
          },
          creator_id: 'test-user',
          created_at: new Date(),
          updated_at: new Date(),
          is_active: true,
          version: 1
        }
      },

      createMockSession: (persona?: PersonaTemplate) => {
        const sessionId = `mock-session-${Date.now()}`
        // In real implementation, would set up session state
        return sessionId
      },

      simulateUserInteraction: async (action: string, data: any) => {
        // Mock user interactions for testing
        switch (action) {
          case 'send_message':
            return { success: true, messageId: `msg-${Date.now()}` }
          case 'switch_persona':
            return { success: true, personaId: data.personaId }
          case 'switch_chat_mode':
            return { success: true, chatMode: data.chatMode }
          default:
            return { success: false, error: 'Unknown action' }
        }
      },

      validatePersonaContext: (expected: any, actual: any) => {
        // Deep comparison of persona context
        return JSON.stringify(expected) === JSON.stringify(actual)
      },

      measurePerformance: async <T>(fn: () => Promise<T>) => {
        const startTime = Date.now()
        const startMemory = process.memoryUsage()
        
        const result = await fn()
        
        const endTime = Date.now()
        const endMemory = process.memoryUsage()
        
        return {
          result,
          metrics: {
            responseTime: endTime - startTime,
            memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
            apiCalls: 0 // Would track actual API calls
          }
        }
      }
    }
  }

  // ============================================
  // TEST EXECUTION & REPORTING
  // ============================================

  async runAllTests(): Promise<Record<string, IntegrationTestResult[]>> {
    if (this.isRunning) {
      throw new Error('Tests are already running')
    }

    this.isRunning = true
    this.results = []
    this.abortController = new AbortController()

    const allResults: Record<string, IntegrationTestResult[]> = {}

    try {
      console.log(`[INTEGRATION TEST] Starting full test run - ${this.testSuites.size} suites`)

      for (const [suiteId, suite] of this.testSuites) {
        if (this.abortController.signal.aborted) {
          break
        }

        const suiteResults = await this.runTestSuite(suiteId)
        allResults[suiteId] = suiteResults
      }

      console.log(`[INTEGRATION TEST] Full test run completed`)
      this.printSummaryReport(allResults)

    } catch (error) {
      console.error(`[INTEGRATION TEST] Test run failed:`, error)
    } finally {
      this.isRunning = false
      this.abortController = undefined
    }

    return allResults
  }

  private printSummaryReport(results: Record<string, IntegrationTestResult[]>): void {
    const allResults = Object.values(results).flat()
    const totalTests = allResults.length
    const passedTests = allResults.filter(r => r.passed).length
    const failedTests = totalTests - passedTests
    const avgDuration = allResults.reduce((sum, r) => sum + r.duration, 0) / totalTests

    console.log(`\n[INTEGRATION TEST] === SUMMARY REPORT ===`)
    console.log(`[INTEGRATION TEST] Total Tests: ${totalTests}`)
    console.log(`[INTEGRATION TEST] Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`)
    console.log(`[INTEGRATION TEST] Failed: ${failedTests}`)
    console.log(`[INTEGRATION TEST] Average Duration: ${avgDuration.toFixed(0)}ms`)
    
    if (failedTests > 0) {
      console.log(`\n[INTEGRATION TEST] === FAILED TESTS ===`)
      allResults.filter(r => !r.passed).forEach(result => {
        console.log(`[INTEGRATION TEST] ❌ ${result.component}: ${result.testName}`)
        console.log(`[INTEGRATION TEST]    Error: ${result.error}`)
      })
    }

    // Performance summary
    const avgResponseTime = allResults
      .filter(r => r.metrics?.responseTime)
      .reduce((sum, r) => sum + (r.metrics!.responseTime), 0) / 
      allResults.filter(r => r.metrics?.responseTime).length

    if (avgResponseTime) {
      console.log(`\n[INTEGRATION TEST] === PERFORMANCE ===`)
      console.log(`[INTEGRATION TEST] Average Response Time: ${avgResponseTime.toFixed(0)}ms`)
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  abortTests(): void {
    if (this.abortController) {
      this.abortController.abort()
      console.log(`[INTEGRATION TEST] Test run aborted`)
    }
  }

  getResults(): IntegrationTestResult[] {
    return [...this.results]
  }

  generateReport(): string {
    const allResults = this.getResults()
    const totalTests = allResults.length
    const passedTests = allResults.filter(r => r.passed).length

    const report = `
# Integration Test Report

**Generated:** ${new Date().toISOString()}
**Total Tests:** ${totalTests}
**Passed:** ${passedTests}
**Failed:** ${totalTests - passedTests}
**Success Rate:** ${totalTests > 0 ? ((passedTests/totalTests)*100).toFixed(1) : 0}%

## Test Results by Component

${this.generateComponentReport(allResults)}

## Performance Metrics

${this.generatePerformanceReport(allResults)}

## Failed Tests

${this.generateFailedTestsReport(allResults)}
    `.trim()

    return report
  }

  private generateComponentReport(results: IntegrationTestResult[]): string {
    const byComponent = results.reduce((acc, result) => {
      if (!acc[result.component]) {
        acc[result.component] = []
      }
      acc[result.component].push(result)
      return acc
    }, {} as Record<string, IntegrationTestResult[]>)

    return Object.entries(byComponent)
      .map(([component, tests]) => {
        const passed = tests.filter(t => t.passed).length
        const total = tests.length
        return `- **${component}:** ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`
      })
      .join('\n')
  }

  private generatePerformanceReport(results: IntegrationTestResult[]): string {
    const withMetrics = results.filter(r => r.metrics)
    if (withMetrics.length === 0) return 'No performance metrics available'

    const avgResponseTime = withMetrics.reduce((sum, r) => sum + (r.metrics!.responseTime), 0) / withMetrics.length
    const avgMemoryUsage = withMetrics.reduce((sum, r) => sum + (r.metrics!.memoryUsage || 0), 0) / withMetrics.length

    return `
- **Average Response Time:** ${avgResponseTime.toFixed(0)}ms
- **Average Memory Usage:** ${(avgMemoryUsage / 1024 / 1024).toFixed(2)}MB
- **Tests with Metrics:** ${withMetrics.length}/${results.length}
    `.trim()
  }

  private generateFailedTestsReport(results: IntegrationTestResult[]): string {
    const failedTests = results.filter(r => !r.passed)
    if (failedTests.length === 0) return 'No failed tests'

    return failedTests
      .map(test => `- **${test.component}/${test.testName}:** ${test.error}`)
      .join('\n')
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const integrationTestFramework = IntegrationTestFramework.getInstance()

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export function registerTestSuite(suite: IntegrationTestSuite): void {
  integrationTestFramework.registerTestSuite(suite)
}

export function runTestSuite(suiteId: string): Promise<IntegrationTestResult[]> {
  return integrationTestFramework.runTestSuite(suiteId)
}

export function runAllTests(): Promise<Record<string, IntegrationTestResult[]>> {
  return integrationTestFramework.runAllTests()
}

export function generateTestReport(): string {
  return integrationTestFramework.generateReport()
}