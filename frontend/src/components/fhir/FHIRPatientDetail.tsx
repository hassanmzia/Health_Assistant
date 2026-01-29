import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  User, ChevronLeft, Calendar, MapPin, Phone, Mail, Heart,
  Activity, Pill, AlertTriangle, Syringe, Stethoscope, FileText,
  Clock, Building2
} from 'lucide-react'
import axios from 'axios'
import { clsx } from 'clsx'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface PatientFull {
  id: string
  identifier_mrn: string
  identifier_ssn: string
  name_given: string
  name_family: string
  name_prefix: string
  full_name: string
  gender: string
  birth_date: string
  age: number
  deceased_boolean: boolean
  deceased_date_time: string | null
  marital_status_code: string
  address_line: string
  address_city: string
  address_state: string
  address_postal_code: string
  telecom_phone_home: string
  telecom_phone_mobile: string
  telecom_email: string
  extension_race_display: string
  extension_ethnicity_display: string
  communication_language_display: string
  general_practitioner_name: string
  managing_organization_name: string
  active: boolean
  conditions: Condition[]
  observations: Observation[]
  medication_requests: Medication[]
  allergy_intolerances: Allergy[]
  procedures: Procedure[]
  immunizations: Immunization[]
  encounters: Encounter[]
  care_plans: CarePlan[]
}

interface Condition {
  id: string
  code_code: string
  code_display: string
  clinical_status_code: string
  verification_status_code: string
  severity_display: string
  onset_date_time: string
  recorded_date: string
}

interface Observation {
  id: string
  category_code: string
  category_display: string
  code_code: string
  code_display: string
  display_value: string
  interpretation_code: string
  interpretation_display: string
  effective_date_time: string
}

interface Medication {
  id: string
  medication_codeable_concept_code: string
  medication_codeable_concept_display: string
  status: string
  intent: string
  dosage_text: string
  authored_on: string
}

interface Allergy {
  id: string
  code_code: string
  code_display: string
  clinical_status_code: string
  type: string
  category: string
  criticality: string
  reaction_severity: string
}

interface Procedure {
  id: string
  code_code: string
  code_display: string
  status: string
  performed_date_time: string
  outcome_display: string
}

interface Immunization {
  id: string
  vaccine_code_code: string
  vaccine_code_display: string
  status: string
  occurrence_date_time: string
  lot_number: string
}

interface Encounter {
  id: string
  identifier: string
  status: string
  class_code: string
  class_display: string
  type_display: string
  period_start: string
  period_end: string
  reason_display: string
}

interface CarePlan {
  id: string
  title: string
  status: string
  intent: string
  category_display: string
  period_start: string
  period_end: string
}

type TabType = 'overview' | 'conditions' | 'observations' | 'medications' | 'allergies' | 'procedures' | 'immunizations' | 'encounters'

