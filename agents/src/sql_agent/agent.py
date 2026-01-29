"""
SQL Agent
Generates SQL from natural language using advanced prompting techniques
"""

import re
from typing import Dict, Any
import httpx
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


# Chain-of-Thought SQL Generation Prompt
SQL_GENERATION_PROMPT = """You are a healthcare SQL expert. Generate SQL queries for a FHIR R4 compliant healthcare database.

DATABASE SCHEMA:
{schema}

FHIR DATABASE TABLES AND KEY COLUMNS (use lowercase, no quotes needed):

1. fhir_patients (Patient demographics)
   - id (UUID PK), active (bool), resource_type, meta_version_id, meta_last_updated
   - identifier_mrn (Medical Record Number), identifier_ssn, identifier_drivers_license, identifier_passport
   - name_given (first name), name_family (last name), name_prefix, name_suffix, name_maiden
   - gender ('male'|'female'|'other'|'unknown'), birth_date (DATE), deceased_boolean (bool), deceased_date_time
   - address_line, address_city, address_state, address_postal_code, address_country
   - telecom_phone_home, telecom_phone_mobile, telecom_email
   - marital_status_code ('S'|'M'|'D'|'W'|etc.)
   - extension_race_display, extension_ethnicity_display, extension_birth_sex
   - communication_language_display
   - general_practitioner_id (FK -> fhir_practitioners), managing_organization_id (FK -> fhir_organizations)

2. fhir_practitioners (Healthcare providers)
   - id (UUID PK), active, identifier_npi, identifier_license
   - name_given, name_family, name_prefix, name_suffix
   - gender, birth_date, telecom_phone, telecom_email
   - qualification_code ('MD'|'DO'|'NP'|etc.), qualification_display
   - specialty_code, specialty_display
   - organization_id (FK -> fhir_organizations)

3. fhir_organizations (Healthcare organizations)
   - id (UUID PK), active, identifier, name
   - type_code, type_display
   - telecom_phone, telecom_email
   - address_line, address_city, address_state, address_postal_code

4. fhir_encounters (Patient visits)
   - id (UUID PK), identifier, status ('planned'|'arrived'|'finished'|'cancelled'|etc.)
   - class_code ('AMB'|'EMER'|'IMP'|etc.), class_display
   - type_code, type_display, service_type_code, service_type_display
   - subject_id (FK -> fhir_patients), participant_practitioner_id (FK -> fhir_practitioners)
   - service_provider_id (FK -> fhir_organizations)
   - period_start (TIMESTAMP), period_end (TIMESTAMP)
   - reason_code, reason_display

5. fhir_conditions (Diagnoses / problems)
   - id (UUID PK), identifier
   - clinical_status_code ('active'|'inactive'|'resolved'|'recurrence'|'remission')
   - verification_status_code ('confirmed'|'provisional'|'unconfirmed'|'refuted')
   - category_code ('encounter-diagnosis'|'problem-list-item'|'health-concern')
   - severity_code, severity_display
   - code_code (ICD-10/SNOMED code), code_display (condition name)
   - subject_id (FK -> fhir_patients), encounter_id (FK -> fhir_encounters)
   - onset_date_time, abatement_date_time, recorded_date
   - recorder_id (FK -> fhir_practitioners)

6. fhir_observations (Vital signs, lab results)
   - id (UUID PK), identifier, status ('final'|'preliminary'|'amended'|etc.)
   - category_code ('vital-signs'|'laboratory'|'imaging'|'social-history'|etc.), category_display
   - code_code (LOINC code), code_display (observation name)
   - subject_id (FK -> fhir_patients), encounter_id (FK -> fhir_encounters)
   - effective_date_time (TIMESTAMP), issued
   - performer_id (FK -> fhir_practitioners)
   - value_quantity_value (DECIMAL), value_quantity_unit, value_string
   - interpretation_code ('N'|'A'|'H'|'L'|'HH'|'LL'), interpretation_display
   - reference_range_low_value, reference_range_high_value, reference_range_unit

7. fhir_medication_requests (Prescriptions)
   - id (UUID PK), identifier, status ('active'|'completed'|'stopped'|'cancelled')
   - intent ('order'|'plan'|'proposal'), priority ('routine'|'urgent'|'stat')
   - category_code ('inpatient'|'outpatient'|'community')
   - medication_codeable_concept_code (RxNorm code), medication_codeable_concept_display (drug name)
   - subject_id (FK -> fhir_patients), encounter_id (FK -> fhir_encounters)
   - authored_on (TIMESTAMP), requester_id (FK -> fhir_practitioners)
   - reason_code, reason_display
   - dosage_text, dosage_dose_value, dosage_dose_unit, dosage_route_display

8. fhir_allergy_intolerances (Allergies)
   - id (UUID PK), identifier
   - clinical_status_code ('active'|'inactive'|'resolved')
   - verification_status_code, type ('allergy'|'intolerance')
   - category ('food'|'medication'|'environment'|'biologic')
   - criticality ('low'|'high'|'unable-to-assess')
   - code_code, code_display (allergen name)
   - patient_id (FK -> fhir_patients), encounter_id (FK -> fhir_encounters)
   - onset_date_time, recorded_date
   - reaction_manifestation_display, reaction_severity ('mild'|'moderate'|'severe')

9. fhir_procedures (Clinical procedures)
   - id (UUID PK), identifier, status ('completed'|'in-progress'|'stopped'|etc.)
   - category_code, category_display
   - code_code (SNOMED/CPT code), code_display (procedure name)
   - subject_id (FK -> fhir_patients), encounter_id (FK -> fhir_encounters)
   - performed_date_time, performer_id (FK -> fhir_practitioners)
   - reason_code, reason_display, body_site_display, outcome_display

10. fhir_immunizations (Vaccinations)
    - id (UUID PK), identifier, status ('completed'|'not-done')
    - vaccine_code_code (CVX code), vaccine_code_display (vaccine name)
    - patient_id (FK -> fhir_patients), encounter_id (FK -> fhir_encounters)
    - occurrence_date_time, lot_number, manufacturer
    - site_display, route_display, dose_quantity_value, dose_quantity_unit
    - performer_id (FK -> fhir_practitioners)

11. fhir_diagnostic_reports (Test reports)
    - id (UUID PK), identifier, status ('final'|'preliminary'|etc.)
    - category_code, category_display, code_code (LOINC), code_display
    - subject_id (FK -> fhir_patients), encounter_id (FK -> fhir_encounters)
    - effective_date_time, issued, conclusion
    - performer_id (FK -> fhir_practitioners)

12. fhir_care_plans (Treatment plans)
    - id (UUID PK), identifier, status ('active'|'completed'|'draft'|etc.)
    - intent ('plan'|'order'|'proposal'), title, description
    - category_code, category_display
    - subject_id (FK -> fhir_patients), encounter_id (FK -> fhir_encounters)
    - period_start, period_end, created
    - author_id (FK -> fhir_practitioners)

KEY RELATIONSHIPS:
- fhir_patients.id -> fhir_encounters.subject_id, fhir_conditions.subject_id, fhir_observations.subject_id
- fhir_patients.id -> fhir_medication_requests.subject_id, fhir_procedures.subject_id
- fhir_patients.id -> fhir_allergy_intolerances.patient_id, fhir_immunizations.patient_id
- fhir_patients.id -> fhir_diagnostic_reports.subject_id, fhir_care_plans.subject_id
- fhir_encounters.id -> most clinical tables via encounter_id
- fhir_practitioners.id -> referenced as performer, requester, recorder, author
- fhir_organizations.id -> referenced as service_provider, managing_organization
NOTE: Most clinical resources use "subject_id" to reference patients, but fhir_allergy_intolerances and fhir_immunizations use "patient_id" instead.

AGE CALCULATION (PostgreSQL):
- To calculate age: EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))
- Example for patients over 50: WHERE EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.birth_date)) > 50
- NEVER use (CURRENT_DATE - birth_date) > INTERVAL — this causes type errors

REASONING PROCESS:
1. UNDERSTAND: Identify which FHIR tables and relationships are needed
2. PLAN: Design query structure (JOINs, filters, aggregations)
3. GENERATE: Write SQL with exact column names from the schema above
4. VERIFY: Check column names, FK references (subject_id vs patient_id), and JOIN conditions

RULES:
- Use PostgreSQL syntax
- Use lowercase column names (no double quotes needed for FHIR tables)
- Include LIMIT 100 for SELECT unless specified otherwise
- NEVER generate DROP, TRUNCATE, or ALTER statements
- Use ILIKE for case-insensitive text matching
- For patient name display, concatenate: name_given || ' ' || name_family
- For age queries, always use AGE() function: EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))

INSERT STATEMENT RULES (CRITICAL):
- For INSERT statements, use gen_random_uuid() for the id column
- Example: INSERT INTO fhir_patients (id, name_given, name_family, gender, birth_date) VALUES (gen_random_uuid(), 'John', 'Doe', 'male', '1990-01-15')
- Always include resource_type column with the FHIR resource name (e.g., 'Patient', 'Condition')

OUTPUT: Return ONLY the SQL statement, no explanations."""


