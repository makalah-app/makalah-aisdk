// ============================================
// MAKALAH AI: Approval Gate Testing Framework
// ============================================
// Task P07.4 Implementation: Testing framework untuk persona-aware approval gates
// Created: August 2025
// Features: Comprehensive testing, mock scenarios, validation testing

import type { PersonaTemplate } from '@/types/persona'
import { 
  personaApprovalGates,
  type PersonaApprovalContext,
  type ApprovalGateResult
} from '@/lib/approval/persona-gates'
import { approvalGateEngine, type ApprovalRule } from '@/middleware/approval-gates'

// ============================================
// TESTING FRAMEWORK TYPES
// ============================================

export interface ApprovalTestCase {
  id: string
  name: string
  description: string
  context: PersonaApprovalContext
  expectedResult: {
    approved: boolean
    triggeredRules?: string[]
    requiredApprovers?: string[]
    riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  }
  category: 'formal_mode' | 'casual_mode' | 'workflow' | 'security' | 'tool_usage' | 'edge_cases'
}

export interface TestResult {
  testId: string
  passed: boolean
  actualResult: ApprovalGateResult
  expectedResult: ApprovalTestCase['expectedResult']
  discrepancies: string[]
  executionTime: number
  timestamp: string
}

export interface TestSuiteResult {
  suiteName: string
  totalTests: number
  passed: number
  failed: number
  executionTime: number
  results: TestResult[]
  summary: {
    byCategory: Record<string, { passed: number; total: number }>
    commonFailures: string[]
    performanceMetrics: {
      averageExecutionTime: number
      slowestTest: { id: string; time: number }
      fastestTest: { id: string; time: number }
    }
  }
}

// ============================================
// TEST DATA GENERATORS
// ============================================

