"""HITL URLs - Human-in-the-loop approval endpoints"""
from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from .models import ApprovalTask, ApprovalTaskStatus


@api_view(['GET'])
def list_pending_tasks(request):
    """List all pending approval tasks"""
    tasks = ApprovalTask.objects.filter(status=ApprovalTaskStatus.PENDING)
    data = list(tasks.values())
    return Response(data)


@api_view(['GET'])
def get_task(request, task_id):
    """Get details of a specific approval task"""
    try:
        task = ApprovalTask.objects.get(task_id=task_id)
        return Response({
            'task_id': task.task_id,
            'session_id': task.session_id,
            'natural_language_query': task.natural_language_query,
            'generated_sql': task.generated_sql,
            'query_type': task.query_type,
            'risk_score': task.risk_score,
            'risk_assessment': task.risk_assessment,
            'status': task.status,
            'priority': task.priority,
            'created_at': task.created_at,
            'expires_at': task.expires_at,
            'is_expired': task.is_expired
        })
    except ApprovalTask.DoesNotExist:
        return Response(
            {'error': 'Task not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
def approve_task(request, task_id):
    """Approve an approval task"""
    reviewer_id = request.data.get('reviewer_id', '')
    notes = request.data.get('notes', '')

    if not reviewer_id:
        return Response(
            {'error': 'reviewer_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        task = ApprovalTask.objects.get(task_id=task_id)

        if task.status != ApprovalTaskStatus.PENDING:
            return Response(
                {'error': f'Task is not pending (current status: {task.status})'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if task.is_expired:
            task.status = ApprovalTaskStatus.EXPIRED
            task.save()
            return Response(
                {'error': 'Task has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )

        task.approve(reviewer_id, notes)

        return Response({
            'message': 'Task approved',
            'task_id': task.task_id,
            'status': task.status,
            'reviewer_id': task.reviewer_id
        })
    except ApprovalTask.DoesNotExist:
        return Response(
            {'error': 'Task not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
def reject_task(request, task_id):
    """Reject an approval task"""
    reviewer_id = request.data.get('reviewer_id', '')
    notes = request.data.get('notes', '')

    if not reviewer_id:
        return Response(
            {'error': 'reviewer_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        task = ApprovalTask.objects.get(task_id=task_id)

        if task.status != ApprovalTaskStatus.PENDING:
            return Response(
                {'error': f'Task is not pending (current status: {task.status})'},
                status=status.HTTP_400_BAD_REQUEST
            )

        task.reject(reviewer_id, notes)

        return Response({
            'message': 'Task rejected',
            'task_id': task.task_id,
            'status': task.status,
            'reviewer_id': task.reviewer_id
        })
    except ApprovalTask.DoesNotExist:
        return Response(
            {'error': 'Task not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
def task_history(request):
    """Get history of all approval tasks"""
    reviewer_id = request.query_params.get('reviewer')
    tasks = ApprovalTask.objects.all()

    if reviewer_id:
        tasks = tasks.filter(reviewer_id=reviewer_id)

    data = list(tasks[:100].values())
    return Response(data)


urlpatterns = [
    path('pending/', list_pending_tasks, name='list_pending_tasks'),
    path('history/', task_history, name='task_history'),
    path('<str:task_id>/', get_task, name='get_task'),
    path('<str:task_id>/approve/', approve_task, name='approve_task'),
    path('<str:task_id>/reject/', reject_task, name='reject_task'),
]
