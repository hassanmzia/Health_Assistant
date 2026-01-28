"""
Patient models - Synthea compatible schema
"""
from django.db import models


class Patient(models.Model):
    """Patient table matching Synthea schema"""
    id = models.CharField(max_length=100, primary_key=True, db_column='Id')
    birthdate = models.DateField(db_column='BIRTHDATE', null=True, blank=True)
    deathdate = models.DateField(db_column='DEATHDATE', null=True, blank=True)
    ssn = models.CharField(max_length=20, db_column='SSN', null=True, blank=True)
    drivers = models.CharField(max_length=50, db_column='DRIVERS', null=True, blank=True)
    passport = models.CharField(max_length=50, db_column='PASSPORT', null=True, blank=True)
    prefix = models.CharField(max_length=10, db_column='PREFIX', null=True, blank=True)
    first = models.CharField(max_length=100, db_column='FIRST')
    last = models.CharField(max_length=100, db_column='LAST')
    suffix = models.CharField(max_length=10, db_column='SUFFIX', null=True, blank=True)
    maiden = models.CharField(max_length=100, db_column='MAIDEN', null=True, blank=True)
    marital = models.CharField(max_length=10, db_column='MARITAL', null=True, blank=True)
    race = models.CharField(max_length=50, db_column='RACE', null=True, blank=True)
    ethnicity = models.CharField(max_length=50, db_column='ETHNICITY', null=True, blank=True)
    gender = models.CharField(max_length=10, db_column='GENDER', null=True, blank=True)
    birthplace = models.CharField(max_length=200, db_column='BIRTHPLACE', null=True, blank=True)
    address = models.CharField(max_length=200, db_column='ADDRESS', null=True, blank=True)
    city = models.CharField(max_length=100, db_column='CITY', null=True, blank=True)
    state = models.CharField(max_length=100, db_column='STATE', null=True, blank=True)
    county = models.CharField(max_length=100, db_column='COUNTY', null=True, blank=True)
    zip = models.CharField(max_length=20, db_column='ZIP', null=True, blank=True)
    lat = models.FloatField(db_column='LAT', null=True, blank=True)
    lon = models.FloatField(db_column='LON', null=True, blank=True)
    healthcare_expenses = models.FloatField(db_column='HEALTHCARE_EXPENSES', null=True, blank=True)
    healthcare_coverage = models.FloatField(db_column='HEALTHCARE_COVERAGE', null=True, blank=True)

    class Meta:
        db_table = 'patients'
        ordering = ['last', 'first']

    def __str__(self):
        return f"{self.first} {self.last}"

    @property
    def full_name(self):
        parts = []
        if self.prefix:
            parts.append(self.prefix)
        parts.append(self.first)
        parts.append(self.last)
        if self.suffix:
            parts.append(self.suffix)
        return ' '.join(parts)
