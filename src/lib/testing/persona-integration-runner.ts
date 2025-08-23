// ============================================
// MAKALAH AI: Persona Integration Test Runner
// ============================================
// Task P07.5 Implementation: Test execution and validation utilities for persona integration
// Created: August 2025  
// Features: Automated test execution, validation reporting, compatibility metrics

import { 
  integrationTestFramework,
  runAllTests,
  generateTestReport,
  type IntegrationTestResult 
} from './integration-test-framework'
import './persona-integration-test-suites' // Auto-register test suites

// ============================================
// PERSONA COMPATIBILITY VALIDATION
// ============================================

export interface PersonaCompatibilityReport {
  overall: {
    totalTests: number
    passed: number
    failed: number
    successRate: number
    avgDuration: number
  }
  byComponent: Record<string, {
    tests: number
    passed: number
    failed: number
    successRate: number
  }>
  byPersonaMode: {
    academic: {
      tests: number
      passed: number
      successRate: number
    }
    casual: {
      tests: number
      passed: number
      successRate: number
    }
  }
  byChatMode: {
    formal: {
      tests: number
      passed: number
      successRate: number
    }
    casual: {
      tests: number
      passed: number
      successRate: number
    }
  }
  performance: {
    avgResponseTime: number
    slowestTest: {
      testId: string
      duration: number
    }
    fastestTest: {
      testId: string
      duration: number
    }
  }
  failureAnalysis: {
    criticalFailures: IntegrationTestResult[]
    componentFailures: Record<string, IntegrationTestResult[]>
    recommendations: string[]
  }
  compatibilityScore: number // 0-100 score
}

export class PersonaCompatibilityValidator {
  private static instance: PersonaCompatibilityValidator

  private constructor() {}

  static getInstance(): PersonaCompatibilityValidator {
    if (!this.instance) {
      this.instance = new PersonaCompatibilityValidator()
    }
    return this.instance
  }

  // ============================================
  // MAIN VALIDATION METHODS
  // ============================================

  async validatePersonaCompatibility(): Promise<PersonaCompatibilityReport> {
    console.log('[PERSONA COMPATIBILITY] Starting comprehensive persona integration validation...')
    
    const startTime = Date.now()
    const testResults = await runAllTests()
    const duration = Date.now() - startTime

    console.log(`[PERSONA COMPATIBILITY] Validation completed in ${duration}ms`)

    const allResults = Object.values(testResults).flat()
    const report = this.generateCompatibilityReport(allResults)

    console.log(`[PERSONA COMPATIBILITY] Overall compatibility score: ${report.compatibilityScore}%`)
    
    return report
  }

  private generateCompatibilityReport(results: IntegrationTestResult[]): PersonaCompatibilityReport {
    // Overall metrics
    const totalTests = results.length
    const passed = results.filter(r => r.passed).length
    const failed = totalTests - passed
    const successRate = totalTests > 0 ? (passed / totalTests) * 100 : 0
    const avgDuration = totalTests > 0 ? results.reduce((sum, r) => sum + r.duration, 0) / totalTests : 0

    // By component analysis
    const byComponent = this.analyzeByComponent(results)

    // By persona mode analysis
    const byPersonaMode = this.analyzeByPersonaMode(results)

    // By chat mode analysis  
    const byChatMode = this.analyzeByChatMode(results)

    // Performance analysis
    const performance = this.analyzePerformance(results)

    // Failure analysis
    const failureAnalysis = this.analyzeFailures(results)

    // Calculate compatibility score
    const compatibilityScore = this.calculateCompatibilityScore(results, byComponent, byPersonaMode)

    return {
      overall: {
        totalTests,
        passed,
        failed,
        successRate,
        avgDuration
      },
      byComponent,
      byPersonaMode,
      byChatMode,
      performance,
      failureAnalysis,
      compatibilityScore
    }
  }

  private analyzeByComponent(results: IntegrationTestResult[]): Record<string, any> {
    const componentMap = results.reduce((acc, result) => {
      if (!acc[result.component]) {
        acc[result.component] = []
      }
      acc[result.component].push(result)
      return acc
    }, {} as Record<string, IntegrationTestResult[]>)

    return Object.entries(componentMap).reduce((acc, [component, tests]) => {
      const passed = tests.filter(t => t.passed).length
      const total = tests.length
      acc[component] = {
        tests: total,
        passed,
        failed: total - passed,
        successRate: total > 0 ? (passed / total) * 100 : 0
      }
      return acc
    }, {} as Record<string, any>)
  }

