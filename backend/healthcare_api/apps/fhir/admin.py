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
    search_fields = ['name', 'identifier', 'address_city']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']


@admin.register(Practitioner)
class PractitionerAdmin(admin.ModelAdmin):
    list_display = ['name_family', 'name_given', 'identifier_npi', 'qualification_code', 'active']
    list_filter = ['active', 'qualification_code', 'gender']
    search_fields = ['name_family', 'name_given', 'identifier_npi']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['identifier_mrn', 'name_family', 'name_given', 'birth_date', 'gender', 'active']
    list_filter = ['active', 'gender', 'address_state', 'marital_status_code']
    search_fields = ['identifier_mrn', 'name_family', 'name_given', 'telecom_email']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']
    date_hierarchy = 'birth_date'

    fieldsets = (
        ('Identification', {
            'fields': ('id', 'identifier_mrn', 'identifier_ssn', 'active')
        }),
        ('Name', {
            'fields': ('name_given', 'name_family', 'name_prefix', 'name_suffix')
        }),
        ('Demographics', {
            'fields': ('gender', 'birth_date', 'deceased_boolean', 'deceased_date_time', 'marital_status_code')
        }),
        ('Contact', {
            'fields': ('telecom_phone_home', 'telecom_phone_mobile', 'telecom_email')
        }),
        ('Address', {
            'fields': ('address_line', 'address_city', 'address_state',
                      'address_postal_code', 'address_country')
        }),
        ('Communication', {
            'fields': ('communication_language_code', 'communication_preferred')
        }),
        ('Care Team', {
            'fields': ('general_practitioner', 'managing_organization')
        }),
        ('Metadata', {
            'fields': ('meta_last_updated', 'meta_version_id'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    list_display = ['identifier', 'subject', 'status', 'class_code', 'type_display', 'period_start']
    list_filter = ['status', 'class_code', 'type_code', 'service_type_code']
    search_fields = ['identifier', 'subject__name_family', 'subject__identifier_mrn']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']
    date_hierarchy = 'period_start'
    raw_id_fields = ['subject', 'service_provider', 'participant_practitioner']


@admin.register(Condition)
class ConditionAdmin(admin.ModelAdmin):
    list_display = ['code_display', 'subject', 'clinical_status_code', 'verification_status_code', 'recorded_date']
    list_filter = ['clinical_status_code', 'verification_status_code', 'severity_code', 'category_code']
    search_fields = ['code_code', 'code_display', 'subject__name_family', 'subject__identifier_mrn']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']
    date_hierarchy = 'recorded_date'
    raw_id_fields = ['subject', 'encounter', 'recorder']


@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = ['code_display', 'subject', 'status', 'effective_date_time', 'value_quantity_value']
    list_filter = ['status', 'category_code', 'code_code']
    search_fields = ['code_code', 'code_display', 'subject__name_family', 'subject__identifier_mrn']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']
    date_hierarchy = 'effective_date_time'
    raw_id_fields = ['subject', 'encounter', 'performer']

    fieldsets = (
        ('Identification', {
            'fields': ('id', 'identifier', 'status')
        }),
        ('Category & Code', {
            'fields': ('category_code', 'category_display', 'code_system', 'code_code', 'code_display')
        }),
        ('Subject & Context', {
            'fields': ('subject', 'encounter', 'performer')
        }),
        ('Timing', {
            'fields': ('effective_date_time', 'issued')
        }),
        ('Value - Quantity', {
            'fields': ('value_quantity_value', 'value_quantity_unit', 'value_quantity_system', 'value_quantity_code')
        }),
        ('Value - Other', {
            'fields': ('value_string', 'value_boolean', 'value_codeable_concept_code', 'value_codeable_concept_display')
        }),
        ('Interpretation & Reference', {
            'fields': ('interpretation_code', 'interpretation_display', 'reference_range_low_value',
                      'reference_range_high_value', 'reference_range_text')
        }),
        ('Additional', {
            'fields': ('note',)
        }),
        ('Metadata', {
            'fields': ('meta_last_updated', 'meta_version_id'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MedicationRequest)
class MedicationRequestAdmin(admin.ModelAdmin):
    list_display = ['medication_codeable_concept_display', 'subject', 'status', 'intent', 'authored_on']
    list_filter = ['status', 'intent', 'priority', 'category_code']
    search_fields = ['medication_codeable_concept_code', 'medication_codeable_concept_display', 'subject__name_family', 'subject__identifier_mrn']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']
    date_hierarchy = 'authored_on'
    raw_id_fields = ['subject', 'encounter', 'requester']


@admin.register(AllergyIntolerance)
class AllergyIntoleranceAdmin(admin.ModelAdmin):
    list_display = ['code_display', 'patient', 'clinical_status_code', 'type', 'criticality']
    list_filter = ['clinical_status_code', 'verification_status_code', 'type', 'category', 'criticality']
    search_fields = ['code_code', 'code_display', 'patient__name_family', 'patient__identifier_mrn']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']
    raw_id_fields = ['patient', 'encounter', 'recorder']


@admin.register(Procedure)
class ProcedureAdmin(admin.ModelAdmin):
    list_display = ['code_display', 'subject', 'status', 'performed_date_time']
    list_filter = ['status', 'category_code', 'code_code']
    search_fields = ['code_code', 'code_display', 'subject__name_family', 'subject__identifier_mrn']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']
    date_hierarchy = 'performed_date_time'
    raw_id_fields = ['subject', 'encounter', 'performer', 'performer_organization']


@admin.register(Immunization)
class ImmunizationAdmin(admin.ModelAdmin):
    list_display = ['vaccine_code_display', 'patient', 'status', 'occurrence_date_time']
    list_filter = ['status', 'vaccine_code_code', 'primary_source']
    search_fields = ['vaccine_code_code', 'vaccine_code_display', 'patient__name_family', 'patient__identifier_mrn']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']
    date_hierarchy = 'occurrence_date_time'
    raw_id_fields = ['patient', 'encounter', 'performer', 'performer_organization']


@admin.register(DiagnosticReport)
class DiagnosticReportAdmin(admin.ModelAdmin):
    list_display = ['code_display', 'subject', 'status', 'effective_date_time', 'issued']
    list_filter = ['status', 'category_code', 'code_code']
    search_fields = ['code_code', 'code_display', 'subject__name_family', 'subject__identifier_mrn']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']
    date_hierarchy = 'effective_date_time'
    raw_id_fields = ['subject', 'encounter', 'performer', 'performer_organization']


@admin.register(CarePlan)
class CarePlanAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'status', 'intent', 'period_start']
    list_filter = ['status', 'intent', 'category_code']
    search_fields = ['title', 'description', 'subject__name_family', 'subject__identifier_mrn']
    readonly_fields = ['id', 'meta_last_updated', 'meta_version_id']
    date_hierarchy = 'period_start'
    raw_id_fields = ['subject', 'encounter', 'author']