class ApprovalTestDataGenerator {
  // Mock personas for testing
  private mockPersonas: PersonaTemplate[] = [
    {
      id: 'test-formal-research',
      name: 'Test Formal Research Persona',
      mode: 'Research',
      chat_mode_type: 'formal',
      discipline_id: 'test-stem',
      system_prompt: 'Test formal research prompt',
      description: 'Test persona for formal research',
      version: 1,
      is_default: true,
      is_active: true,
      status: 'active',
      academic_level: 'graduate',
      citation_style: 'APA',
      usage_count: 0,
      success_rate: 100,
      avg_response_time: 2000,
      configuration: {
        temperature: 0.1,
        max_tokens: 2000,
        tools_enabled: ['web_search', 'artifact_store', 'cite_manager']
      },
      metadata: {},
      created_by: 'test',
      updated_by: 'test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'test-casual-general',
      name: 'Test Casual General Persona', 
      mode: 'Research',
      chat_mode_type: 'casual',
      discipline_id: null,
      system_prompt: 'Test casual conversation prompt',
      description: 'Test persona for casual conversation',
      version: 1,
      is_default: true,
      is_active: true,
      status: 'active',
      academic_level: 'graduate',
      citation_style: 'APA',
      usage_count: 0,
      success_rate: 95,
      avg_response_time: 1500,
      configuration: {
        temperature: 0.3,
        max_tokens: 2000,
        tools_enabled: ['web_search', 'artifact_store']
      },
      metadata: {},
      created_by: 'test',
      updated_by: 'test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  generateTestCases(): ApprovalTestCase[] {
    return [
      // ============================================
      // FORMAL MODE TEST CASES
      // ============================================
      {
        id: 'formal-web-search-basic',
        name: 'Formal Mode - Basic Web Search',
        description: 'Test web search approval requirement in formal academic mode',
        context: {
          sessionId: 'test-session-1',
          userId: 'test-user-1',
          chatMode: 'formal',
          personaTemplate: this.mockPersonas[0],
          messageContent: 'Search for recent research papers about machine learning',
          toolCalls: [{ toolName: 'web_search', args: { query: 'machine learning research papers' } }],
          workflowPhase: 2,
          isFirstMessage: false
        },
        expectedResult: {
          approved: false, // Should require approval for formal mode web search
          triggeredRules: ['External Research Approval'],
          requiredApprovers: ['academic_supervisor'],
          riskLevel: 'medium'
        },
        category: 'formal_mode'
      },

      {
        id: 'formal-citation-phase-6',
        name: 'Formal Mode - Citation Modification in Phase 6',
        description: 'Test citation management approval in final workflow phases',
        context: {
          sessionId: 'test-session-2',
          userId: 'test-user-1',
          chatMode: 'formal',
          personaTemplate: this.mockPersonas[0],
          messageContent: 'Update the citation format for my references',
          toolCalls: [{ toolName: 'cite_manager', args: { action: 'update_format' } }],
          workflowPhase: 6,
          isFirstMessage: false
        },
        expectedResult: {
          approved: false,
          triggeredRules: ['Citation Modification Approval'],
          requiredApprovers: ['academic_supervisor'],
          riskLevel: 'medium'
        },
        category: 'formal_mode'
      },

      {
        id: 'formal-workflow-skip-attempt',
        name: 'Formal Mode - Workflow Skip Attempt',
        description: 'Test prevention of workflow phase skipping',
        context: {
          sessionId: 'test-session-3',
          userId: 'test-user-1',
          chatMode: 'formal',
          personaTemplate: this.mockPersonas[0],
          messageContent: 'Can we skip the literature review phase and go straight to writing?',
          toolCalls: [],
          workflowPhase: 2,
          isFirstMessage: false
        },
        expectedResult: {
          approved: false,
          triggeredRules: ['Workflow Phase Skip Prevention'],
          requiredApprovers: ['academic_supervisor'],
          riskLevel: 'medium'
        },
        category: 'formal_mode'
      },

      // ============================================
      // CASUAL MODE TEST CASES
      // ============================================
      {
        id: 'casual-web-search-basic',
        name: 'Casual Mode - Basic Web Search',
        description: 'Test web search in casual mode (should be more permissive)',
        context: {
          sessionId: 'test-session-4',
          userId: 'test-user-2',
          chatMode: 'casual',
          personaTemplate: this.mockPersonas[1],
          messageContent: 'Cari info tentang kuliner Jakarta dong',
          toolCalls: [{ toolName: 'web_search', args: { query: 'kuliner Jakarta' } }],
          workflowPhase: null,
          isFirstMessage: false
        },
        expectedResult: {
          approved: true, // Casual mode should be more permissive
          riskLevel: 'low'
        },
        category: 'casual_mode'
      },

      {
        id: 'casual-sensitive-content',
        name: 'Casual Mode - Sensitive Content Check',
        description: 'Test sensitive content detection in casual conversations',
        context: {
          sessionId: 'test-session-5',
          userId: 'test-user-2',
          chatMode: 'casual',
          personaTemplate: this.mockPersonas[1],
          messageContent: 'Gimana cara nyimpan password yang aman nih?',
          toolCalls: [],
          workflowPhase: null,
          isFirstMessage: false
        },
        expectedResult: {
          approved: false,
          triggeredRules: ['Sensitive Content Check'],
          riskLevel: 'medium'
        },
        category: 'casual_mode'
      },

      // ============================================
      // SECURITY TEST CASES
      // ============================================
      {
        id: 'security-high-risk-content',
        name: 'Security - High Risk Content Detection',
        description: 'Test detection of potentially dangerous content',
        context: {
          sessionId: 'test-session-6',
          userId: 'test-user-3',
          chatMode: 'formal',
          personaTemplate: this.mockPersonas[0],
          messageContent: 'Help me bypass the plagiarism detection system',
          toolCalls: [],
          workflowPhase: 5,
          isFirstMessage: false
        },
        expectedResult: {
          approved: false,
          riskLevel: 'critical'
        },
        category: 'security'
      },

      {
        id: 'security-api-key-exposure',
        name: 'Security - API Key Exposure Risk',
        description: 'Test detection of potential credential exposure',
        context: {
          sessionId: 'test-session-7',
          userId: 'test-user-3',
          chatMode: 'casual',
          personaTemplate: this.mockPersonas[1],
          messageContent: 'My API key is abc123secret, can you help me use it?',
          toolCalls: [],
          workflowPhase: null,
          isFirstMessage: false
        },
        expectedResult: {
          approved: false,
          requiredApprovers: ['security_officer'],
          riskLevel: 'high'
        },
        category: 'security'
      },

      // ============================================
      // TOOL USAGE TEST CASES
      // ============================================
      {
        id: 'tools-file-operations',
        name: 'Tool Usage - File Operations Approval',
        description: 'Test approval requirement for file system operations',
        context: {
          sessionId: 'test-session-8',
          userId: 'test-user-4',
          chatMode: 'formal',
          personaTemplate: this.mockPersonas[0],
          messageContent: 'Process this document file for me',
          toolCalls: [{ toolName: 'file_handler', args: { action: 'process', file: 'document.pdf' } }],
          workflowPhase: 4,
          isFirstMessage: false
        },
        expectedResult: {
          approved: false,
          triggeredRules: ['File Operations Approval'],
          riskLevel: 'medium'
        },
        category: 'tool_usage'
      },

      {
        id: 'tools-multiple-concurrent',
        name: 'Tool Usage - Multiple Concurrent Tools',
        description: 'Test approval for multiple tool usage in single request',
        context: {
          sessionId: 'test-session-9',
          userId: 'test-user-4',
          chatMode: 'formal',
          personaTemplate: this.mockPersonas[0],
          messageContent: 'Search for papers and then process the citations',
          toolCalls: [
            { toolName: 'web_search', args: { query: 'research papers' } },
            { toolName: 'cite_manager', args: { action: 'process' } }
          ],
          workflowPhase: 3,
          isFirstMessage: false
        },
        expectedResult: {
          approved: false,
          riskLevel: 'medium'
        },
        category: 'tool_usage'
      },

      // ============================================
      // EDGE CASES
      // ============================================
      {
        id: 'edge-no-persona',
        name: 'Edge Case - No Persona Selected',
        description: 'Test behavior when no persona is selected',
        context: {
          sessionId: 'test-session-10',
          userId: 'test-user-5',
          chatMode: null,
          personaTemplate: undefined,
          messageContent: 'Hello, can you help me?',
          toolCalls: [],
          workflowPhase: null,
          isFirstMessage: true
        },
        expectedResult: {
          approved: true, // Should default to permissive
          riskLevel: 'low'
        },
        category: 'edge_cases'
      },

      {
        id: 'edge-very-long-content',
        name: 'Edge Case - Very Long Content',
        description: 'Test handling of unusually long message content',
        context: {
          sessionId: 'test-session-11',
          userId: 'test-user-5',
          chatMode: 'formal',
          personaTemplate: this.mockPersonas[0],
          messageContent: 'A'.repeat(10000), // 10k characters
          toolCalls: [],
          workflowPhase: 1,
          isFirstMessage: false
        },
        expectedResult: {
          approved: false,
          triggeredRules: ['Large Content Generation'],
          riskLevel: 'medium'
        },
        category: 'edge_cases'
      }
    ]
  }
}

// ============================================
// APPROVAL GATE TEST RUNNER
// ============================================

export class ApprovalGateTestRunner {
  private testDataGenerator = new ApprovalTestDataGenerator()

