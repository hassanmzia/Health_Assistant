"""
FHIR R4 Compliant Healthcare Data Models

This module implements core FHIR R4 resources for Electronic Health Records (EHR).
Based on HL7 FHIR R4 specification: https://www.hl7.org/fhir/R4/

Key coding systems used:
- SNOMED CT: Clinical findings and procedures
- ICD-10-CM: Diagnoses
- LOINC: Laboratory and vital signs observations
- RxNorm: Medications
- CPT: Procedures
"""

import uuid
from django.db import models
from django.utils import timezone


# =============================================================================
# FHIR Base Classes and Common Types
# =============================================================================

class FHIRResource(models.Model):
    """Abstract base class for all FHIR resources"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resource_type = models.CharField(max_length=50, editable=False)
    meta_version_id = models.CharField(max_length=20, default='1')
    meta_last_updated = models.DateTimeField(auto_now=True)
    active = models.BooleanField(default=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.resource_type:
            self.resource_type = self.__class__.__name__
        super().save(*args, **kwargs)


class CodeableConcept(models.Model):
    """FHIR CodeableConcept - represents coded values with display text"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    system = models.CharField(max_length=255, help_text="Coding system URI (e.g., http://snomed.info/sct)")
    code = models.CharField(max_length=50, db_index=True)
    display = models.CharField(max_length=500)
    text = models.CharField(max_length=500, null=True, blank=True, help_text="Plain text representation")

    class Meta:
        db_table = 'fhir_codeable_concepts'
        indexes = [
            models.Index(fields=['system', 'code']),
        ]

    def __str__(self):
        return f"{self.display} ({self.code})"


# =============================================================================
# FHIR Administrative Resources
# =============================================================================

class Organization(FHIRResource):
    """FHIR Organization - healthcare provider organization"""
    identifier = models.CharField(max_length=100, unique=True, help_text="NPI or other identifier")
    name = models.CharField(max_length=255)
    type_code = models.CharField(max_length=50, null=True, blank=True, help_text="prov|dept|team|govt|ins|pay|edu|reli|crs|cg|bus|other")
    type_display = models.CharField(max_length=100, null=True, blank=True)
    telecom_phone = models.CharField(max_length=20, null=True, blank=True)
    telecom_email = models.EmailField(null=True, blank=True)
    address_line = models.CharField(max_length=255, null=True, blank=True)
    address_city = models.CharField(max_length=100, null=True, blank=True)
    address_state = models.CharField(max_length=50, null=True, blank=True)
    address_postal_code = models.CharField(max_length=20, null=True, blank=True)
    address_country = models.CharField(max_length=50, default='US')

    class Meta:
        db_table = 'fhir_organizations'

    def __str__(self):
        return self.name


class Practitioner(FHIRResource):
    """FHIR Practitioner - healthcare provider"""
    identifier_npi = models.CharField(max_length=20, unique=True, null=True, blank=True, help_text="National Provider Identifier")
    identifier_license = models.CharField(max_length=50, null=True, blank=True)
    name_prefix = models.CharField(max_length=20, null=True, blank=True)
    name_given = models.CharField(max_length=100, help_text="First/given name")
    name_family = models.CharField(max_length=100, help_text="Last/family name")
    name_suffix = models.CharField(max_length=20, null=True, blank=True)
    telecom_phone = models.CharField(max_length=20, null=True, blank=True)
    telecom_email = models.EmailField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=[
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('unknown', 'Unknown'),
    ], null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    qualification_code = models.CharField(max_length=50, null=True, blank=True, help_text="MD, DO, NP, PA, RN, etc.")
    qualification_display = models.CharField(max_length=100, null=True, blank=True)
    specialty_code = models.CharField(max_length=50, null=True, blank=True, help_text="NUCC specialty code")
    specialty_display = models.CharField(max_length=100, null=True, blank=True)
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='practitioners')

    class Meta:
        db_table = 'fhir_practitioners'

    def __str__(self):
        prefix = f"{self.name_prefix} " if self.name_prefix else ""
        suffix = f", {self.name_suffix}" if self.name_suffix else ""
        return f"{prefix}{self.name_given} {self.name_family}{suffix}"

    @property
    def full_name(self):
        return str(self)


