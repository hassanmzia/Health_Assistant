"""
Django Admin configuration for FHIR R4 models
"""
from django.contrib import admin
from .models import (
    Organization, Practitioner, Patient, Encounter, Condition,
    Observation, MedicationRequest, AllergyIntolerance, Procedure,
    Immunization, DiagnosticReport, CarePlan
)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'type_code', 'active', 'telecom_phone', 'address_city', 'address_state']
    list_filter = ['active', 'type_code', 'address_state']
    search_fields = ['name', 'identifier_npi', 'address_city']
    readonly_fields = ['id', 'last_updated', 'version_id']


@admin.register(Practitioner)
class PractitionerAdmin(admin.ModelAdmin):
    list_display = ['name_family', 'name_given', 'identifier_npi', 'qualification_code', 'active']
    list_filter = ['active', 'qualification_code', 'gender']
    search_fields = ['name_family', 'name_given', 'identifier_npi']
    readonly_fields = ['id', 'last_updated', 'version_id']


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['identifier_mrn', 'name_family', 'name_given', 'birth_date', 'gender', 'active']
    list_filter = ['active', 'gender', 'address_state', 'marital_status']
    search_fields = ['identifier_mrn', 'name_family', 'name_given', 'telecom_email']
    readonly_fields = ['id', 'last_updated', 'version_id']
    date_hierarchy = 'birth_date'

    fieldsets = (
        ('Identification', {
            'fields': ('id', 'identifier_mrn', 'identifier_ssn', 'active')
        }),
        ('Name', {
            'fields': ('name_given', 'name_family', 'name_prefix', 'name_suffix')
        }),
        ('Demographics', {
            'fields': ('gender', 'birth_date', 'deceased_boolean', 'deceased_datetime', 'marital_status')
        }),
        ('Contact', {
            'fields': ('telecom_phone', 'telecom_email')
        }),
        ('Address', {
            'fields': ('address_line1', 'address_line2', 'address_city', 'address_state',
                      'address_postal_code', 'address_country')
        }),
        ('Communication', {
            'fields': ('communication_language', 'communication_preferred')
        }),
        ('Care Team', {
            'fields': ('general_practitioner', 'managing_organization')
        }),
        ('Metadata', {
            'fields': ('last_updated', 'version_id'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    list_display = ['identifier', 'patient', 'status', 'class_code', 'type_display', 'period_start']
    list_filter = ['status', 'class_code', 'type_code', 'service_type_code']
    search_fields = ['identifier', 'patient__name_family', 'patient__identifier_mrn']
    readonly_fields = ['id', 'last_updated', 'version_id']
    date_hierarchy = 'period_start'
    raw_id_fields = ['patient', 'service_provider']


@admin.register(Condition)
class ConditionAdmin(admin.ModelAdmin):
    list_display = ['code_display', 'patient', 'clinical_status', 'verification_status', 'recorded_date']
    list_filter = ['clinical_status', 'verification_status', 'severity_code', 'category_code']
    search_fields = ['code_code', 'code_display', 'patient__name_family', 'patient__identifier_mrn']
    readonly_fields = ['id', 'last_updated', 'version_id']
    date_hierarchy = 'recorded_date'
    raw_id_fields = ['patient', 'encounter', 'recorder', 'asserter']


@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = ['code_display', 'patient', 'status', 'effective_datetime', 'value_quantity_value']
    list_filter = ['status', 'category_code', 'code_code']
    search_fields = ['code_code', 'code_display', 'patient__name_family', 'patient__identifier_mrn']
    readonly_fields = ['id', 'last_updated', 'version_id']
    date_hierarchy = 'effective_datetime'
    raw_id_fields = ['patient', 'encounter', 'performer']

    fieldsets = (
        ('Identification', {
            'fields': ('id', 'identifier', 'status')
        }),
        ('Category & Code', {
            'fields': ('category_code', 'category_display', 'code_system', 'code_code', 'code_display')
        }),
        ('Subject & Context', {
            'fields': ('patient', 'encounter', 'performer')
        }),
        ('Timing', {
            'fields': ('effective_datetime', 'issued')
        }),
        ('Value - Quantity', {
            'fields': ('value_quantity_value', 'value_quantity_unit', 'value_quantity_system', 'value_quantity_code')
        }),
        ('Value - Other', {
            'fields': ('value_string', 'value_boolean', 'value_codeable_concept_code', 'value_codeable_concept_display')
        }),
        ('Interpretation & Reference', {
            'fields': ('interpretation_code', 'interpretation_display', 'reference_range_low',
                      'reference_range_high', 'reference_range_text')
        }),
        ('Additional', {
            'fields': ('body_site_code', 'body_site_display', 'method_code', 'method_display', 'note')
        }),
        ('Metadata', {
            'fields': ('last_updated', 'version_id'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MedicationRequest)
class MedicationRequestAdmin(admin.ModelAdmin):
    list_display = ['medication_display', 'patient', 'status', 'intent', 'authored_on']
    list_filter = ['status', 'intent', 'priority', 'category_code']
    search_fields = ['medication_code', 'medication_display', 'patient__name_family', 'patient__identifier_mrn']
    readonly_fields = ['id', 'last_updated', 'version_id']
    date_hierarchy = 'authored_on'
    raw_id_fields = ['patient', 'encounter', 'requester', 'recorder']


@admin.register(AllergyIntolerance)
class AllergyIntoleranceAdmin(admin.ModelAdmin):
    list_display = ['code_display', 'patient', 'clinical_status', 'type', 'criticality']
    list_filter = ['clinical_status', 'verification_status', 'type', 'category', 'criticality']
    search_fields = ['code_code', 'code_display', 'patient__name_family', 'patient__identifier_mrn']
    readonly_fields = ['id', 'last_updated', 'version_id']
    raw_id_fields = ['patient', 'encounter', 'recorder', 'asserter']


@admin.register(Procedure)
class ProcedureAdmin(admin.ModelAdmin):
    list_display = ['code_display', 'patient', 'status', 'performed_datetime']
    list_filter = ['status', 'category_code', 'code_code']
    search_fields = ['code_code', 'code_display', 'patient__name_family', 'patient__identifier_mrn']
    readonly_fields = ['id', 'last_updated', 'version_id']
    date_hierarchy = 'performed_datetime'
    raw_id_fields = ['patient', 'encounter', 'recorder', 'asserter', 'performer', 'location']


@admin.register(Immunization)
class ImmunizationAdmin(admin.ModelAdmin):
    list_display = ['vaccine_code_display', 'patient', 'status', 'occurrence_datetime', 'dose_number']
    list_filter = ['status', 'vaccine_code_code', 'primary_source']
    search_fields = ['vaccine_code_code', 'vaccine_code_display', 'patient__name_family', 'patient__identifier_mrn']
    readonly_fields = ['id', 'last_updated', 'version_id']
    date_hierarchy = 'occurrence_datetime'
    raw_id_fields = ['patient', 'encounter', 'performer', 'location', 'manufacturer']


@admin.register(DiagnosticReport)
class DiagnosticReportAdmin(admin.ModelAdmin):
    list_display = ['code_display', 'patient', 'status', 'effective_datetime', 'issued']
    list_filter = ['status', 'category_code', 'code_code']
    search_fields = ['code_code', 'code_display', 'patient__name_family', 'patient__identifier_mrn']
    readonly_fields = ['id', 'last_updated', 'version_id']
    date_hierarchy = 'effective_datetime'
    raw_id_fields = ['patient', 'encounter']


@admin.register(CarePlan)
class CarePlanAdmin(admin.ModelAdmin):
    list_display = ['title', 'patient', 'status', 'intent', 'period_start']
    list_filter = ['status', 'intent', 'category_code']
    search_fields = ['title', 'description', 'patient__name_family', 'patient__identifier_mrn']
    readonly_fields = ['id', 'last_updated', 'version_id']
    date_hierarchy = 'period_start'
    raw_id_fields = ['patient', 'encounter', 'author']
