import { useEffect, useState } from 'react'
import { Shield, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import { ApprovalTask } from '../../types'
import { clsx } from 'clsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function HITLPage() {
  const [tasks, setTasks] = useState<ApprovalTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/hitl/history/`)
      setTasks(response.data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-success-600" />
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-danger-600" />
      case 'PENDING':
        return <Clock className="h-5 w-5 text-warning-600" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-success-50 text-success-700'
      case 'REJECTED':
        return 'bg-danger-50 text-danger-700'
      case 'PENDING':
        return 'bg-warning-50 text-warning-700'
      default:
        return 'bg-gray-50 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HITL Approvals</h1>
            <p className="text-gray-600">Human-in-the-Loop approval history</p>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Query
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reviewer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No approval tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.taskId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          getStatusColor(task.status)
                        )}
                      >
                        {task.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 truncate max-w-xs">
                      {task.naturalLanguageQuery}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 rounded bg-primary-50 text-primary-700 text-xs font-medium">
                      {task.queryType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={clsx(
                            'h-2 rounded-full',
                            task.riskScore >= 0.7
                              ? 'bg-danger-500'
                              : task.riskScore >= 0.4
                              ? 'bg-warning-500'
                              : 'bg-success-500'
                          )}
                          style={{ width: `${task.riskScore * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {(task.riskScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.status !== 'PENDING' ? 'reviewer_id' : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
