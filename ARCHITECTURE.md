# Healthcare Intelligence Platform - Architecture

## Overview

A production-grade, multi-agent healthcare system built with cutting-edge AI technologies, featuring Human-in-the-Loop (HITL) workflows, Model Context Protocol (MCP), and Agent-to-Agent (A2A) communication.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              HEALTHCARE INTELLIGENCE PLATFORM                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                         FRONTEND (React + TypeScript)                        │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │    │
│  │  │ Chat Interface│  │HITL Approval │  │  Dashboard   │  │ Agent Monitoring │ │    │
│  │  │   Component   │  │    Panel     │  │   & Metrics  │  │     Console      │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │    │
│  └────────────────────────────────┬────────────────────────────────────────────┘    │
│                                   │                                                  │
│                          ┌────────▼────────┐                                        │
│                          │   WebSocket     │ Real-time Communication                │
│                          │   (Port 3002)   │ Agent Updates, HITL Events             │
│                          └────────┬────────┘                                        │
│                                   │                                                  │
│  ┌────────────────────────────────┼────────────────────────────────────────────┐    │
│  │                      API GATEWAY & ORCHESTRATION                             │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │    │
│  │  │  Django REST API │  │   Nginx Proxy    │  │   Rate Limiting &        │   │    │
│  │  │   (Port 8000)    │  │   (Port 80)      │  │   Request Validation     │   │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────────┘   │    │
│  └────────────────────────────────┬────────────────────────────────────────────┘    │
│                                   │                                                  │
│  ┌────────────────────────────────┼────────────────────────────────────────────┐    │
│  │                         MULTI-AGENT SYSTEM                                   │    │
│  │                                                                              │    │
│  │   ┌──────────────────────────────────────────────────────────────────┐      │    │
│  │   │                    AGENT ORCHESTRATOR (Port 8001)                 │      │    │
│  │   │  ┌─────────────────────────────────────────────────────────────┐ │      │    │
│  │   │  │                    LangGraph StateGraph                      │ │      │    │
│  │   │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │ │      │    │
│  │   │  │  │  START  │──▶  SQL    │──▶Classifier│──▶ Guardrails     │ │ │      │    │
│  │   │  │  │         │  │  Agent  │  │  Agent   │  │ Validation     │ │ │      │    │
│  │   │  │  └─────────┘  └─────────┘  └─────────┘  └───────┬─────────┘ │ │      │    │
│  │   │  │                                                  │           │ │      │    │
│  │   │  │  ┌─────────────────────────────────────────────┐│           │ │      │    │
│  │   │  │  │           Conditional Routing               ││           │ │      │    │
│  │   │  │  │  READ ──────▶ Auto Execute ────────────────▶││──▶END    │ │      │    │
│  │   │  │  │  WRITE ─────▶ HITL Gate (interrupt) ───────▶││           │ │      │    │
│  │   │  │  │  UNSAFE ────▶ Block & Reject ──────────────▶││           │ │      │    │
│  │   │  │  └─────────────────────────────────────────────┘│           │ │      │    │
│  │   │  │                                                  │           │ │      │    │
│  │   │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────▼──────────┐ │ │      │    │
│  │   │  │  │Executor │──▶Presenter│──▶ Audit   │──▶    END          │ │ │      │    │
│  │   │  │  │ Agent   │  │  Agent  │  │  Logger │  │                 │ │ │      │    │
│  │   │  │  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘ │ │      │    │
│  │   │  └─────────────────────────────────────────────────────────────┘ │      │    │
│  │   └──────────────────────────────────────────────────────────────────┘      │    │
│  │                                                                              │    │
│  │   ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │   │                    A2A (Agent-to-Agent) Protocol                    │    │    │
│  │   │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐│    │    │
│  │   │  │Agent Registry│  │Message Router│  │  Capability Discovery      ││    │    │
│  │   │  │  & Discovery │  │  & Queuing   │  │  & Negotiation             ││    │    │
│  │   │  └──────────────┘  └──────────────┘  └────────────────────────────┘│    │    │
│  │   └────────────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                         MCP SERVER (Port 3001)                               │    │
│  │   ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │   │                    Model Context Protocol                           │    │    │
│  │   │  ┌──────────────────────────────────────────────────────────────┐  │    │    │
│  │   │  │                         TOOLS                                 │  │    │    │
│  │   │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │  │    │    │
│  │   │  │  │ query_db   │ │insert_record││delete_record││get_patient │ │  │    │    │
│  │   │  │  │            │ │            │ │            │ │  _summary  │ │  │    │    │
│  │   │  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘ │  │    │    │
│  │   │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │  │    │    │
│  │   │  │  │list_tables │ │get_schema  │ │validate_sql││audit_action│ │  │    │    │
│  │   │  │  │            │ │            │ │            │ │            │ │  │    │    │
│  │   │  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘ │  │    │    │
│  │   │  └──────────────────────────────────────────────────────────────┘  │    │    │
│  │   │  ┌──────────────────────────────────────────────────────────────┐  │    │    │
│  │   │  │                       RESOURCES                               │  │    │    │
│  │   │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │  │    │    │
│  │   │  │  │ healthcare://  │  │ healthcare://  │  │ healthcare://  │  │  │    │    │
│  │   │  │  │   schema       │  │   patients     │  │   audit-log    │  │  │    │    │
│  │   │  │  └────────────────┘  └────────────────┘  └────────────────┘  │  │    │    │
│  │   │  └──────────────────────────────────────────────────────────────┘  │    │    │
│  │   └────────────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                              DATA LAYER                                      │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │    │
│  │  │   PostgreSQL     │  │      Redis       │  │    Event Store           │   │    │
│  │  │   (Port 5432)    │  │   (Port 6379)    │  │   (Audit Trail)          │   │    │
│  │  │                  │  │                  │  │                          │   │    │
│  │  │  - patients      │  │  - Session cache │  │  - Query history         │   │    │
│  │  │  - conditions    │  │  - HITL state    │  │  - Approval decisions    │   │    │
│  │  │  - medications   │  │  - A2A messages  │  │  - Agent interactions    │   │    │
│  │  │  - allergies     │  │  - Rate limits   │  │  - Compliance logs       │   │    │
│  │  │  - encounters    │  │  - Pub/Sub       │  │                          │   │    │
│  │  │  - audit_log     │  │                  │  │                          │   │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Port Allocation (Conflict-Free)