  private analyzeByPersonaMode(results: IntegrationTestResult[]): PersonaCompatibilityReport['byPersonaMode'] {
    const academicTests = results.filter(r => r.persona?.mode === 'formal')
    const casualTests = results.filter(r => r.persona?.mode === 'casual')

    return {
      academic: {
        tests: academicTests.length,
        passed: academicTests.filter(t => t.passed).length,
        successRate: academicTests.length > 0 ? 
          (academicTests.filter(t => t.passed).length / academicTests.length) * 100 : 0
      },
      casual: {
        tests: casualTests.length,
        passed: casualTests.filter(t => t.passed).length,
        successRate: casualTests.length > 0 ? 
          (casualTests.filter(t => t.passed).length / casualTests.length) * 100 : 0
      }
    }
  }

  private analyzeByChatMode(results: IntegrationTestResult[]): PersonaCompatibilityReport['byChatMode'] {
    const formalTests = results.filter(r => r.chatMode === 'formal')
    const casualTests = results.filter(r => r.chatMode === 'casual')

    return {
      formal: {
        tests: formalTests.length,
        passed: formalTests.filter(t => t.passed).length,
        successRate: formalTests.length > 0 ? 
          (formalTests.filter(t => t.passed).length / formalTests.length) * 100 : 0
      },
      casual: {
        tests: casualTests.length,
        passed: casualTests.filter(t => t.passed).length,
        successRate: casualTests.length > 0 ? 
          (casualTests.filter(t => t.passed).length / casualTests.length) * 100 : 0
      }
    }
  }

  private analyzePerformance(results: IntegrationTestResult[]): PersonaCompatibilityReport['performance'] {
    const withMetrics = results.filter(r => r.metrics?.responseTime)
    const avgResponseTime = withMetrics.length > 0 ? 
      withMetrics.reduce((sum, r) => sum + (r.metrics!.responseTime), 0) / withMetrics.length : 0

    const sortedByDuration = [...results].sort((a, b) => b.duration - a.duration)

    return {
      avgResponseTime,
      slowestTest: {
        testId: sortedByDuration[0]?.testId || 'none',
        duration: sortedByDuration[0]?.duration || 0
      },
      fastestTest: {
        testId: sortedByDuration[sortedByDuration.length - 1]?.testId || 'none',
        duration: sortedByDuration[sortedByDuration.length - 1]?.duration || 0
      }
    }
  }

  private analyzeFailures(results: IntegrationTestResult[]): PersonaCompatibilityReport['failureAnalysis'] {
    const failedTests = results.filter(r => !r.passed)
    
    // Critical failures (core functionality)
    const criticalComponents = ['PersonaAwareProviderManager', 'PersonaAwareDatabaseManager', 'Full Integration']
    const criticalFailures = failedTests.filter(test => 
      criticalComponents.some(comp => test.component.includes(comp))
    )

    // Failures by component
    const componentFailures = failedTests.reduce((acc, test) => {
      if (!acc[test.component]) {
        acc[test.component] = []
      }
      acc[test.component].push(test)
      return acc
    }, {} as Record<string, IntegrationTestResult[]>)

    // Generate recommendations
    const recommendations = this.generateRecommendations(failedTests, criticalFailures)

    return {
      criticalFailures,
      componentFailures,
      recommendations
    }
  }

  private generateRecommendations(failedTests: IntegrationTestResult[], criticalFailures: IntegrationTestResult[]): string[] {
    const recommendations: string[] = []

    if (criticalFailures.length > 0) {
      recommendations.push('CRITICAL: Fix core persona integration failures before deployment')
    }

    const providerFailures = failedTests.filter(t => t.component.includes('Provider'))
    if (providerFailures.length > 0) {
      recommendations.push('Review AI provider configuration and persona context propagation')
    }

    const dbFailures = failedTests.filter(t => t.component.includes('Database'))
    if (dbFailures.length > 0) {
      recommendations.push('Verify database schema and persona metadata storage')
    }

    const uiFailures = failedTests.filter(t => t.component.includes('ui') || t.component.includes('UI'))
    if (uiFailures.length > 0) {
      recommendations.push('Check React component persona context integration')
    }

    const approvalFailures = failedTests.filter(t => t.component.includes('Approval'))
    if (approvalFailures.length > 0) {
      recommendations.push('Review approval gate rules and persona-specific configurations')
    }

    if (failedTests.length === 0) {
      recommendations.push('All tests passed! Persona integration is ready for production.')
    }

    return recommendations
  }