class Patient(FHIRResource):
    """FHIR Patient - individual receiving healthcare services"""
    # Identifiers
    identifier_mrn = models.CharField(max_length=50, unique=True, help_text="Medical Record Number")
    identifier_ssn = models.CharField(max_length=11, null=True, blank=True, help_text="Social Security Number (encrypted)")
    identifier_drivers_license = models.CharField(max_length=50, null=True, blank=True)
    identifier_passport = models.CharField(max_length=50, null=True, blank=True)

    # Name (HumanName)
    name_use = models.CharField(max_length=20, default='official', choices=[
        ('usual', 'Usual'),
        ('official', 'Official'),
        ('temp', 'Temporary'),
        ('nickname', 'Nickname'),
        ('anonymous', 'Anonymous'),
        ('old', 'Old'),
        ('maiden', 'Maiden'),
    ])
    name_prefix = models.CharField(max_length=20, null=True, blank=True)
    name_given = models.CharField(max_length=100, help_text="First/given name")
    name_family = models.CharField(max_length=100, help_text="Last/family name")
    name_suffix = models.CharField(max_length=20, null=True, blank=True)
    name_maiden = models.CharField(max_length=100, null=True, blank=True)

    # Telecom (ContactPoint)
    telecom_phone_home = models.CharField(max_length=20, null=True, blank=True)
    telecom_phone_mobile = models.CharField(max_length=20, null=True, blank=True)
    telecom_phone_work = models.CharField(max_length=20, null=True, blank=True)
    telecom_email = models.EmailField(null=True, blank=True)

    # Demographics
    gender = models.CharField(max_length=10, choices=[
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('unknown', 'Unknown'),
    ])
    birth_date = models.DateField()
    deceased_boolean = models.BooleanField(default=False)
    deceased_date_time = models.DateTimeField(null=True, blank=True)

    # Address
    address_use = models.CharField(max_length=20, default='home', choices=[
        ('home', 'Home'),
        ('work', 'Work'),
        ('temp', 'Temporary'),
        ('old', 'Old'),
        ('billing', 'Billing'),
    ])
    address_line = models.CharField(max_length=255, null=True, blank=True)
    address_city = models.CharField(max_length=100, null=True, blank=True)
    address_district = models.CharField(max_length=100, null=True, blank=True, help_text="County")
    address_state = models.CharField(max_length=50, null=True, blank=True)
    address_postal_code = models.CharField(max_length=20, null=True, blank=True)
    address_country = models.CharField(max_length=50, default='US')
    address_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    address_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)

    # Marital Status
    marital_status_code = models.CharField(max_length=10, null=True, blank=True, choices=[
        ('A', 'Annulled'),
        ('D', 'Divorced'),
        ('I', 'Interlocutory'),
        ('L', 'Legally Separated'),
        ('M', 'Married'),
        ('P', 'Polygamous'),
        ('S', 'Never Married'),
        ('T', 'Domestic Partner'),
        ('U', 'Unmarried'),
        ('W', 'Widowed'),
        ('UNK', 'Unknown'),
    ])

    # Extensions (US Core)
    extension_race_code = models.CharField(max_length=50, null=True, blank=True)
    extension_race_display = models.CharField(max_length=100, null=True, blank=True)
    extension_ethnicity_code = models.CharField(max_length=50, null=True, blank=True)
    extension_ethnicity_display = models.CharField(max_length=100, null=True, blank=True)
    extension_birth_sex = models.CharField(max_length=10, null=True, blank=True, choices=[
        ('M', 'Male'),
        ('F', 'Female'),
        ('UNK', 'Unknown'),
    ])
    extension_birthplace = models.CharField(max_length=200, null=True, blank=True)

    # Communication/Language
    communication_language_code = models.CharField(max_length=10, default='en', help_text="ISO 639-1 language code")
    communication_language_display = models.CharField(max_length=50, default='English')
    communication_preferred = models.BooleanField(default=True)

    # General Practitioner
    general_practitioner = models.ForeignKey(Practitioner, on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')

    # Managing Organization
    managing_organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')

    class Meta:
        db_table = 'fhir_patients'
        indexes = [
            models.Index(fields=['name_family', 'name_given']),
            models.Index(fields=['birth_date']),
            models.Index(fields=['gender']),
        ]

    def __str__(self):
        return f"{self.name_given} {self.name_family} (MRN: {self.identifier_mrn})"

    @property
    def full_name(self):
        parts = []
        if self.name_prefix:
            parts.append(self.name_prefix)
        parts.append(self.name_given)
        parts.append(self.name_family)
        if self.name_suffix:
            parts.append(self.name_suffix)
        return ' '.join(parts)

    @property
    def age(self):
        if self.deceased_date_time:
            end_date = self.deceased_date_time.date()
        else:
            end_date = timezone.now().date()
        return (end_date - self.birth_date).days // 365


# =============================================================================
# FHIR Clinical Resources
# =============================================================================

class Encounter(FHIRResource):
    """FHIR Encounter - interaction between patient and healthcare provider"""
    identifier = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=[
        ('planned', 'Planned'),
        ('arrived', 'Arrived'),
        ('triaged', 'Triaged'),
        ('in-progress', 'In Progress'),
        ('onleave', 'On Leave'),
        ('finished', 'Finished'),
        ('cancelled', 'Cancelled'),
        ('entered-in-error', 'Entered in Error'),
        ('unknown', 'Unknown'),
    ], default='finished')

    class_code = models.CharField(max_length=20, choices=[
        ('AMB', 'Ambulatory'),
        ('EMER', 'Emergency'),
        ('FLD', 'Field'),
        ('HH', 'Home Health'),
        ('IMP', 'Inpatient'),
        ('ACUTE', 'Inpatient Acute'),
        ('NONAC', 'Inpatient Non-Acute'),
        ('OBSENC', 'Observation'),
        ('PRENC', 'Pre-Admission'),
        ('SS', 'Short Stay'),
        ('VR', 'Virtual'),
    ])
    class_display = models.CharField(max_length=50)

    # Type (SNOMED CT)
    type_code = models.CharField(max_length=20, null=True, blank=True, help_text="SNOMED CT code")
    type_display = models.CharField(max_length=255, null=True, blank=True)

    # Service Type
    service_type_code = models.CharField(max_length=20, null=True, blank=True)
    service_type_display = models.CharField(max_length=100, null=True, blank=True)

    # Priority
    priority_code = models.CharField(max_length=20, null=True, blank=True, choices=[
        ('A', 'ASAP'),
        ('CR', 'Callback results'),
        ('CS', 'Callback for scheduling'),
        ('CSP', 'Callback placer for scheduling'),
        ('CSR', 'Contact recipient for scheduling'),
        ('EL', 'Elective'),
        ('EM', 'Emergency'),
        ('P', 'Preoperative'),
        ('PRN', 'As needed'),
        ('R', 'Routine'),
        ('RR', 'Rush reporting'),
        ('S', 'Stat'),
        ('T', 'Timing critical'),
        ('UD', 'Use as directed'),
        ('UR', 'Urgent'),
    ])

    # Subject (Patient)
    subject = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='encounters')

    # Participants
    participant_practitioner = models.ForeignKey(Practitioner, on_delete=models.SET_NULL, null=True, blank=True, related_name='encounters')

    # Period
    period_start = models.DateTimeField()
    period_end = models.DateTimeField(null=True, blank=True)

    # Reason (SNOMED CT)
    reason_code = models.CharField(max_length=20, null=True, blank=True)
    reason_display = models.CharField(max_length=255, null=True, blank=True)

    # Hospitalization
    hospitalization_admit_source_code = models.CharField(max_length=20, null=True, blank=True)
    hospitalization_admit_source_display = models.CharField(max_length=100, null=True, blank=True)
    hospitalization_discharge_disposition_code = models.CharField(max_length=20, null=True, blank=True)
    hospitalization_discharge_disposition_display = models.CharField(max_length=100, null=True, blank=True)

    # Location/Organization
    service_provider = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='encounters')

    class Meta:
        db_table = 'fhir_encounters'
        indexes = [
            models.Index(fields=['subject', 'period_start']),
            models.Index(fields=['status']),
            models.Index(fields=['class_code']),
        ]

    def __str__(self):
        return f"{self.class_display} - {self.subject} ({self.period_start.date()})"


