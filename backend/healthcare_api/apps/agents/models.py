"""Agent models for multi-agent system"""
from django.db import models
from django.utils import timezone


class AgentStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'
    MAINTENANCE = 'MAINTENANCE', 'Maintenance'


class Agent(models.Model):
    """Registry of available agents"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    endpoint = models.CharField(max_length=200)
    capabilities = models.JSONField(default=list)
    status = models.CharField(
        max_length=20,
        choices=AgentStatus.choices,
        default=AgentStatus.ACTIVE
    )
    load_balance = models.BooleanField(default=True)
    priority = models.IntegerField(default=5)
    max_concurrent = models.IntegerField(default=10)
    timeout_seconds = models.IntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'agents'
        ordering = ['priority', 'name']

    def __str__(self):
        return f"{self.name} ({self.status})"


class AgentSession(models.Model):
    """Track active agent sessions"""
    session_id = models.CharField(max_length=100, primary_key=True)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    state = models.JSONField(default=dict)
    current_node = models.CharField(max_length=100, null=True, blank=True)
    is_paused = models.BooleanField(default=False)
    pause_reason = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'agent_sessions'

    def __str__(self):
        return f"Session {self.session_id[:8]}..."

    @property
    def is_active(self):
        if self.expires_at:
            return timezone.now() < self.expires_at
        return True
