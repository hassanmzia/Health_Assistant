/**
 * Healthcare MCP Tools
 * Tools for healthcare database operations
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
        fields: result.fields.map(f => f.name)
      };
    }
  },

  {
    name: 'get_patient_summary',
    description: 'Get comprehensive patient summary including conditions, medications, and allergies',
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
    name: 'insert_record',
    description: 'Insert a new record into the database (requires HITL approval)',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name (patients, conditions, medications, allergies)',
          enum: ['patients', 'conditions', 'medications', 'allergies']
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
          enum: ['patients', 'conditions', 'medications', 'allergies']
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

      const idColumn = table === 'patients' ? 'Id' : 'id';
      const sql = `DELETE FROM ${table} WHERE "${idColumn}" = $1 RETURNING *`;

      const result = await pool.query(sql, [id]);
      return {
        deleted: result.rows[0],
        rowCount: result.rowCount
      };
    }
  },

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

      return {
        tables: result.rows.map((r: any) => r.table_name)
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
    name: 'search_patients',
    description: 'Search for patients by name or other criteria',
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
  }
];