| Service        | Port  | Protocol | Description                           |
|----------------|-------|----------|---------------------------------------|
| Frontend       | 3000  | HTTP     | React application                     |
| MCP Server     | 3001  | HTTP     | Model Context Protocol server         |
| WebSocket      | 3002  | WS       | Real-time communication               |
| PostgreSQL     | 5432  | TCP      | Database                              |
| Redis          | 6379  | TCP      | Cache & Pub/Sub                       |
| Django API     | 8000  | HTTP     | REST API                              |
| Agent Service  | 8001  | HTTP     | Multi-agent orchestrator              |
| Nginx          | 80    | HTTP     | Reverse proxy (production)            |

---

## Advanced AI Technologies Used

### 1. LangGraph Multi-Agent Architecture

```python
# State-based workflow with checkpointing for HITL
class HealthcareAgentState(TypedDict):
    user_query: str
    generated_sql: str
    query_type: QueryType  # READ, WRITE, UNSAFE
    risk_score: float
    guardrail_violations: List[str]
    approval_status: ApprovalStatus
    execution_result: Optional[str]
    audit_trail: List[AuditEntry]
```

**Features:**
- **Stateful Workflows**: Full state persistence across agent interactions
- **Checkpoint System**: Resume HITL workflows after human decisions
- **Conditional Routing**: Dynamic path selection based on risk assessment
- **Parallel Execution**: Concurrent agent operations where safe

### 2. Advanced Prompt Engineering

```python
# Chain-of-Thought SQL Generation with Self-Verification
SQL_GENERATION_PROMPT = """
You are a healthcare SQL expert. Follow this reasoning process:

STEP 1 - UNDERSTAND: Parse the user's intent
- What tables are needed?
- What relationships exist?
- What filters apply?

STEP 2 - PLAN: Design the query structure
- Determine JOIN strategy
- Identify aggregations
- Plan result format

STEP 3 - GENERATE: Write the SQL
- Use exact Synthea column names (UPPERCASE)
- Apply appropriate indexes
- Include safety LIMIT clause

STEP 4 - VERIFY: Self-check the query
- Validate column names exist
- Confirm JOIN conditions
- Check for SQL injection patterns

OUTPUT: Only the verified SQL statement
"""
```

