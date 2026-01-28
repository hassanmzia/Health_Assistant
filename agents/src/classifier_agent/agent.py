"""
Classifier Agent
Classifies queries and assesses risk with guardrails
"""

import re
from typing import Dict, Any, List

from ..orchestrator.state import QueryType


class ClassifierAgent:
    """Agent for classifying queries and checking guardrails"""

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

    # Sensitive columns that should be masked
    SENSITIVE_COLUMNS = ["SSN", "PASSPORT", "DRIVERS"]

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

        # Check for WRITE operations
        for keyword in self.WRITE_KEYWORDS:
            if keyword in upper_sql:
                risk_score = self._calculate_write_risk(sql, keyword)
                return {
                    "query_type": QueryType.WRITE.value,
                    "risk_score": risk_score,
                    "risk_assessment": f"WRITE operation: {keyword} detected. Requires approval."
                }

        # Default: READ
        risk_score = self._calculate_read_risk(sql)
        return {
            "query_type": QueryType.READ.value,
            "risk_score": risk_score,
            "risk_assessment": "Safe read-only query. Will auto-execute."
        }

    async def check_guardrails(self, sql: str) -> List[str]:
        """Check SQL against guardrails and return violations"""
        violations = []

        # Check for SQL injection patterns
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, sql, re.IGNORECASE):
                violations.append(f"Potential SQL injection pattern: {pattern}")

        # Check for sensitive column access
        for col in self.SENSITIVE_COLUMNS:
            if col in sql.upper():
                violations.append(f"Access to sensitive column: {col}")

        # Check for * in SELECT (data minimization)
        if re.search(r"SELECT\s+\*", sql, re.IGNORECASE):
            # This is a warning, not a blocking violation
            pass

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

        # Check for sensitive columns
        for col in self.SENSITIVE_COLUMNS:
            if col in sql.upper():
                risk += 0.2

        # Check for complex queries (multiple JOINs)
        join_count = sql.upper().count("JOIN")
        risk += min(join_count * 0.05, 0.2)

        return min(risk, 0.5)
