"""Agents URLs - Main query processing endpoint"""
from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Avg
import httpx
import os

from healthcare_api.apps.audit.models import AuditLog, AgentInteraction


@api_view(['POST'])
def process_query(request):
    """Main endpoint to process natural language queries through the agent system"""
    user_query = request.data.get('query', '')
    session_id = request.data.get('session_id', '')
    user_id = request.data.get('user_id', 'anonymous')

    if not user_query:
        return Response(
            {'error': 'Query is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Forward to agent orchestrator
    agent_url = os.environ.get('AGENT_ORCHESTRATOR_URL', 'http://localhost:8001')

    try:
        response = httpx.post(
            f'{agent_url}/process',
            json={
                'query': user_query,
                'session_id': session_id,
                'user_id': user_id
            },
            timeout=60.0
        )
        return Response(response.json(), status=response.status_code)
    except httpx.RequestError as e:
        return Response(
            {'error': f'Agent service unavailable: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['POST'])
def resume_query(request):
    """Resume a paused query with human decision"""
    session_id = request.data.get('session_id', '')
    decision = request.data.get('decision', '')
    reviewer_id = request.data.get('reviewer_id', '')
    notes = request.data.get('notes', '')

    if not all([session_id, decision]):
        return Response(
            {'error': 'session_id and decision are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    agent_url = os.environ.get('AGENT_ORCHESTRATOR_URL', 'http://localhost:8001')

    try:
        response = httpx.post(
            f'{agent_url}/resume',
            json={
                'session_id': session_id,
                'decision': decision,
                'reviewer_id': reviewer_id,
                'notes': notes
            },
            timeout=60.0
        )
        return Response(response.json(), status=response.status_code)
    except httpx.RequestError as e:
        return Response(
            {'error': f'Agent service unavailable: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['GET'])
def list_agents(request):
    """List available agents and their status"""
    from .models import Agent
    data = list(Agent.objects.all().values())
    return Response(data)


@api_view(['GET'])
def agent_status(request, agent_name):
    """Get status of a specific agent"""
    from .models import Agent
    try:
        agent = Agent.objects.get(name=agent_name)
        return Response({
            'name': agent.name,
            'status': agent.status,
            'capabilities': agent.capabilities,
            'endpoint': agent.endpoint
        })
    except Agent.DoesNotExist:
        return Response(
            {'error': 'Agent not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
def agent_interactions(request):
    """Get recent agent-to-agent interactions"""
    limit = int(request.query_params.get('limit', 50))
    interactions = AgentInteraction.objects.all()[:limit]
    data = []
    for interaction in interactions:
        data.append({
            'id': interaction.id,
            'timestamp': interaction.timestamp.isoformat(),
            'session_id': interaction.session_id,
            'sender_agent': interaction.sender_agent,
            'receiver_agent': interaction.receiver_agent,
            'message_type': interaction.message_type,
            'capability': interaction.capability,
            'payload': interaction.payload,  # Include payload for decision input
            'response': interaction.response,  # Include response for rationale
            'duration_ms': interaction.duration_ms or 0,
            'success': interaction.success,
            'error': interaction.error,
        })
    return Response(data)


@api_view(['GET'])
def agent_stats(request):
    """Get agent interaction statistics"""
    total = AgentInteraction.objects.count()
    success_count = AgentInteraction.objects.filter(success=True).count()
    avg_duration = AgentInteraction.objects.aggregate(avg=Avg('duration_ms'))['avg'] or 0

    by_agent = {}
    agent_counts = AgentInteraction.objects.values('sender_agent').annotate(count=Count('id'))
    for item in agent_counts:
        by_agent[item['sender_agent']] = item['count']

    return Response({
        'total_interactions': total,
        'success_rate': success_count / total if total > 0 else 1.0,
        'avg_duration_ms': avg_duration,
        'by_agent': by_agent,
    })


@api_view(['GET'])
def agent_workflow(request):
    """Get LangGraph workflow as Mermaid diagram"""
    agent_url = os.environ.get('AGENT_ORCHESTRATOR_URL', 'http://localhost:8001')

    try:
        response = httpx.get(f'{agent_url}/workflow', timeout=10.0)
        return Response(response.json(), status=response.status_code)
    except httpx.RequestError as e:
        # Return default workflow diagram on error
        return Response({
            'mermaid': get_default_workflow_diagram(),
            'error': f'Agent service unavailable: {str(e)}'
        })


def get_default_workflow_diagram():
    """Return default Mermaid workflow diagram"""
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


@api_view(['GET'])
def observability_config(request):
    """Get observability configuration for LangSmith and Langfuse"""
    return Response({
        'langsmith_enabled': bool(os.environ.get('LANGCHAIN_API_KEY')),
        'langfuse_enabled': bool(os.environ.get('LANGFUSE_PUBLIC_KEY')),
        'langsmith_project': os.environ.get('LANGCHAIN_PROJECT', 'healthcare-multi-agent'),
        'langfuse_host': os.environ.get('LANGFUSE_HOST', 'https://cloud.langfuse.com'),
    })


@api_view(['GET'])
def observability_traces(request):
    """Get traces with decision rationale from agent interactions"""
    from healthcare_api.apps.audit.models import AuditLog
    from django.db.models import Count

    limit = int(request.query_params.get('limit', 20))

    # Get recent audit logs as traces
    audit_logs = AuditLog.objects.all()[:limit]
    traces = []

    for log in audit_logs:
        # Get interactions for this session
        session_interactions = AgentInteraction.objects.filter(
            session_id=log.session_id
        ).order_by('timestamp')

        decisions = []
        conversations = []

        for interaction in session_interactions:
            # Build decision record
            decision = {
                'agent': interaction.receiver_agent,
                'decision': interaction.capability,
                'rationale': _extract_rationale(interaction.response),
                'confidence': _extract_confidence(interaction.response),
                'timestamp': interaction.timestamp.isoformat(),
                'duration_ms': interaction.duration_ms or 0,
                'input_summary': _summarize_payload(interaction.payload),
                'output_summary': _summarize_payload(interaction.response),
            }
            decisions.append(decision)

            # Build conversation record
            conversations.append({
                'id': interaction.id,
                'timestamp': interaction.timestamp.isoformat(),
                'sender_agent': interaction.sender_agent,
                'receiver_agent': interaction.receiver_agent,
                'capability': interaction.capability,
                'message_type': interaction.message_type,
                'payload': interaction.payload,
                'response': interaction.response,
                'duration_ms': interaction.duration_ms or 0,
                'success': interaction.success,
            })

        traces.append({
            'id': str(log.session_id or log.id),
            'session_id': log.session_id,
            'timestamp': log.timestamp.isoformat(),
            'user_query': log.natural_language_query[:200] if log.natural_language_query else '',
            'total_duration_ms': log.execution_time_ms or 0,
            'agents_involved': list(set(
                [d['agent'] for d in decisions] +
                [c['sender_agent'] for c in conversations]
            )),
            'final_status': log.classification,
            'decisions': decisions,
            'conversations': conversations,
        })

    return Response(traces)


def _extract_rationale(response_data):
    """Extract rationale from response data"""
    if not response_data or not isinstance(response_data, dict):
        return 'No rationale provided'

    # Look for common rationale fields
    for key in ['rationale', 'reason', 'assessment', 'message', 'risk_assessment']:
        if key in response_data:
            value = response_data[key]
            if isinstance(value, str):
                return value[:500]

    return 'Decision made based on query analysis'


def _extract_confidence(response_data):
    """Extract confidence score from response data"""
    if not response_data or not isinstance(response_data, dict):
        return 0.8

    for key in ['confidence', 'score', 'risk_score']:
        if key in response_data:
            try:
                value = float(response_data[key])
                # If it's a risk score, convert to confidence
                if key == 'risk_score':
                    return 1.0 - value
                return value
            except (ValueError, TypeError):
                pass

    return 0.8


def _summarize_payload(data):
    """Create a short summary of payload data"""
    if not data:
        return '-'
    if isinstance(data, dict):
        keys = list(data.keys())[:3]
        return ', '.join(keys) if keys else '-'
    return str(data)[:100]


urlpatterns = [
    path('process/', process_query, name='process_query'),
    path('resume/', resume_query, name='resume_query'),
    path('interactions/', agent_interactions, name='agent_interactions'),
    path('stats/', agent_stats, name='agent_stats'),
    path('workflow/', agent_workflow, name='agent_workflow'),
    path('', list_agents, name='list_agents'),
    path('<str:agent_name>/', agent_status, name='agent_status'),
]

# Observability URLs (separate namespace)
observability_urlpatterns = [
    path('config/', observability_config, name='observability_config'),
    path('traces/', observability_traces, name='observability_traces'),
]