**Techniques Used:**
- **Chain-of-Thought (CoT)**: Step-by-step reasoning
- **Self-Verification**: Built-in error checking
- **Few-Shot Learning**: Example-based learning
- **Constitutional AI**: Built-in safety constraints

### 3. Guardrails System

```python
# Multi-layer guardrails for healthcare compliance
class GuardrailsConfig:
    # Input validation
    input_guardrails = [
        MaxLengthGuardrail(max_chars=1000),
        PIIDetectionGuardrail(),
        SQLInjectionGuardrail(),
        PromptInjectionGuardrail()
    ]

    # Output validation
    output_guardrails = [
        PHIProtectionGuardrail(),  # HIPAA compliance
        DataMinimizationGuardrail(),
        SensitiveColumnMaskGuardrail()
    ]

    # SQL-specific guardrails
    sql_guardrails = [
        DangerousKeywordGuardrail(['DROP', 'TRUNCATE', 'ALTER']),
        MassOperationGuardrail(),  # Prevents UPDATE/DELETE without WHERE
        TableAccessGuardrail(allowed_tables=['patients', 'conditions', ...]),
        ColumnAccessGuardrail(blocked_columns=['SSN', 'PASSPORT'])
    ]
```

### 4. HITL (Human-in-the-Loop) Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    HITL APPROVAL FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User Query ──▶ SQL Generation ──▶ Classification               │
│                                            │                     │
│                              ┌─────────────┼─────────────┐       │
│                              │             │             │       │
│                              ▼             ▼             ▼       │
│                           [READ]       [WRITE]      [UNSAFE]     │
│                              │             │             │       │
│                              │             │             │       │
│                              ▼             ▼             ▼       │
│                        Auto-Execute   ┌─────────┐    Blocked     │
│                              │        │  HITL   │        │       │
│                              │        │  Gate   │        │       │
│                              │        │interrupt│        │       │
│                              │        └────┬────┘        │       │
│                              │             │             │       │
│                              │    ┌────────┴────────┐    │       │
│                              │    │                 │    │       │
│                              │    ▼                 ▼    │       │
│                              │ [APPROVE]      [REJECT]   │       │
│                              │    │                 │    │       │
│                              │    ▼                 ▼    │       │
│                              │ Execute           Notify  │       │
│                              │    │                 │    │       │
│                              └────┴────────┬────────┴────┘       │
│                                            │                     │
│                                            ▼                     │
│                                     Audit Logging                │
│                                            │                     │
│                                            ▼                     │
│                                    Present Results               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5. MCP (Model Context Protocol) Implementation

```typescript
// MCP Server with Healthcare-specific Tools
const healthcareMCPServer = {
  tools: [
    {
      name: "query_database",
      description: "Execute a read-only SQL query against the healthcare database",
      inputSchema: {
        type: "object",
        properties: {
          sql: { type: "string", description: "SQL SELECT statement" },
          limit: { type: "number", default: 100 }
        },
        required: ["sql"]
      }
    },
    {
      name: "get_patient_summary",
      description: "Get comprehensive patient summary including conditions, medications, allergies",
      inputSchema: {
        type: "object",
        properties: {
          patient_id: { type: "string" },
          include_history: { type: "boolean", default: true }
        },
        required: ["patient_id"]
      }
    },
    {
      name: "validate_sql",
      description: "Validate SQL syntax and safety before execution",
      inputSchema: {
        type: "object",
        properties: {
          sql: { type: "string" }
        },
        required: ["sql"]
      }
    }
  ],
  resources: [
    {
      uri: "healthcare://schema",
      name: "Database Schema",
      mimeType: "application/json"
    },
    {
      uri: "healthcare://patients/{id}",
      name: "Patient Resource",
      mimeType: "application/json"
    }
  ]
};
```

### 6. A2A (Agent-to-Agent) Protocol

