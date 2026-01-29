# Healthcare Intelligence Platform - Technical Architecture Document

## Table of Contents
1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Service Components](#3-service-components)
4. [Data Models](#4-data-models)
5. [Multi-Agent System](#5-multi-agent-system)
6. [Communication Patterns](#6-communication-patterns)
7. [Security & Compliance](#7-security--compliance)
8. [Deployment Architecture](#8-deployment-architecture)
9. [API Reference](#9-api-reference)
10. [Observability & Tracing](#10-observability--tracing)

---

## 1. Overview

### 1.1 Purpose
The Healthcare Intelligence Platform is an AI-powered natural language interface for healthcare databases. It enables medical professionals to query patient data using plain English while ensuring HIPAA compliance through Human-in-the-Loop (HITL) approval workflows.

### 1.2 Key Features
- **Natural Language to SQL**: Converts plain English queries to SQL statements
- **Multi-Agent Architecture**: LangGraph-based workflow with specialized agents
- **Human-in-the-Loop (HITL)**: Write operations require human approval
- **Real-time Communication**: WebSocket-based live updates
- **Audit Logging**: Complete audit trail for HIPAA compliance
- **Guardrails**: Automatic blocking of dangerous queries

### 1.3 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Zustand |
| Backend API | Django 5.0, Django REST Framework, Python 3.11 |
| Agent Orchestration | FastAPI, LangGraph, LangChain, OpenAI GPT-4o-mini |
| MCP Server | Node.js 20, Express, TypeScript |
| WebSocket Server | Node.js 20, Socket.IO, TypeScript |
| Database | PostgreSQL 16 (Synthea schema) |
| Cache/Pub-Sub | Redis 7 |
| Reverse Proxy | Nginx |
| Container Orchestration | Docker Compose |

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NGINX REVERSE PROXY                             │
│                              (Port 18080 → 80)                               │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                    │                    │
         ▼                    ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    FRONTEND     │  │   BACKEND API   │  │   WS-SERVER     │  │   MCP-SERVER    │
│  React + Vite   │  │     Django      │  │   Socket.IO     │  │    Express      │
│ Port 13040→3040 │  │ Port 18000→8000 │  │ Port 13002→3002 │  │ Port 13001→3001 │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
                              │                    │                    │
                              ▼                    │                    │
                     ┌─────────────────┐           │                    │
                     │     AGENTS      │◄──────────┘                    │
                     │    FastAPI +    │◄───────────────────────────────┘
                     │    LangGraph    │
                     │ Port 18001→8001 │
                     └─────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   POSTGRESQL    │  │     REDIS       │  │     REDIS       │
│   Healthcare    │  │   Cache/Queue   │  │    Pub/Sub      │
│ Port 15432→5432 │  │ Port 16379→6379 │  │ Port 16379→6379 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 2.2 Request Flow

```
User Query → Frontend → WebSocket Server → Agent Orchestrator
                                                   │
                                    ┌──────────────┼──────────────┐
                                    ▼              ▼              ▼
                              SQL Agent    Classifier Agent  HITL Agent
                                    │              │              │
                                    └──────────────┼──────────────┘
                                                   ▼
                                    ┌──────────────────────────┐
                                    │  Decision: READ/WRITE?   │
                                    └──────────────────────────┘
                                         │                │
                              READ ──────┘                └────── WRITE
                                   │                             │
                                   ▼                             ▼
                         ┌─────────────────┐           ┌─────────────────┐
                         │ Execute Query   │           │ HITL Approval   │
                         └─────────────────┘           │    Required     │
                                   │                   └─────────────────┘
                                   │                             │
                                   ▼                             ▼
                         ┌─────────────────┐           ┌─────────────────┐
                         │ Executor Agent  │           │ Human Decision  │
                         └─────────────────┘           └─────────────────┘
                                   │                             │
                                   └──────────────┬──────────────┘
                                                  ▼
                                         ┌─────────────────┐
                                         │  Audit Logging  │
                                         └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ Result to User  │
                                         └─────────────────┘
```

---

## 3. Service Components

### 3.1 Frontend (React + TypeScript)

**Location**: `/frontend/`

**Ports**: 13040 (external) → 3040 (internal)

**Technology**: React 18, Vite, TypeScript, TailwindCSS, Zustand

#### Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── chat/           # Chat interface components
│   │   │   ├── ChatPage.tsx
│   │   │   └── ChatMessage.tsx
│   │   ├── dashboard/      # Analytics dashboard
│   │   │   └── DashboardPage.tsx
│   │   ├── hitl/           # Human-in-the-Loop components
│   │   │   ├── HITLPage.tsx
│   │   │   └── HITLApprovalPanel.tsx
│   │   └── common/         # Shared components
│   │       └── Layout.tsx
│   ├── hooks/
│   │   └── useWebSocket.ts # WebSocket connection hook (singleton)
│   ├── store/
│   │   └── index.ts        # Zustand state management
│   ├── types/
│   │   └── index.ts        # TypeScript interfaces
│   ├── utils/
│   │   └── uuid.ts         # UUID generation utility (HTTP-safe)
│   ├── App.tsx             # Root component with routing
│   └── main.tsx            # Entry point
├── nginx.conf              # Production nginx config
└── Dockerfile
```

#### Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/` | ChatPage | Main chat interface |
| `/dashboard` | DashboardPage | Analytics and metrics |
| `/hitl` | HITLPage | HITL task history |

#### State Management (Zustand)
```typescript
interface AppState {
  sessionId: string              // UUID for session tracking
  messages: Message[]            // Chat message history
  currentApproval: ApprovalTask | null  // Active approval request
  isConnected: boolean           // WebSocket connection status
  isLoading: boolean             // Loading indicator
}
```

---

### 3.2 Backend API (Django)

**Location**: `/backend/`

**Ports**: 18000 (external) → 8000 (internal)

**Technology**: Django 5.0, Django REST Framework

#### Structure
```
backend/
├── healthcare_api/
│   ├── apps/
│   │   ├── patients/       # Patient data models & API
│   │   ├── conditions/     # Medical conditions
│   │   ├── medications/    # Medication records
│   │   ├── allergies/      # Allergy information
│   │   ├── encounters/     # Patient encounters
│   │   ├── audit/          # Audit logging (AuditLog, AgentInteraction)
│   │   ├── agents/         # Agent coordination
│   │   └── hitl/           # HITL endpoints (task history)
│   ├── settings/
│   │   ├── base.py         # Base settings
│   │   ├── development.py  # Dev settings
│   │   └── production.py   # Prod settings
│   ├── urls.py             # URL routing
│   └── wsgi.py
├── manage.py
├── requirements.txt
├── init.sql                # Database initialization with uuid-ossp
└── Dockerfile
```

#### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health/` | GET | Health check |
| `/api/patients/` | GET | List/search patients |
| `/api/conditions/` | GET | List conditions |
| `/api/medications/` | GET | List medications |
| `/api/allergies/` | GET | List allergies |
| `/api/encounters/` | GET | List encounters |
| `/api/audit/` | GET | Audit logs |
| `/api/audit/metrics/` | GET | Analytics metrics (by_type, by_status) |
| `/api/hitl/tasks/` | GET | Pending HITL tasks |
| `/api/hitl/history/` | GET | HITL history from audit_log |

---

### 3.3 Agent Orchestrator (FastAPI + LangGraph)

**Location**: `/agents/`

**Ports**: 18001 (external) → 8001 (internal)

**Technology**: FastAPI, LangGraph, LangChain, OpenAI GPT-4o-mini

#### Structure
```
agents/
├── src/
│   ├── orchestrator/
│   │   ├── orchestrator.py # Main LangGraph workflow (HealthcareOrchestrator)
│   │   └── state.py        # State definitions (HealthcareState, QueryType, ApprovalStatus)
│   ├── sql_agent/
│   │   └── agent.py        # SQL generation agent (SQLAgent)
│   ├── classifier_agent/
│   │   └── agent.py        # Query classification (ClassifierAgent)
│   ├── executor_agent/
│   │   └── agent.py        # SQL execution (ExecutorAgent)
│   ├── hitl_agent/
│   │   └── agent.py        # HITL workflow (HITLAgent)
│   ├── a2a/
│   │   ├── protocol.py     # Agent-to-Agent protocol
│   │   └── registry.py     # Agent registry
│   └── main.py             # FastAPI application
├── requirements.txt
└── Dockerfile
```

#### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/process` | POST | Process natural language query |
| `/resume` | POST | Resume paused workflow with HITL decision |
| `/session/{id}` | GET | Get session state |
| `/agents` | GET | List available agents and capabilities |

---

### 3.4 MCP Server (Model Context Protocol)

**Location**: `/mcp-server/`

**Ports**: 13001 (external) → 3001 (internal)

**Technology**: Node.js, Express, TypeScript, pg (PostgreSQL client)

#### Structure
```
mcp-server/
├── src/
│   ├── index.ts            # Express server with MCP endpoints
│   ├── tools/
│   │   └── index.ts        # MCP tools (query_db, insert_record, etc.)
│   └── resources/
│       └── index.ts        # MCP resources (schema, patients)
├── package.json
├── tsconfig.json
└── Dockerfile
```

#### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/tools` | GET | List available MCP tools |
| `/tools/:name` | POST | Execute a specific tool |
| `/resources` | GET | List MCP resources |
| `/resources/:uri` | GET | Fetch resource content |
| `/schema` | GET | Get database schema (table columns, types) |
| `/validate-sql` | POST | Validate SQL statement safety |

#### SQL Validation Rules
The MCP server validates SQL with these rules:
- **Blocked keywords**: DROP, TRUNCATE, ALTER, GRANT, REVOKE, CREATE DATABASE
- **Blocked patterns**: UPDATE/DELETE without WHERE clause
- **Injection detection**: `;DROP`, `;DELETE`, `UNION SELECT`, `--`, `/**/`, `' OR '1'='1`
- **Warnings**: SELECT without LIMIT clause

---

### 3.5 WebSocket Server (Socket.IO)

**Location**: `/ws-server/`

**Ports**: 13002 (external) → 3002 (internal)

**Technology**: Node.js, Socket.IO, Express, Redis (pub/sub)

#### Structure
```
ws-server/
├── src/
│   └── index.ts            # Socket.IO server with event handlers
├── package.json
├── tsconfig.json
└── Dockerfile
```

#### WebSocket Events

**Client → Server**
| Event | Payload | Description |
|-------|---------|-------------|
| `join_session` | `sessionId: string` | Join a session room |
| `leave_session` | `sessionId: string` | Leave a session |
| `submit_query` | `{sessionId, query, userId}` | Submit NL query |
| `submit_decision` | `{sessionId, decision, reviewerId, notes}` | Submit HITL decision |

**Server → Client**
| Event | Payload | Description |
|-------|---------|-------------|
| `session_joined` | `{sessionId}` | Session join confirmed |
| `approval_required` | `ApprovalTask` | HITL approval needed |
| `query_result` | `QueryResult` | Query completed successfully |
| `decision_processed` | `DecisionResult` | HITL decision processed |
| `error` | `{message}` | Error occurred |

#### Redis Pub/Sub Channels
| Channel | Publisher | Description |
|---------|-----------|-------------|
| `hitl:new_task` | HITL Agent | New approval task created |
| `hitl:decision` | HITL Agent | Decision made on task |
| `a2a:broadcast` | Agents | Agent broadcast messages |

---

### 3.6 Database (PostgreSQL)

**Ports**: 15432 (external) → 5432 (internal)

**Schema**: Synthea Healthcare Data Format + Custom Tables

#### Healthcare Tables (Synthea Format)

**patients**
| Column | Type | Description |
|--------|------|-------------|
| Id | VARCHAR(100) PK | Patient UUID |
| FIRST | VARCHAR(100) | First name |
| LAST | VARCHAR(100) | Last name |
| BIRTHDATE | DATE | Date of birth |
| DEATHDATE | DATE | Date of death (nullable) |
| SSN | VARCHAR(20) | Social Security Number (sensitive) |
| GENDER | VARCHAR(10) | Gender |
| RACE | VARCHAR(50) | Race |
| ETHNICITY | VARCHAR(50) | Ethnicity |
| ADDRESS | VARCHAR(200) | Street address |
| CITY | VARCHAR(100) | City |
| STATE | VARCHAR(100) | State |
| ZIP | VARCHAR(20) | ZIP code |
| HEALTHCARE_EXPENSES | FLOAT | Total expenses |
| HEALTHCARE_COVERAGE | FLOAT | Coverage amount |

**conditions**
| Column | Type | Description |
|--------|------|-------------|
| START | DATE | Condition start date |
| STOP | DATE | Condition end date |
| PATIENT | VARCHAR(100) FK | Patient reference |
| ENCOUNTER | VARCHAR(100) | Encounter reference |
| CODE | VARCHAR(50) | SNOMED code |
| DESCRIPTION | TEXT | Condition description |

**medications**
| Column | Type | Description |
|--------|------|-------------|
| START | DATE | Medication start date |
| STOP | DATE | Medication end date |
| PATIENT | VARCHAR(100) FK | Patient reference |
| ENCOUNTER | VARCHAR(100) | Encounter reference |
| CODE | VARCHAR(50) | RxNorm code |
| DESCRIPTION | TEXT | Medication name |
| REASONDESCRIPTION | TEXT | Reason for medication |

**allergies**
| Column | Type | Description |
|--------|------|-------------|
| START | DATE | Allergy onset date |
| STOP | DATE | Allergy resolution date |
| PATIENT | VARCHAR(100) FK | Patient reference |
| CODE | VARCHAR(50) | Allergy code |
| DESCRIPTION | TEXT | Allergy description |
| TYPE | VARCHAR(50) | Allergy type |
| CATEGORY | VARCHAR(50) | Category |
| SEVERITY1 | VARCHAR(50) | Severity level |

**encounters**
| Column | Type | Description |
|--------|------|-------------|
| Id | VARCHAR(100) PK | Encounter UUID |
| START | TIMESTAMP | Encounter start time |
| STOP | TIMESTAMP | Encounter end time |
| PATIENT | VARCHAR(100) FK | Patient reference |
| ENCOUNTERCLASS | VARCHAR(50) | Type (ambulatory, emergency, etc.) |
| DESCRIPTION | TEXT | Encounter description |

#### System Tables

**audit_log**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Auto-increment ID |
| timestamp | TIMESTAMP | Event timestamp |
| session_id | VARCHAR(100) | Session identifier |
| user_id | VARCHAR(100) | User identifier |
| natural_language_query | TEXT | Original user query |
| query_type | VARCHAR(20) | READ, WRITE, UNSAFE |
| sql_statement | TEXT | Generated SQL |
| classification | VARCHAR(20) | APPROVED, REJECTED, BLOCKED, AUTO_EXECUTED, PENDING |
| risk_score | FLOAT | Risk assessment score |
| guardrail_violations | JSONB | List of violations |
| reviewer_id | VARCHAR(100) | HITL reviewer ID |
| review_notes | TEXT | Reviewer notes |
| execution_result | TEXT | Query result |
| execution_time_ms | INTEGER | Execution time |

**agent_interactions**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Auto-increment ID |
| timestamp | TIMESTAMP | Interaction time |
| session_id | VARCHAR(100) | Session identifier |
| correlation_id | VARCHAR(100) | Request correlation |
| sender_agent | VARCHAR(50) | Sending agent |
| receiver_agent | VARCHAR(50) | Receiving agent |
| message_type | VARCHAR(50) | Message type |
| capability | VARCHAR(100) | Capability invoked |
| payload | JSONB | Request payload |
| response | JSONB | Response data |
| duration_ms | INTEGER | Duration |
| success | BOOLEAN | Success status |

---

### 3.7 Redis

**Ports**: 16379 (external) → 6379 (internal)

#### Database Allocation
| DB | Service | Purpose |
|----|---------|---------|
| 0 | Backend | Django session cache |
| 1 | MCP Server | Schema caching |
| 2 | Agents | Session state, LangGraph checkpoints |
| 3 | WS Server | Pub/Sub messaging |

#### Key Patterns
```
hitl:task:{task_id}     # HITL task data (JSON, 24h TTL)
hitl:pending            # List of pending task IDs
session:{session_id}    # Session state data
```

---

## 4. Data Models

### 4.1 Query State (HealthcareState)

```python
class HealthcareState(TypedDict, total=False):
    # Input
    user_query: str           # Natural language query
    session_id: str           # Session UUID
    user_id: str              # User identifier
    timestamp: str            # ISO timestamp

    # SQL Generation
    generated_sql: str        # Generated SQL statement
    sql_confidence: float     # Confidence score (0.0-1.0)

    # Classification
    query_type: str           # READ, WRITE, UNSAFE
    risk_score: float         # Risk assessment (0.0-1.0)
    risk_assessment: str      # Human-readable assessment
    guardrail_violations: List[str]  # List of violations

    # HITL
    requires_approval: bool   # Whether approval needed
    approval_status: str      # PENDING, APPROVED, REJECTED, AUTO_EXECUTED, BLOCKED
    reviewer_id: Optional[str]    # Reviewer identifier
    review_notes: Optional[str]   # Reviewer notes

    # Execution
    execution_result: Optional[str]   # Query result
    execution_time_ms: Optional[int]  # Execution time
    error_message: Optional[str]      # Error if any

    # Schema context
    schema_context: Optional[str]     # Database schema JSON

    # Audit
    audit_logged: bool        # Whether audit logged
```

### 4.2 Query Types

```python
class QueryType(str, Enum):
    READ = "READ"       # SELECT queries - auto-execute
    WRITE = "WRITE"     # INSERT, UPDATE, DELETE - requires HITL
    UNSAFE = "UNSAFE"   # DROP, TRUNCATE, ALTER - blocked
```

### 4.3 Approval Status

```python
class ApprovalStatus(str, Enum):
    PENDING = "PENDING"           # Awaiting human decision
    APPROVED = "APPROVED"         # Human approved
    REJECTED = "REJECTED"         # Human rejected
    AUTO_EXECUTED = "AUTO_EXECUTED"  # Auto-executed (READ queries)
    BLOCKED = "BLOCKED"           # Blocked by guardrails
```

### 4.4 Frontend Types

```typescript
interface ApprovalTask {
  taskId: string
  sessionId: string
  naturalLanguageQuery: string
  generatedSql: string
  queryType: 'READ' | 'WRITE' | 'UNSAFE'
  riskScore: number
  riskAssessment: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED'
  reviewerId?: string
  reviewNotes?: string
  createdAt: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    queryType?: string
    sql?: string
    requiresApproval?: boolean
    status?: string
  }
}
```

---

## 5. Multi-Agent System

### 5.1 LangGraph Workflow

```
                    START
                      │
                      ▼
              ┌──────────────┐
              │ fetch_schema │  ← Fetches schema from MCP Server
              └──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ generate_sql │  ← SQL Agent generates query
              └──────────────┘
                      │
                      ▼
              ┌───────────────┐
              │classify_query │  ← Classifier Agent assesses risk
              └───────────────┘
                      │
                      ▼
              ┌────────────────┐
              │check_guardrails│  ← Check for violations
              └────────────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
    violations    WRITE       READ
          │           │           │
          ▼           ▼           ▼
    ┌───────────┐ ┌─────────┐ ┌───────────┐
    │  handle   │ │  hitl   │ │ execute   │
    │ rejection │ │  gate   │ │   sql     │
    └───────────┘ └─────────┘ └───────────┘
          │           │           │
          │     ┌─────┴─────┐     │
          │     │ interrupt │     │
          │     │  (HITL)   │     │
          │     └─────┬─────┘     │
          │           │           │
          │     ┌─────┴─────┐     │
          │  APPROVED   REJECTED  │
          │     │           │     │
          │     ▼           ▼     │
          │ ┌─────────┐ ┌───────┐│
          │ │ execute │ │handle ││
          │ │   sql   │ │reject ││
          │ └─────────┘ └───────┘│
          │     │           │     │
          └─────┼───────────┼─────┘
                │           │
                ▼           ▼
              ┌───────────────┐
              │present_results│  ← LLM summarizes results
              └───────────────┘
                      │
                      ▼
              ┌──────────────┐
              │  log_audit   │  ← Record to audit_log
              └──────────────┘
                      │
                      ▼
                     END
```

### 5.2 Agent Descriptions

#### SQL Agent (`agents/src/sql_agent/agent.py`)

**Purpose**: Generate SQL from natural language

**Key Prompt Features**:
```
- Use PostgreSQL syntax
- ALWAYS use double quotes for column names: "FIRST", "LAST", etc.
- Include LIMIT 100 for SELECT unless specified otherwise
- NEVER generate DROP, TRUNCATE, or ALTER statements
- Use ILIKE for case-insensitive text matching

INSERT STATEMENT RULES (CRITICAL):
- For INSERT statements, ALWAYS use uuid_generate_v4() for the "Id" column
- NEVER use DEFAULT for "Id" columns
- Example: INSERT INTO "patients" ("Id", "FIRST", "LAST") VALUES (uuid_generate_v4(), 'John', 'Doe')
```

**Methods**:
- `generate(query, schema_context)` → SQL result with confidence
- `_clean_sql(sql)` → Remove markdown code blocks
- `_fetch_schema()` → Get schema from MCP server
- `_validate_sql(sql)` → Validate via MCP server

#### Classifier Agent (`agents/src/classifier_agent/agent.py`)

**Purpose**: Classify queries and assess risk

**Classification Logic**:
```python
UNSAFE_KEYWORDS = ["DROP", "TRUNCATE", "ALTER", "GRANT", "REVOKE",
                   "CREATE USER", "CREATE DATABASE", "EXEC", "EXECUTE"]
WRITE_KEYWORDS = ["INSERT", "UPDATE", "DELETE"]
SENSITIVE_COLUMNS = ["SSN", "PASSPORT", "DRIVERS"]

# Classification flow:
1. Check UNSAFE keywords → Block
2. Check UPDATE/DELETE without WHERE → Block
3. Check WRITE keywords → Require HITL
4. Default → READ (auto-execute)
```

**Risk Scoring**:
| Factor | Risk Impact |
|--------|-------------|
| INSERT operation | +0.5 base |
| UPDATE operation | +0.7 base |
| DELETE operation | +0.8 base |
| JOIN in query | +0.1 |
| Weak WHERE conditions | +0.1 |
| No LIMIT clause | +0.1 |
| Sensitive column access | +0.2 each |

#### HITL Agent (`agents/src/hitl_agent/agent.py`)

**Purpose**: Manage human approval workflow

**Workflow**:
1. Create approval request in Redis (`hitl:task:{id}`)
2. Add to pending queue (`hitl:pending`)
3. Publish to `hitl:new_task` channel
4. Return `interrupt()` to pause workflow
5. Wait for human decision via `resume()`
6. Process decision and publish to `hitl:decision`

**Data Storage** (Redis, 24h TTL):
```json
{
  "task_id": "uuid",
  "session_id": "uuid",
  "natural_language_query": "...",
  "generated_sql": "...",
  "query_type": "WRITE",
  "risk_score": 0.5,
  "risk_assessment": "...",
  "status": "PENDING",
  "created_at": "ISO timestamp",
  "expires_at": "ISO timestamp"
}
```

#### Executor Agent (`agents/src/executor_agent/agent.py`)

**Purpose**: Execute SQL safely

**Safety Features**:
- Final safety check before execution
- Statement splitting for multiple queries
- Timeout protection
- Result formatting (JSON for single record, summary for multiple)

**Execution Flow**:
1. Split SQL by semicolon
2. Determine SELECT vs modifying query
3. Execute with asyncpg
4. Format results (limit display to 20 records)
5. Return data and row count

---

## 6. Communication Patterns

### 6.1 Query Processing Flow (READ)

```
1. User types: "Show all patients with diabetes"
2. Frontend → WebSocket: submit_query {sessionId, query, userId}
3. WS Server → Agents: POST /process {query, session_id, user_id}
4. Orchestrator workflow:
   a. fetch_schema: GET MCP /schema
   b. generate_sql: SQL Agent creates SELECT query
   c. classify_query: Classifier returns {type: READ, risk: 0.2}
   d. check_guardrails: No violations
   e. execute_sql: Executor runs query
   f. present_results: LLM summarizes results
   g. log_audit: INSERT into audit_log
5. Agents → WS Server: QueryResponse {status: AUTO_EXECUTED, result}
6. WS Server → Frontend: emit 'query_result'
7. Frontend displays formatted results
```

### 6.2 HITL Approval Flow (WRITE)

```
1. User types: "Add new patient John Doe born 1990-05-15"
2. Frontend → WebSocket: submit_query
3. WS Server → Agents: POST /process
4. Orchestrator workflow:
   a. generate_sql: INSERT INTO patients... uuid_generate_v4()
   b. classify_query: {type: WRITE, risk: 0.5}
   c. hitl_gate: Creates approval request
   d. interrupt() pauses workflow
5. Agents → WS Server: {status: PENDING_APPROVAL, requires_approval: true}
6. WS Server → Frontend: emit 'approval_required' {generatedSql, riskScore}
7. Frontend shows HITLApprovalPanel
8. Reviewer clicks APPROVE
9. Frontend → WebSocket: submit_decision {decision: APPROVED, reviewerId}
10. WS Server → Agents: POST /resume {session_id, decision, reviewer_id}
11. Orchestrator resumes:
    a. execute_sql: Runs INSERT
    b. present_results: Formats success message
    c. log_audit: Records approval
12. WS Server → Frontend: emit 'decision_processed'
13. Frontend shows success message
```

### 6.3 Redis Pub/Sub Flow

```
┌──────────────┐      publish       ┌─────────────┐
│ HITL Agent   │ ─────────────────► │   Redis     │
└──────────────┘  hitl:new_task     │   DB 3      │
                                    └──────┬──────┘
                                           │
                                           │ subscribe
                                           ▼
                                    ┌─────────────┐
                                    │  WS Server  │
                                    └──────┬──────┘
                                           │
                                           │ emit
                                           ▼
                                    ┌─────────────┐
                                    │  Frontend   │
                                    └─────────────┘
```

---

## 7. Security & Compliance

### 7.1 HIPAA Compliance Features

| Requirement | Implementation |
|-------------|----------------|
| Access Control | Session-based tracking, reviewer IDs |
| Audit Trail | All queries logged to audit_log table |
| Data Minimization | Guardrails warn on SELECT * |
| PHI Protection | Sensitive column detection (SSN, PASSPORT, DRIVERS) |
| Write Controls | HITL approval for all write operations |
| Encryption | PostgreSQL SSL, Redis AUTH (configurable) |

### 7.2 Guardrails System

**Blocked Operations** (Automatic rejection):
```python
UNSAFE_KEYWORDS = [
    "DROP", "TRUNCATE", "ALTER",
    "GRANT", "REVOKE",
    "CREATE USER", "CREATE DATABASE",
    "EXEC", "EXECUTE"
]
```

**Mass Operation Prevention**:
- UPDATE without WHERE → Blocked
- DELETE without WHERE → Blocked

**SQL Injection Detection**:
```python
INJECTION_PATTERNS = [
    r";\s*DROP",           # Chained DROP
    r";\s*DELETE",         # Chained DELETE
    r"UNION\s+SELECT",     # Union injection
    r"--\s*$",             # Comment injection
    r"/\*.*\*/",           # Block comment
    r"'\s*OR\s+'1'\s*=\s*'1",  # Always-true (string)
    r"'\s*OR\s+1\s*=\s*1"      # Always-true (int)
]
```

**Sensitive Column Detection**:
- SSN (Social Security Number)
- PASSPORT
- DRIVERS (Driver's License)
- Access generates guardrail violation warnings

### 7.3 Risk Scoring Matrix

| Query Type | Base Risk | Modifiers |
|------------|-----------|-----------|
| SELECT | 0.1 | +0.1 no LIMIT, +0.2/sensitive col |
| INSERT | 0.5 | +0.1 if JOINs |
| UPDATE | 0.7 | +0.1 weak WHERE |
| DELETE | 0.8 | +0.1 weak WHERE |
| UNSAFE | 1.0 | Always blocked |

---

## 8. Deployment Architecture

### 8.1 Port Allocation

| Service | External Port | Internal Port | Protocol |
|---------|---------------|---------------|----------|
| PostgreSQL | 15432 | 5432 | TCP |
| Redis | 16379 | 6379 | TCP |
| Backend API | 18000 | 8000 | HTTP |
| MCP Server | 13001 | 3001 | HTTP |
| Agents | 18001 | 8001 | HTTP |
| WS Server | 13002 | 3002 | WS |
| Frontend | 13040 | 3040 | HTTP |
| Nginx | 18080 | 80 | HTTP |

### 8.2 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://healthcare_user:healthcare_secure_pass_2024@postgres:5432/healthcare_db

# Redis
REDIS_URL=redis://redis:6379/0

# API Keys
OPENAI_API_KEY=sk-...

# Service URLs (internal Docker network)
MCP_SERVER_URL=http://mcp-server:3001
AGENT_ORCHESTRATOR_URL=http://agents:8001
WS_SERVER_URL=http://ws-server:3002
BACKEND_URL=http://backend:8000

# Django
SECRET_KEY=django-healthcare-secret-key-2024-very-secure
ALLOWED_HOSTS=*
DEBUG=False
```

### 8.3 Docker Compose Services

| Service | Base Image | Healthcheck |
|---------|------------|-------------|
| postgres | postgres:16-alpine | pg_isready |
| redis | redis:7-alpine | redis-cli ping |
| backend | Custom Python | curl /api/health/ |
| mcp-server | Custom Node | wget /health |
| agents | Custom Python | curl /health |
| ws-server | Custom Node | wget /health |
| frontend | Custom Node/Nginx | - |
| nginx | nginx:alpine | - |

### 8.4 Volume Mounts

| Volume | Mount Point | Purpose |
|--------|-------------|---------|
| postgres_data | /var/lib/postgresql/data | Database persistence |
| redis_data | /data | Cache persistence |
| backend_static | /app/staticfiles | Django static files |

---

## 9. API Reference

### 9.1 Agent Orchestrator API

#### POST /process
Process a natural language query.

**Request**:
```json
{
  "query": "Show all patients with diabetes",
  "session_id": "optional-uuid",
  "user_id": "anonymous"
}
```

**Response (READ - Auto-executed)**:
```json
{
  "session_id": "uuid",
  "status": "AUTO_EXECUTED",
  "query_type": "READ",
  "result": "Found 5 patients with diabetes:\n- John Doe, age 45...",
  "requires_approval": false
}
```

**Response (WRITE - Pending)**:
```json
{
  "session_id": "uuid",
  "status": "PENDING_APPROVAL",
  "query_type": "WRITE",
  "requires_approval": true,
  "approval_details": {
    "generated_sql": "INSERT INTO \"patients\" (\"Id\", \"FIRST\", \"LAST\") VALUES (uuid_generate_v4(), 'John', 'Doe')",
    "risk_assessment": "WRITE operation: INSERT detected. Requires approval.",
    "risk_score": 0.5
  }
}
```

#### POST /resume
Resume a paused workflow with human decision.

**Request**:
```json
{
  "session_id": "uuid",
  "decision": "APPROVED",
  "reviewer_id": "dr.smith",
  "notes": "Patient verified"
}
```

**Response**:
```json
{
  "session_id": "uuid",
  "status": "APPROVED",
  "query_type": "WRITE",
  "result": "INSERT 0 1",
  "requires_approval": false
}
```

#### GET /agents
List available agents.

**Response**:
```json
{
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
    }
  ]
}
```

### 9.2 MCP Server API

#### GET /schema
Get database schema.

**Response**:
```json
{
  "schema": {
    "patients": [
      {"column": "Id", "type": "character varying", "nullable": false},
      {"column": "FIRST", "type": "character varying", "nullable": true},
      {"column": "LAST", "type": "character varying", "nullable": true}
    ],
    "conditions": [...],
    "medications": [...]
  }
}
```

#### POST /validate-sql
Validate SQL statement.

**Request**:
```json
{
  "sql": "SELECT * FROM patients WHERE \"LAST\" = 'Smith'"
}
```

**Response**:
```json
{
  "valid": true,
  "errors": [],
  "warnings": ["Consider adding LIMIT clause to prevent large result sets"]
}
```

### 9.3 Backend API

#### GET /api/audit/metrics/
Get analytics metrics.

**Response**:
```json
{
  "total_queries": 150,
  "by_type": {
    "READ": 120,
    "WRITE": 25,
    "UNSAFE": 5
  },
  "by_status": {
    "AUTO_EXECUTED": 120,
    "APPROVED": 20,
    "REJECTED": 3,
    "BLOCKED": 7
  }
}
```

---

## 10. Observability & Tracing

### 10.1 Overview

The Healthcare Intelligence Platform includes comprehensive observability features for explainability, accountability, and debugging. This is implemented through integration with two powerful observability platforms:

- **LangSmith**: LangChain's native tracing and monitoring platform
- **Langfuse**: Open-source LLM observability with self-hosting options

### 10.2 Features

| Feature | Description |
|---------|-------------|
| **Decision Tracing** | Track every agent decision with full rationale |
| **Agent Conversations** | Log all agent-to-agent communications |
| **Confidence Scores** | Record confidence levels for SQL generation and classification |
| **Execution Timings** | Measure latency for each workflow step |
| **Error Tracking** | Capture and analyze failures |
| **Session Replay** | View complete query session traces |

### 10.3 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY LAYER                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐         ┌─────────────────┐                │
│  │   LangSmith     │         │    Langfuse     │                │
│  │  (Cloud/Self)   │         │  (Cloud/Self)   │                │
│  └────────▲────────┘         └────────▲────────┘                │
│           │                           │                          │
│           └───────────┬───────────────┘                          │
│                       │                                          │
│              ┌────────┴────────┐                                │
│              │ Observability   │                                │
│              │    Manager      │                                │
│              └────────▲────────┘                                │
│                       │                                          │
└───────────────────────┼──────────────────────────────────────────┘
                        │
           ┌────────────┼────────────┐
           │            │            │
    ┌──────▼──────┐ ┌───▼────┐ ┌────▼─────┐
    │ SQL Agent   │ │Classifier│ │ HITL    │
    │ Decisions   │ │ Decisions│ │ Decisions│
    └─────────────┘ └──────────┘ └──────────┘
```

### 10.4 Configuration

#### Environment Variables

```bash
# LangSmith Configuration
LANGCHAIN_TRACING_V2=true              # Enable LangSmith tracing
LANGCHAIN_API_KEY=ls_xxxxxxxx          # LangSmith API key
LANGCHAIN_PROJECT=healthcare-multi-agent  # Project name

# Langfuse Configuration
LANGFUSE_PUBLIC_KEY=pk_xxxxxxxx        # Langfuse public key
LANGFUSE_SECRET_KEY=sk_xxxxxxxx        # Langfuse secret key
LANGFUSE_HOST=https://cloud.langfuse.com  # Langfuse host (or self-hosted URL)
```

#### Docker Compose

The docker-compose.yml automatically passes these environment variables to the agents service:

```yaml
agents:
  environment:
    # LangSmith (optional)
    - LANGCHAIN_TRACING_V2=${LANGCHAIN_TRACING_V2:-false}
    - LANGCHAIN_API_KEY=${LANGCHAIN_API_KEY:-}
    - LANGCHAIN_PROJECT=${LANGCHAIN_PROJECT:-healthcare-multi-agent}
    # Langfuse (optional)
    - LANGFUSE_PUBLIC_KEY=${LANGFUSE_PUBLIC_KEY:-}
    - LANGFUSE_SECRET_KEY=${LANGFUSE_SECRET_KEY:-}
    - LANGFUSE_HOST=${LANGFUSE_HOST:-https://cloud.langfuse.com}
```

### 10.5 Decision Logging

Each agent decision is logged with:

```python
{
    "timestamp": "2024-01-15T10:30:00Z",
    "trace_id": "session-uuid",
    "agent": "sql_agent",
    "decision": "generate_sql",
    "rationale": "Translated natural language to SQL. Confidence: 85%. SQL type: SELECT",
    "input": {"query": "Show all patients with diabetes"},
    "output": {"sql": "SELECT * FROM patients..."},
    "confidence": 0.85,
    "alternatives": [...],
    "duration_ms": 450
}
```

### 10.6 Agent Conversation Logging

Agent-to-agent communications are tracked:

```python
{
    "timestamp": "2024-01-15T10:30:01Z",
    "trace_id": "session-uuid",
    "sender": "orchestrator",
    "receiver": "classifier_agent",
    "message_type": "request",
    "content": {"sql": "SELECT * FROM patients..."},
    "response": {"query_type": "READ", "risk_score": 0.1}
}
```

### 10.7 Implementation Details

#### ObservabilityManager

Located at `agents/src/observability/tracer.py`:

```python
class ObservabilityManager:
    """Unified observability manager for LangSmith and Langfuse"""

    def create_trace(name, session_id, user_id, metadata) -> TraceContext
    def log_agent_decision(trace_id, agent_name, decision, rationale, ...)
    def log_agent_conversation(trace_id, sender, receiver, message_type, ...)
    def flush()  # Flush pending traces
```

#### TraceContext

```python
async with observability.create_trace(
    name="healthcare_query",
    session_id=session_id,
    user_id=user_id,
    metadata={"query": query}
) as trace:
    trace.log_decision(
        agent_name="sql_agent",
        decision="generate_sql",
        rationale="Generated SELECT query for patient lookup",
        input_data={"query": user_query},
        output_data={"sql": generated_sql},
        confidence=0.85
    )
```

### 10.8 Viewing Traces

#### LangSmith Dashboard

1. Go to https://smith.langchain.com
2. Select the "healthcare-multi-agent" project
3. View traces, filter by session, analyze latency

#### Langfuse Dashboard

1. Go to https://cloud.langfuse.com (or self-hosted URL)
2. Navigate to Traces
3. Filter by session_id or user_id
4. View decision rationale and agent conversations

### 10.9 Local Development

For local development without external services, traces are logged to stdout:

```
LangSmith tracing disabled (no LANGCHAIN_API_KEY)
Langfuse tracing disabled (no LANGFUSE_PUBLIC_KEY)
```

Agent interactions are still logged to the `agent_interactions` database table for the Agent Monitoring Console.

---

## Appendix A: File Structure

```
Health_Assistant/
├── agents/                     # Multi-agent orchestrator
│   ├── src/
│   │   ├── orchestrator/       # LangGraph workflow
│   │   │   ├── orchestrator.py # HealthcareOrchestrator class
│   │   │   └── state.py        # HealthcareState, enums
│   │   ├── sql_agent/          # SQL generation
│   │   │   └── agent.py        # SQLAgent class
│   │   ├── classifier_agent/   # Query classification
│   │   │   └── agent.py        # ClassifierAgent class
│   │   ├── executor_agent/     # SQL execution
│   │   │   └── agent.py        # ExecutorAgent class
│   │   ├── hitl_agent/         # HITL workflow
│   │   │   └── agent.py        # HITLAgent class
│   │   ├── observability/      # Tracing & Logging
│   │   │   ├── __init__.py     # Module exports
│   │   │   ├── tracer.py       # ObservabilityManager, TraceContext
│   │   │   └── callbacks.py    # LangSmith/Langfuse callbacks
│   │   ├── a2a/                # Agent-to-Agent protocol
│   │   └── main.py             # FastAPI application
│   ├── requirements.txt
│   └── Dockerfile
├── backend/                    # Django REST API
│   ├── healthcare_api/
│   │   ├── apps/
│   │   │   ├── patients/       # Patient CRUD
│   │   │   ├── conditions/     # Conditions
│   │   │   ├── medications/    # Medications
│   │   │   ├── allergies/      # Allergies
│   │   │   ├── encounters/     # Encounters
│   │   │   ├── audit/          # Audit logging
│   │   │   ├── agents/         # Agent coordination
│   │   │   └── hitl/           # HITL endpoints
│   │   ├── settings/           # Django settings
│   │   └── urls.py             # URL routing
│   ├── init.sql                # DB initialization
│   └── Dockerfile
├── frontend/                   # React + TypeScript UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/           # ChatPage, ChatMessage
│   │   │   ├── dashboard/      # DashboardPage
│   │   │   ├── hitl/           # HITLPage, HITLApprovalPanel
│   │   │   └── common/         # Layout
│   │   ├── hooks/              # useWebSocket (singleton)
│   │   ├── store/              # Zustand state
│   │   ├── types/              # TypeScript interfaces
│   │   ├── utils/              # uuid.ts (HTTP-safe)
│   │   └── App.tsx             # Router
│   ├── nginx.conf              # Production nginx
│   └── Dockerfile
├── mcp-server/                 # Model Context Protocol
│   ├── src/
│   │   ├── index.ts            # Express server
│   │   ├── tools/              # MCP tools
│   │   └── resources/          # MCP resources
│   └── Dockerfile
├── ws-server/                  # WebSocket server
│   ├── src/
│   │   └── index.ts            # Socket.IO server
│   └── Dockerfile
├── nginx/                      # Reverse proxy
│   └── nginx.conf
├── docker-compose.yml          # Container orchestration
└── ARCHITECTURE.md             # This document
```

---

## Appendix B: Quick Start

```bash
# 1. Set environment variables
export OPENAI_API_KEY=sk-your-key

# Optional: Enable LangSmith observability
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=ls-your-key

# Optional: Enable Langfuse observability
export LANGFUSE_PUBLIC_KEY=pk-your-key
export LANGFUSE_SECRET_KEY=sk-your-key

# 2. Start all services
docker compose up -d

# 3. Run database migrations
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate

# 4. Access the application
open http://localhost:18080    # Via Nginx
open http://localhost:13040    # Direct frontend

# 5. Test a query
# In the chat interface, try: "Show all patients"

# 6. View traces (if observability enabled)
# LangSmith: https://smith.langchain.com
# Langfuse: https://cloud.langfuse.com
```

---

## Appendix C: Troubleshooting

| Issue | Solution |
|-------|----------|
| Port already in use | Change external ports in docker-compose.yml |
| WebSocket disconnected | Check ws-server logs, ensure Redis is healthy |
| Query fails with "relation does not exist" | Run migrations: `docker compose exec backend python manage.py migrate` |
| INSERT fails with null Id | SQL Agent now uses `uuid_generate_v4()` - rebuild agents container |
| HITL page shows 0 records | HITL history reads from audit_log where query_type='WRITE' |
| crypto.randomUUID error | Frontend uses polyfill in utils/uuid.ts for HTTP |

---

*Document Version: 2.0*
*Last Updated: January 2026*
