"""
Classifier Agent
Classifies queries and assesses risk with guardrails and PHI protection
"""

import re
from typing import Dict, Any, List

from ..orchestrator.state import QueryType
from ..phi_filter import (
    detect_phi_columns,
    check_query_toxicity,
    SENSITIVE_COLUMNS,
    BLOCKED_COLUMNS,
    HITL_REQUIRED_COLUMNS,
)
from ..phi_filter.toxicity import check_sql_toxicity


class ClassifierAgent:
    """Agent for classifying queries, checking guardrails, and PHI protection"""

    # Dangerous keywords - always block
    UNSAFE_KEYWORDS = [
        "DROP", "TRUNCATE", "ALTER", "GRANT", "REVOKE",
        "CREATE USER", "CREATE DATABASE", "EXEC", "EXECUTE"
    ]

    # Write keywords - need HITL
    WRITE_KEYWORDS = ["INSERT", "UPDATE", "DELETE"]

    # SQL injection patterns
    INJECTION_PATTERNS = [
        r";\s*DROP",
        r";\s*DELETE",
        r"UNION\s+SELECT",
        r"--\s*$",
        r"/\*.*\*/",
        r"'\s*OR\s+'1'\s*=\s*'1",
        r"'\s*OR\s+1\s*=\s*1"
    ]

    async def classify(self, sql: str) -> Dict[str, Any]:
        """Classify SQL query type and assess risk"""
        upper_sql = sql.upper()
        normalized = " ".join(upper_sql.split())

        # Check for UNSAFE patterns
        for keyword in self.UNSAFE_KEYWORDS:
            if keyword in upper_sql:
                return {
                    "query_type": QueryType.UNSAFE.value,
                    "risk_score": 1.0,
                    "risk_assessment": f"BLOCKED: Dangerous keyword '{keyword}' detected"
                }

        # Check for mass UPDATE without WHERE
        if "UPDATE" in upper_sql and "WHERE" not in upper_sql:
            return {
                "query_type": QueryType.UNSAFE.value,
                "risk_score": 1.0,
                "risk_assessment": "BLOCKED: UPDATE without WHERE clause"
            }

        # Check for mass DELETE without WHERE
        if "DELETE" in upper_sql and "WHERE" not in upper_sql:
            return {
                "query_type": QueryType.UNSAFE.value,
                "risk_score": 1.0,
                "risk_assessment": "BLOCKED: DELETE without WHERE clause"
            }

        # Check PHI columns
        phi_result = detect_phi_columns(sql)

        # Block if accessing blocked columns (SSN, PASSPORT, etc.)
        if phi_result['blocked_columns']:
            return {
                "query_type": QueryType.UNSAFE.value,
                "risk_score": 1.0,
                "risk_assessment": f"BLOCKED: Access to prohibited PHI columns: {', '.join(phi_result['blocked_columns'])}"
            }

        # Check for WRITE operations
        for keyword in self.WRITE_KEYWORDS:
            if keyword in upper_sql:
                risk_score = self._calculate_write_risk(sql, keyword)
                # Add PHI risk
                risk_score = min(risk_score + phi_result['risk_increase'], 1.0)
                return {
                    "query_type": QueryType.WRITE.value,
                    "risk_score": risk_score,
                    "risk_assessment": f"WRITE operation: {keyword} detected. Requires approval.",
                    "phi_columns": phi_result['sensitive_columns']
                }

        # Check for SELECT * (data minimization)
        if phi_result['has_select_all']:
            return {
                "query_type": QueryType.WRITE.value,  # Require HITL approval
                "risk_score": 0.6,
                "risk_assessment": (
                    "SELECT * detected. This returns all columns including sensitive PHI. "
                    "Please specify only the columns you need, or obtain approval."
                ),
                "phi_columns": phi_result['sensitive_columns']
            }

        # Check if accessing HITL-required columns
        if phi_result['hitl_required_columns']:
            risk_score = self._calculate_read_risk(sql)
            risk_score = min(risk_score + phi_result['risk_increase'], 0.8)
            return {
                "query_type": QueryType.WRITE.value,  # Require HITL
                "risk_score": risk_score,
                "risk_assessment": (
                    f"Accessing sensitive PHI columns: {', '.join(phi_result['hitl_required_columns'])}. "
                    "Approval required for data access."
                ),
                "phi_columns": phi_result['sensitive_columns']
            }

        # Default: READ
        risk_score = self._calculate_read_risk(sql)
        risk_score = min(risk_score + phi_result['risk_increase'], 0.5)
        return {
            "query_type": QueryType.READ.value,
            "risk_score": risk_score,
            "risk_assessment": "Safe read-only query. Will auto-execute.",
            "phi_columns": phi_result['sensitive_columns']
        }

    async def classify_with_toxicity(self, natural_query: str, sql: str) -> Dict[str, Any]:
        """
        Classify with both SQL analysis and toxicity check on natural language query

        Args:
            natural_query: The user's original natural language query
            sql: The generated SQL

        Returns:
            Classification result with toxicity information
        """
        # Check toxicity of natural language query
        toxicity_result = check_query_toxicity(natural_query)

        if toxicity_result['should_block']:
            return {
                "query_type": QueryType.UNSAFE.value,
                "risk_score": 1.0,
                "risk_assessment": toxicity_result['message'],
                "blocked_reason": "toxicity",
                "toxicity_violations": toxicity_result['violations']
            }

        # Check SQL for suspicious patterns
        sql_toxicity = check_sql_toxicity(sql)
        if sql_toxicity['is_suspicious']:
            return {
                "query_type": QueryType.UNSAFE.value,
                "risk_score": 1.0,
                "risk_assessment": sql_toxicity['message'],
                "blocked_reason": "sql_injection",
                "sql_violations": sql_toxicity['violations']
            }

        # Regular classification
        result = await self.classify(sql)

        # Add toxicity info to result
        if toxicity_result['is_toxic']:
            result['toxicity_warning'] = toxicity_result['message']
            result['risk_score'] = min(
                result['risk_score'] + toxicity_result['toxicity_score'] / 20,
                1.0
            )

            if toxicity_result['requires_hitl'] and result['query_type'] == QueryType.READ.value:
                result['query_type'] = QueryType.WRITE.value  # Require HITL
                result['risk_assessment'] += " Additionally: " + toxicity_result['message']

        return result

    async def check_guardrails(self, sql: str) -> List[str]:
        """Check SQL against guardrails and return violations"""
        violations = []

        # Check for SQL injection patterns
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, sql, re.IGNORECASE):
                violations.append(f"Potential SQL injection pattern detected")

        # Check PHI columns
        phi_result = detect_phi_columns(sql)

        # Add blocked column violations
        for col in phi_result['blocked_columns']:
            violations.append(f"Access to prohibited PHI column: {col}")

        # Add violations from PHI detection
        violations.extend(phi_result['violations'])

        # Check for SELECT * (data minimization enforcement)
        if phi_result['has_select_all']:
            violations.append(
                "SELECT * violates data minimization principle. "
                "Please specify only required columns."
            )

        # Check SQL for suspicious patterns
        sql_toxicity = check_sql_toxicity(sql)
        if sql_toxicity['is_suspicious']:
            for violation in sql_toxicity['violations']:
                violations.append(violation['description'])

        return violations

    def _calculate_write_risk(self, sql: str, operation: str) -> float:
        """Calculate risk score for write operations"""
        base_risk = {
            "INSERT": 0.5,
            "UPDATE": 0.7,
            "DELETE": 0.8
        }.get(operation, 0.5)

        # Increase risk if affecting multiple tables
        if sql.upper().count("JOIN") > 0:
            base_risk += 0.1

        # Increase risk if no specific WHERE conditions
        if "WHERE" in sql.upper():
            conditions = sql.upper().split("WHERE")[1]
            if "=" not in conditions and "LIKE" not in conditions:
                base_risk += 0.1

        return min(base_risk, 1.0)

    def _calculate_read_risk(self, sql: str) -> float:
        """Calculate risk score for read operations"""
        risk = 0.1  # Base risk for any query

        # Check for LIMIT
        if "LIMIT" not in sql.upper():
            risk += 0.1

        # Check for complex queries (multiple JOINs)
        join_count = sql.upper().count("JOIN")
        risk += min(join_count * 0.05, 0.2)

        return min(risk, 0.5)
