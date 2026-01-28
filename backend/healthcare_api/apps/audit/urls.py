"""Audit URLs"""
from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import AuditLog, AgentInteraction


@api_view(['GET'])
def list_audit_logs(request):
    session_id = request.query_params.get('session')
    queryset = AuditLog.objects.all()
    if session_id:
        queryset = queryset.filter(session_id=session_id)
    data = list(queryset[:100].values())
    return Response(data)


@api_view(['GET'])
def audit_metrics(request):
    total = AuditLog.objects.count()
    by_type = {}
    for qt in ['READ', 'WRITE', 'UNSAFE']:
        by_type[qt] = AuditLog.objects.filter(query_type=qt).count()

    by_status = {}
    for status in ['PENDING', 'APPROVED', 'REJECTED', 'AUTO_EXECUTED', 'BLOCKED']:
        by_status[status] = AuditLog.objects.filter(classification=status).count()

    return Response({
        'total_queries': total,
        'by_type': by_type,
        'by_status': by_status
    })


@api_view(['GET'])
def agent_interactions(request):
    session_id = request.query_params.get('session')
    queryset = AgentInteraction.objects.all()
    if session_id:
        queryset = queryset.filter(session_id=session_id)
    data = list(queryset[:100].values())
    return Response(data)


urlpatterns = [
    path('', list_audit_logs, name='list_audit_logs'),
    path('metrics/', audit_metrics, name='audit_metrics'),
    path('interactions/', agent_interactions, name='agent_interactions'),
]
