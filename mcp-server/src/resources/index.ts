/**
 * Healthcare MCP Resources
 * Resources for healthcare data access (includes FHIR R4 resources)
 */

import { Pool } from 'pg';

interface Resource {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
  fetch: (uri: string, pool: Pool) => Promise<any>;
}

export const healthcareResources: Resource[] = [
  {
    uri: 'healthcare://schema',
    name: 'Database Schema',
    mimeType: 'application/json',
    description: 'Complete database schema with table definitions and relationships',
    fetch: async (uri, pool) => {
      const result = await pool.query(`
        SELECT
          t.table_name,
          array_agg(
            json_build_object(
              'column', c.column_name,
              'type', c.data_type,
              'nullable', c.is_nullable = 'YES'
            ) ORDER BY c.ordinal_position
          ) as columns
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_name
        ORDER BY t.table_name
      `);

      const schema: Record<string, any> = {};
      result.rows.forEach((row: any) => {
        schema[row.table_name] = row.columns;
      });

      return {
        schema,
        relationships: [
          // Legacy schema relationships
          { from: 'conditions.PATIENT', to: 'patients.Id' },
          { from: 'medications.PATIENT', to: 'patients.Id' },
          { from: 'allergies.PATIENT', to: 'patients.Id' },
          { from: 'encounters.PATIENT', to: 'patients.Id' },
          // FHIR R4 relationships
          { from: 'fhir_patient.managing_organization_id', to: 'fhir_organization.id' },
          { from: 'fhir_patient.general_practitioner_id', to: 'fhir_practitioner.id' },
          { from: 'fhir_encounter.patient_id', to: 'fhir_patient.id' },
          { from: 'fhir_encounter.service_provider_id', to: 'fhir_organization.id' },
          { from: 'fhir_condition.patient_id', to: 'fhir_patient.id' },
          { from: 'fhir_condition.encounter_id', to: 'fhir_encounter.id' },
          { from: 'fhir_observation.patient_id', to: 'fhir_patient.id' },
          { from: 'fhir_observation.encounter_id', to: 'fhir_encounter.id' },
          { from: 'fhir_medicationrequest.patient_id', to: 'fhir_patient.id' },
          { from: 'fhir_medicationrequest.encounter_id', to: 'fhir_encounter.id' },
          { from: 'fhir_allergyintolerance.patient_id', to: 'fhir_patient.id' },
          { from: 'fhir_procedure.patient_id', to: 'fhir_patient.id' },
          { from: 'fhir_procedure.encounter_id', to: 'fhir_encounter.id' },
          { from: 'fhir_immunization.patient_id', to: 'fhir_patient.id' },
          { from: 'fhir_diagnosticreport.patient_id', to: 'fhir_patient.id' },
          { from: 'fhir_careplan.patient_id', to: 'fhir_patient.id' }
        ]
      };
    }
  },

  // === Legacy Resources (existing schema) ===
  {
    uri: 'healthcare://patients',
    name: 'Patients List',
    mimeType: 'application/json',
    description: 'List of all patients (summary view)',
    fetch: async (uri, pool) => {
      const result = await pool.query(`
        SELECT "Id", "FIRST", "LAST", "BIRTHDATE", "GENDER", "CITY", "STATE"
        FROM patients
        ORDER BY "LAST", "FIRST"
        LIMIT 1000
      `);

      return {
        patients: result.rows,
        count: result.rowCount
      };
    }
  },

  {
    uri: 'healthcare://patients/{id}',
    name: 'Patient Details',
    mimeType: 'application/json',
    description: 'Full patient record with medical history',
    fetch: async (uri, pool) => {
      const match = uri.match(/healthcare:\/\/patients\/(.+)/);
      if (!match) {
        throw new Error('Invalid patient URI');
      }
      const patientId = match[1];

      const patientResult = await pool.query(
        'SELECT * FROM patients WHERE "Id" = $1',
        [patientId]
      );

      if (patientResult.rows.length === 0) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      const patient = patientResult.rows[0];

      const [conditions, medications, allergies, encounters] = await Promise.all([
        pool.query('SELECT * FROM conditions WHERE "PATIENT" = $1 ORDER BY "START" DESC', [patientId]),
        pool.query('SELECT * FROM medications WHERE "PATIENT" = $1 ORDER BY "START" DESC', [patientId]),
        pool.query('SELECT * FROM allergies WHERE "PATIENT" = $1', [patientId]),
        pool.query('SELECT * FROM encounters WHERE "PATIENT" = $1 ORDER BY "START" DESC LIMIT 20', [patientId])
      ]);

      return {
        patient,
        conditions: conditions.rows,
        medications: medications.rows,
        allergies: allergies.rows,
        encounters: encounters.rows
      };
    }
  },

  {
    uri: 'healthcare://audit-log',
    name: 'Audit Log',
    mimeType: 'application/json',
    description: 'Recent audit log entries',
    fetch: async (uri, pool) => {
      const result = await pool.query(`
        SELECT *
        FROM audit_log
        ORDER BY timestamp DESC
        LIMIT 100
      `);

      return {
        entries: result.rows,
        count: result.rowCount
      };
    }
  },

  {
    uri: 'healthcare://statistics',
    name: 'Database Statistics',
    mimeType: 'application/json',
    description: 'Overview statistics of the healthcare database',
    fetch: async (uri, pool) => {
      const stats = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM patients) as patient_count,
          (SELECT COUNT(*) FROM conditions) as condition_count,
          (SELECT COUNT(*) FROM medications) as medication_count,
          (SELECT COUNT(*) FROM allergies) as allergy_count,
          (SELECT COUNT(*) FROM encounters) as encounter_count
      `);

      const topConditions = await pool.query(`
        SELECT "DESCRIPTION", COUNT(*) as count
        FROM conditions
        GROUP BY "DESCRIPTION"
        ORDER BY count DESC
        LIMIT 10
      `);

      const topMedications = await pool.query(`
        SELECT "DESCRIPTION", COUNT(*) as count
        FROM medications
        GROUP BY "DESCRIPTION"
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        counts: stats.rows[0],
        topConditions: topConditions.rows,
        topMedications: topMedications.rows
      };
    }
  },

  // === FHIR R4 Resources ===
  {
    uri: 'healthcare://fhir/Patient',
    name: 'FHIR Patients',
    mimeType: 'application/json',
    description: 'List of FHIR R4 Patient resources',
    fetch: async (uri, pool) => {
      const result = await pool.query(`
        SELECT
          id, identifier_mrn, name_given, name_family,
          gender, birth_date, active,
          address_city, address_state, telecom_phone, telecom_email
        FROM fhir_patient
        WHERE active = true
        ORDER BY name_family, name_given
        LIMIT 1000
      `);

      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: result.rowCount,
        entry: result.rows.map((row: any) => ({
          resource: {
            resourceType: 'Patient',
            id: row.id,
            identifier: [{ system: 'urn:mrn', value: row.identifier_mrn }],
            name: [{ family: row.name_family, given: [row.name_given] }],
            gender: row.gender,
            birthDate: row.birth_date,
            active: row.active,
            telecom: [
              row.telecom_phone ? { system: 'phone', value: row.telecom_phone } : null,
              row.telecom_email ? { system: 'email', value: row.telecom_email } : null
            ].filter(Boolean),
            address: [{
              city: row.address_city,
              state: row.address_state
            }]
          }
        }))
      };
    }
  },

  {
    uri: 'healthcare://fhir/Patient/{id}',
    name: 'FHIR Patient Detail',
    mimeType: 'application/json',
    description: 'Single FHIR R4 Patient resource with related data',
    fetch: async (uri, pool) => {
      const match = uri.match(/healthcare:\/\/fhir\/Patient\/(.+)/);
      if (!match) {
        throw new Error('Invalid FHIR Patient URI');
      }
      const patientId = match[1];

      const patientResult = await pool.query(
        'SELECT * FROM fhir_patient WHERE id = $1',
        [patientId]
      );

      if (patientResult.rows.length === 0) {
        throw new Error(`FHIR Patient not found: ${patientId}`);
      }

      const patient = patientResult.rows[0];

      // Get related FHIR resources
      const [conditions, observations, medications, allergies, encounters, procedures, immunizations] = await Promise.all([
        pool.query('SELECT * FROM fhir_condition WHERE patient_id = $1 ORDER BY recorded_date DESC', [patientId]),
        pool.query('SELECT * FROM fhir_observation WHERE patient_id = $1 ORDER BY effective_datetime DESC LIMIT 50', [patientId]),
        pool.query('SELECT * FROM fhir_medicationrequest WHERE patient_id = $1 ORDER BY authored_on DESC', [patientId]),
        pool.query('SELECT * FROM fhir_allergyintolerance WHERE patient_id = $1', [patientId]),
        pool.query('SELECT * FROM fhir_encounter WHERE patient_id = $1 ORDER BY period_start DESC LIMIT 20', [patientId]),
        pool.query('SELECT * FROM fhir_procedure WHERE patient_id = $1 ORDER BY performed_datetime DESC', [patientId]),
        pool.query('SELECT * FROM fhir_immunization WHERE patient_id = $1 ORDER BY occurrence_datetime DESC', [patientId])
      ]);

      return {
        patient: {
          resourceType: 'Patient',
          id: patient.id,
          identifier: [
            { system: 'urn:mrn', value: patient.identifier_mrn },
            patient.identifier_ssn ? { system: 'urn:ssn', value: patient.identifier_ssn } : null
          ].filter(Boolean),
          name: [{
            family: patient.name_family,
            given: [patient.name_given],
            prefix: patient.name_prefix ? [patient.name_prefix] : undefined,
            suffix: patient.name_suffix ? [patient.name_suffix] : undefined
          }],
          gender: patient.gender,
          birthDate: patient.birth_date,
          deceasedBoolean: patient.deceased_boolean,
          deceasedDateTime: patient.deceased_datetime,
          maritalStatus: patient.marital_status ? { coding: [{ code: patient.marital_status }] } : undefined,
          telecom: [
            patient.telecom_phone ? { system: 'phone', value: patient.telecom_phone } : null,
            patient.telecom_email ? { system: 'email', value: patient.telecom_email } : null
          ].filter(Boolean),
          address: [{
            line: [patient.address_line1, patient.address_line2].filter(Boolean),
            city: patient.address_city,
            state: patient.address_state,
            postalCode: patient.address_postal_code,
            country: patient.address_country
          }],
          communication: patient.communication_language ? [{
            language: { coding: [{ code: patient.communication_language }] },
            preferred: patient.communication_preferred
          }] : undefined,
          active: patient.active
        },
        conditions: conditions.rows,
        observations: observations.rows,
        medications: medications.rows,
        allergies: allergies.rows,
        encounters: encounters.rows,
        procedures: procedures.rows,
        immunizations: immunizations.rows
      };
    }
  },

  {
    uri: 'healthcare://fhir/Practitioner',
    name: 'FHIR Practitioners',
    mimeType: 'application/json',
    description: 'List of FHIR R4 Practitioner resources',
    fetch: async (uri, pool) => {
      const result = await pool.query(`
        SELECT
          id, identifier_npi, name_given, name_family,
          qualification_code, qualification_display, active
        FROM fhir_practitioner
        WHERE active = true
        ORDER BY name_family, name_given
        LIMIT 500
      `);

      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: result.rowCount,
        entry: result.rows.map((row: any) => ({
          resource: {
            resourceType: 'Practitioner',
            id: row.id,
            identifier: [{ system: 'http://hl7.org/fhir/sid/us-npi', value: row.identifier_npi }],
            name: [{ family: row.name_family, given: [row.name_given] }],
            qualification: row.qualification_code ? [{
              code: { coding: [{ code: row.qualification_code, display: row.qualification_display }] }
            }] : undefined,
            active: row.active
          }
        }))
      };
    }
  },

  {
    uri: 'healthcare://fhir/Organization',
    name: 'FHIR Organizations',
    mimeType: 'application/json',
    description: 'List of FHIR R4 Organization resources',
    fetch: async (uri, pool) => {
      const result = await pool.query(`
        SELECT
          id, identifier_npi, name, type_code, type_display,
          address_city, address_state, active
        FROM fhir_organization
        WHERE active = true
        ORDER BY name
        LIMIT 500
      `);

      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: result.rowCount,
        entry: result.rows.map((row: any) => ({
          resource: {
            resourceType: 'Organization',
            id: row.id,
            identifier: row.identifier_npi ? [{ system: 'http://hl7.org/fhir/sid/us-npi', value: row.identifier_npi }] : undefined,
            name: row.name,
            type: row.type_code ? [{ coding: [{ code: row.type_code, display: row.type_display }] }] : undefined,
            address: [{ city: row.address_city, state: row.address_state }],
            active: row.active
          }
        }))
      };
    }
  },

  {
    uri: 'healthcare://fhir/Encounter',
    name: 'FHIR Encounters',
    mimeType: 'application/json',
    description: 'Recent FHIR R4 Encounter resources',
    fetch: async (uri, pool) => {
      const result = await pool.query(`
        SELECT
          e.id, e.identifier, e.status, e.class_code, e.class_display,
          e.type_code, e.type_display, e.period_start, e.period_end,
          e.reason_code, e.reason_display,
          p.identifier_mrn as patient_mrn,
          p.name_given as patient_given, p.name_family as patient_family
        FROM fhir_encounter e
        JOIN fhir_patient p ON e.patient_id = p.id
        ORDER BY e.period_start DESC
        LIMIT 500
      `);

      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: result.rowCount,
        entry: result.rows.map((row: any) => ({
          resource: {
            resourceType: 'Encounter',
            id: row.id,
            identifier: [{ value: row.identifier }],
            status: row.status,
            class: { code: row.class_code, display: row.class_display },
            type: row.type_code ? [{ coding: [{ code: row.type_code, display: row.type_display }] }] : undefined,
            subject: {
              reference: `Patient/${row.patient_mrn}`,
              display: `${row.patient_given} ${row.patient_family}`
            },
            period: { start: row.period_start, end: row.period_end },
            reasonCode: row.reason_code ? [{ coding: [{ code: row.reason_code, display: row.reason_display }] }] : undefined
          }
        }))
      };
    }
  },

  {
    uri: 'healthcare://fhir/statistics',
    name: 'FHIR Statistics',
    mimeType: 'application/json',
    description: 'Overview statistics of FHIR R4 healthcare data',
    fetch: async (uri, pool) => {
      const stats = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM fhir_patient) as patient_count,
          (SELECT COUNT(*) FROM fhir_practitioner) as practitioner_count,
          (SELECT COUNT(*) FROM fhir_organization) as organization_count,
          (SELECT COUNT(*) FROM fhir_encounter) as encounter_count,
          (SELECT COUNT(*) FROM fhir_condition) as condition_count,
          (SELECT COUNT(*) FROM fhir_observation) as observation_count,
          (SELECT COUNT(*) FROM fhir_medicationrequest) as medication_count,
          (SELECT COUNT(*) FROM fhir_allergyintolerance) as allergy_count,
          (SELECT COUNT(*) FROM fhir_procedure) as procedure_count,
          (SELECT COUNT(*) FROM fhir_immunization) as immunization_count,
          (SELECT COUNT(*) FROM fhir_diagnosticreport) as diagnostic_report_count,
          (SELECT COUNT(*) FROM fhir_careplan) as care_plan_count
      `);

      const topConditions = await pool.query(`
        SELECT code_display as description, COUNT(*) as count
        FROM fhir_condition
        GROUP BY code_display
        ORDER BY count DESC
        LIMIT 10
      `);

      const topMedications = await pool.query(`
        SELECT medication_display as description, COUNT(*) as count
        FROM fhir_medicationrequest
        GROUP BY medication_display
        ORDER BY count DESC
        LIMIT 10
      `);

      const encountersByClass = await pool.query(`
        SELECT class_display as encounter_class, COUNT(*) as count
        FROM fhir_encounter
        GROUP BY class_display
        ORDER BY count DESC
        LIMIT 10
      `);

      const observationsByCategory = await pool.query(`
        SELECT category_display as category, COUNT(*) as count
        FROM fhir_observation
        GROUP BY category_display
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        counts: stats.rows[0],
        topConditions: topConditions.rows,
        topMedications: topMedications.rows,
        encountersByClass: encountersByClass.rows,
        observationsByCategory: observationsByCategory.rows
      };
    }
  }
];
