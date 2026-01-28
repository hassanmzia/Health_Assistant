"""Medications models - Synthea compatible"""
from django.db import models


class Medication(models.Model):
    """Medication table matching Synthea schema"""
    start = models.DateField(db_column='START', null=True, blank=True)
    stop = models.DateField(db_column='STOP', null=True, blank=True)
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        db_column='PATIENT',
        related_name='medications'
    )
    payer = models.CharField(max_length=100, db_column='PAYER', null=True, blank=True)
    encounter = models.CharField(max_length=100, db_column='ENCOUNTER', null=True, blank=True)
    code = models.CharField(max_length=50, db_column='CODE', null=True, blank=True)
    description = models.TextField(db_column='DESCRIPTION', null=True, blank=True)
    base_cost = models.FloatField(db_column='BASE_COST', null=True, blank=True)
    payer_coverage = models.FloatField(db_column='PAYER_COVERAGE', null=True, blank=True)
    dispenses = models.IntegerField(db_column='DISPENSES', null=True, blank=True)
    totalcost = models.FloatField(db_column='TOTALCOST', null=True, blank=True)
    reasoncode = models.CharField(max_length=50, db_column='REASONCODE', null=True, blank=True)
    reasondescription = models.TextField(db_column='REASONDESCRIPTION', null=True, blank=True)

    class Meta:
        db_table = 'medications'
        ordering = ['-start']

    def __str__(self):
        return f"{self.description} ({self.patient})"
