import {
  UserCog, Building2, Stethoscope, Activity,
  Pill, AlertTriangle, Syringe, ClipboardList
} from 'lucide-react'
import FHIRResourceList, { StatusBadge, formatValue } from './FHIRResourceList'
import type { ColumnDef } from './FHIRResourceList'

// --- Practitioners ---
const practitionerColumns: ColumnDef[] = [
  {
    key: 'full_name', label: 'Name',
    render: (_, row) => (
      <span className="font-medium text-gray-900">
        {row.full_name as string || `${row.name_given} ${row.name_family}`}
      </span>
    )
  },
  { key: 'identifier_npi', label: 'NPI' },
  { key: 'qualification_code', label: 'Qualification' },
  { key: 'specialty_display', label: 'Specialty' },
  {
    key: 'active', label: 'Status',
    render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} />
  },
]

export function PractitionerListPage() {
  return (
    <FHIRResourceList
      title="Practitioners"
      icon={UserCog}
      apiEndpoint="practitioners"
      columns={practitionerColumns}
      searchPlaceholder="Search by name or NPI..."
    />
  )
}

// --- Organizations ---
const organizationColumns: ColumnDef[] = [
  {
    key: 'name', label: 'Name',
    render: (val) => <span className="font-medium text-gray-900">{formatValue(val)}</span>
  },
  { key: 'identifier', label: 'Identifier' },
  { key: 'type_display', label: 'Type' },
  { key: 'address_city', label: 'City' },
  { key: 'address_state', label: 'State' },
  {
    key: 'active', label: 'Status',
    render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} />
  },
]

export function OrganizationListPage() {
  return (
    <FHIRResourceList
      title="Organizations"
      icon={Building2}
      apiEndpoint="organizations"
      columns={organizationColumns}
      searchPlaceholder="Search by name or city..."
    />
  )
}

// --- Encounters ---
const encounterColumns: ColumnDef[] = [
  { key: 'identifier', label: 'ID' },
  {
    key: 'status', label: 'Status',
    render: (val) => <StatusBadge status={val as string} />
  },
  { key: 'class_display', label: 'Class' },
  { key: 'type_display', label: 'Type' },
  { key: 'patient_name', label: 'Patient' },
  { key: 'period_start', label: 'Start' },
  { key: 'period_end', label: 'End' },
  { key: 'reason_display', label: 'Reason' },
]

export function EncounterListPage() {
  return (
    <FHIRResourceList
      title="Encounters"
      icon={Stethoscope}
      apiEndpoint="encounters"
      columns={encounterColumns}
      searchPlaceholder="Search by identifier or patient name..."
    />
  )
}

// --- Conditions ---
const conditionColumns: ColumnDef[] = [
  {
    key: 'code_display', label: 'Condition',
    render: (val) => <span className="font-medium text-gray-900">{formatValue(val)}</span>
  },
  { key: 'code_code', label: 'Code' },
  {
    key: 'clinical_status_code', label: 'Clinical Status',
    render: (val) => <StatusBadge status={val as string} />
  },
  {
    key: 'verification_status_code', label: 'Verification',
    render: (val) => <StatusBadge status={val as string} />
  },
  { key: 'category_code', label: 'Category' },
  { key: 'severity_display', label: 'Severity' },
  { key: 'onset_date_time', label: 'Onset' },
  { key: 'recorded_date', label: 'Recorded' },
]

export function ConditionListPage() {
  return (
    <FHIRResourceList
      title="Conditions"
      icon={Activity}
      apiEndpoint="conditions"
      columns={conditionColumns}
      searchPlaceholder="Search by condition name or code..."
    />
  )
}

// --- Observations ---
const observationColumns: ColumnDef[] = [
  {
    key: 'code_display', label: 'Observation',
    render: (val) => <span className="font-medium text-gray-900">{formatValue(val)}</span>
  },
  { key: 'code_code', label: 'Code' },
  {
    key: 'status', label: 'Status',
    render: (val) => <StatusBadge status={val as string} />
  },
  { key: 'category_display', label: 'Category' },
  { key: 'display_value', label: 'Value' },
  {
    key: 'interpretation_display', label: 'Interpretation',
    render: (val) => val ? <StatusBadge status={val as string} /> : <span className="text-gray-400">—</span>
  },
  { key: 'effective_date_time', label: 'Date' },
]