  private calculateCompatibilityScore(
    results: IntegrationTestResult[], 
    byComponent: Record<string, any>,
    byPersonaMode: PersonaCompatibilityReport['byPersonaMode']
  ): number {
    const totalTests = results.length
    const passedTests = results.filter(r => r.passed).length
    
    if (totalTests === 0) return 0

    // Base score from pass rate
    let score = (passedTests / totalTests) * 70

    // Bonus points for critical component success
    const criticalComponents = ['PersonaAwareProviderManager', 'PersonaAwareDatabaseManager', 'Full Integration']
    const criticalTests = results.filter(r => 
      criticalComponents.some(comp => r.component.includes(comp))
    )
    const criticalPassed = criticalTests.filter(r => r.passed).length
    
    if (criticalTests.length > 0) {
      score += (criticalPassed / criticalTests.length) * 20
    }

    // Bonus points for persona mode consistency
    const academicConsistency = byPersonaMode.academic.successRate
    const casualConsistency = byPersonaMode.casual.successRate
    const modeConsistencyBonus = ((academicConsistency + casualConsistency) / 200) * 10

    score += modeConsistencyBonus

    return Math.min(Math.round(score), 100)
  }

  // ============================================
  // REPORTING METHODS
  // ============================================

  async generateCompatibilityReport(): Promise<string> {
    const report = await this.validatePersonaCompatibility()
    
    return `
# Persona Integration Compatibility Report

**Generated:** ${new Date().toISOString()}
**Compatibility Score:** ${report.compatibilityScore}/100

## Executive Summary

${this.getExecutiveSummary(report)}

## Overall Results

- **Total Tests:** ${report.overall.totalTests}
- **Passed:** ${report.overall.passed} (${report.overall.successRate.toFixed(1)}%)
- **Failed:** ${report.overall.failed}
- **Average Duration:** ${report.overall.avgDuration.toFixed(0)}ms

## Component Analysis

${this.formatComponentAnalysis(report.byComponent)}

## Persona Mode Analysis

- **Academic Mode:** ${report.byPersonaMode.academic.passed}/${report.byPersonaMode.academic.tests} (${report.byPersonaMode.academic.successRate.toFixed(1)}%)
- **Casual Mode:** ${report.byPersonaMode.casual.passed}/${report.byPersonaMode.casual.tests} (${report.byPersonaMode.casual.successRate.toFixed(1)}%)

## Chat Mode Analysis

- **Formal Chat:** ${report.byChatMode.formal.passed}/${report.byChatMode.formal.tests} (${report.byChatMode.formal.successRate.toFixed(1)}%)
- **Casual Chat:** ${report.byChatMode.casual.passed}/${report.byChatMode.casual.tests} (${report.byChatMode.casual.successRate.toFixed(1)}%)

## Performance Metrics

- **Average Response Time:** ${report.performance.avgResponseTime.toFixed(0)}ms
- **Slowest Test:** ${report.performance.slowestTest.testId} (${report.performance.slowestTest.duration}ms)
- **Fastest Test:** ${report.performance.fastestTest.testId} (${report.performance.fastestTest.duration}ms)

## Failure Analysis

${this.formatFailureAnalysis(report.failureAnalysis)}

## Recommendations

${report.failureAnalysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## Deployment Readiness

${this.getDeploymentReadiness(report)}
    `.trim()
  }

