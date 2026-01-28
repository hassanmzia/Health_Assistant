"""Allergies models - Synthea compatible"""
from django.db import models


class Allergy(models.Model):
    """Allergy table matching Synthea schema"""
    start = models.DateField(db_column='START', null=True, blank=True)
    stop = models.DateField(db_column='STOP', null=True, blank=True)
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        db_column='PATIENT',
        related_name='allergies'
    )
    encounter = models.CharField(max_length=100, db_column='ENCOUNTER', null=True, blank=True)
    code = models.CharField(max_length=50, db_column='CODE', null=True, blank=True)
    system = models.CharField(max_length=50, db_column='SYSTEM', null=True, blank=True)
    description = models.TextField(db_column='DESCRIPTION', null=True, blank=True)
    type = models.CharField(max_length=50, db_column='TYPE', null=True, blank=True)
    category = models.CharField(max_length=50, db_column='CATEGORY', null=True, blank=True)
    reaction1 = models.CharField(max_length=100, db_column='REACTION1', null=True, blank=True)
    description1 = models.TextField(db_column='DESCRIPTION1', null=True, blank=True)
    severity1 = models.CharField(max_length=50, db_column='SEVERITY1', null=True, blank=True)
    reaction2 = models.CharField(max_length=100, db_column='REACTION2', null=True, blank=True)
    description2 = models.TextField(db_column='DESCRIPTION2', null=True, blank=True)
    severity2 = models.CharField(max_length=50, db_column='SEVERITY2', null=True, blank=True)

    class Meta:
        db_table = 'allergies'
        ordering = ['-start']
        verbose_name_plural = 'Allergies'

    def __str__(self):
        return f"{self.description} ({self.patient})"
