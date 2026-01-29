"""
Healthcare Multi-Agent Orchestrator
Main FastAPI application for processing healthcare queries
"""

import os
import uuid
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import redis.asyncio as redis
import httpx

from .orchestrator import HealthcareOrchestrator
from .orchestrator.state import ApprovalStatus


# Pydantic models
class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    user_id: Optional[str] = "anonymous"


class ResumeRequest(BaseModel):
    session_id: str
    decision: str  # APPROVED or REJECTED
    reviewer_id: str
    notes: Optional[str] = ""


class QueryResponse(BaseModel):
    session_id: str
    status: str
    query_type: Optional[str] = None
    result: Optional[str] = None
    requires_approval: bool = False
    approval_details: Optional[dict] = None
    error: Optional[str] = None


# Global orchestrator instance
orchestrator: Optional[HealthcareOrchestrator] = None
redis_client: Optional[redis.Redis] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    global orchestrator, redis_client

    # Startup
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/2')
    redis_client = redis.from_url(redis_url)

    database_url = os.environ.get('DATABASE_URL', 'postgresql://healthcare_user:healthcare_secure_pass_2024@localhost:5432/healthcare_db')
    mcp_url = os.environ.get('MCP_SERVER_URL', 'http://localhost:3001')
    openai_key = os.environ.get('OPENAI_API_KEY', '')

    orchestrator = HealthcareOrchestrator(
        database_url=database_url,
        mcp_url=mcp_url,
        openai_api_key=openai_key,
        redis_client=redis_client
    )

    print("Healthcare Orchestrator initialized")
    yield

    # Shutdown
    if redis_client:
        await redis_client.close()


app = FastAPI(
    title="Healthcare Multi-Agent System",
    description="Multi-agent orchestrator for healthcare intelligence queries",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "agent-orchestrator"}