class Condition(FHIRResource):
    """FHIR Condition - clinical condition, problem, diagnosis"""
    identifier = models.CharField(max_length=100, unique=True)

    # Clinical Status
    clinical_status_code = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('recurrence', 'Recurrence'),
        ('relapse', 'Relapse'),
        ('inactive', 'Inactive'),
        ('remission', 'Remission'),
        ('resolved', 'Resolved'),
    ], default='active')

    # Verification Status
    verification_status_code = models.CharField(max_length=20, choices=[
        ('unconfirmed', 'Unconfirmed'),
        ('provisional', 'Provisional'),
        ('differential', 'Differential'),
        ('confirmed', 'Confirmed'),
        ('refuted', 'Refuted'),
        ('entered-in-error', 'Entered in Error'),
    ], default='confirmed')

    # Category
    category_code = models.CharField(max_length=50, choices=[
        ('problem-list-item', 'Problem List Item'),
        ('encounter-diagnosis', 'Encounter Diagnosis'),
        ('health-concern', 'Health Concern'),
    ], default='encounter-diagnosis')

    # Severity (SNOMED CT)
    severity_code = models.CharField(max_length=20, null=True, blank=True)
    severity_display = models.CharField(max_length=50, null=True, blank=True)

    # Code (ICD-10-CM or SNOMED CT)
    code_system = models.CharField(max_length=255, default='http://hl7.org/fhir/sid/icd-10-cm')
    code_code = models.CharField(max_length=20, db_index=True)
    code_display = models.CharField(max_length=500)

    # Body Site (SNOMED CT)
    body_site_code = models.CharField(max_length=20, null=True, blank=True)
    body_site_display = models.CharField(max_length=100, null=True, blank=True)

    # Subject
    subject = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='conditions')

    # Encounter
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='conditions')

    # Onset
    onset_date_time = models.DateTimeField(null=True, blank=True)
    onset_age_value = models.IntegerField(null=True, blank=True)
    onset_string = models.CharField(max_length=100, null=True, blank=True)

    # Abatement (when condition ended)
    abatement_date_time = models.DateTimeField(null=True, blank=True)
    abatement_age_value = models.IntegerField(null=True, blank=True)
    abatement_string = models.CharField(max_length=100, null=True, blank=True)

    # Recorded Date
    recorded_date = models.DateTimeField(default=timezone.now)

    # Recorder
    recorder = models.ForeignKey(Practitioner, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_conditions')

    # Note
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'fhir_conditions'
        indexes = [
            models.Index(fields=['subject', 'clinical_status_code']),
            models.Index(fields=['code_code']),
            models.Index(fields=['onset_date_time']),
        ]

    def __str__(self):
        return f"{self.code_display} - {self.subject}"


class Observation(FHIRResource):
    """FHIR Observation - vital signs, lab results, measurements"""
    identifier = models.CharField(max_length=100, unique=True)

    # Status
    status = models.CharField(max_length=20, choices=[
        ('registered', 'Registered'),
        ('preliminary', 'Preliminary'),
        ('final', 'Final'),
        ('amended', 'Amended'),
        ('corrected', 'Corrected'),
        ('cancelled', 'Cancelled'),
        ('entered-in-error', 'Entered in Error'),
        ('unknown', 'Unknown'),
    ], default='final')

    # Category (LOINC)
    category_code = models.CharField(max_length=50, choices=[
        ('vital-signs', 'Vital Signs'),
        ('laboratory', 'Laboratory'),
        ('imaging', 'Imaging'),
        ('procedure', 'Procedure'),
        ('survey', 'Survey'),
        ('exam', 'Exam'),
        ('therapy', 'Therapy'),
        ('activity', 'Activity'),
        ('social-history', 'Social History'),
    ])
    category_display = models.CharField(max_length=50)

    # Code (LOINC)
    code_system = models.CharField(max_length=255, default='http://loinc.org')
    code_code = models.CharField(max_length=20, db_index=True)
    code_display = models.CharField(max_length=255)

    # Subject
    subject = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='observations')

    # Encounter
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='observations')

    # Effective DateTime
    effective_date_time = models.DateTimeField()

    # Issued
    issued = models.DateTimeField(default=timezone.now)

    # Performer
    performer = models.ForeignKey(Practitioner, on_delete=models.SET_NULL, null=True, blank=True, related_name='observations')

    # Value - supports different types
    value_quantity_value = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    value_quantity_unit = models.CharField(max_length=50, null=True, blank=True)
    value_quantity_system = models.CharField(max_length=255, default='http://unitsofmeasure.org', null=True, blank=True)
    value_quantity_code = models.CharField(max_length=20, null=True, blank=True)
    value_string = models.CharField(max_length=500, null=True, blank=True)
    value_boolean = models.BooleanField(null=True, blank=True)
    value_codeable_concept_code = models.CharField(max_length=50, null=True, blank=True)
    value_codeable_concept_display = models.CharField(max_length=255, null=True, blank=True)

    # Interpretation
    interpretation_code = models.CharField(max_length=10, null=True, blank=True, choices=[
        ('N', 'Normal'),
        ('A', 'Abnormal'),
        ('AA', 'Critical Abnormal'),
        ('H', 'High'),
        ('HH', 'Critical High'),
        ('L', 'Low'),
        ('LL', 'Critical Low'),
        ('U', 'Significant Change Up'),
        ('D', 'Significant Change Down'),
    ])
    interpretation_display = models.CharField(max_length=50, null=True, blank=True)

    # Reference Range
    reference_range_low_value = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    reference_range_high_value = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    reference_range_unit = models.CharField(max_length=50, null=True, blank=True)
    reference_range_text = models.CharField(max_length=100, null=True, blank=True)

    # Note
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'fhir_observations'
        indexes = [
            models.Index(fields=['subject', 'effective_date_time']),
            models.Index(fields=['code_code']),
            models.Index(fields=['category_code']),
        ]

    def __str__(self):
        value = self.value_quantity_value or self.value_string or self.value_codeable_concept_display or ''
        unit = self.value_quantity_unit or ''
        return f"{self.code_display}: {value} {unit}".strip()