class SQLAgent:
    """Agent for generating SQL from natural language"""

    def __init__(self, llm: ChatOpenAI, mcp_url: str):
        self.llm = llm
        self.mcp_url = mcp_url
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", SQL_GENERATION_PROMPT),
            ("human", "Generate SQL for: {query}")
        ])

    async def generate(self, query: str, schema_context: str = "") -> Dict[str, Any]:
        """Generate SQL from natural language query"""

        # If no schema provided, fetch from MCP
        if not schema_context:
            schema_context = await self._fetch_schema()

        chain = self.prompt | self.llm

        response = await chain.ainvoke({
            "schema": schema_context,
            "query": query
        })

        sql = self._clean_sql(response.content)

        # Validate the SQL
        validation = await self._validate_sql(sql)

        return {
            "sql": sql,
            "confidence": 0.9 if validation.get("valid") else 0.6,
            "warnings": validation.get("warnings", [])
        }

    def _clean_sql(self, sql: str) -> str:
        """Clean up generated SQL"""
        sql = sql.strip()

        # Remove markdown code blocks
        if sql.startswith("```"):
            lines = sql.split("\n")
            sql_lines = []
            in_block = False
            for line in lines:
                if line.startswith("```"):
                    in_block = not in_block
                    continue
                if in_block:
                    sql_lines.append(line)
            sql = "\n".join(sql_lines).strip()

        # Remove sql prefix
        if sql.lower().startswith("sql"):
            sql = sql[3:].strip()

        return sql

    async def _fetch_schema(self) -> str:
        """Fetch schema from MCP server"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.mcp_url}/schema", timeout=10.0)
                return str(response.json().get("schema", {}))
        except Exception:
            return "Schema unavailable"

    async def _validate_sql(self, sql: str) -> Dict[str, Any]:
        """Validate SQL using MCP server"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.mcp_url}/validate-sql",
                    json={"sql": sql},
                    timeout=10.0
                )
                return response.json()
        except Exception:
            return {"valid": True, "warnings": []}
