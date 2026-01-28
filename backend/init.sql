-- Initialize Healthcare Database with Synthea-compatible schema

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE healthcare_db TO healthcare_user;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Django migrations will create the tables
-- This file is for any additional initialization