class MedicationRequest(FHIRResource):
    """FHIR MedicationRequest - prescription or medication order"""
    identifier = models.CharField(max_length=100, unique=True)

    # Status
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('on-hold', 'On Hold'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('entered-in-error', 'Entered in Error'),
        ('stopped', 'Stopped'),
        ('draft', 'Draft'),
        ('unknown', 'Unknown'),
    ], default='active')

    # Intent
    intent = models.CharField(max_length=20, choices=[
        ('proposal', 'Proposal'),
        ('plan', 'Plan'),
        ('order', 'Order'),
        ('original-order', 'Original Order'),
        ('reflex-order', 'Reflex Order'),
        ('filler-order', 'Filler Order'),
        ('instance-order', 'Instance Order'),
        ('option', 'Option'),
    ], default='order')

    # Category
    category_code = models.CharField(max_length=50, null=True, blank=True, choices=[
        ('inpatient', 'Inpatient'),
        ('outpatient', 'Outpatient'),
        ('community', 'Community'),
        ('discharge', 'Discharge'),
    ])

    # Priority
    priority = models.CharField(max_length=20, null=True, blank=True, choices=[
        ('routine', 'Routine'),
        ('urgent', 'Urgent'),
        ('asap', 'ASAP'),
        ('stat', 'Stat'),
    ])

    # Medication (RxNorm)
    medication_codeable_concept_system = models.CharField(max_length=255, default='http://www.nlm.nih.gov/research/umls/rxnorm')
    medication_codeable_concept_code = models.CharField(max_length=20, db_index=True)
    medication_codeable_concept_display = models.CharField(max_length=500)

    # Subject
    subject = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medication_requests')

    # Encounter
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='medication_requests')

    # Authored On
    authored_on = models.DateTimeField(default=timezone.now)

    # Requester (Prescriber)
    requester = models.ForeignKey(Practitioner, on_delete=models.SET_NULL, null=True, blank=True, related_name='medication_requests')

    # Reason (ICD-10 or SNOMED CT)
    reason_code = models.CharField(max_length=20, null=True, blank=True)
    reason_display = models.CharField(max_length=255, null=True, blank=True)

    # Dosage Instruction
    dosage_text = models.CharField(max_length=500, null=True, blank=True)
    dosage_timing_frequency = models.IntegerField(null=True, blank=True, help_text="Times per period")
    dosage_timing_period = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    dosage_timing_period_unit = models.CharField(max_length=10, null=True, blank=True, choices=[
        ('s', 'Seconds'),
        ('min', 'Minutes'),
        ('h', 'Hours'),
        ('d', 'Days'),
        ('wk', 'Weeks'),
        ('mo', 'Months'),
        ('a', 'Years'),
    ])
    dosage_route_code = models.CharField(max_length=20, null=True, blank=True)
    dosage_route_display = models.CharField(max_length=100, null=True, blank=True)
    dosage_dose_value = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    dosage_dose_unit = models.CharField(max_length=50, null=True, blank=True)

    # Dispense Request
    dispense_validity_period_start = models.DateField(null=True, blank=True)
    dispense_validity_period_end = models.DateField(null=True, blank=True)
    dispense_quantity_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dispense_quantity_unit = models.CharField(max_length=50, null=True, blank=True)
    dispense_expected_supply_days = models.IntegerField(null=True, blank=True)
    dispense_number_of_repeats = models.IntegerField(null=True, blank=True, help_text="Number of refills")

    # Note
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'fhir_medication_requests'
        indexes = [
            models.Index(fields=['subject', 'authored_on']),
            models.Index(fields=['medication_codeable_concept_code']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.medication_codeable_concept_display} - {self.subject}"


class AllergyIntolerance(FHIRResource):
    """FHIR AllergyIntolerance - allergy or intolerance"""
    identifier = models.CharField(max_length=100, unique=True)

    # Clinical Status
    clinical_status_code = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('resolved', 'Resolved'),
    ], default='active')

    # Verification Status
    verification_status_code = models.CharField(max_length=20, choices=[
        ('unconfirmed', 'Unconfirmed'),
        ('confirmed', 'Confirmed'),
        ('refuted', 'Refuted'),
        ('entered-in-error', 'Entered in Error'),
    ], default='confirmed')

    # Type
    type = models.CharField(max_length=20, choices=[
        ('allergy', 'Allergy'),
        ('intolerance', 'Intolerance'),
    ], null=True, blank=True)

    # Category
    category = models.CharField(max_length=20, choices=[
        ('food', 'Food'),
        ('medication', 'Medication'),
        ('environment', 'Environment'),
        ('biologic', 'Biologic'),
    ])

    # Criticality
    criticality = models.CharField(max_length=20, null=True, blank=True, choices=[
        ('low', 'Low Risk'),
        ('high', 'High Risk'),
        ('unable-to-assess', 'Unable to Assess'),
    ])

    # Code (SNOMED CT or RxNorm)
    code_system = models.CharField(max_length=255, default='http://snomed.info/sct')
    code_code = models.CharField(max_length=20, db_index=True)
    code_display = models.CharField(max_length=500)

    # Patient
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='allergy_intolerances')

    # Encounter
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='allergy_intolerances')

    # Onset
    onset_date_time = models.DateTimeField(null=True, blank=True)
    onset_string = models.CharField(max_length=100, null=True, blank=True)

    # Recorded Date
    recorded_date = models.DateTimeField(default=timezone.now)

    # Recorder
    recorder = models.ForeignKey(Practitioner, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_allergies')

    # Reaction
    reaction_manifestation_code = models.CharField(max_length=20, null=True, blank=True)
    reaction_manifestation_display = models.CharField(max_length=255, null=True, blank=True)
    reaction_severity = models.CharField(max_length=20, null=True, blank=True, choices=[
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
    ])
    reaction_onset = models.DateTimeField(null=True, blank=True)

    # Note
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'fhir_allergy_intolerances'
        indexes = [
            models.Index(fields=['patient', 'clinical_status_code']),
            models.Index(fields=['code_code']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.code_display} ({self.category}) - {self.patient}"


class Procedure(FHIRResource):
    """FHIR Procedure - action performed on or for a patient"""
    identifier = models.CharField(max_length=100, unique=True)

    # Status
    status = models.CharField(max_length=20, choices=[
        ('preparation', 'Preparation'),
        ('in-progress', 'In Progress'),
        ('not-done', 'Not Done'),
        ('on-hold', 'On Hold'),
        ('stopped', 'Stopped'),
        ('completed', 'Completed'),
        ('entered-in-error', 'Entered in Error'),
        ('unknown', 'Unknown'),
    ], default='completed')

    # Category (SNOMED CT)
    category_code = models.CharField(max_length=20, null=True, blank=True)
    category_display = models.CharField(max_length=100, null=True, blank=True)

    # Code (SNOMED CT or CPT)
    code_system = models.CharField(max_length=255, default='http://snomed.info/sct')
    code_code = models.CharField(max_length=20, db_index=True)
    code_display = models.CharField(max_length=500)

    # Subject
    subject = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='procedures')

    # Encounter
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='procedures')

    # Performed DateTime/Period
    performed_date_time = models.DateTimeField(null=True, blank=True)
    performed_period_start = models.DateTimeField(null=True, blank=True)
    performed_period_end = models.DateTimeField(null=True, blank=True)

    # Performer
    performer = models.ForeignKey(Practitioner, on_delete=models.SET_NULL, null=True, blank=True, related_name='procedures')
    performer_organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='procedures')

    # Reason (SNOMED CT or ICD-10)
    reason_code = models.CharField(max_length=20, null=True, blank=True)
    reason_display = models.CharField(max_length=255, null=True, blank=True)

    # Body Site (SNOMED CT)
    body_site_code = models.CharField(max_length=20, null=True, blank=True)
    body_site_display = models.CharField(max_length=100, null=True, blank=True)

    # Outcome
    outcome_code = models.CharField(max_length=20, null=True, blank=True)
    outcome_display = models.CharField(max_length=100, null=True, blank=True)

    # Note
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'fhir_procedures'
        indexes = [
            models.Index(fields=['subject', 'performed_date_time']),
            models.Index(fields=['code_code']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.code_display} - {self.subject}"


class Immunization(FHIRResource):
    """FHIR Immunization - vaccination record"""
    identifier = models.CharField(max_length=100, unique=True)

    # Status
    status = models.CharField(max_length=20, choices=[
        ('completed', 'Completed'),
        ('entered-in-error', 'Entered in Error'),
        ('not-done', 'Not Done'),
    ], default='completed')

    # Status Reason (if not-done)
    status_reason_code = models.CharField(max_length=20, null=True, blank=True)
    status_reason_display = models.CharField(max_length=100, null=True, blank=True)

    # Vaccine Code (CVX)
    vaccine_code_system = models.CharField(max_length=255, default='http://hl7.org/fhir/sid/cvx')
    vaccine_code_code = models.CharField(max_length=20, db_index=True)
    vaccine_code_display = models.CharField(max_length=500)

    # Patient
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='immunizations')

    # Encounter
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='immunizations')

    # Occurrence DateTime
    occurrence_date_time = models.DateTimeField()

    # Primary Source
    primary_source = models.BooleanField(default=True, help_text="True if from patient's record")

    # Manufacturer
    manufacturer = models.CharField(max_length=255, null=True, blank=True)

    # Lot Number
    lot_number = models.CharField(max_length=50, null=True, blank=True)

    # Expiration Date
    expiration_date = models.DateField(null=True, blank=True)

    # Site (SNOMED CT)
    site_code = models.CharField(max_length=20, null=True, blank=True)
    site_display = models.CharField(max_length=100, null=True, blank=True)

    # Route
    route_code = models.CharField(max_length=20, null=True, blank=True)
    route_display = models.CharField(max_length=100, null=True, blank=True)

    # Dose Quantity
    dose_quantity_value = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    dose_quantity_unit = models.CharField(max_length=50, null=True, blank=True)

    # Performer
    performer = models.ForeignKey(Practitioner, on_delete=models.SET_NULL, null=True, blank=True, related_name='immunizations')
    performer_organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='immunizations')

    # Note
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'fhir_immunizations'
        indexes = [
            models.Index(fields=['patient', 'occurrence_date_time']),
            models.Index(fields=['vaccine_code_code']),
        ]

    def __str__(self):
        return f"{self.vaccine_code_display} - {self.patient}"


