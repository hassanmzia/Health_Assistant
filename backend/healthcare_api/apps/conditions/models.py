"""Conditions models - Synthea compatible"""
from django.db import models


class Condition(models.Model):
    """Condition table matching Synthea schema"""
    start = models.DateField(db_column='START', null=True, blank=True)
    stop = models.DateField(db_column='STOP', null=True, blank=True)
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        db_column='PATIENT',
        related_name='conditions'
    )
    encounter = models.CharField(max_length=100, db_column='ENCOUNTER', null=True, blank=True)
    code = models.CharField(max_length=50, db_column='CODE', null=True, blank=True)
    description = models.TextField(db_column='DESCRIPTION', null=True, blank=True)

    class Meta:
        db_table = 'conditions'
        ordering = ['-start']

    def __str__(self):
        return f"{self.description} ({self.patient})"