  private getExecutiveSummary(report: PersonaCompatibilityReport): string {
    if (report.compatibilityScore >= 95) {
      return '✅ **EXCELLENT** - Persona integration is production-ready with comprehensive compatibility across all components.'
    } else if (report.compatibilityScore >= 85) {
      return '🟨 **GOOD** - Persona integration is mostly compatible with minor issues that should be addressed.'
    } else if (report.compatibilityScore >= 70) {
      return '🟧 **ACCEPTABLE** - Persona integration has significant compatibility issues that need attention.'
    } else {
      return '🔴 **CRITICAL** - Persona integration has major compatibility failures that must be fixed before deployment.'
    }
  }

  private formatComponentAnalysis(byComponent: Record<string, any>): string {
    return Object.entries(byComponent)
      .map(([component, data]) => {
        const status = data.successRate >= 90 ? '✅' : data.successRate >= 70 ? '🟨' : '🔴'
        return `- **${component}:** ${status} ${data.passed}/${data.tests} (${data.successRate.toFixed(1)}%)`
      })
      .join('\n')
  }

  private formatFailureAnalysis(failureAnalysis: PersonaCompatibilityReport['failureAnalysis']): string {
    let analysis = ''

    if (failureAnalysis.criticalFailures.length > 0) {
      analysis += `**Critical Failures:** ${failureAnalysis.criticalFailures.length}\n`
      failureAnalysis.criticalFailures.forEach(failure => {
        analysis += `- ${failure.component}/${failure.testName}: ${failure.error}\n`
      })
      analysis += '\n'
    }

    if (Object.keys(failureAnalysis.componentFailures).length > 0) {
      analysis += '**Component Failures:**\n'
      Object.entries(failureAnalysis.componentFailures).forEach(([component, failures]) => {
        analysis += `- **${component}:** ${failures.length} failures\n`
      })
    }

    return analysis || 'No failures detected.'
  }

  private getDeploymentReadiness(report: PersonaCompatibilityReport): string {
    if (report.compatibilityScore >= 95 && report.failureAnalysis.criticalFailures.length === 0) {
      return '🚀 **READY FOR DEPLOYMENT** - All persona integration tests pass with excellent compatibility.'
    } else if (report.compatibilityScore >= 85 && report.failureAnalysis.criticalFailures.length === 0) {
      return '⚠️ **DEPLOYMENT WITH MONITORING** - Deploy with close monitoring and plan to address minor issues.'
    } else if (report.failureAnalysis.criticalFailures.length > 0) {
      return '🚫 **DEPLOYMENT BLOCKED** - Critical persona integration failures must be resolved first.'
    } else {
      return '⏸️ **DEPLOYMENT DELAYED** - Address compatibility issues before proceeding to production.'
    }
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export async function validatePersonaCompatibility(): Promise<PersonaCompatibilityReport> {
  const validator = PersonaCompatibilityValidator.getInstance()
  return validator.validatePersonaCompatibility()
}

export async function generatePersonaCompatibilityReport(): Promise<string> {
  const validator = PersonaCompatibilityValidator.getInstance()
  return validator.generateCompatibilityReport()
}

export async function runPersonaIntegrationTests(): Promise<void> {
  console.log('[PERSONA INTEGRATION] Starting comprehensive persona integration validation...')
  
  try {
    const report = await validatePersonaCompatibility()
    const reportText = await generatePersonaCompatibilityReport()
    
    console.log(reportText)
    
    // Write report to file for documentation
    const fs = await import('fs/promises')
    const path = await import('path')
    
    const reportPath = path.join(process.cwd(), 'persona-integration-test-report.md')
    await fs.writeFile(reportPath, reportText)
    
    console.log(`\n[PERSONA INTEGRATION] Report saved to: ${reportPath}`)
    console.log(`[PERSONA INTEGRATION] Final compatibility score: ${report.compatibilityScore}/100`)
    
    if (report.compatibilityScore >= 90) {
      console.log('✅ [PERSONA INTEGRATION] Persona integration is production-ready!')
    } else if (report.compatibilityScore >= 70) {
      console.log('🟨 [PERSONA INTEGRATION] Persona integration needs attention before deployment.')
    } else {
      console.log('🔴 [PERSONA INTEGRATION] Critical persona integration issues detected!')
    }
    
  } catch (error) {
    console.error('[PERSONA INTEGRATION] Test execution failed:', error)
    throw error
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const personaCompatibilityValidator = PersonaCompatibilityValidator.getInstance()