class DiagnosticReport(FHIRResource):
    """FHIR DiagnosticReport - findings and interpretation of diagnostic tests"""
    identifier = models.CharField(max_length=100, unique=True)

    # Status
    status = models.CharField(max_length=20, choices=[
        ('registered', 'Registered'),
        ('partial', 'Partial'),
        ('preliminary', 'Preliminary'),
        ('final', 'Final'),
        ('amended', 'Amended'),
        ('corrected', 'Corrected'),
        ('appended', 'Appended'),
        ('cancelled', 'Cancelled'),
        ('entered-in-error', 'Entered in Error'),
        ('unknown', 'Unknown'),
    ], default='final')

    # Category (LOINC)
    category_code = models.CharField(max_length=50)
    category_display = models.CharField(max_length=100)

    # Code (LOINC)
    code_system = models.CharField(max_length=255, default='http://loinc.org')
    code_code = models.CharField(max_length=20, db_index=True)
    code_display = models.CharField(max_length=255)

    # Subject
    subject = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='diagnostic_reports')

    # Encounter
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='diagnostic_reports')

    # Effective DateTime
    effective_date_time = models.DateTimeField()

    # Issued
    issued = models.DateTimeField(default=timezone.now)

    # Performer
    performer = models.ForeignKey(Practitioner, on_delete=models.SET_NULL, null=True, blank=True, related_name='diagnostic_reports')
    performer_organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='diagnostic_reports')

    # Conclusion
    conclusion = models.TextField(null=True, blank=True)

    # Conclusion Code (SNOMED CT)
    conclusion_code_code = models.CharField(max_length=20, null=True, blank=True)
    conclusion_code_display = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'fhir_diagnostic_reports'
        indexes = [
            models.Index(fields=['subject', 'effective_date_time']),
            models.Index(fields=['code_code']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.code_display} - {self.subject}"


class CarePlan(FHIRResource):
    """FHIR CarePlan - healthcare plan for a patient"""
    identifier = models.CharField(max_length=100, unique=True)

    # Status
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('on-hold', 'On Hold'),
        ('revoked', 'Revoked'),
        ('completed', 'Completed'),
        ('entered-in-error', 'Entered in Error'),
        ('unknown', 'Unknown'),
    ], default='active')

    # Intent
    intent = models.CharField(max_length=20, choices=[
        ('proposal', 'Proposal'),
        ('plan', 'Plan'),
        ('order', 'Order'),
        ('option', 'Option'),
    ], default='plan')

    # Category (SNOMED CT)
    category_code = models.CharField(max_length=20, null=True, blank=True)
    category_display = models.CharField(max_length=100, null=True, blank=True)

    # Title
    title = models.CharField(max_length=255, null=True, blank=True)

    # Description
    description = models.TextField(null=True, blank=True)

    # Subject
    subject = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='care_plans')

    # Encounter
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True, related_name='care_plans')

    # Period
    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True)

    # Created
    created = models.DateTimeField(default=timezone.now)

    # Author
    author = models.ForeignKey(Practitioner, on_delete=models.SET_NULL, null=True, blank=True, related_name='authored_care_plans')

    # Care Team Note
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'fhir_care_plans'
        indexes = [
            models.Index(fields=['subject', 'status']),
            models.Index(fields=['created']),
        ]

    def __str__(self):
        title = self.title or self.category_display or 'Care Plan'
        return f"{title} - {self.subject}"