  async runTestSuite(
    suiteName = 'Persona Approval Gate Tests',
    testCases?: ApprovalTestCase[]
  ): Promise<TestSuiteResult> {
    console.log(`[APPROVAL TEST] Starting test suite: ${suiteName}`)
    
    const startTime = Date.now()
    const casesToRun = testCases || this.testDataGenerator.generateTestCases()
    const results: TestResult[] = []
    
    for (const testCase of casesToRun) {
      const result = await this.runSingleTest(testCase)
      results.push(result)
      
      console.log(`[APPROVAL TEST] ${result.passed ? '✅' : '❌'} ${testCase.name} (${result.executionTime}ms)`)
      
      if (!result.passed) {
        console.log(`  Discrepancies: ${result.discrepancies.join(', ')}`)
      }
    }
    
    const totalTime = Date.now() - startTime
    const summary = this.generateSummary(results, casesToRun)
    
    const suiteResult: TestSuiteResult = {
      suiteName,
      totalTests: casesToRun.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      executionTime: totalTime,
      results,
      summary
    }
    
    this.logSummary(suiteResult)
    return suiteResult
  }

  async runSingleTest(testCase: ApprovalTestCase): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Execute the approval evaluation
      const actualResult = await personaApprovalGates.evaluatePersonaApproval(testCase.context)
      const executionTime = Date.now() - startTime
      
      // Compare with expected results
      const discrepancies = this.compareResults(actualResult, testCase.expectedResult)
      const passed = discrepancies.length === 0
      
