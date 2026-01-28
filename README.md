# Healthcare Intelligence Platform

A production-grade, multi-agent healthcare system built with cutting-edge AI technologies, featuring Human-in-the-Loop (HITL) workflows, Model Context Protocol (MCP), and Agent-to-Agent (A2A) communication.

## Features

- **Natural Language to SQL**: Convert healthcare queries to SQL using advanced prompting
- **Multi-Agent Architecture**: SQL Agent, Classifier Agent, HITL Agent, Executor Agent
- **Human-in-the-Loop**: Approval workflows for write operations
- **Guardrails**: Multi-layer security for SQL and prompts
- **HIPAA Compliance**: Complete audit logging and PHI protection
- **Real-time Updates**: WebSocket-based notifications

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Quick Start

### Prerequisites

- Docker & Docker Compose
- OpenAI API Key

### Setup

1. Clone the repository:
```bash
git clone <repo-url>
cd Health_Assistant
```

2. Create environment file:
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- MCP Server: http://localhost:3001
- WebSocket: ws://localhost:3002

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React + TypeScript SPA |
| MCP Server | 3001 | Model Context Protocol |
| WebSocket | 3002 | Real-time communication |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & Pub/Sub |
| Backend | 8000 | Django REST API |
| Agents | 8001 | Multi-agent orchestrator |
| Nginx | 80 | Reverse proxy |

## Technology Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Socket.io
- **Backend**: Django 5, Django REST Framework
- **Agents**: LangGraph, LangChain, OpenAI GPT-4o-mini
- **MCP**: TypeScript, Express
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Container**: Docker Compose

## Development

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Agents
```bash
cd agents
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001
```

## Example Queries

- "Show me all patients with diabetes"
- "What medications is John Smith taking?"
- "Insert a new patient named Jane Doe" (requires approval)
- "Delete patient records" (blocked)

## License

MIT
