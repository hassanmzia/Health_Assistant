import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Database, Users, UserCog, Building2, Stethoscope, Activity,
  Pill, AlertTriangle, Syringe, ClipboardList, TrendingUp
} from 'lucide-react'
import axios from 'axios'
import { clsx } from 'clsx'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface FHIRStatistics {
  counts: {
    patients: number
    active_patients: number
    practitioners: number
    organizations: number
    encounters: number
    conditions: number
    active_conditions: number
    observations: number
    medications: number
    active_medications: number
    allergies: number
    procedures: number
    immunizations: number
  }
  demographics: {
    gender_distribution: Array<{ gender: string; count: number }>
    age_groups: Array<{ age_group: string; count: number }>
  }
  clinical: {
    top_conditions: Array<{ code_display: string; count: number }>
    top_medications: Array<{ medication_codeable_concept_display: string; count: number }>
    encounter_types: Array<{ class_display: string; count: number }>
    observation_categories: Array<{ category_display: string; count: number }>
  }
  recent_activity: {
    encounters_last_30_days: number
    observations_last_30_days: number
  }
}

interface ResourceCardProps {
  title: string
  count: number
  activeCount?: number
  icon: React.ElementType
  color: string
  link: string
}

function ResourceCard({ title, count, activeCount, icon: Icon, color, link }: ResourceCardProps) {
  return (
    <Link
      to={link}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-primary-300 transition-all"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{count.toLocaleString()}</p>
          {activeCount !== undefined && activeCount !== count && (
            <p className="text-xs text-gray-500 mt-1">
              {activeCount.toLocaleString()} active
            </p>
          )}
        </div>
        <div className={clsx('p-3 rounded-lg', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </Link>
  )
}

export default function FHIRBrowserPage() {
  const [stats, setStats] = useState<FHIRStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_URL}/fhir/statistics/`)
      setStats(response.data)
    } catch (err) {
      console.error('Failed to fetch FHIR statistics:', err)
      setError('Failed to load FHIR statistics. Make sure the database has been populated.')
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FHIR Data Browser</h1>
            <p className="text-gray-600">FHIR R4 Healthcare Data Explorer</p>
          </div>
        </div>
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-6">
          <h3 className="text-warning-800 font-semibold mb-2">No FHIR Data Available</h3>
          <p className="text-warning-700 text-sm mb-4">{error}</p>
          <p className="text-warning-600 text-sm">
            Run the following commands to set up FHIR data:
          </p>
          <pre className="bg-warning-100 rounded p-3 mt-2 text-xs text-warning-800 overflow-x-auto">
{`docker compose exec backend python manage.py makemigrations fhir
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py generate_fhir_data --patients 100`}
          </pre>
        </div>
      </div>
    )
  }

  const counts = stats?.counts || {} as FHIRStatistics['counts']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FHIR Data Browser</h1>
            <p className="text-gray-600">FHIR R4 Healthcare Data Explorer</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <TrendingUp className="h-4 w-4" />
          <span>{stats?.recent_activity?.encounters_last_30_days || 0} encounters in last 30 days</span>
        </div>
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <ResourceCard
          title="Patients"
          count={counts.patients || 0}
          activeCount={counts.active_patients}
          icon={Users}
          color="bg-primary-600"
          link="/fhir/patients"
        />
        <ResourceCard
          title="Practitioners"
          count={counts.practitioners || 0}
          icon={UserCog}
          color="bg-indigo-600"
          link="/fhir/practitioners"
        />
        <ResourceCard
          title="Organizations"
          count={counts.organizations || 0}
          icon={Building2}
          color="bg-purple-600"
          link="/fhir/organizations"
        />
        <ResourceCard
          title="Encounters"
          count={counts.encounters || 0}
          icon={Stethoscope}
          color="bg-green-600"
          link="/fhir/encounters"
        />
        <ResourceCard
          title="Conditions"
          count={counts.conditions || 0}
          activeCount={counts.active_conditions}
          icon={Activity}
          color="bg-red-600"
          link="/fhir/conditions"
        />
        <ResourceCard
          title="Observations"
          count={counts.observations || 0}
          icon={ClipboardList}
          color="bg-blue-600"
          link="/fhir/observations"
        />
        <ResourceCard
          title="Medications"
          count={counts.medications || 0}
          activeCount={counts.active_medications}
          icon={Pill}
          color="bg-orange-600"
          link="/fhir/medications"
        />
        <ResourceCard
          title="Allergies"
          count={counts.allergies || 0}
          icon={AlertTriangle}
          color="bg-yellow-600"
          link="/fhir/allergies"
        />
        <ResourceCard
          title="Procedures"
          count={counts.procedures || 0}
          icon={Stethoscope}
          color="bg-teal-600"
          link="/fhir/procedures"
        />
        <ResourceCard
          title="Immunizations"
          count={counts.immunizations || 0}
          icon={Syringe}
          color="bg-cyan-600"
          link="/fhir/immunizations"
        />
      </div>

      {/* Charts and Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demographics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Demographics</h3>

          {/* Gender Distribution */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Gender Distribution</h4>
            <div className="space-y-2">
              {stats?.demographics?.gender_distribution?.map((item) => {
                const total = counts.active_patients || 1
                const percentage = ((item.count / total) * 100).toFixed(1)
                const colors: Record<string, string> = {
                  male: 'bg-blue-500',
                  female: 'bg-pink-500',
                  other: 'bg-purple-500',
                  unknown: 'bg-gray-500',
                }
                return (
                  <div key={item.gender}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 capitalize">{item.gender}</span>
                      <span className="font-medium">{item.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={clsx('h-2 rounded-full', colors[item.gender] || 'bg-gray-500')}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Age Groups */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Age Groups</h4>
            <div className="space-y-2">
              {stats?.demographics?.age_groups?.map((item, idx) => {
                const total = counts.active_patients || 1
                const percentage = ((item.count / total) * 100).toFixed(1)
                const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500']
                return (
                  <div key={item.age_group}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.age_group}</span>
                      <span className="font-medium">{item.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={clsx('h-2 rounded-full', colors[idx % colors.length])}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Clinical Data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Overview</h3>

          {/* Top Conditions */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Top Active Conditions</h4>
            <div className="space-y-1">
              {stats?.clinical?.top_conditions?.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate flex-1 pr-2">{item.code_display}</span>
                  <span className="font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Medications */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Top Active Medications</h4>
            <div className="space-y-1">
              {stats?.clinical?.top_medications?.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate flex-1 pr-2">
                    {item.medication_codeable_concept_display}
                  </span>
                  <span className="font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Encounter Types */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Encounter Types</h4>
            <div className="flex flex-wrap gap-2">
              {stats?.clinical?.encounter_types?.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {item.class_display}: {item.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg shadow-sm p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">FHIR R4 Compliant Data</h3>
        <p className="text-primary-100 text-sm mb-4">
          This database follows the HL7 FHIR R4 specification for healthcare interoperability.
          Data includes standardized codes from ICD-10-CM, SNOMED CT, LOINC, RxNorm, and CVX.
        </p>
        <div className="flex gap-4">
          <Link
            to="/fhir/patients"
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Browse Patients
          </Link>
          <Link
            to="/"
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Query with NLP
          </Link>
        </div>
      </div>
    </div>
  )
}
