/**
 * Healthcare MCP Tools
 * Tools for healthcare database operations (includes FHIR R4 support)
 */

import { Pool } from 'pg';

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any, pool: Pool) => Promise<any>;
}

export const healthcareTools: Tool[] = [
  {
    name: 'query_database',
    description: 'Execute a read-only SQL query against the healthcare database. Only SELECT statements are allowed.',
    inputSchema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'SQL SELECT statement to execute'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of rows to return',
          default: 100
        }
      },
      required: ['sql']
    },
    execute: async (args, pool) => {
      const { sql, limit = 100 } = args;

      // Validate it's a SELECT query
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        throw new Error('Only SELECT queries are allowed through query_database');
      }

      // Add limit if not present
      let finalSQL = sql;
      if (!sql.toUpperCase().includes('LIMIT')) {
        finalSQL = `${sql} LIMIT ${limit}`;
      }

      const result = await pool.query(finalSQL);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields.map((f: { name: string }) => f.name)
      };
    }
  },

  // === Legacy Patient Tools ===
  {
    name: 'get_patient_summary',
    description: 'Get comprehensive patient summary including conditions, medications, and allergies (legacy schema)',
    inputSchema: {
      type: 'object',
      properties: {
        patient_id: {
          type: 'string',
          description: 'Patient ID'
        },
        include_history: {
          type: 'boolean',
          description: 'Include full medical history',
          default: true
        }
      },
      required: ['patient_id']
    },
    execute: async (args, pool) => {
      const { patient_id, include_history = true } = args;

      // Get patient info
      const patientResult = await pool.query(
        'SELECT * FROM patients WHERE "Id" = $1',
        [patient_id]
      );

      if (patientResult.rows.length === 0) {
        throw new Error(`Patient not found: ${patient_id}`);
      }

      const patient = patientResult.rows[0];

      // Get conditions
      const conditionsResult = await pool.query(
        'SELECT * FROM conditions WHERE "PATIENT" = $1 ORDER BY "START" DESC',
        [patient_id]
      );

      // Get medications
      const medicationsResult = await pool.query(
        'SELECT * FROM medications WHERE "PATIENT" = $1 ORDER BY "START" DESC',
        [patient_id]
      );

      // Get allergies
      const allergiesResult = await pool.query(
        'SELECT * FROM allergies WHERE "PATIENT" = $1',
        [patient_id]
      );

      // Get recent encounters if history requested
      let encounters: any[] = [];
      if (include_history) {
        const encountersResult = await pool.query(
          'SELECT * FROM encounters WHERE "PATIENT" = $1 ORDER BY "START" DESC LIMIT 10',
          [patient_id]
        );
        encounters = encountersResult.rows;
      }

      return {
        patient: {
          id: patient.Id,
          name: `${patient.FIRST} ${patient.LAST}`,
          birthdate: patient.BIRTHDATE,
          gender: patient.GENDER,
          address: `${patient.ADDRESS}, ${patient.CITY}, ${patient.STATE} ${patient.ZIP}`
        },
        conditions: conditionsResult.rows.map((c: any) => ({
          description: c.DESCRIPTION,
          code: c.CODE,
          start: c.START,
          stop: c.STOP
        })),
        medications: medicationsResult.rows.map((m: any) => ({
          description: m.DESCRIPTION,
          code: m.CODE,
          start: m.START,
          stop: m.STOP,
          reason: m.REASONDESCRIPTION
        })),
        allergies: allergiesResult.rows.map((a: any) => ({
          description: a.DESCRIPTION,
          type: a.TYPE,
          severity: a.SEVERITY1
        })),
        recentEncounters: encounters.map((e: any) => ({
          description: e.DESCRIPTION,
          date: e.START,
          type: e.ENCOUNTERCLASS
        }))
      };
    }
  },

  {
    name: 'search_patients',
    description: 'Search for patients by name or other criteria (legacy schema)',
    inputSchema: {
      type: 'object',
      properties: {
        first_name: { type: 'string', description: 'First name (partial match)' },
        last_name: { type: 'string', description: 'Last name (partial match)' },
        city: { type: 'string', description: 'City' },
        gender: { type: 'string', description: 'Gender (M/F)' },
        limit: { type: 'number', default: 50 }
      }
    },
    execute: async (args, pool) => {
      const { first_name, last_name, city, gender, limit = 50 } = args;

      let conditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      if (first_name) {
        conditions.push(`"FIRST" ILIKE $${paramIndex++}`);
        params.push(`%${first_name}%`);
      }
      if (last_name) {
        conditions.push(`"LAST" ILIKE $${paramIndex++}`);
        params.push(`%${last_name}%`);
      }
      if (city) {
        conditions.push(`"CITY" ILIKE $${paramIndex++}`);
        params.push(`%${city}%`);
      }
      if (gender) {
        conditions.push(`"GENDER" = $${paramIndex++}`);
        params.push(gender.toUpperCase());
      }

      let sql = 'SELECT "Id", "FIRST", "LAST", "BIRTHDATE", "GENDER", "CITY", "STATE" FROM patients';
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ` ORDER BY "LAST", "FIRST" LIMIT ${limit}`;

      const result = await pool.query(sql, params);
      return {
        patients: result.rows,
        count: result.rowCount
      };
    }
  },

  // === FHIR R4 Patient Tools ===
  {
    name: 'get_fhir_patient',
    description: 'Get comprehensive FHIR R4 Patient resource with all related clinical data',
    inputSchema: {
      type: 'object',
      properties: {
        patient_id: {
          type: 'string',
          description: 'FHIR Patient UUID'
        },
        mrn: {
          type: 'string',
          description: 'Medical Record Number (alternative to patient_id)'
        }
      }
    },
    execute: async (args, pool) => {
      const { patient_id, mrn } = args;

      let patientResult;
      if (patient_id) {
        patientResult = await pool.query('SELECT * FROM fhir_patient WHERE id = $1', [patient_id]);
      } else if (mrn) {
        patientResult = await pool.query('SELECT * FROM fhir_patient WHERE identifier_mrn = $1', [mrn]);
      } else {
        throw new Error('Either patient_id or mrn is required');
      }

      if (patientResult.rows.length === 0) {
        throw new Error(`FHIR Patient not found`);
      }

      const patient = patientResult.rows[0];
      const pid = patient.id;

      // Get related FHIR resources
      const [conditions, observations, medications, allergies, encounters, procedures, immunizations, careplans] = await Promise.all([
        pool.query('SELECT * FROM fhir_condition WHERE patient_id = $1 ORDER BY recorded_date DESC', [pid]),
        pool.query('SELECT * FROM fhir_observation WHERE patient_id = $1 ORDER BY effective_datetime DESC LIMIT 100', [pid]),
        pool.query('SELECT * FROM fhir_medicationrequest WHERE patient_id = $1 ORDER BY authored_on DESC', [pid]),
        pool.query('SELECT * FROM fhir_allergyintolerance WHERE patient_id = $1', [pid]),
        pool.query('SELECT * FROM fhir_encounter WHERE patient_id = $1 ORDER BY period_start DESC LIMIT 50', [pid]),
        pool.query('SELECT * FROM fhir_procedure WHERE patient_id = $1 ORDER BY performed_datetime DESC', [pid]),
        pool.query('SELECT * FROM fhir_immunization WHERE patient_id = $1 ORDER BY occurrence_datetime DESC', [pid]),
        pool.query('SELECT * FROM fhir_careplan WHERE patient_id = $1 ORDER BY period_start DESC', [pid])
      ]);

      return {
        resourceType: 'Patient',
        patient: {
          id: patient.id,
          mrn: patient.identifier_mrn,
          name: `${patient.name_given} ${patient.name_family}`,
          gender: patient.gender,
          birthDate: patient.birth_date,
          age: patient.birth_date ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
          maritalStatus: patient.marital_status,
          phone: patient.telecom_phone,
          email: patient.telecom_email,
          address: {
            line: [patient.address_line1, patient.address_line2].filter(Boolean),
            city: patient.address_city,
            state: patient.address_state,
            postalCode: patient.address_postal_code,
            country: patient.address_country
          },
          active: patient.active,
          deceased: patient.deceased_boolean
        },
        conditions: conditions.rows.map((c: any) => ({
          id: c.id,
          code: c.code_code,
          display: c.code_display,
          system: c.code_system,
          clinicalStatus: c.clinical_status,
          verificationStatus: c.verification_status,
          severity: c.severity_display,
          onsetDate: c.onset_datetime,
          recordedDate: c.recorded_date
        })),
        observations: observations.rows.map((o: any) => ({
          id: o.id,
          category: o.category_display,
          code: o.code_code,
          display: o.code_display,
          value: o.value_quantity_value,
          unit: o.value_quantity_unit,
          valueString: o.value_string,
          interpretation: o.interpretation_display,
          effectiveDateTime: o.effective_datetime,
          status: o.status
        })),
        medications: medications.rows.map((m: any) => ({
          id: m.id,
          medication: m.medication_display,
          code: m.medication_code,
          status: m.status,
          intent: m.intent,
          dosage: m.dosage_instruction_text,
          authoredOn: m.authored_on
        })),
        allergies: allergies.rows.map((a: any) => ({
          id: a.id,
          substance: a.code_display,
          code: a.code_code,
          type: a.type,
          category: a.category,
          criticality: a.criticality,
          clinicalStatus: a.clinical_status,
          manifestation: a.reaction_manifestation_display,
          severity: a.reaction_severity
        })),
        encounters: encounters.rows.map((e: any) => ({
          id: e.id,
          class: e.class_display,
          type: e.type_display,
          status: e.status,
          periodStart: e.period_start,
          periodEnd: e.period_end,
          reason: e.reason_display,
          dischargeDisposition: e.hospitalization_discharge_display
        })),
        procedures: procedures.rows.map((p: any) => ({
          id: p.id,
          code: p.code_code,
          display: p.code_display,
          status: p.status,
          performedDateTime: p.performed_datetime,
          bodySite: p.body_site_display,
          outcome: p.outcome_display
        })),
        immunizations: immunizations.rows.map((i: any) => ({
          id: i.id,
          vaccine: i.vaccine_code_display,
          code: i.vaccine_code_code,
          status: i.status,
          occurrenceDateTime: i.occurrence_datetime,
          doseNumber: i.dose_number,
          site: i.site_display,
          route: i.route_display
        })),
        carePlans: careplans.rows.map((cp: any) => ({
          id: cp.id,
          title: cp.title,
          description: cp.description,
          status: cp.status,
          intent: cp.intent,
          category: cp.category_display,
          periodStart: cp.period_start,
          periodEnd: cp.period_end
        }))
      };
    }
  },

  {
    name: 'search_fhir_patients',
    description: 'Search FHIR R4 Patients by various criteria',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name (partial match on given or family)' },
        mrn: { type: 'string', description: 'Medical Record Number' },
        gender: { type: 'string', description: 'Gender (male/female/other/unknown)' },
        birthdate: { type: 'string', description: 'Birth date (YYYY-MM-DD)' },
        city: { type: 'string', description: 'City' },
        state: { type: 'string', description: 'State' },
        active: { type: 'boolean', description: 'Active status', default: true },
        limit: { type: 'number', default: 50 }
      }
    },
    execute: async (args, pool) => {
      const { name, mrn, gender, birthdate, city, state, active = true, limit = 50 } = args;

      let conditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      if (active !== undefined) {
        conditions.push(`active = $${paramIndex++}`);
        params.push(active);
      }
      if (name) {
        conditions.push(`(name_given ILIKE $${paramIndex} OR name_family ILIKE $${paramIndex})`);
        params.push(`%${name}%`);
        paramIndex++;
      }
      if (mrn) {
        conditions.push(`identifier_mrn = $${paramIndex++}`);
        params.push(mrn);
      }
      if (gender) {
        conditions.push(`gender = $${paramIndex++}`);
        params.push(gender.toLowerCase());
      }
      if (birthdate) {
        conditions.push(`birth_date = $${paramIndex++}`);
        params.push(birthdate);
      }
      if (city) {
        conditions.push(`address_city ILIKE $${paramIndex++}`);
        params.push(`%${city}%`);
      }
      if (state) {
        conditions.push(`address_state ILIKE $${paramIndex++}`);
        params.push(`%${state}%`);
      }

      let sql = `
        SELECT id, identifier_mrn, name_given, name_family, gender, birth_date,
               address_city, address_state, telecom_phone, telecom_email, active
        FROM fhir_patient
      `;
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ` ORDER BY name_family, name_given LIMIT ${limit}`;

      const result = await pool.query(sql, params);
      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: result.rowCount,
        entry: result.rows.map((row: any) => ({
          resourceType: 'Patient',
          id: row.id,
          mrn: row.identifier_mrn,
          name: `${row.name_given} ${row.name_family}`,
          gender: row.gender,
          birthDate: row.birth_date,
          city: row.address_city,
          state: row.address_state,
          phone: row.telecom_phone,
          email: row.telecom_email,
          active: row.active
        }))
      };
    }
  },

  {
    name: 'search_fhir_conditions',
    description: 'Search FHIR R4 Conditions by various criteria',
    inputSchema: {
      type: 'object',
      properties: {
        patient_id: { type: 'string', description: 'FHIR Patient UUID' },
        code: { type: 'string', description: 'Condition code (ICD-10 or SNOMED)' },
        clinical_status: { type: 'string', description: 'Clinical status (active, recurrence, relapse, inactive, remission, resolved)' },
        category: { type: 'string', description: 'Category code (problem-list-item, encounter-diagnosis)' },
        onset_date_from: { type: 'string', description: 'Onset date from (YYYY-MM-DD)' },
        onset_date_to: { type: 'string', description: 'Onset date to (YYYY-MM-DD)' },
        limit: { type: 'number', default: 100 }
      }
    },
    execute: async (args, pool) => {
      const { patient_id, code, clinical_status, category, onset_date_from, onset_date_to, limit = 100 } = args;

      let conditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      if (patient_id) {
        conditions.push(`c.patient_id = $${paramIndex++}`);
        params.push(patient_id);
      }
      if (code) {
        conditions.push(`c.code_code ILIKE $${paramIndex++}`);
        params.push(`%${code}%`);
      }
      if (clinical_status) {
        conditions.push(`c.clinical_status = $${paramIndex++}`);
        params.push(clinical_status);
      }
      if (category) {
        conditions.push(`c.category_code = $${paramIndex++}`);
        params.push(category);
      }
      if (onset_date_from) {
        conditions.push(`c.onset_datetime >= $${paramIndex++}`);
        params.push(onset_date_from);
      }
      if (onset_date_to) {
        conditions.push(`c.onset_datetime <= $${paramIndex++}`);
        params.push(onset_date_to);
      }

      let sql = `
        SELECT c.*, p.identifier_mrn, p.name_given, p.name_family
        FROM fhir_condition c
        JOIN fhir_patient p ON c.patient_id = p.id
      `;
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ` ORDER BY c.recorded_date DESC LIMIT ${limit}`;

      const result = await pool.query(sql, params);
      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: result.rowCount,
        entry: result.rows.map((row: any) => ({
          id: row.id,
          patient: {
            mrn: row.identifier_mrn,
            name: `${row.name_given} ${row.name_family}`
          },
          code: row.code_code,
          display: row.code_display,
          system: row.code_system,
          clinicalStatus: row.clinical_status,
          verificationStatus: row.verification_status,
          severity: row.severity_display,
          category: row.category_display,
          onsetDateTime: row.onset_datetime,
          recordedDate: row.recorded_date
        }))
      };
    }
  },

  {
    name: 'search_fhir_observations',
    description: 'Search FHIR R4 Observations (vital signs, lab results) by various criteria',
    inputSchema: {
      type: 'object',
      properties: {
        patient_id: { type: 'string', description: 'FHIR Patient UUID' },
        category: { type: 'string', description: 'Category (vital-signs, laboratory, social-history, etc.)' },
        code: { type: 'string', description: 'Observation code (LOINC)' },
        date_from: { type: 'string', description: 'Effective date from (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Effective date to (YYYY-MM-DD)' },
        status: { type: 'string', description: 'Status (final, preliminary, amended)' },
        limit: { type: 'number', default: 100 }
      }
    },
    execute: async (args, pool) => {
      const { patient_id, category, code, date_from, date_to, status, limit = 100 } = args;

      let conditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      if (patient_id) {
        conditions.push(`o.patient_id = $${paramIndex++}`);
        params.push(patient_id);
      }
      if (category) {
        conditions.push(`o.category_code = $${paramIndex++}`);
        params.push(category);
      }
      if (code) {
        conditions.push(`o.code_code ILIKE $${paramIndex++}`);
        params.push(`%${code}%`);
      }
      if (date_from) {
        conditions.push(`o.effective_datetime >= $${paramIndex++}`);
        params.push(date_from);
      }
      if (date_to) {
        conditions.push(`o.effective_datetime <= $${paramIndex++}`);
        params.push(date_to);
      }
      if (status) {
        conditions.push(`o.status = $${paramIndex++}`);
        params.push(status);
      }

      let sql = `
        SELECT o.*, p.identifier_mrn, p.name_given, p.name_family
        FROM fhir_observation o
        JOIN fhir_patient p ON o.patient_id = p.id
      `;
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ` ORDER BY o.effective_datetime DESC LIMIT ${limit}`;

      const result = await pool.query(sql, params);
      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: result.rowCount,
        entry: result.rows.map((row: any) => ({
          id: row.id,
          patient: {
            mrn: row.identifier_mrn,
            name: `${row.name_given} ${row.name_family}`
          },
          category: row.category_display,
          code: row.code_code,
          display: row.code_display,
          value: row.value_quantity_value,
          unit: row.value_quantity_unit,
          valueString: row.value_string,
          interpretation: row.interpretation_display,
          referenceRange: row.reference_range_text,
          effectiveDateTime: row.effective_datetime,
          status: row.status
        }))
      };
    }
  },

  {
    name: 'search_fhir_medications',
    description: 'Search FHIR R4 MedicationRequests by various criteria',
    inputSchema: {
      type: 'object',
      properties: {
        patient_id: { type: 'string', description: 'FHIR Patient UUID' },
        medication_code: { type: 'string', description: 'Medication code (RxNorm)' },
        status: { type: 'string', description: 'Status (active, completed, cancelled, stopped)' },
        date_from: { type: 'string', description: 'Authored date from (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'Authored date to (YYYY-MM-DD)' },
        limit: { type: 'number', default: 100 }
      }
    },
    execute: async (args, pool) => {
      const { patient_id, medication_code, status, date_from, date_to, limit = 100 } = args;

      let conditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      if (patient_id) {
        conditions.push(`m.patient_id = $${paramIndex++}`);
        params.push(patient_id);
      }
      if (medication_code) {
        conditions.push(`m.medication_code ILIKE $${paramIndex++}`);
        params.push(`%${medication_code}%`);
      }
      if (status) {
        conditions.push(`m.status = $${paramIndex++}`);
        params.push(status);
      }
      if (date_from) {
        conditions.push(`m.authored_on >= $${paramIndex++}`);
        params.push(date_from);
      }
      if (date_to) {
        conditions.push(`m.authored_on <= $${paramIndex++}`);
        params.push(date_to);
      }

      let sql = `
        SELECT m.*, p.identifier_mrn, p.name_given, p.name_family
        FROM fhir_medicationrequest m
        JOIN fhir_patient p ON m.patient_id = p.id
      `;
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ` ORDER BY m.authored_on DESC LIMIT ${limit}`;

      const result = await pool.query(sql, params);
      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: result.rowCount,
        entry: result.rows.map((row: any) => ({
          id: row.id,
          patient: {
            mrn: row.identifier_mrn,
            name: `${row.name_given} ${row.name_family}`
          },
          medication: row.medication_display,
          code: row.medication_code,
          system: row.medication_system,
          status: row.status,
          intent: row.intent,
          dosageInstruction: row.dosage_instruction_text,
          quantity: row.dispense_request_quantity,
          refills: row.dispense_request_refills,
          authoredOn: row.authored_on
        }))
      };
    }
  },

  // === Write Operations (require HITL approval) ===
  {
    name: 'insert_record',
    description: 'Insert a new record into the database (requires HITL approval)',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name (patients, conditions, medications, allergies, or fhir_* tables)',
          enum: ['patients', 'conditions', 'medications', 'allergies',
                 'fhir_patient', 'fhir_practitioner', 'fhir_organization',
                 'fhir_encounter', 'fhir_condition', 'fhir_observation',
                 'fhir_medicationrequest', 'fhir_allergyintolerance',
                 'fhir_procedure', 'fhir_immunization']
        },
        data: {
          type: 'object',
          description: 'Record data to insert'
        }
      },
      required: ['table', 'data']
    },
    execute: async (args, pool) => {
      const { table, data } = args;

      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`);

      const sql = `INSERT INTO ${table} (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;

      const result = await pool.query(sql, values);
      return {
        inserted: result.rows[0],
        rowCount: result.rowCount
      };
    }
  },

  {
    name: 'delete_record',
    description: 'Delete a record from the database (requires HITL approval)',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name',
          enum: ['patients', 'conditions', 'medications', 'allergies',
                 'fhir_patient', 'fhir_practitioner', 'fhir_organization',
                 'fhir_encounter', 'fhir_condition', 'fhir_observation',
                 'fhir_medicationrequest', 'fhir_allergyintolerance',
                 'fhir_procedure', 'fhir_immunization']
        },
        id: {
          type: 'string',
          description: 'Record ID to delete'
        }
      },
      required: ['table', 'id']
    },
    execute: async (args, pool) => {
      const { table, id } = args;

      // Determine ID column based on table
      const idColumn = table === 'patients' ? 'Id' : 'id';
      const sql = `DELETE FROM ${table} WHERE "${idColumn}" = $1 RETURNING *`;

      const result = await pool.query(sql, [id]);
      return {
        deleted: result.rows[0],
        rowCount: result.rowCount
      };
    }
  },

  // === Schema and Utility Tools ===
  {
    name: 'list_tables',
    description: 'List all available tables in the healthcare database',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (args, pool) => {
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const tables = result.rows.map((r: any) => r.table_name);
      const legacyTables = tables.filter((t: string) => !t.startsWith('fhir_') && !t.startsWith('django_') && !t.startsWith('auth_'));
      const fhirTables = tables.filter((t: string) => t.startsWith('fhir_'));

      return {
        tables: tables,
        legacyTables: legacyTables,
        fhirTables: fhirTables
      };
    }
  },

  {
    name: 'get_table_schema',
    description: 'Get schema details for a specific table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name'
        }
      },
      required: ['table']
    },
    execute: async (args, pool) => {
      const { table } = args;

      const result = await pool.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      return {
        table,
        columns: result.rows
      };
    }
  },

  {
    name: 'audit_action',
    description: 'Log an action to the audit trail',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        action: { type: 'string' },
        query_type: { type: 'string' },
        sql_statement: { type: 'string' },
        result: { type: 'string' }
      },
      required: ['user_id', 'action']
    },
    execute: async (args, pool) => {
      const { user_id, action, query_type, sql_statement, result } = args;

      const insertResult = await pool.query(`
        INSERT INTO audit_log (user_id, natural_language_query, query_type, sql_statement, execution_result)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING log_id
      `, [user_id, action, query_type || 'READ', sql_statement, result]);

      return {
        logged: true,
        log_id: insertResult.rows[0].log_id
      };
    }
  },

  {
    name: 'get_fhir_statistics',
    description: 'Get comprehensive statistics about FHIR R4 healthcare data',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (args, pool) => {
      const stats = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM fhir_patient WHERE active = true) as active_patients,
          (SELECT COUNT(*) FROM fhir_patient WHERE deceased_boolean = true) as deceased_patients,
          (SELECT COUNT(*) FROM fhir_practitioner WHERE active = true) as active_practitioners,
          (SELECT COUNT(*) FROM fhir_organization WHERE active = true) as organizations,
          (SELECT COUNT(*) FROM fhir_encounter) as total_encounters,
          (SELECT COUNT(*) FROM fhir_condition WHERE clinical_status = 'active') as active_conditions,
          (SELECT COUNT(*) FROM fhir_observation) as total_observations,
          (SELECT COUNT(*) FROM fhir_medicationrequest WHERE status = 'active') as active_medications,
          (SELECT COUNT(*) FROM fhir_allergyintolerance) as documented_allergies,
          (SELECT COUNT(*) FROM fhir_procedure) as procedures_performed,
          (SELECT COUNT(*) FROM fhir_immunization) as immunizations_given
      `);

      const genderDistribution = await pool.query(`
        SELECT gender, COUNT(*) as count
        FROM fhir_patient
        WHERE active = true
        GROUP BY gender
      `);

      const ageGroups = await pool.query(`
        SELECT
          CASE
            WHEN EXTRACT(YEAR FROM AGE(birth_date)) < 18 THEN 'Pediatric (0-17)'
            WHEN EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 18 AND 39 THEN 'Young Adult (18-39)'
            WHEN EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 40 AND 64 THEN 'Middle Age (40-64)'
            ELSE 'Senior (65+)'
          END as age_group,
          COUNT(*) as count
        FROM fhir_patient
        WHERE active = true AND birth_date IS NOT NULL
        GROUP BY age_group
        ORDER BY age_group
      `);

      const topDiagnoses = await pool.query(`
        SELECT code_display, COUNT(*) as count
        FROM fhir_condition
        WHERE clinical_status = 'active'
        GROUP BY code_display
        ORDER BY count DESC
        LIMIT 10
      `);

      const encounterTypes = await pool.query(`
        SELECT class_display, COUNT(*) as count
        FROM fhir_encounter
        GROUP BY class_display
        ORDER BY count DESC
      `);

      return {
        summary: stats.rows[0],
        demographics: {
          genderDistribution: genderDistribution.rows,
          ageGroups: ageGroups.rows
        },
        clinical: {
          topDiagnoses: topDiagnoses.rows,
          encounterTypes: encounterTypes.rows
        }
      };
    }
  }
];
