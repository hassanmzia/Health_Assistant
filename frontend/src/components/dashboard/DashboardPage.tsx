import { useEffect, useState } from 'react'
import { BarChart3, Users, FileText, Activity, TrendingUp } from 'lucide-react'
import axios from 'axios'
import { clsx } from 'clsx'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface Metrics {
  total_queries: number
  by_type: Record<string, number>
  by_status: Record<string, number>
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  change?: string
}

function StatCard({ title, value, icon: Icon, color, change }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-600 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className="text-sm text-success-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {change}
            </p>
          )}
        </div>
        <div className={clsx('p-3 rounded-lg', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API_URL}/audit/metrics/`)
      setMetrics(response.data)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 shrink-0" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Healthcare Intelligence Analytics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          title="Total Queries"
          value={metrics?.total_queries || 0}
          icon={FileText}
          color="bg-primary-600"
        />
        <StatCard
          title="Auto-Executed"
          value={metrics?.by_status?.AUTO_EXECUTED || 0}
          icon={Activity}
          color="bg-success-600"
        />
        <StatCard
          title="Approved"
          value={metrics?.by_status?.APPROVED || 0}
          icon={Users}
          color="bg-primary-600"
        />
        <StatCard
          title="Blocked"
          value={(metrics?.by_status?.REJECTED || 0) + (metrics?.by_status?.BLOCKED || 0)}
          icon={BarChart3}
          color="bg-danger-600"
        />
      </div>

      {/* Query Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Types</h3>
          <div className="space-y-4">
            {Object.entries(metrics?.by_type || {}).map(([type, count]) => {
              const total = metrics?.total_queries || 1
              const percentage = ((count / total) * 100).toFixed(1)
              const colors: Record<string, string> = {
                READ: 'bg-success-500',
                WRITE: 'bg-warning-500',
                UNSAFE: 'bg-danger-500',
              }
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{type}</span>
                    <span className="font-medium">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={clsx('h-2 rounded-full transition-all', colors[type] || 'bg-gray-500')}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Status</h3>
          <div className="space-y-4">
            {Object.entries(metrics?.by_status || {}).map(([status, count]) => {
              const total = metrics?.total_queries || 1
              const percentage = ((count / total) * 100).toFixed(1)
              const colors: Record<string, string> = {
                AUTO_EXECUTED: 'bg-success-500',
                APPROVED: 'bg-primary-500',
                REJECTED: 'bg-danger-500',
                BLOCKED: 'bg-danger-700',
                PENDING: 'bg-warning-500',
              }
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{status.replace('_', ' ')}</span>
                    <span className="font-medium">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={clsx('h-2 rounded-full transition-all', colors[status] || 'bg-gray-500')}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Multi-Agent System</h3>
          <p className="text-primary-100 text-sm">
            SQL Agent, Classifier Agent, HITL Agent, and Executor Agent work together
            to process healthcare queries safely.
          </p>
        </div>

        <div className="bg-gradient-to-br from-success-600 to-success-700 rounded-lg shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">HIPAA Compliant</h3>
          <p className="text-success-100 text-sm">
            All queries are logged to the audit trail. PHI is protected with
            guardrails and access controls.
          </p>
        </div>

        <div className="bg-gradient-to-br from-warning-600 to-warning-700 rounded-lg shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Human-in-the-Loop</h3>
          <p className="text-warning-100 text-sm">
            Write operations require human approval. Unsafe queries are
            automatically blocked.
          </p>
        </div>
      </div>
    </div>
  )
}
