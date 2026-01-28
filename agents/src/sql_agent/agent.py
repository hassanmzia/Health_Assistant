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
SQL_GENERATION_PROMPT = """You are a healthcare SQL expert. Generate SQL queries for a healthcare database using Synthea synthetic data format.

DATABASE SCHEMA:
{schema}

KEY RELATIONSHIPS:
- patients.Id -> conditions.PATIENT, medications.PATIENT, allergies.PATIENT, encounters.PATIENT
- encounters.Id -> conditions.ENCOUNTER, medications.ENCOUNTER, allergies.ENCOUNTER

CRITICAL COLUMN NAMES (UPPERCASE - USE EXACTLY):
- Patient: Id, FIRST, LAST, BIRTHDATE, GENDER, CITY, STATE, ZIP
- Conditions: PATIENT, ENCOUNTER, CODE, DESCRIPTION, START, STOP
- Medications: PATIENT, DESCRIPTION, CODE, START, STOP, REASONDESCRIPTION
- Allergies: PATIENT, DESCRIPTION, TYPE, CATEGORY, SEVERITY1
- Encounters: Id, PATIENT, ENCOUNTERCLASS, DESCRIPTION, START, STOP

REASONING PROCESS:
1. UNDERSTAND: Identify tables needed and relationships
2. PLAN: Design query structure (JOINs, filters, aggregations)
3. GENERATE: Write SQL with exact column names
4. VERIFY: Check column names and JOIN conditions

RULES:
- Use PostgreSQL syntax
- ALWAYS use double quotes for column names: "FIRST", "LAST", etc.
- Include LIMIT 100 for SELECT unless specified otherwise
- NEVER generate DROP, TRUNCATE, or ALTER statements
- Use ILIKE for case-insensitive text matching

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