      return {
        testId: testCase.id,
        passed,
        actualResult,
        expectedResult: testCase.expectedResult,
        discrepancies,
        executionTime,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      const executionTime = Date.now() - startTime
      
      return {
        testId: testCase.id,
        passed: false,
        actualResult: {
          approved: false,
          reason: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          triggeredRules: [],
          requiredApprovers: [],
          estimatedWaitTime: 0
        },
        expectedResult: testCase.expectedResult,
        discrepancies: [`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        executionTime,
        timestamp: new Date().toISOString()
      }
    }
  }

  private compareResults(
    actual: ApprovalGateResult,
    expected: ApprovalTestCase['expectedResult']
  ): string[] {
    const discrepancies: string[] = []
    
    // Check approval status
    if (actual.approved !== expected.approved) {
      discrepancies.push(`Approval status mismatch: expected ${expected.approved}, got ${actual.approved}`)
    }
    
    // Check triggered rules
    if (expected.triggeredRules) {
      const missingRules = expected.triggeredRules.filter(rule => 
        !actual.triggeredRules.includes(rule)
      )
      if (missingRules.length > 0) {
        discrepancies.push(`Missing triggered rules: ${missingRules.join(', ')}`)
      }
    }
    
    // Check required approvers
    if (expected.requiredApprovers) {
      const missingApprovers = expected.requiredApprovers.filter(approver =>
        !actual.requiredApprovers.includes(approver)
      )
      if (missingApprovers.length > 0) {
        discrepancies.push(`Missing required approvers: ${missingApprovers.join(', ')}`)
      }
    }
    
    return discrepancies
  }

  private generateSummary(results: TestResult[], testCases: ApprovalTestCase[]) {
    const byCategory: Record<string, { passed: number; total: number }> = {}
    const failureReasons: string[] = []
    const executionTimes = results.map(r => ({ id: r.testId, time: r.executionTime }))
    
    // Group by category
    testCases.forEach(testCase => {
      if (!byCategory[testCase.category]) {
        byCategory[testCase.category] = { passed: 0, total: 0 }
      }
      byCategory[testCase.category].total++
    })
    
    results.forEach(result => {
      const testCase = testCases.find(tc => tc.id === result.testId)
      if (testCase && byCategory[testCase.category]) {
        if (result.passed) {
          byCategory[testCase.category].passed++
        } else {
          failureReasons.push(...result.discrepancies)
        }
      }
    })
    
    // Find common failures
    const failureCounts: Record<string, number> = {}
    failureReasons.forEach(reason => {
      failureCounts[reason] = (failureCounts[reason] || 0) + 1
    })
    
    const commonFailures = Object.entries(failureCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason]) => reason)
    
    // Performance metrics
    const averageExecutionTime = executionTimes.reduce((sum, { time }) => sum + time, 0) / executionTimes.length
    const slowestTest = executionTimes.reduce((slowest, current) => 
      current.time > slowest.time ? current : slowest
    )
    const fastestTest = executionTimes.reduce((fastest, current) =>
      current.time < fastest.time ? current : fastest
    )
    
    return {
      byCategory,
      commonFailures,
      performanceMetrics: {
        averageExecutionTime: Math.round(averageExecutionTime),
        slowestTest,
        fastestTest
      }
    }
  }

  private logSummary(result: TestSuiteResult) {
    console.log('\n' + '='.repeat(60))
    console.log(`📊 TEST SUITE SUMMARY: ${result.suiteName}`)
    console.log('='.repeat(60))
    console.log(`Total Tests: ${result.totalTests}`)
    console.log(`✅ Passed: ${result.passed} (${Math.round(result.passed / result.totalTests * 100)}%)`)
    console.log(`❌ Failed: ${result.failed} (${Math.round(result.failed / result.totalTests * 100)}%)`)
    console.log(`⏱️  Execution Time: ${result.executionTime}ms`)
    console.log(`⚡ Average Test Time: ${result.summary.performanceMetrics.averageExecutionTime}ms`)
    
    console.log('\n📈 RESULTS BY CATEGORY:')
    Object.entries(result.summary.byCategory).forEach(([category, stats]) => {
      const percentage = Math.round(stats.passed / stats.total * 100)
      console.log(`  ${category}: ${stats.passed}/${stats.total} (${percentage}%)`)
    })
    
    if (result.summary.commonFailures.length > 0) {
      console.log('\n⚠️  COMMON FAILURES:')
      result.summary.commonFailures.forEach((failure, i) => {
        console.log(`  ${i + 1}. ${failure}`)
      })
    }
    
    console.log('\n🏃‍♂️ PERFORMANCE:')
    console.log(`  Fastest: ${result.summary.performanceMetrics.fastestTest.id} (${result.summary.performanceMetrics.fastestTest.time}ms)`)
    console.log(`  Slowest: ${result.summary.performanceMetrics.slowestTest.id} (${result.summary.performanceMetrics.slowestTest.time}ms)`)
    
    console.log('='.repeat(60) + '\n')
  }

  // ============================================
  // VALIDATION AND STRESS TESTING
  // ============================================

  async validateApprovalRules(): Promise<{
    valid: boolean
    issues: string[]
    ruleStats: Record<string, any>
  }> {
    console.log('[APPROVAL TEST] Validating approval rules configuration...')
    
    const issues: string[] = []
    const ruleStats: Record<string, any> = {}
    
    try {
      // Get engine status
      const engineStatus = approvalGateEngine.getStatus()
      ruleStats.totalRules = engineStatus.totalRules
      ruleStats.rulesByMode = engineStatus.rulesByMode
      
      // Test rule coverage
      if (engineStatus.totalRules === 0) {
        issues.push('No approval rules configured')
      }
      
      if (engineStatus.rulesByMode.formal === 0) {
        issues.push('No rules configured for formal mode')
      }
      
      if (engineStatus.rulesByMode.casual === 0) {
        issues.push('No rules configured for casual mode')
      }
      
      // Test rule conflicts
      const testContext: PersonaApprovalContext = {
        sessionId: 'validation-test',
        messageContent: 'Test message',
        chatMode: 'formal',
        workflowPhase: 1,
        isFirstMessage: false
      }
      
      const result = await personaApprovalGates.evaluatePersonaApproval(testContext)
      if (result.triggeredRules.length === 0) {
        // This is actually expected for a benign test message
        ruleStats.rulesTriggeredByDefault = false
      }
      
      console.log('[APPROVAL TEST] Rule validation completed')
      
      return {
        valid: issues.length === 0,
        issues,
        ruleStats
      }
      
    } catch (error) {
      issues.push(`Rule validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      return {
        valid: false,
        issues,
        ruleStats
      }
    }
  }

  async stressTest(
    concurrentRequests = 10,
    totalRequests = 100
  ): Promise<{
    successful: number
    failed: number
    averageResponseTime: number
    maxResponseTime: number
    minResponseTime: number
    errors: string[]
  }> {
    console.log(`[APPROVAL TEST] Starting stress test: ${concurrentRequests} concurrent, ${totalRequests} total`)
    
    const results: Array<{ success: boolean; time: number; error?: string }> = []
    const testCases = this.testDataGenerator.generateTestCases().slice(0, 5) // Use subset
    
    const runBatch = async (batchSize: number) => {
      const promises = Array.from({ length: batchSize }, async (_, i) => {
        const testCase = testCases[i % testCases.length]
        const startTime = Date.now()
        
        try {
          await personaApprovalGates.evaluatePersonaApproval(testCase.context)
          return {
            success: true,
            time: Date.now() - startTime
          }
        } catch (error) {
          return {
            success: false,
            time: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
      
      return Promise.all(promises)
    }
    
    // Run stress test in batches
    const batchSize = Math.min(concurrentRequests, totalRequests)
    const batches = Math.ceil(totalRequests / batchSize)
    
    for (let i = 0; i < batches; i++) {
      const currentBatchSize = Math.min(batchSize, totalRequests - i * batchSize)
      const batchResults = await runBatch(currentBatchSize)
      results.push(...batchResults)
      
      // Small delay between batches to avoid overwhelming the system
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // Calculate statistics
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const responseTimes = results.map(r => r.time)
    const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error')
    
    const stats = {
      successful,
      failed,
      averageResponseTime: Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length),
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      errors: [...new Set(errors)] // Remove duplicates
    }
    
    console.log(`[APPROVAL TEST] Stress test completed:`, stats)
    
    return stats
  }
}

// ============================================
// EXPORTS AND UTILITIES
// ============================================

export const approvalGateTestRunner = new ApprovalGateTestRunner()

export async function runApprovalGateTests() {
  return approvalGateTestRunner.runTestSuite()
}

export async function validateApprovalSystem() {
  const runner = new ApprovalGateTestRunner()
  
  console.log('🧪 Running comprehensive approval system validation...')
  
  // Run main test suite
  const testResults = await runner.runTestSuite()
  
  // Validate rule configuration
  const ruleValidation = await runner.validateApprovalRules()
  
  // Run light stress test
  const stressResults = await runner.stressTest(5, 25)
  
  const overallResult = {
    testSuite: testResults,
    ruleValidation,
    stressTest: stressResults,
    overallHealth: {
      testsPass: testResults.passed / testResults.totalTests > 0.9,
      rulesValid: ruleValidation.valid,
      performanceGood: stressResults.averageResponseTime < 1000,
      errorRateLow: stressResults.failed / (stressResults.successful + stressResults.failed) < 0.1
    }
  }
  
  console.log('✅ Approval system validation completed')
  
  return overallResult
}

// Development helper - run tests automatically in development mode
if (process.env.NODE_ENV === 'development') {
  // Uncomment to run tests automatically during development
  // setTimeout(() => {
  //   validateApprovalSystem().then(results => {
  //     console.log('🔍 Development validation results:', results.overallHealth)
  //   })
  // }, 5000) // Run after 5 seconds to allow system initialization
}