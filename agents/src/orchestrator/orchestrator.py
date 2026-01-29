"""
Healthcare Multi-Agent Orchestrator
LangGraph-based workflow for healthcare query processing
"""

import os
import json
import time
import uuid
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

    async def _log_agent_interaction(
        self,
        session_id: str,
        sender_agent: str,
        receiver_agent: str,
        capability: str,
        message_type: str = "request",
        payload: Dict = None,
        response: Dict = None,
        duration_ms: int = 0,
        success: bool = True,
        error: str = None
    ):
        """Log agent-to-agent interaction to the database"""
        try:
            conn = await asyncpg.connect(self.database_url)
            await conn.execute("""
                INSERT INTO agent_interactions (
                    timestamp, session_id, correlation_id, sender_agent, receiver_agent,
                    message_type, capability, payload, response, duration_ms, success, error
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            """,
                datetime.now(),
                session_id,
                str(uuid.uuid4()),
                sender_agent,
                receiver_agent,
                message_type,
                capability,
                json.dumps(payload or {}),
                json.dumps(response or {}),
                duration_ms,
                success,
                error
            )
            await conn.close()
        except Exception as e:
            print(f"Failed to log agent interaction: {e}")

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
        start_time = time.time()
        session_id = state.get("session_id", "unknown")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.mcp_url}/schema", timeout=10.0)
                schema = response.json()
                duration = int((time.time() - start_time) * 1000)
                await self._log_agent_interaction(
                    session_id=session_id,
                    sender_agent="orchestrator",
                    receiver_agent="mcp_server",
                    capability="fetch_schema",
                    payload={"url": f"{self.mcp_url}/schema"},
                    response={"tables": list(schema.get('schema', {}).keys())},
                    duration_ms=duration,
                    success=True
                )
                return {"schema_context": json.dumps(schema.get('schema', {}), indent=2)}
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            await self._log_agent_interaction(
                session_id=session_id,
                sender_agent="orchestrator",
                receiver_agent="mcp_server",
                capability="fetch_schema",
                duration_ms=duration,
                success=False,
                error=str(e)
            )
            return {"schema_context": "Schema unavailable", "error_message": str(e)}

    async def _generate_sql(self, state: HealthcareState) -> Dict[str, Any]:
        """Generate SQL from natural language"""
        start_time = time.time()
        session_id = state.get("session_id", "unknown")
        result = await self.sql_agent.generate(
            query=state["user_query"],
            schema_context=state.get("schema_context", "")
        )
        duration = int((time.time() - start_time) * 1000)
        await self._log_agent_interaction(
            session_id=session_id,
            sender_agent="orchestrator",
            receiver_agent="sql_agent",
            capability="generate_sql",
            payload={"query": state["user_query"]},
            response={"sql": result["sql"][:200], "confidence": result.get("confidence", 0.8)},
            duration_ms=duration,
            success=True
        )
        return {
            "generated_sql": result["sql"],
            "sql_confidence": result.get("confidence", 0.8)
        }

    async def _classify_query(self, state: HealthcareState) -> Dict[str, Any]:
        """Classify query type and assess risk"""
        start_time = time.time()
        session_id = state.get("session_id", "unknown")
        result = await self.classifier_agent.classify(state["generated_sql"])
        duration = int((time.time() - start_time) * 1000)
        await self._log_agent_interaction(
            session_id=session_id,
            sender_agent="orchestrator",
            receiver_agent="classifier_agent",
            capability="classify_query",
            payload={"sql": state["generated_sql"][:100]},
            response={"query_type": result["query_type"], "risk_score": result["risk_score"]},
            duration_ms=duration,
            success=True
        )
        return {
            "query_type": result["query_type"],
            "risk_score": result["risk_score"],
            "risk_assessment": result["risk_assessment"]
        }

    async def _check_guardrails(self, state: HealthcareState) -> Dict[str, Any]:
        """Check SQL against guardrails"""
        start_time = time.time()
        session_id = state.get("session_id", "unknown")
        violations = await self.classifier_agent.check_guardrails(state["generated_sql"])
        duration = int((time.time() - start_time) * 1000)
        await self._log_agent_interaction(
            session_id=session_id,
            sender_agent="orchestrator",
            receiver_agent="classifier_agent",
            capability="check_guardrails",
            payload={"sql": state["generated_sql"][:100]},
            response={"violations": violations},
            duration_ms=duration,
            success=len(violations) == 0
        )
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
        start_time = time.time()
        session_id = state.get("session_id", "unknown")

        # Create approval request
        await self.hitl_agent.create_approval_request(
            session_id=state["session_id"],
            query=state["user_query"],
            sql=state["generated_sql"],
            query_type=state["query_type"],
            risk_score=state.get("risk_score", 0.5),
            risk_assessment=state.get("risk_assessment", "")
        )

        # Log HITL request
        await self._log_agent_interaction(
            session_id=session_id,
            sender_agent="orchestrator",
            receiver_agent="hitl_agent",
            capability="request_approval",
            message_type="request",
            payload={"query_type": state["query_type"], "risk_score": state.get("risk_score", 0.5)},
            duration_ms=int((time.time() - start_time) * 1000),
            success=True
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

        # Log HITL decision
        await self._log_agent_interaction(
            session_id=session_id,
            sender_agent="hitl_agent",
            receiver_agent="orchestrator",
            capability="process_decision",
            message_type="response",
            payload={"decision": decision, "reviewer_id": reviewer_id},
            response={"approved": decision.upper() == "APPROVED"},
            duration_ms=0,
            success=True
        )

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
        session_id = state.get("session_id", "unknown")
        result = await self.executor_agent.execute(state["generated_sql"])
        execution_time = int((time.time() - start_time) * 1000)

        # Log executor interaction
        await self._log_agent_interaction(
            session_id=session_id,
            sender_agent="orchestrator",
            receiver_agent="executor_agent",
            capability="execute_sql",
            payload={"sql": state["generated_sql"][:100]},
            response={"row_count": result.get("row_count", 0), "error": result.get("error")},
            duration_ms=execution_time,
            success=not result.get("error"),
            error=result.get("error")
        )

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
        start_time = time.time()
        session_id = state.get("session_id", "unknown")

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
            duration = int((time.time() - start_time) * 1000)
            await self._log_agent_interaction(
                session_id=session_id,
                sender_agent="orchestrator",
                receiver_agent="presenter_agent",
                capability="summarize_results",
                payload={"results_length": len(str(state["execution_result"]))},
                response={"summary_length": len(response.content)},
                duration_ms=duration,
                success=True
            )
            return {"execution_result": response.content}
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            await self._log_agent_interaction(
                session_id=session_id,
                sender_agent="orchestrator",
                receiver_agent="presenter_agent",
                capability="summarize_results",
                duration_ms=duration,
                success=False,
                error=str(e)
            )
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
            import json
            conn = await asyncpg.connect(self.database_url)
            await conn.execute("""
                INSERT INTO audit_log (
                    timestamp, session_id, user_id, natural_language_query, query_type,
                    sql_statement, classification, risk_score, guardrail_violations,
                    reviewer_id, review_notes, execution_result, execution_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            """,
                datetime.now(),
                state.get("session_id"),
                state.get("user_id"),
                state.get("user_query"),
                state.get("query_type"),
                state.get("generated_sql"),
                state.get("approval_status"),
                state.get("risk_score"),
                json.dumps(state.get("guardrail_violations", [])),
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