export function ObservationListPage() {
  return (
    <FHIRResourceList
      title="Observations"
      icon={ClipboardList}
      apiEndpoint="observations"
      columns={observationColumns}
      searchPlaceholder="Search by observation name or code..."
    />
  )
}

// --- Medications ---
const medicationColumns: ColumnDef[] = [
  {
    key: 'medication_codeable_concept_display', label: 'Medication',
    render: (val) => <span className="font-medium text-gray-900">{formatValue(val)}</span>
  },
  { key: 'medication_codeable_concept_code', label: 'Code' },
  {
    key: 'status', label: 'Status',
    render: (val) => <StatusBadge status={val as string} />
  },
  { key: 'intent', label: 'Intent' },
  { key: 'dosage_text', label: 'Dosage' },
  { key: 'authored_on', label: 'Authored' },
]

export function MedicationListPage() {
  return (
    <FHIRResourceList
      title="Medications"
      icon={Pill}
      apiEndpoint="medication-requests"
      columns={medicationColumns}
      searchPlaceholder="Search by medication name or code..."
    />
  )
}

// --- Allergies ---
const allergyColumns: ColumnDef[] = [
  {
    key: 'code_display', label: 'Allergen',
    render: (val) => <span className="font-medium text-gray-900">{formatValue(val)}</span>
  },
  { key: 'code_code', label: 'Code' },
  {
    key: 'clinical_status_code', label: 'Clinical Status',
    render: (val) => <StatusBadge status={val as string} />
  },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  {
    key: 'criticality', label: 'Criticality',
    render: (val) => val ? <StatusBadge status={val as string} /> : <span className="text-gray-400">—</span>
  },
  { key: 'reaction_severity', label: 'Reaction Severity' },
]

export function AllergyListPage() {
  return (
    <FHIRResourceList
      title="Allergies"
      icon={AlertTriangle}
      apiEndpoint="allergy-intolerances"
      columns={allergyColumns}
      searchPlaceholder="Search by allergen name or code..."
    />
  )
}

// --- Procedures ---
const procedureColumns: ColumnDef[] = [
  {
    key: 'code_display', label: 'Procedure',
    render: (val) => <span className="font-medium text-gray-900">{formatValue(val)}</span>
  },
  { key: 'code_code', label: 'Code' },
  {
    key: 'status', label: 'Status',
    render: (val) => <StatusBadge status={val as string} />
  },
  { key: 'performed_date_time', label: 'Performed' },
  { key: 'body_site_display', label: 'Body Site' },
  { key: 'outcome_display', label: 'Outcome' },
]

export function ProcedureListPage() {
  return (
    <FHIRResourceList
      title="Procedures"
      icon={Stethoscope}
      apiEndpoint="procedures"
      columns={procedureColumns}
      searchPlaceholder="Search by procedure name or code..."
    />
  )
}

// --- Immunizations ---
const immunizationColumns: ColumnDef[] = [
  {
    key: 'vaccine_code_display', label: 'Vaccine',
    render: (val) => <span className="font-medium text-gray-900">{formatValue(val)}</span>
  },
  { key: 'vaccine_code_code', label: 'Code' },
  {
    key: 'status', label: 'Status',
    render: (val) => <StatusBadge status={val as string} />
  },
  { key: 'occurrence_date_time', label: 'Date' },
  { key: 'lot_number', label: 'Lot Number' },
  { key: 'site_display', label: 'Site' },
]

export function ImmunizationListPage() {
  return (
    <FHIRResourceList
      title="Immunizations"
      icon={Syringe}
      apiEndpoint="immunizations"
      columns={immunizationColumns}
      searchPlaceholder="Search by vaccine name or code..."
    />
  )
}
