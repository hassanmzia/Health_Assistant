"""Agents URLs - Main query processing endpoint"""
from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import httpx
import os

from healthcare_api.apps.audit.models import AuditLog


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


urlpatterns = [
    path('process/', process_query, name='process_query'),
    path('resume/', resume_query, name='resume_query'),
    path('', list_agents, name='list_agents'),
    path('<str:agent_name>/', agent_status, name='agent_status'),
]
