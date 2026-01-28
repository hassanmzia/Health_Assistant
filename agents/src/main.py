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