```python
# A2A Message Protocol for Healthcare Agents
@dataclass
class A2AMessage:
    sender_agent: str
    receiver_agent: str
    message_type: Literal["request", "response", "notification"]
    capability: str
    payload: Dict[str, Any]
    correlation_id: str
    timestamp: datetime
    priority: int = 5

# Agent Registry with Capability Discovery
class AgentRegistry:
    agents = {
        "sql_agent": {
            "capabilities": ["generate_sql", "validate_sql", "optimize_sql"],
            "endpoint": "/agents/sql",
            "load_balance": True
        },
        "classifier_agent": {
            "capabilities": ["classify_query", "assess_risk", "detect_pii"],
            "endpoint": "/agents/classifier"
        },
        "hitl_agent": {
            "capabilities": ["request_approval", "track_decision", "escalate"],
            "endpoint": "/agents/hitl"
        },
        "executor_agent": {
            "capabilities": ["execute_query", "format_results", "handle_errors"],
            "endpoint": "/agents/executor"
        }
    }
```

### 7. Risk Assessment & Scoring

```python
# Multi-factor Risk Scoring System
class RiskAssessor:
    def calculate_risk_score(self, sql: str, context: dict) -> RiskAssessment:
        factors = {
            "query_type": self._assess_query_type(sql),      # 0.0 - 1.0
            "table_sensitivity": self._assess_tables(sql),    # 0.0 - 1.0
            "data_scope": self._assess_scope(sql),            # 0.0 - 1.0
            "user_history": self._assess_user_risk(context),  # 0.0 - 1.0
            "time_anomaly": self._assess_time_pattern(context) # 0.0 - 1.0
        }

        weights = {
            "query_type": 0.35,
            "table_sensitivity": 0.25,
            "data_scope": 0.20,
            "user_history": 0.10,
            "time_anomaly": 0.10
        }

        final_score = sum(factors[k] * weights[k] for k in factors)

        return RiskAssessment(
            score=final_score,
            factors=factors,
            recommendation=self._get_recommendation(final_score)
        )
```

---

## Agent Workflow Details

### SQL Agent
```python
class SQLAgent:
    """Generates SQL from natural language using advanced prompting"""

    capabilities = ["generate_sql", "validate_sql", "explain_sql"]

    def generate(self, query: str, context: SchemaContext) -> SQLResult:
        # 1. Schema-aware prompt construction
        prompt = self._build_prompt(query, context.get_relevant_tables())

        # 2. Generate with CoT reasoning
        response = self.llm.generate(prompt, temperature=0)

        # 3. Self-verification step
        verified_sql = self._verify_and_fix(response.sql)

        # 4. Syntax validation
        self._validate_syntax(verified_sql)

        return SQLResult(sql=verified_sql, confidence=response.confidence)
```

### Classifier Agent
```python
class ClassifierAgent:
    """Classifies queries and assesses risk with guardrails"""

    capabilities = ["classify", "assess_risk", "check_guardrails"]

    def classify(self, sql: str) -> Classification:
        # 1. Pattern-based classification
        query_type = self._detect_query_type(sql)

        # 2. Guardrail checks
        violations = self.guardrails.check(sql)

        # 3. Risk scoring
        risk = self.risk_assessor.calculate(sql)

        # 4. Determine action
        if violations:
            return Classification(type=UNSAFE, violations=violations)
        elif query_type in [INSERT, UPDATE, DELETE]:
            return Classification(type=WRITE, risk_score=risk)
        else:
            return Classification(type=READ, risk_score=risk)
```

### HITL Agent
```python
class HITLAgent:
    """Manages human-in-the-loop approval workflows"""

    capabilities = ["request_approval", "process_decision", "escalate"]

    async def request_approval(self, request: ApprovalRequest) -> None:
        # 1. Create approval task
        task = await self._create_task(request)

        # 2. Notify via WebSocket
        await self.ws_server.broadcast({
            "type": "approval_required",
            "task_id": task.id,
            "details": request.to_dict()
        })

        # 3. Interrupt workflow (LangGraph)
        return interrupt({"task_id": task.id, "request": request})

    async def process_decision(self, task_id: str, decision: Decision) -> None:
        # 1. Validate reviewer permissions
        self._validate_reviewer(decision.reviewer_id)

        # 2. Log decision
        await self.audit_logger.log(decision)

        # 3. Resume workflow
        return Command(resume=decision)
```

### Executor Agent
```python
class ExecutorAgent:
    """Safely executes SQL and formats results"""

    capabilities = ["execute", "format_results", "handle_errors"]

    def execute(self, sql: str, approved: bool = False) -> ExecutionResult:
        # 1. Final safety check
        if not self._final_safety_check(sql, approved):
            raise SecurityError("Execution blocked by safety check")

        # 2. Execute with timeout
        with timeout(seconds=30):
            result = self.db.execute(sql)

        # 3. Apply output guardrails
        sanitized = self.output_guardrails.process(result)

        # 4. Format for presentation
        formatted = self._format_results(sanitized)

        return ExecutionResult(data=formatted, row_count=len(result))
```

