"""Human-in-the-Loop models for approval workflows"""
from django.db import models
from django.utils import timezone


class ApprovalTaskStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    EXPIRED = 'EXPIRED', 'Expired'
    ESCALATED = 'ESCALATED', 'Escalated'


class ApprovalTaskPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'


class ApprovalTask(models.Model):
    """HITL approval task for write operations"""
    task_id = models.CharField(max_length=100, primary_key=True)
    session_id = models.CharField(max_length=100, db_index=True)
    user_id = models.CharField(max_length=100, null=True, blank=True)

    # Query details
    natural_language_query = models.TextField()
    generated_sql = models.TextField()
    query_type = models.CharField(max_length=20)
    risk_score = models.FloatField(default=0.0)
    risk_assessment = models.TextField(null=True, blank=True)

    # Status
    status = models.CharField(
        max_length=20,
        choices=ApprovalTaskStatus.choices,
        default=ApprovalTaskStatus.PENDING
    )
    priority = models.CharField(
        max_length=20,
        choices=ApprovalTaskPriority.choices,
        default=ApprovalTaskPriority.MEDIUM
    )

    # Review
    reviewer_id = models.CharField(max_length=100, null=True, blank=True)
    review_notes = models.TextField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # Notification tracking
    notifications_sent = models.JSONField(default=list)

    class Meta:
        db_table = 'approval_tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['reviewer_id', 'status']),
        ]

    def __str__(self):
        return f"Task {self.task_id[:8]}... ({self.status})"

    @property
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    def approve(self, reviewer_id: str, notes: str = None):
        self.status = ApprovalTaskStatus.APPROVED
        self.reviewer_id = reviewer_id
        self.review_notes = notes
        self.reviewed_at = timezone.now()
        self.save()

    def reject(self, reviewer_id: str, notes: str = None):
        self.status = ApprovalTaskStatus.REJECTED
        self.reviewer_id = reviewer_id
        self.review_notes = notes
        self.reviewed_at = timezone.now()
        self.save()


class ApprovalPolicy(models.Model):
    """Policies for automatic approval/rejection"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    is_active = models.BooleanField(default=True)

    # Conditions
    query_type_filter = models.JSONField(default=list)  # ['INSERT', 'UPDATE', 'DELETE']
    table_filter = models.JSONField(default=list)  # Tables this policy applies to
    risk_threshold = models.FloatField(null=True, blank=True)

    # Action
    action = models.CharField(max_length=20)  # 'auto_approve', 'auto_reject', 'escalate'
    escalation_target = models.CharField(max_length=100, null=True, blank=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'approval_policies'
        verbose_name_plural = 'Approval Policies'

    def __str__(self):
        return f"{self.name} ({self.action})"
