/**
 * 🚀 P03.5: WORKFLOW PROGRESS VISUALIZATION COMPONENT
 * Real-time workflow progress tracking with 8-phase academic workflow visualization
 */

'use client'

import { useChatStore } from '@/store/chat'
import type { WorkflowState } from '@/types'

interface WorkflowProgressProps {
  sessionId?: string | null
}

export function WorkflowProgress({ sessionId }: WorkflowProgressProps) {
  const { 
    workflowState, 
    getCurrentWorkflowPhase, 
    getNextRequiredTools,
    isWorkflowActive 
  } = useChatStore()

  // Only show for active workflows
  if (!isWorkflowActive() || !workflowState || workflowState.type !== 'academic-8-phase') {
    return null
  }

  const currentPhase = getCurrentWorkflowPhase()
  const requiredTools = getNextRequiredTools()
  const completionPercentage = Math.round((workflowState.completedPhases.length / workflowState.maxPhases) * 100)

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">
          📚 Workflow Akademik 8-Fase
        </h3>
        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
          {completionPercentage}% Complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>Phase {workflowState.currentPhase}/8</span>
          <span>{workflowState.completedPhases.length} completed</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Current Phase Info */}
      {currentPhase && (
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-1">
              📍 Fase Aktif: {currentPhase.name}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {currentPhase.description}
            </p>
          </div>

          {requiredTools.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                🛠️ Tools Diperlukan:
              </h5>
              <div className="flex flex-wrap gap-1">
                {requiredTools.map((tool, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Expected Outputs */}
          {currentPhase.expectedOutputs.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                🎯 Output yang Diharapkan:
              </h5>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                {currentPhase.expectedOutputs.map((output, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span>•</span>
                    <span>{output}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Phase Progress Indicators */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-4 gap-1 text-xs">
              {workflowState.phases.slice(0, 8).map((phase) => {
                const isCompleted = workflowState.completedPhases.includes(phase.phase)
                const isCurrent = workflowState.currentPhase === phase.phase
                const phaseProgress = workflowState.phaseProgress[phase.phase]

                return (
                  <div
                    key={phase.phase}
                    className={`p-2 rounded text-center transition-all ${
                      isCompleted
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : isCurrent
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 ring-2 ring-blue-300 dark:ring-blue-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-medium">{phase.phase}</div>
                    <div className="text-xs leading-tight mt-1">
                      {phase.name.split(' ').slice(0, 2).join(' ')}
                    </div>
                    {phaseProgress?.started && !isCompleted && (
                      <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1 mt-1">
                        <div className="bg-current h-1 rounded-full w-1/2" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Completion Criteria */}
      {currentPhase?.completionCriteria && currentPhase.completionCriteria.length > 0 && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            📋 Kriteria Penyelesaian Fase
          </summary>
          <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
            {currentPhase.completionCriteria.map((criteria, idx) => (
              <li key={idx} className="flex items-start gap-2 pl-2">
                <span>☐</span>
                <span>{criteria}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

export default WorkflowProgress