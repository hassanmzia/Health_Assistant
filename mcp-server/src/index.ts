/**
 * Healthcare MCP Server
 * Model Context Protocol server providing healthcare database tools and resources
 */

import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { healthcareTools } from './tools';
import { healthcareResources } from './resources';

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://healthcare_user:healthcare_secure_pass_2024@localhost:5432/healthcare_db'
});

// Redis connection
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379/1'
});

redis.on('error', (err) => console.log('Redis Client Error', err));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mcp-server' });
});

// MCP Tools endpoint
app.get('/tools', (req, res) => {
  res.json({
    tools: healthcareTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  });
});

// MCP Resources endpoint
app.get('/resources', (req, res) => {
  res.json({
    resources: healthcareResources.map(resource => ({
      uri: resource.uri,
      name: resource.name,
      mimeType: resource.mimeType,
      description: resource.description
    }))
  });
});

// Execute tool
app.post('/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const args = req.body;

  const tool = healthcareTools.find(t => t.name === toolName);
  if (!tool) {
    return res.status(404).json({ error: `Tool not found: ${toolName}` });
  }

  try {
    const result = await tool.execute(args, pool);
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get resource
app.get('/resources/:resourceUri(*)', async (req, res) => {
  const resourceUri = 'healthcare://' + req.params.resourceUri;

  const resource = healthcareResources.find(r => {
    // Handle parameterized URIs like healthcare://patients/{id}
    const pattern = r.uri.replace(/\{[^}]+\}/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(resourceUri);
  });

  if (!resource) {
    return res.status(404).json({ error: `Resource not found: ${resourceUri}` });
  }

  try {
    const content = await resource.fetch(resourceUri, pool);
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Schema endpoint for agents
app.get('/schema', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const schema: Record<string, any[]> = {};
    result.rows.forEach((row: any) => {
      if (!schema[row.table_name]) {
        schema[row.table_name] = [];
      }
      schema[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES'
      });
    });

    res.json({ schema });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Validate SQL endpoint
app.post('/validate-sql', async (req, res) => {
  const { sql } = req.body;

  if (!sql) {
    return res.status(400).json({ error: 'SQL is required' });
  }

  const validation = validateSQL(sql);
  res.json(validation);
});

// SQL Validation function
function validateSQL(sql: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const upperSQL = sql.toUpperCase();

  // Check for dangerous keywords
  const dangerousKeywords = ['DROP', 'TRUNCATE', 'ALTER', 'GRANT', 'REVOKE', 'CREATE DATABASE'];
  dangerousKeywords.forEach(keyword => {
    if (upperSQL.includes(keyword)) {
      errors.push(`Dangerous keyword detected: ${keyword}`);
    }
  });

  // Check for UPDATE/DELETE without WHERE
  if (upperSQL.includes('UPDATE') && !upperSQL.includes('WHERE')) {
    errors.push('UPDATE without WHERE clause is not allowed');
  }
  if (upperSQL.includes('DELETE') && !upperSQL.includes('WHERE')) {
    errors.push('DELETE without WHERE clause is not allowed');
  }

  // Check for SQL injection patterns
  const injectionPatterns = [
    /;\s*DROP/i,
    /;\s*DELETE/i,
    /UNION\s+SELECT/i,
    /--\s*$/,
    /\/\*.*\*\//,
    /'\s*OR\s+'1'\s*=\s*'1/i
  ];

  injectionPatterns.forEach(pattern => {
    if (pattern.test(sql)) {
      errors.push('Potential SQL injection pattern detected');
    }
  });

  // Warnings
  if (!upperSQL.includes('LIMIT') && upperSQL.includes('SELECT')) {
    warnings.push('Consider adding LIMIT clause to prevent large result sets');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await redis.connect();
    console.log('Connected to Redis');

    await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL');

    app.listen(PORT, () => {
      console.log(`MCP Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

start();