@app.post("/process", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """Process a natural language query through the multi-agent system"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    session_id = request.session_id or str(uuid.uuid4())

    try:
        result = await orchestrator.process(
            query=request.query,
            session_id=session_id,
            user_id=request.user_id
        )

        # Check if paused for HITL
        if result.get('requires_approval'):
            return QueryResponse(
                session_id=session_id,
                status="PENDING_APPROVAL",
                query_type=result.get('query_type'),
                requires_approval=True,
                approval_details={
                    'generated_sql': result.get('generated_sql'),
                    'risk_assessment': result.get('risk_assessment'),
                    'risk_score': result.get('risk_score')
                }
            )

        # Normal completion
        return QueryResponse(
            session_id=session_id,
            status=result.get('approval_status', 'COMPLETED'),
            query_type=result.get('query_type'),
            result=result.get('execution_result'),
            requires_approval=False
        )

    except Exception as e:
        return QueryResponse(
            session_id=session_id,
            status="ERROR",
            error=str(e)
        )


@app.post("/resume", response_model=QueryResponse)
async def resume_query(request: ResumeRequest):
    """Resume a paused query with human decision"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    try:
        result = await orchestrator.resume(
            session_id=request.session_id,
            decision=request.decision,
            reviewer_id=request.reviewer_id,
            notes=request.notes
        )

        return QueryResponse(
            session_id=request.session_id,
            status=result.get('approval_status', 'COMPLETED'),
            query_type=result.get('query_type'),
            result=result.get('execution_result'),
            requires_approval=False
        )

    except Exception as e:
        return QueryResponse(
            session_id=request.session_id,
            status="ERROR",
            error=str(e)
        )


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get current state of a session"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    state = await orchestrator.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    return state


@app.get("/agents")
async def list_agents():
    """List available agents and their capabilities"""
    return {
        "agents": [
            {
                "name": "sql_agent",
                "description": "Generates SQL from natural language",
                "capabilities": ["generate_sql", "validate_sql", "optimize_sql"]
            },
            {
                "name": "classifier_agent",
                "description": "Classifies queries and assesses risk",
                "capabilities": ["classify_query", "assess_risk", "check_guardrails"]
            },
            {
                "name": "hitl_agent",
                "description": "Manages human-in-the-loop approvals",
                "capabilities": ["request_approval", "process_decision", "escalate"]
            },
            {
                "name": "executor_agent",
                "description": "Executes SQL and formats results",
                "capabilities": ["execute_query", "format_results", "handle_errors"]
            },
            {
                "name": "presenter_agent",
                "description": "Summarizes results in natural language",
                "capabilities": ["summarize", "format", "highlight_important"]
            }
        ]
    }


@app.get("/workflow")
async def get_workflow():
    """Export LangGraph workflow as Mermaid diagram"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    try:
        # Get the graph structure from the orchestrator
        graph = orchestrator.graph

        # Generate Mermaid diagram from LangGraph structure
        mermaid_diagram = _generate_mermaid_from_langgraph(graph)

        return {
            "mermaid": mermaid_diagram,
            "nodes": _get_graph_nodes(graph),
            "edges": _get_graph_edges(graph)
        }
    except Exception as e:
        # Return default diagram on error
        return {
            "mermaid": _get_default_mermaid_diagram(),
            "error": str(e)
        }


def _generate_mermaid_from_langgraph(graph) -> str:
    """Convert LangGraph structure to Mermaid flowchart"""
    try:
        # Try to use LangGraph's built-in graph export
        if hasattr(graph, 'get_graph'):
            graph_data = graph.get_graph()

            nodes = []
            edges = []

            # Extract nodes
            for node in graph_data.nodes:
                node_id = node.id if hasattr(node, 'id') else str(node)
                if node_id == '__start__':
                    nodes.append(f"    START([Start])")
                elif node_id == '__end__':
                    nodes.append(f"    END([End])")
                else:
                    # Format node name for display
                    display_name = node_id.replace('_', ' ').title()
                    nodes.append(f"    {node_id}[{display_name}]")

            # Extract edges
            for edge in graph_data.edges:
                source = edge.source if hasattr(edge, 'source') else edge[0]
                target = edge.target if hasattr(edge, 'target') else edge[1]

                # Handle special node names
                source_id = 'START' if source == '__start__' else source
                target_id = 'END' if target == '__end__' else target

                # Check if edge has a condition
                if hasattr(edge, 'conditional') and edge.conditional:
                    edges.append(f"    {source_id} -.-> {target_id}")
                else:
                    edges.append(f"    {source_id} --> {target_id}")

            # Build mermaid diagram
            diagram = "flowchart TD\n"
            diagram += "\n".join(nodes) + "\n"
            diagram += "\n".join(edges) + "\n"

            # Add styling
            diagram += _get_mermaid_styles()

            return diagram
    except Exception as e:
        print(f"Error generating Mermaid from LangGraph: {e}")

    # Fallback to default diagram
    return _get_default_mermaid_diagram()


def _get_graph_nodes(graph) -> list:
    """Extract node information from LangGraph"""
    try:
        if hasattr(graph, 'get_graph'):
            graph_data = graph.get_graph()
            return [
                {
                    "id": node.id if hasattr(node, 'id') else str(node),
                    "type": "node"
                }
                for node in graph_data.nodes
            ]
    except Exception:
        pass
    return []


def _get_graph_edges(graph) -> list:
    """Extract edge information from LangGraph"""
    try:
        if hasattr(graph, 'get_graph'):
            graph_data = graph.get_graph()
            return [
                {
                    "source": edge.source if hasattr(edge, 'source') else edge[0],
                    "target": edge.target if hasattr(edge, 'target') else edge[1],
                    "conditional": hasattr(edge, 'conditional') and edge.conditional
                }
                for edge in graph_data.edges
            ]
    except Exception:
        pass
    return []


def _get_mermaid_styles() -> str:
    """Return Mermaid styling for the diagram"""
    return """
    style START fill:#22c55e,stroke:#16a34a,color:#fff
    style END fill:#ef4444,stroke:#dc2626,color:#fff
    style hitl_gate fill:#f59e0b,stroke:#d97706,color:#fff
    style handle_rejection fill:#ef4444,stroke:#dc2626,color:#fff
    style execute_sql fill:#3b82f6,stroke:#2563eb,color:#fff
    style generate_sql fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style classify_query fill:#ec4899,stroke:#db2777,color:#fff
    style check_guardrails fill:#06b6d4,stroke:#0891b2,color:#fff
    style present_results fill:#10b981,stroke:#059669,color:#fff
    style fetch_schema fill:#6366f1,stroke:#4f46e5,color:#fff
    style log_audit fill:#78716c,stroke:#57534e,color:#fff
"""


def _get_default_mermaid_diagram() -> str:
    """Return default Mermaid diagram for the healthcare workflow"""
    return """flowchart TD
    START([Start]) --> fetch_schema[Fetch Schema]
    fetch_schema --> generate_sql[Generate SQL]
    generate_sql --> classify_query[Classify Query]
    classify_query --> check_guardrails[Check Guardrails]

    check_guardrails --> route_decision{Route Decision}

    route_decision -->|READ query| execute_sql[Execute SQL]
    route_decision -->|WRITE query| hitl_gate[HITL Gate]
    route_decision -->|UNSAFE/Violations| handle_rejection[Handle Rejection]

    hitl_gate --> hitl_decision{Human Decision}
    hitl_decision -->|Approved| execute_sql
    hitl_decision -->|Rejected| handle_rejection

    execute_sql --> present_results[Present Results]
    present_results --> log_audit[Log Audit]
    handle_rejection --> log_audit
    log_audit --> END([End])

    style START fill:#22c55e,stroke:#16a34a,color:#fff
    style END fill:#ef4444,stroke:#dc2626,color:#fff
    style hitl_gate fill:#f59e0b,stroke:#d97706,color:#fff
    style hitl_decision fill:#f59e0b,stroke:#d97706,color:#000
    style handle_rejection fill:#ef4444,stroke:#dc2626,color:#fff
    style execute_sql fill:#3b82f6,stroke:#2563eb,color:#fff
    style generate_sql fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style classify_query fill:#ec4899,stroke:#db2777,color:#fff
    style check_guardrails fill:#06b6d4,stroke:#0891b2,color:#fff
    style present_results fill:#10b981,stroke:#059669,color:#fff
"""


# Notify WebSocket server about events
async def notify_ws_server(event_type: str, data: dict):
    """Send notification to WebSocket server for real-time updates"""
    ws_url = os.environ.get('WS_SERVER_URL', 'http://localhost:3002')
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{ws_url}/notify",
                json={"type": event_type, "data": data},
                timeout=5.0
            )
    except Exception as e:
        print(f"Failed to notify WS server: {e}")
