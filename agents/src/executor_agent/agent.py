"""
Executor Agent
Safely executes SQL queries and formats results
"""

import json
from typing import Dict, Any, List
import asyncpg


class ExecutorAgent:
    """Agent for executing SQL queries safely"""

    def __init__(self, database_url: str):
        self.database_url = database_url

    async def execute(self, sql: str) -> Dict[str, Any]:
        """Execute SQL query and return results"""
        try:
            conn = await asyncpg.connect(self.database_url)

            # Handle multiple statements
            statements = [s.strip() for s in sql.split(';') if s.strip()]

            results = []
            for stmt in statements:
                if not stmt:
                    continue

                # Determine if this is a SELECT or modifying query
                is_select = stmt.strip().upper().startswith("SELECT")

                if is_select:
                    rows = await conn.fetch(stmt)
                    results.append({
                        "type": "SELECT",
                        "rows": [dict(row) for row in rows],
                        "count": len(rows)
                    })
                else:
                    status = await conn.execute(stmt)
                    results.append({
                        "type": "EXECUTE",
                        "status": status
                    })

            await conn.close()

            # Format results
            if len(results) == 1:
                result = results[0]
                if result["type"] == "SELECT":
                    return {
                        "data": self._format_rows(result["rows"]),
                        "row_count": result["count"]
                    }
                else:
                    return {
                        "data": result["status"],
                        "row_count": 0
                    }
            else:
                return {
                    "data": f"Executed {len(statements)} statements successfully",
                    "row_count": sum(r.get("count", 0) for r in results if r["type"] == "SELECT")
                }

        except Exception as e:
            return {
                "error": str(e),
                "data": None,
                "row_count": 0
            }

    def _format_rows(self, rows: List[Dict]) -> str:
        """Format rows for display"""
        if not rows:
            return "No results found"

        # Convert to string representation
        if len(rows) == 1:
            return json.dumps(rows[0], default=str, indent=2)

        # For multiple rows, create a summary
        formatted = []
        for i, row in enumerate(rows[:20]):  # Limit display
            formatted.append(f"Record {i+1}: {json.dumps(row, default=str)}")

        result = "\n".join(formatted)
        if len(rows) > 20:
            result += f"\n... and {len(rows) - 20} more records"

        return result

    async def validate_before_execute(self, sql: str) -> Dict[str, Any]:
        """Final validation before execution"""
        upper_sql = sql.upper()

        # Final safety checks
        dangerous = ["DROP", "TRUNCATE", "ALTER TABLE", "CREATE DATABASE"]
        for keyword in dangerous:
            if keyword in upper_sql:
                return {
                    "valid": False,
                    "error": f"Blocked: {keyword} not allowed"
                }

        return {"valid": True}
