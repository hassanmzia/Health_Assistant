"""Encounters models - Synthea compatible"""
from django.db import models


class Encounter(models.Model):
    """Encounter table matching Synthea schema"""
    id = models.CharField(max_length=100, primary_key=True, db_column='Id')
    start = models.DateTimeField(db_column='START', null=True, blank=True)
    stop = models.DateTimeField(db_column='STOP', null=True, blank=True)
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        db_column='PATIENT',
        related_name='encounters'
    )
    organization = models.CharField(max_length=100, db_column='ORGANIZATION', null=True, blank=True)
    provider = models.CharField(max_length=100, db_column='PROVIDER', null=True, blank=True)
    payer = models.CharField(max_length=100, db_column='PAYER', null=True, blank=True)
    encounterclass = models.CharField(max_length=50, db_column='ENCOUNTERCLASS', null=True, blank=True)
    code = models.CharField(max_length=50, db_column='CODE', null=True, blank=True)
    description = models.TextField(db_column='DESCRIPTION', null=True, blank=True)
    base_encounter_cost = models.FloatField(db_column='BASE_ENCOUNTER_COST', null=True, blank=True)
    total_claim_cost = models.FloatField(db_column='TOTAL_CLAIM_COST', null=True, blank=True)
    payer_coverage = models.FloatField(db_column='PAYER_COVERAGE', null=True, blank=True)
    reasoncode = models.CharField(max_length=50, db_column='REASONCODE', null=True, blank=True)
    reasondescription = models.TextField(db_column='REASONDESCRIPTION', null=True, blank=True)

    class Meta:
        db_table = 'encounters'
        ordering = ['-start']

    def __str__(self):
        return f"{self.description} - {self.patient}"