---

## Security & Compliance Features

### HIPAA Compliance
- **PHI Detection**: Automatic detection of Protected Health Information
- **Data Minimization**: Return only necessary data fields
- **Audit Trail**: Complete logging of all data access
- **Access Control**: Role-based permissions for HITL approvers

### SQL Injection Prevention
```python
# Multi-layer SQL injection prevention
class SQLInjectionGuardrail:
    patterns = [
        r";\s*DROP",
        r";\s*DELETE",
        r"UNION\s+SELECT",
        r"--\s*$",
        r"/\*.*\*/",
        r"'\s*OR\s+'1'\s*=\s*'1",
        r"'\s*OR\s+1\s*=\s*1"
    ]

    def check(self, sql: str) -> List[Violation]:
        violations = []
        for pattern in self.patterns:
            if re.search(pattern, sql, re.IGNORECASE):
                violations.append(Violation(
                    type="SQL_INJECTION",
                    pattern=pattern,
                    severity="CRITICAL"
                ))
        return violations
```

### Prompt Injection Prevention
```python
class PromptInjectionGuardrail:
    """Prevents manipulation of system prompts via user input"""

    suspicious_patterns = [
        r"ignore previous instructions",
        r"disregard the above",
        r"new instructions:",
        r"system:",
        r"<\|.*\|>",
        r"\[INST\]",
        r"###"
    ]
```

---

## Data Flow

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Input Guardrails                                        │
│     - Length validation                                     │
│     - PII detection                                         │
│     - Injection prevention                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. SQL Agent (via MCP)                                     │
│     - Schema context loading                                │
│     - Natural language → SQL transformation                 │
│     - Self-verification                                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Classifier Agent                                        │
│     - Query type detection                                  │
│     - Risk score calculation                                │
│     - SQL guardrails check                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ├─── READ (Low Risk) ──▶ Auto-Execute
    │
    ├─── WRITE (Medium Risk) ──▶ HITL Gate
    │                              │
    │                              ├──▶ APPROVE ──▶ Execute
    │                              └──▶ REJECT ──▶ Notify User
    │
    └─── UNSAFE (High Risk) ──▶ Block & Notify
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Executor Agent                                          │
│     - Final safety check                                    │
│     - Query execution                                       │
│     - Output guardrails                                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Presenter Agent                                         │
│     - Result formatting                                     │
│     - Natural language summary                              │
│     - Clinical context                                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Audit Logger                                            │
│     - Compliance logging                                    │
│     - Metrics collection                                    │
│     - Event streaming                                       │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Response to User
```

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18, TypeScript, TailwindCSS | Modern UI with real-time updates |
| WebSocket | Node.js, Socket.io | Real-time HITL notifications |
| API | Django REST Framework | REST API with auth & validation |
| Agents | LangGraph, LangChain | Multi-agent orchestration |
| MCP | TypeScript, @modelcontextprotocol/sdk | Tool & resource provider |
| LLM | OpenAI GPT-4o-mini / GPT-4o | Natural language processing |
| Database | PostgreSQL 16 | ACID-compliant data storage |
| Cache | Redis 7 | Session, pub/sub, rate limiting |
| Container | Docker Compose | Multi-service orchestration |
| Proxy | Nginx | Load balancing & SSL termination |

---

## Getting Started

```bash
# Clone and setup
git clone <repo>
cd Health_Assistant

# Set environment variables
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/api/docs
# MCP Server: http://localhost:3001
```

---

## Features from Original Notebook (All Implemented)

1. **Synthea Healthcare Data** - Full schema support for patients, conditions, medications, allergies, encounters
2. **Natural Language to SQL** - Advanced prompt engineering with schema awareness
3. **Query Classification** - READ/WRITE/UNSAFE with risk scoring
4. **Human-in-the-Loop** - Interrupt/resume workflow for write operations
5. **Audit Logging** - Complete compliance trail
6. **Result Presentation** - LLM-powered summarization
7. **Guardrails** - Multi-layer security for SQL and prompts
8. **Gradio Interface** → Upgraded to React/TypeScript SPA
