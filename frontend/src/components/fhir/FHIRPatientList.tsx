import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Users, Search, ChevronLeft, ChevronRight,
  User, Calendar, MapPin, Mail, AlertCircle
} from 'lucide-react'
import api from '../../utils/api'
import { clsx } from 'clsx'

interface Patient {
  id: string
  identifier_mrn: string
  name_given: string
  name_family: string
  full_name: string
  gender: string
  birth_date: string
  age: number
  address_city: string
  address_state: string
  telecom_email: string
  active: boolean
  deceased_boolean: boolean
}

interface PaginatedResponse {
  count: number
  next: string | null
  previous: string | null
  results: Patient[]
}

export default function FHIRPatientList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [patients, setPatients] = useState<Patient[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [genderFilter, setGenderFilter] = useState(searchParams.get('gender') || '')
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') || '')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('active') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))

  const pageSize = 20

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (genderFilter) params.append('gender', genderFilter)
      if (stateFilter) params.append('address_state', stateFilter)
      if (activeFilter) params.append('active', activeFilter)
      params.append('page', page.toString())

      const response = await api.get<PaginatedResponse>(`/fhir/patients/?${params}`)
      setPatients(response.data.results)
      setTotalCount(response.data.count)
    } catch (err) {
      console.error('Failed to fetch patients:', err)
      setError('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, genderFilter, stateFilter, activeFilter, page])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (genderFilter) params.set('gender', genderFilter)
    if (stateFilter) params.set('state', stateFilter)
    if (activeFilter) params.set('active', activeFilter)
    if (page > 1) params.set('page', page.toString())
    setSearchParams(params)
  }, [searchTerm, genderFilter, stateFilter, activeFilter, page, setSearchParams])

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>()
  const debouncedSearch = useCallback((value: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setSearchTerm(value)
      setPage(1)
    }, 300)
  }, [])

  const totalPages = Math.ceil(totalCount / pageSize)

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case 'male': return 'bg-blue-100 text-blue-800'
      case 'female': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/fhir" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">FHIR Patients</h1>
            <p className="text-sm sm:text-base text-gray-600">{totalCount.toLocaleString()} patients in database</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, MRN, or email..."
              defaultValue={searchTerm}
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={genderFilter}
              onChange={(e) => { setGenderFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            <select
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <input
              type="text"
              placeholder="State..."
              value={stateFilter}
              onChange={(e) => { setStateFilter(e.target.value); setPage(1) }}
              className="w-20 sm:w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Patient List */}
      {!loading && !error && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MRN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Demographics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/fhir/patients/${patient.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className={clsx(
                          'h-10 w-10 rounded-full flex items-center justify-center',
                          patient.gender === 'male' ? 'bg-blue-100' : patient.gender === 'female' ? 'bg-pink-100' : 'bg-gray-100'
                        )}>
                          <User className={clsx(
                            'h-5 w-5',
                            patient.gender === 'male' ? 'text-blue-600' : patient.gender === 'female' ? 'text-pink-600' : 'text-gray-600'
                          )} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 hover:text-primary-600">
                            {patient.full_name}
                          </div>
                          {patient.telecom_email && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {patient.telecom_email}
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-600">{patient.identifier_mrn}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          getGenderColor(patient.gender)
                        )}>
                          {patient.gender}
                        </span>
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {patient.age} yrs
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {patient.address_city}, {patient.address_state}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {patient.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                        {patient.deceased_boolean && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-white">
                            Deceased
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-gray-600">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} patients
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
