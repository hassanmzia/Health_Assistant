/**
 * Healthcare MCP Resources
 * Resources for healthcare data access
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
          { from: 'conditions.PATIENT', to: 'patients.Id' },
          { from: 'medications.PATIENT', to: 'patients.Id' },
          { from: 'allergies.PATIENT', to: 'patients.Id' },
          { from: 'encounters.PATIENT', to: 'patients.Id' }
        ]
      };
    }
  },

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
      // Extract patient ID from URI
      const match = uri.match(/healthcare:\/\/patients\/(.+)/);
      if (!match) {
        throw new Error('Invalid patient URI');
      }
      const patientId = match[1];

      // Get patient
      const patientResult = await pool.query(
        'SELECT * FROM patients WHERE "Id" = $1',
        [patientId]
      );

      if (patientResult.rows.length === 0) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      const patient = patientResult.rows[0];

      // Get related records
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
  }
];
