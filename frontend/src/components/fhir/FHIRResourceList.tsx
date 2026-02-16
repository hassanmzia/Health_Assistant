import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Search, AlertCircle
} from 'lucide-react'
import api from '../../utils/api'

interface ColumnDef {
  key: string
  label: string
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
}

interface FHIRResourceListProps {
  title: string
  icon: React.ElementType
  apiEndpoint: string
  columns: ColumnDef[]
  searchPlaceholder?: string
}

interface PaginatedResponse {
  count: number
  next: string | null
  previous: string | null
  results: Record<string, unknown>[]
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string') {
    // Try to format as date if it looks like one
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        const d = new Date(value)
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      } catch {
        return value
      }
    }
    return value
  }
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    finished: 'bg-blue-100 text-blue-800',
    inactive: 'bg-gray-100 text-gray-800',
    resolved: 'bg-teal-100 text-teal-800',
    recurrence: 'bg-yellow-100 text-yellow-800',
    'entered-in-error': 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800',
    stopped: 'bg-orange-100 text-orange-800',
    draft: 'bg-gray-100 text-gray-600',
    'on-hold': 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    unconfirmed: 'bg-yellow-100 text-yellow-800',
    refuted: 'bg-red-100 text-red-800',
    high: 'bg-red-100 text-red-800',
    low: 'bg-green-100 text-green-800',
    'unable-to-assess': 'bg-gray-100 text-gray-800',
  }
  const colorClass = colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  )
}

export default function FHIRResourceList({
  title, icon: Icon, apiEndpoint, columns, searchPlaceholder
}: FHIRResourceListProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const pageSize = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      params.append('page', page.toString())
      const response = await api.get<PaginatedResponse>(
        `/fhir/${apiEndpoint}/?${params}`
      )
      setItems(response.data.results)
      setTotalCount(response.data.count)
    } catch (err) {
      console.error(`Failed to fetch ${title}:`, err)
      setError(`Failed to load ${title.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, page, apiEndpoint, title])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (page > 1) params.set('page', page.toString())
    setSearchParams(params)
  }, [searchTerm, page, setSearchParams])

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>()
  const debouncedSearch = useCallback((value: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setSearchTerm(value)
      setPage(1)
    }, 300)
  }, [])

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/fhir" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">FHIR {title}</h1>
            <p className="text-sm sm:text-base text-gray-600">{totalCount.toLocaleString()} {title.toLowerCase()} in database</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder || `Search ${title.toLowerCase()}...`}
            defaultValue={searchTerm}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, rowIdx) => (
                    <tr key={(item.id as string) || rowIdx} className="hover:bg-gray-50">
                      {columns.map((col) => (
                        <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {col.render
                            ? col.render(item[col.key], item)
                            : formatValue(item[col.key])
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                        No {title.toLowerCase()} found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-gray-600">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export { StatusBadge, formatValue }
export type { ColumnDef }
