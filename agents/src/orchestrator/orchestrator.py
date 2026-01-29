"""
Healthcare Multi-Agent Orchestrator
LangGraph-based workflow for healthcare query processing
"""

import os
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt, Command
import httpx
import redis.asyncio as redis
import asyncpg

from .state import HealthcareState, QueryType, ApprovalStatus
from ..sql_agent import SQLAgent
from ..classifier_agent import ClassifierAgent
from ..executor_agent import ExecutorAgent
from ..hitl_agent import HITLAgent


class HealthcareOrchestrator:
    """
    Multi-agent orchestrator for healthcare queries.
    Uses LangGraph for workflow management with HITL support.
    """

    def __init__(
        self,
        database_url: str,
        mcp_url: str,
        openai_api_key: str,
        redis_client: redis.Redis
    ):
        self.database_url = database_url
        self.mcp_url = mcp_url
        self.redis_client = redis_client

        # Initialize LLM
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=openai_api_key,
            temperature=0
        )

        # Initialize agents
        self.sql_agent = SQLAgent(self.llm, mcp_url)
        self.classifier_agent = ClassifierAgent()
        self.executor_agent = ExecutorAgent(database_url)
        self.hitl_agent = HITLAgent(redis_client)

        # Build workflow graph
        self.checkpointer = MemorySaver()
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        builder = StateGraph(HealthcareState)

        # Add nodes
        builder.add_node("fetch_schema", self._fetch_schema)
        builder.add_node("generate_sql", self._generate_sql)
        builder.add_node("classify_query", self._classify_query)
        builder.add_node("check_guardrails", self._check_guardrails)
        builder.add_node("hitl_gate", self._hitl_gate)
        builder.add_node("execute_sql", self._execute_sql)
        builder.add_node("present_results", self._present_results)
        builder.add_node("handle_rejection", self._handle_rejection)
        builder.add_node("log_audit", self._log_audit)

        # Add edges
        builder.add_edge(START, "fetch_schema")
        builder.add_edge("fetch_schema", "generate_sql")
        builder.add_edge("generate_sql", "classify_query")
        builder.add_edge("classify_query", "check_guardrails")

        # Conditional routing after guardrails
        builder.add_conditional_edges(
            "check_guardrails",
            self._route_after_guardrails,
            {
                "execute_sql": "execute_sql",
                "hitl_gate": "hitl_gate",
                "handle_rejection": "handle_rejection"
            }
        )

        # Conditional routing after HITL
        builder.add_conditional_edges(
            "hitl_gate",
            self._route_after_hitl,
            {
                "execute_sql": "execute_sql",
                "handle_rejection": "handle_rejection"
            }
        )

        # Result paths
        builder.add_edge("execute_sql", "present_results")
        builder.add_edge("present_results", "log_audit")
        builder.add_edge("handle_rejection", "log_audit")
        builder.add_edge("log_audit", END)

        return builder.compile(checkpointer=self.checkpointer)

    async def _fetch_schema(self, state: HealthcareState) -> Dict[str, Any]:
        """Fetch database schema from MCP server"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.mcp_url}/schema", timeout=10.0)
                schema = response.json()
                return {"schema_context": json.dumps(schema.get('schema', {}), indent=2)}
        except Exception as e:
            return {"schema_context": "Schema unavailable", "error_message": str(e)}

    async def _generate_sql(self, state: HealthcareState) -> Dict[str, Any]:
        """Generate SQL from natural language"""
        result = await self.sql_agent.generate(
            query=state["user_query"],
            schema_context=state.get("schema_context", "")
        )
        return {
            "generated_sql": result["sql"],
            "sql_confidence": result.get("confidence", 0.8)
        }

    async def _classify_query(self, state: HealthcareState) -> Dict[str, Any]:
        """Classify query type and assess risk"""
        result = await self.classifier_agent.classify(state["generated_sql"])
        return {
            "query_type": result["query_type"],
            "risk_score": result["risk_score"],
            "risk_assessment": result["risk_assessment"]
        }

    async def _check_guardrails(self, state: HealthcareState) -> Dict[str, Any]:
        """Check SQL against guardrails"""
        violations = await self.classifier_agent.check_guardrails(state["generated_sql"])
        return {"guardrail_violations": violations}

    def _route_after_guardrails(self, state: HealthcareState) -> str:
        """Route based on classification and guardrails"""
        violations = state.get("guardrail_violations", [])
        query_type = state.get("query_type", QueryType.READ.value)

        if violations:
            return "handle_rejection"
        elif query_type == QueryType.UNSAFE.value:
            return "handle_rejection"
        elif query_type == QueryType.WRITE.value:
            return "hitl_gate"
        else:
            return "execute_sql"

    async def _hitl_gate(self, state: HealthcareState) -> Dict[str, Any]:
        """Human-in-the-loop approval gate"""
        # Create approval request
        await self.hitl_agent.create_approval_request(
            session_id=state["session_id"],
            query=state["user_query"],
            sql=state["generated_sql"],
            query_type=state["query_type"],
            risk_score=state.get("risk_score", 0.5),
            risk_assessment=state.get("risk_assessment", "")
        )

        # Interrupt workflow for human decision
        review_request = {
            "action_required": "APPROVAL_NEEDED",
            "session_id": state["session_id"],
            "generated_sql": state["generated_sql"],
            "query_type": state["query_type"],
            "risk_score": state.get("risk_score", 0.5),
            "risk_assessment": state.get("risk_assessment", "")
        }

        human_decision = interrupt(review_request)

        # Process decision
        decision = human_decision.get("decision", "REJECTED")
        reviewer_id = human_decision.get("reviewer_id", "unknown")
        notes = human_decision.get("notes", "")

        if decision.upper() == "APPROVED":
            return {
                "approval_status": ApprovalStatus.APPROVED.value,
                "reviewer_id": reviewer_id,
                "review_notes": notes,
                "requires_approval": False
            }
        else:
            return {
                "approval_status": ApprovalStatus.REJECTED.value,
                "reviewer_id": reviewer_id,
                "review_notes": notes,
                "requires_approval": False
            }

    def _route_after_hitl(self, state: HealthcareState) -> str:
        """Route based on HITL decision"""
        if state.get("approval_status") == ApprovalStatus.APPROVED.value:
            return "execute_sql"
        return "handle_rejection"

    async def _execute_sql(self, state: HealthcareState) -> Dict[str, Any]:
        """Execute the SQL query"""
        start_time = time.time()
        result = await self.executor_agent.execute(state["generated_sql"])
        execution_time = int((time.time() - start_time) * 1000)

        if result.get("error"):
            return {
                "error_message": result["error"],
                "execution_time_ms": execution_time
            }

        # Set approval status if not already set
        approval_status = state.get("approval_status")
        if not approval_status or approval_status == ApprovalStatus.PENDING.value:
            approval_status = ApprovalStatus.AUTO_EXECUTED.value

        return {
            "execution_result": result["data"],
            "execution_time_ms": execution_time,
            "approval_status": approval_status
        }

    async def _present_results(self, state: HealthcareState) -> Dict[str, Any]:
        """Format results for presentation"""
        if state.get("error_message"):
            return {"execution_result": f"Query failed: {state['error_message']}"}

        if not state.get("execution_result"):
            return {"execution_result": "No results found."}

        # Use LLM to summarize results
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a healthcare assistant presenting database query results.
Summarize the data in clear, clinical language.
Use bullet points for multiple records.
Highlight important medical information."""),
            ("human", """
Original Question: {query}
SQL Executed: {sql}
Raw Results: {results}

Provide a clear summary for the medical professional.""")
        ])

        chain = prompt | self.llm

        try:
            response = await chain.ainvoke({
                "query": state["user_query"],
                "sql": state["generated_sql"],
                "results": state["execution_result"]
            })
            return {"execution_result": response.content}
        except Exception:
            return state

    async def _handle_rejection(self, state: HealthcareState) -> Dict[str, Any]:
        """Handle rejected or blocked queries"""
        violations = state.get("guardrail_violations", [])
        query_type = state.get("query_type", "")

        if violations:
            message = f"Query blocked due to guardrail violations:\n"
            for v in violations:
                message += f"- {v}\n"
            return {
                "execution_result": message,
                "approval_status": ApprovalStatus.BLOCKED.value
            }

        if query_type == QueryType.UNSAFE.value:
            return {
                "execution_result": f"Query blocked: {state.get('risk_assessment', 'Unsafe operation detected')}",
                "approval_status": ApprovalStatus.BLOCKED.value
            }

        # HITL rejection
        return {
            "execution_result": f"Query rejected by reviewer {state.get('reviewer_id', 'unknown')}.\nReason: {state.get('review_notes', 'No reason provided')}",
            "approval_status": ApprovalStatus.REJECTED.value
        }

    async def _log_audit(self, state: HealthcareState) -> Dict[str, Any]:
        """Log operation to audit trail"""
        try:
            from datetime import datetime
            conn = await asyncpg.connect(self.database_url)
            await conn.execute("""
                INSERT INTO audit_log (
                    timestamp, session_id, user_id, natural_language_query, query_type,
                    sql_statement, classification, risk_score, reviewer_id,
                    review_notes, execution_result, execution_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            """,
                datetime.now(),
                state.get("session_id"),
                state.get("user_id"),
                state.get("user_query"),
                state.get("query_type"),
                state.get("generated_sql"),
                state.get("approval_status"),
                state.get("risk_score"),
                state.get("reviewer_id"),
                state.get("review_notes"),
                str(state.get("execution_result", ""))[:1000],
                state.get("execution_time_ms")
            )
            await conn.close()
            return {"audit_logged": True}
        except Exception as e:
            print(f"Audit logging failed: {e}")
            return {"audit_logged": False}

    async def process(
        self,
        query: str,
        session_id: str,
        user_id: str = "anonymous"
    ) -> Dict[str, Any]:
        """Process a query through the multi-agent workflow"""
        config = {"configurable": {"thread_id": session_id}}

        initial_state: HealthcareState = {
            "user_query": query,
            "session_id": session_id,
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        }

        # Run the graph
        result = await self.graph.ainvoke(initial_state, config)

        # Check if paused for HITL
        snapshot = self.graph.get_state(config)
        if snapshot.next and "hitl_gate" in str(snapshot.next):
            result["requires_approval"] = True

        return result

    async def resume(
        self,
        session_id: str,
        decision: str,
        reviewer_id: str,
        notes: str = ""
    ) -> Dict[str, Any]:
        """Resume a paused workflow with human decision"""
        config = {"configurable": {"thread_id": session_id}}

        human_response = {
            "decision": decision.upper(),
            "reviewer_id": reviewer_id,
            "notes": notes
        }

        result = await self.graph.ainvoke(
            Command(resume=human_response),
            config
        )

        return result

    async def get_session_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get current state of a session"""
        config = {"configurable": {"thread_id": session_id}}
        snapshot = self.graph.get_state(config)

        if not snapshot.values:
            return None

        return {
            "session_id": session_id,
            "state": snapshot.values,
            "next_node": list(snapshot.next) if snapshot.next else [],
            "is_paused": bool(snapshot.next)
        }
