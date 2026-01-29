"""
FHIR R4 Serializers for REST API
"""
from rest_framework import serializers
from .models import (
    Organization, Practitioner, Patient, Encounter, Condition,
    Observation, MedicationRequest, AllergyIntolerance, Procedure,
    Immunization, DiagnosticReport, CarePlan
)


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'


class OrganizationSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'identifier', 'name', 'type_code', 'type_display',
                  'address_city', 'address_state', 'active']


class PractitionerSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Practitioner
        fields = '__all__'

    def get_full_name(self, obj):
        return str(obj)


class PractitionerSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Practitioner
        fields = ['id', 'identifier_npi', 'name_given', 'name_family', 'full_name',
                  'qualification_code', 'specialty_display', 'active']

    def get_full_name(self, obj):
        return str(obj)


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    general_practitioner_name = serializers.CharField(
        source='general_practitioner.full_name', read_only=True)
    managing_organization_name = serializers.CharField(
        source='managing_organization.name', read_only=True)

    class Meta:
        model = Patient
        fields = '__all__'

    def get_full_name(self, obj):
        return obj.full_name

    def get_age(self, obj):
        return obj.age


class PatientSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = ['id', 'identifier_mrn', 'name_given', 'name_family', 'full_name',
                  'gender', 'birth_date', 'age', 'address_city', 'address_state',
                  'telecom_email', 'active', 'deceased_boolean']

    def get_full_name(self, obj):
        return obj.full_name

    def get_age(self, obj):
        return obj.age


class EncounterSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='subject.full_name', read_only=True)
    patient_mrn = serializers.CharField(source='subject.identifier_mrn', read_only=True)
    practitioner_name = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='service_provider.name', read_only=True)

    class Meta:
        model = Encounter
        fields = '__all__'

    def get_practitioner_name(self, obj):
        if obj.participant_practitioner:
            return str(obj.participant_practitioner)
        return None


class EncounterSummarySerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='subject.full_name', read_only=True)

    class Meta:
        model = Encounter
        fields = ['id', 'identifier', 'status', 'class_code', 'class_display',
                  'type_display', 'period_start', 'period_end', 'patient_name',
                  'reason_display']


class ConditionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='subject.full_name', read_only=True)
    patient_mrn = serializers.CharField(source='subject.identifier_mrn', read_only=True)

    class Meta:
        model = Condition
        fields = '__all__'


class ConditionSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Condition
        fields = ['id', 'identifier', 'clinical_status_code', 'verification_status_code',
                  'category_code', 'code_code', 'code_display', 'severity_display',
                  'onset_date_time', 'recorded_date']


class ObservationSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='subject.full_name', read_only=True)
    patient_mrn = serializers.CharField(source='subject.identifier_mrn', read_only=True)
    display_value = serializers.SerializerMethodField()

    class Meta:
        model = Observation
        fields = '__all__'

    def get_display_value(self, obj):
        if obj.value_quantity_value is not None:
            return f"{obj.value_quantity_value} {obj.value_quantity_unit or ''}"
        if obj.value_string:
            return obj.value_string
        if obj.value_codeable_concept_display:
            return obj.value_codeable_concept_display
        return None


class ObservationSummarySerializer(serializers.ModelSerializer):
    display_value = serializers.SerializerMethodField()

    class Meta:
        model = Observation
        fields = ['id', 'identifier', 'status', 'category_code', 'category_display',
                  'code_code', 'code_display', 'display_value', 'interpretation_code',
                  'interpretation_display', 'effective_date_time']

    def get_display_value(self, obj):
        if obj.value_quantity_value is not None:
            return f"{obj.value_quantity_value} {obj.value_quantity_unit or ''}"
        if obj.value_string:
            return obj.value_string
        return None


class MedicationRequestSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='subject.full_name', read_only=True)
    patient_mrn = serializers.CharField(source='subject.identifier_mrn', read_only=True)
    requester_name = serializers.SerializerMethodField()

    class Meta:
        model = MedicationRequest
        fields = '__all__'

    def get_requester_name(self, obj):
        if obj.requester:
            return str(obj.requester)
        return None


class MedicationRequestSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationRequest
        fields = ['id', 'identifier', 'status', 'intent', 'medication_codeable_concept_code',
                  'medication_codeable_concept_display', 'dosage_text', 'authored_on']


class AllergyIntoleranceSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_mrn = serializers.CharField(source='patient.identifier_mrn', read_only=True)

    class Meta:
        model = AllergyIntolerance
        fields = '__all__'


class AllergyIntoleranceSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = AllergyIntolerance
        fields = ['id', 'identifier', 'clinical_status_code', 'type', 'category',
                  'criticality', 'code_code', 'code_display', 'reaction_severity']


class ProcedureSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='subject.full_name', read_only=True)
    patient_mrn = serializers.CharField(source='subject.identifier_mrn', read_only=True)

    class Meta:
        model = Procedure
        fields = '__all__'


class ProcedureSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Procedure
        fields = ['id', 'identifier', 'status', 'code_code', 'code_display',
                  'performed_date_time', 'body_site_display', 'outcome_display']


class ImmunizationSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_mrn = serializers.CharField(source='patient.identifier_mrn', read_only=True)

    class Meta:
        model = Immunization
        fields = '__all__'


class ImmunizationSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Immunization
        fields = ['id', 'identifier', 'status', 'vaccine_code_code', 'vaccine_code_display',
                  'occurrence_date_time', 'lot_number', 'site_display']


class DiagnosticReportSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='subject.full_name', read_only=True)
    patient_mrn = serializers.CharField(source='subject.identifier_mrn', read_only=True)

    class Meta:
        model = DiagnosticReport
        fields = '__all__'


class DiagnosticReportSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticReport
        fields = ['id', 'identifier', 'status', 'category_code', 'category_display',
                  'code_code', 'code_display', 'effective_date_time', 'issued']


class CarePlanSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='subject.full_name', read_only=True)
    patient_mrn = serializers.CharField(source='subject.identifier_mrn', read_only=True)

    class Meta:
        model = CarePlan
        fields = '__all__'


class CarePlanSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = CarePlan
        fields = ['id', 'identifier', 'status', 'intent', 'title', 'category_display',
                  'period_start', 'period_end']


# Comprehensive Patient Record Serializer
class PatientFullRecordSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    general_practitioner_name = serializers.CharField(
        source='general_practitioner.full_name', read_only=True)
    managing_organization_name = serializers.CharField(
        source='managing_organization.name', read_only=True)
    conditions = ConditionSummarySerializer(many=True, read_only=True)
    observations = serializers.SerializerMethodField()
    medication_requests = MedicationRequestSummarySerializer(many=True, read_only=True)
    allergy_intolerances = AllergyIntoleranceSummarySerializer(many=True, read_only=True)
    procedures = ProcedureSummarySerializer(many=True, read_only=True)
    immunizations = ImmunizationSummarySerializer(many=True, read_only=True)
    encounters = EncounterSummarySerializer(many=True, read_only=True)
    care_plans = CarePlanSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Patient
        fields = '__all__'

    def get_full_name(self, obj):
        return obj.full_name

    def get_age(self, obj):
        return obj.age

    def get_observations(self, obj):
        # Limit observations to most recent 50
        recent_obs = obj.observations.order_by('-effective_date_time')[:50]
        return ObservationSummarySerializer(recent_obs, many=True).data
