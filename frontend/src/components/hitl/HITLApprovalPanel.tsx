import { useState } from 'react'
import { Shield, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { ApprovalTask } from '../../types'
import { useStore } from '../../store'
import { useWebSocket } from '../../hooks/useWebSocket'
import { clsx } from 'clsx'

interface HITLApprovalPanelProps {
  approval: ApprovalTask
}

export default function HITLApprovalPanel({ approval }: HITLApprovalPanelProps) {
  const [notes, setNotes] = useState('')
  const { userId, isLoading, sessionId } = useStore()
  const { sendDecision } = useWebSocket()

  const getRiskColor = (score: number) => {
    if (score >= 0.7) return 'text-danger-600 bg-danger-50'
    if (score >= 0.4) return 'text-warning-600 bg-warning-50'
    return 'text-success-600 bg-success-50'
  }

  const handleApprove = () => {
    sendDecision(sessionId, 'APPROVED', userId, notes)
  }

  const handleReject = () => {
    sendDecision(sessionId, 'REJECTED', userId, notes)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-warning-600" />
        <h3 className="font-semibold text-gray-900">Approval Required</h3>
      </div>

      {/* Risk Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600">Risk Score</span>
          <span
            className={clsx(
              'text-sm font-medium px-2 py-0.5 rounded',
              getRiskColor(approval.riskScore)
            )}
          >
            {(approval.riskScore * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={clsx(
              'h-2 rounded-full transition-all',
              approval.riskScore >= 0.7
                ? 'bg-danger-500'
                : approval.riskScore >= 0.4
                ? 'bg-warning-500'
                : 'bg-success-500'
            )}
            style={{ width: `${approval.riskScore * 100}%` }}
          />
        </div>
      </div>

      {/* Query Type */}
      <div className="mb-4">
        <span className="text-sm text-gray-600">Query Type:</span>
        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
          {approval.queryType}
        </span>
      </div>

      {/* Generated SQL */}
      <div className="mb-4">
        <span className="text-sm text-gray-600 block mb-1">Generated SQL:</span>
        <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto max-h-32">
          {approval.generatedSql}
        </pre>
      </div>

      {/* Risk Assessment */}
      {approval.riskAssessment && (
        <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-600 mt-0.5" />
            <p className="text-sm text-warning-800">{approval.riskAssessment}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mb-4">
        <label className="text-sm text-gray-600 block mb-1">
          Review Notes (optional):
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about your decision..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Approve
            </>
          )}
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <XCircle className="h-4 w-4" />
              Reject
            </>
          )}
        </button>
      </div>
    </div>
  )
}
