"""Audit models for compliance tracking"""
from django.db import models
from django.utils import timezone


class QueryType(models.TextChoices):
    READ = 'READ', 'Read'
    WRITE = 'WRITE', 'Write'
    UNSAFE = 'UNSAFE', 'Unsafe'


class ApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    AUTO_EXECUTED = 'AUTO_EXECUTED', 'Auto Executed'
    BLOCKED = 'BLOCKED', 'Blocked'


class AuditLog(models.Model):
    """Audit log for HIPAA compliance tracking"""
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    session_id = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    natural_language_query = models.TextField()
    query_type = models.CharField(
        max_length=20,
        choices=QueryType.choices,
        default=QueryType.READ
    )
    sql_statement = models.TextField(null=True, blank=True)
    classification = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING
    )
    risk_score = models.FloatField(null=True, blank=True)
    guardrail_violations = models.JSONField(default=list, blank=True)
    reviewer_id = models.CharField(max_length=100, null=True, blank=True)
    review_notes = models.TextField(null=True, blank=True)
    execution_result = models.TextField(null=True, blank=True)
    execution_time_ms = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = 'audit_log'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user_id', 'timestamp']),
            models.Index(fields=['query_type', 'timestamp']),
            models.Index(fields=['classification', 'timestamp']),
        ]

    def __str__(self):
        return f"[{self.timestamp}] {self.query_type} - {self.classification}"


class AgentInteraction(models.Model):
    """Track agent-to-agent interactions for debugging and monitoring"""
    timestamp = models.DateTimeField(default=timezone.now)
    session_id = models.CharField(max_length=100, db_index=True)
    correlation_id = models.CharField(max_length=100, db_index=True)
    sender_agent = models.CharField(max_length=50)
    receiver_agent = models.CharField(max_length=50)
    message_type = models.CharField(max_length=50)
    capability = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    response = models.JSONField(default=dict, null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)
    success = models.BooleanField(default=True)
    error = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'agent_interactions'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.sender_agent} -> {self.receiver_agent}: {self.capability}"