export default function FHIRPatientDetail() {
  const { id } = useParams<{ id: string }>()
  const [patient, setPatient] = useState<PatientFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  useEffect(() => {
    fetchPatient()
  }, [id])

  const fetchPatient = async () => {
    try {
      const response = await axios.get(`${API_URL}/fhir/patients/${id}/full_record/`)
      setPatient(response.data)
    } catch (err) {
      console.error('Failed to fetch patient:', err)
      setError('Failed to load patient details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString()
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold">Error Loading Patient</h3>
        <p className="text-red-700 text-sm mt-1">{error || 'Patient not found'}</p>
        <Link to="/fhir/patients" className="text-red-600 hover:text-red-800 text-sm mt-4 inline-block">
          &larr; Back to Patient List
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'conditions', label: `Conditions (${patient.conditions?.length || 0})`, icon: Activity },
    { id: 'observations', label: `Observations (${patient.observations?.length || 0})`, icon: FileText },
    { id: 'medications', label: `Medications (${patient.medication_requests?.length || 0})`, icon: Pill },
    { id: 'allergies', label: `Allergies (${patient.allergy_intolerances?.length || 0})`, icon: AlertTriangle },
    { id: 'procedures', label: `Procedures (${patient.procedures?.length || 0})`, icon: Stethoscope },
    { id: 'immunizations', label: `Immunizations (${patient.immunizations?.length || 0})`, icon: Syringe },
    { id: 'encounters', label: `Encounters (${patient.encounters?.length || 0})`, icon: Clock },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to="/fhir/patients" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className={clsx(
            'h-16 w-16 rounded-full flex items-center justify-center',
            patient.gender === 'male' ? 'bg-blue-100' : patient.gender === 'female' ? 'bg-pink-100' : 'bg-gray-100'
          )}>
            <User className={clsx(
              'h-8 w-8',
              patient.gender === 'male' ? 'text-blue-600' : patient.gender === 'female' ? 'text-pink-600' : 'text-gray-600'
            )} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patient.full_name}</h1>
            <p className="text-gray-600">MRN: {patient.identifier_mrn}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                patient.gender === 'male' ? 'bg-blue-100 text-blue-800' : patient.gender === 'female' ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800'
              )}>
                {patient.gender}
              </span>
              <span className="text-sm text-gray-600">{patient.age} years old</span>
              {patient.deceased_boolean && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-white">
                  Deceased
                </span>
              )}
              {!patient.active && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={clsx(
                  'flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Demographics */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-4 w-4" /> Demographics
              </h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">Birth Date:</span> <span className="font-medium">{formatDate(patient.birth_date)}</span></div>
                <div><span className="text-gray-500">Gender:</span> <span className="font-medium capitalize">{patient.gender}</span></div>
                <div><span className="text-gray-500">Marital Status:</span> <span className="font-medium">{patient.marital_status_code || 'N/A'}</span></div>
                <div><span className="text-gray-500">Race:</span> <span className="font-medium">{patient.extension_race_display || 'N/A'}</span></div>
                <div><span className="text-gray-500">Ethnicity:</span> <span className="font-medium">{patient.extension_ethnicity_display || 'N/A'}</span></div>
                <div><span className="text-gray-500">Language:</span> <span className="font-medium">{patient.communication_language_display || 'English'}</span></div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Phone className="h-4 w-4" /> Contact
              </h3>
              <div className="space-y-2 text-sm">
                {patient.telecom_phone_home && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span>{patient.telecom_phone_home} (Home)</span>
                  </div>
                )}
                {patient.telecom_phone_mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span>{patient.telecom_phone_mobile} (Mobile)</span>
                  </div>
                )}
                {patient.telecom_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <span>{patient.telecom_email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Address
              </h3>
              <div className="text-sm">
                <p>{patient.address_line}</p>
                <p>{patient.address_city}, {patient.address_state} {patient.address_postal_code}</p>
              </div>
            </div>

            {/* Care Team */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Care Team
              </h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">Primary Care:</span> <span className="font-medium">{patient.general_practitioner_name || 'N/A'}</span></div>
                <div><span className="text-gray-500">Organization:</span> <span className="font-medium">{patient.managing_organization_name || 'N/A'}</span></div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Heart className="h-4 w-4" /> Clinical Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{patient.conditions?.filter(c => c.clinical_status_code === 'active').length || 0}</div>
                  <div className="text-xs text-red-700">Active Conditions</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{patient.medication_requests?.filter(m => m.status === 'active').length || 0}</div>
                  <div className="text-xs text-blue-700">Active Medications</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{patient.allergy_intolerances?.length || 0}</div>
                  <div className="text-xs text-yellow-700">Allergies</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{patient.immunizations?.length || 0}</div>
                  <div className="text-xs text-green-700">Immunizations</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conditions' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Conditions & Diagnoses</h3>
            {patient.conditions?.length === 0 ? (
              <p className="text-gray-500 text-sm">No conditions recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Condition</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Onset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {patient.conditions?.map((cond) => (
                      <tr key={cond.id}>
                        <td className="px-4 py-2 text-sm">{cond.code_display}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-600">{cond.code_code}</td>
                        <td className="px-4 py-2">
                          <span className={clsx(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            cond.clinical_status_code === 'active' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          )}>
                            {cond.clinical_status_code}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDate(cond.onset_date_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'observations' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Observations (Vitals & Labs)</h3>
            {patient.observations?.length === 0 ? (
              <p className="text-gray-500 text-sm">No observations recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Test</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Value</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Interpretation</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {patient.observations?.map((obs) => (
                      <tr key={obs.id}>
                        <td className="px-4 py-2">
                          <span className={clsx(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            obs.category_code === 'vital-signs' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          )}>
                            {obs.category_display}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">{obs.code_display}</td>
                        <td className="px-4 py-2 text-sm font-medium">{obs.display_value}</td>
                        <td className="px-4 py-2">
                          {obs.interpretation_code && (
                            <span className={clsx(
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                              obs.interpretation_code === 'N' ? 'bg-green-100 text-green-800' :
                              obs.interpretation_code === 'H' || obs.interpretation_code === 'HH' ? 'bg-red-100 text-red-800' :
                              obs.interpretation_code === 'L' || obs.interpretation_code === 'LL' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            )}>
                              {obs.interpretation_display || obs.interpretation_code}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDateTime(obs.effective_date_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'medications' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Medications</h3>
            {patient.medication_requests?.length === 0 ? (
              <p className="text-gray-500 text-sm">No medications recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Medication</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Dosage</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Prescribed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {patient.medication_requests?.map((med) => (
                      <tr key={med.id}>
                        <td className="px-4 py-2 text-sm font-medium">{med.medication_codeable_concept_display}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{med.dosage_text || 'N/A'}</td>
                        <td className="px-4 py-2">
                          <span className={clsx(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            med.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          )}>
                            {med.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDate(med.authored_on)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'allergies' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Allergies & Intolerances</h3>
            {patient.allergy_intolerances?.length === 0 ? (
              <p className="text-gray-500 text-sm">No allergies recorded</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {patient.allergy_intolerances?.map((allergy) => (
                  <div key={allergy.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{allergy.code_display}</h4>
                        <p className="text-sm text-gray-500 capitalize">{allergy.category} {allergy.type}</p>
                      </div>
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        allergy.criticality === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      )}>
                        {allergy.criticality} risk
                      </span>
                    </div>
                    {allergy.reaction_severity && (
                      <p className="text-sm text-gray-600 mt-2">Reaction severity: {allergy.reaction_severity}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'procedures' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Procedures</h3>
            {patient.procedures?.length === 0 ? (
              <p className="text-gray-500 text-sm">No procedures recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Procedure</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {patient.procedures?.map((proc) => (
                      <tr key={proc.id}>
                        <td className="px-4 py-2 text-sm">{proc.code_display}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {proc.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDateTime(proc.performed_date_time)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{proc.outcome_display || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'immunizations' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Immunizations</h3>
            {patient.immunizations?.length === 0 ? (
              <p className="text-gray-500 text-sm">No immunizations recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Vaccine</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Lot #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {patient.immunizations?.map((imm) => (
                      <tr key={imm.id}>
                        <td className="px-4 py-2 text-sm">{imm.vaccine_code_display}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {imm.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDateTime(imm.occurrence_date_time)}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-600">{imm.lot_number || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'encounters' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Encounters</h3>
            {patient.encounters?.length === 0 ? (
              <p className="text-gray-500 text-sm">No encounters recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Class</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {patient.encounters?.map((enc) => (
                      <tr key={enc.id}>
                        <td className="px-4 py-2 text-sm">{enc.type_display || 'Visit'}</td>
                        <td className="px-4 py-2">
                          <span className={clsx(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            enc.class_code === 'EMER' ? 'bg-red-100 text-red-800' :
                            enc.class_code === 'IMP' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          )}>
                            {enc.class_display}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {enc.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDateTime(enc.period_start)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{enc.reason_display || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
