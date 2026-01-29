"""
FHIR R4 API Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import (
    Organization, Practitioner, Patient, Encounter, Condition,
    Observation, MedicationRequest, AllergyIntolerance, Procedure,
    Immunization, DiagnosticReport, CarePlan
)
from .serializers import (
    OrganizationSerializer, OrganizationSummarySerializer,
    PractitionerSerializer, PractitionerSummarySerializer,
    PatientSerializer, PatientSummarySerializer, PatientFullRecordSerializer,
    EncounterSerializer, EncounterSummarySerializer,
    ConditionSerializer, ConditionSummarySerializer,
    ObservationSerializer, ObservationSummarySerializer,
    MedicationRequestSerializer, MedicationRequestSummarySerializer,
    AllergyIntoleranceSerializer, AllergyIntoleranceSummarySerializer,
    ProcedureSerializer, ProcedureSummarySerializer,
    ImmunizationSerializer, ImmunizationSummarySerializer,
    DiagnosticReportSerializer, DiagnosticReportSummarySerializer,
    CarePlanSerializer, CarePlanSummarySerializer,
)


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['active', 'type_code', 'address_state']
    search_fields = ['name', 'identifier', 'address_city']
    ordering_fields = ['name', 'address_city']

    def get_serializer_class(self):
        if self.action == 'list':
            return OrganizationSummarySerializer
        return OrganizationSerializer


class PractitionerViewSet(viewsets.ModelViewSet):
    queryset = Practitioner.objects.select_related('organization').all()
    serializer_class = PractitionerSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['active', 'gender', 'qualification_code', 'specialty_code']
    search_fields = ['name_given', 'name_family', 'identifier_npi']
    ordering_fields = ['name_family', 'name_given']

    def get_serializer_class(self):
        if self.action == 'list':
            return PractitionerSummarySerializer
        return PractitionerSerializer


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.select_related(
        'general_practitioner', 'managing_organization'
    ).all()
    serializer_class = PatientSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['active', 'gender', 'address_state', 'marital_status_code', 'deceased_boolean']
    search_fields = ['name_given', 'name_family', 'identifier_mrn', 'telecom_email']
    ordering_fields = ['name_family', 'name_given', 'birth_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientSummarySerializer
        if self.action == 'full_record':
            return PatientFullRecordSerializer
        return PatientSerializer

    @action(detail=True, methods=['get'])
    def full_record(self, request, pk=None):
        """Get patient with all clinical records"""
        patient = self.get_object()
        # Prefetch related data
        patient = Patient.objects.prefetch_related(
            'conditions', 'observations', 'medication_requests',
            'allergy_intolerances', 'procedures', 'immunizations',
            'encounters', 'care_plans'
        ).select_related(
            'general_practitioner', 'managing_organization'
        ).get(pk=patient.pk)
        serializer = PatientFullRecordSerializer(patient)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """Get patient clinical timeline"""
        patient = self.get_object()
        timeline = []

        # Add encounters
        for enc in patient.encounters.order_by('-period_start')[:20]:
            timeline.append({
                'type': 'encounter',
                'date': enc.period_start,
                'title': f"{enc.class_display} - {enc.type_display or 'Visit'}",
                'description': enc.reason_display,
                'status': enc.status,
                'id': str(enc.id),
            })

        # Add conditions
        for cond in patient.conditions.order_by('-onset_date_time')[:20]:
            timeline.append({
                'type': 'condition',
                'date': cond.onset_date_time or cond.recorded_date,
                'title': cond.code_display,
                'description': f"Status: {cond.clinical_status_code}",
                'status': cond.clinical_status_code,
                'id': str(cond.id),
            })

        # Add procedures
        for proc in patient.procedures.order_by('-performed_date_time')[:20]:
            timeline.append({
                'type': 'procedure',
                'date': proc.performed_date_time,
                'title': proc.code_display,
                'description': proc.outcome_display,
                'status': proc.status,
                'id': str(proc.id),
            })

        # Add immunizations
        for imm in patient.immunizations.order_by('-occurrence_date_time')[:20]:
            timeline.append({
                'type': 'immunization',
                'date': imm.occurrence_date_time,
                'title': imm.vaccine_code_display,
                'description': f"Lot: {imm.lot_number or 'N/A'}",
                'status': imm.status,
                'id': str(imm.id),
            })

        # Sort by date descending
        timeline.sort(key=lambda x: x['date'] if x['date'] else timezone.now(), reverse=True)

        return Response(timeline[:50])

    @action(detail=True, methods=['get'])
    def vitals(self, request, pk=None):
        """Get patient vital signs history"""
        patient = self.get_object()
        vitals = patient.observations.filter(
            category_code='vital-signs'
        ).order_by('-effective_date_time')[:100]
        return Response(ObservationSummarySerializer(vitals, many=True).data)

    @action(detail=True, methods=['get'])
    def labs(self, request, pk=None):
        """Get patient laboratory results"""
        patient = self.get_object()
        labs = patient.observations.filter(
            category_code='laboratory'
        ).order_by('-effective_date_time')[:100]
        return Response(ObservationSummarySerializer(labs, many=True).data)


class EncounterViewSet(viewsets.ModelViewSet):
    queryset = Encounter.objects.select_related(
        'subject', 'participant_practitioner', 'service_provider'
    ).all()
    serializer_class = EncounterSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'class_code', 'type_code']
    search_fields = ['identifier', 'subject__name_family', 'subject__identifier_mrn']
    ordering_fields = ['period_start', 'period_end']
    ordering = ['-period_start']

    def get_serializer_class(self):
        if self.action == 'list':
            return EncounterSummarySerializer
        return EncounterSerializer


class ConditionViewSet(viewsets.ModelViewSet):
    queryset = Condition.objects.select_related('subject', 'encounter', 'recorder').all()
    serializer_class = ConditionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['clinical_status_code', 'verification_status_code', 'category_code']
    search_fields = ['code_code', 'code_display', 'subject__name_family', 'subject__identifier_mrn']
    ordering_fields = ['onset_date_time', 'recorded_date']
    ordering = ['-recorded_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return ConditionSummarySerializer
        return ConditionSerializer


class ObservationViewSet(viewsets.ModelViewSet):
    queryset = Observation.objects.select_related('subject', 'encounter', 'performer').all()
    serializer_class = ObservationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'category_code', 'interpretation_code']
    search_fields = ['code_code', 'code_display', 'subject__name_family', 'subject__identifier_mrn']
    ordering_fields = ['effective_date_time', 'issued']
    ordering = ['-effective_date_time']

    def get_serializer_class(self):
        if self.action == 'list':
            return ObservationSummarySerializer
        return ObservationSerializer


class MedicationRequestViewSet(viewsets.ModelViewSet):
    queryset = MedicationRequest.objects.select_related('subject', 'encounter', 'requester').all()
    serializer_class = MedicationRequestSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'intent', 'priority', 'category_code']
    search_fields = ['medication_codeable_concept_code', 'medication_codeable_concept_display',
                     'subject__name_family', 'subject__identifier_mrn']
    ordering_fields = ['authored_on']
    ordering = ['-authored_on']

    def get_serializer_class(self):
        if self.action == 'list':
            return MedicationRequestSummarySerializer
        return MedicationRequestSerializer


class AllergyIntoleranceViewSet(viewsets.ModelViewSet):
    queryset = AllergyIntolerance.objects.select_related('patient', 'encounter', 'recorder').all()
    serializer_class = AllergyIntoleranceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['clinical_status_code', 'type', 'category', 'criticality']
    search_fields = ['code_code', 'code_display', 'patient__name_family', 'patient__identifier_mrn']
    ordering_fields = ['recorded_date']
    ordering = ['-recorded_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return AllergyIntoleranceSummarySerializer
        return AllergyIntoleranceSerializer


class ProcedureViewSet(viewsets.ModelViewSet):
    queryset = Procedure.objects.select_related('subject', 'encounter', 'performer').all()
    serializer_class = ProcedureSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'category_code']
    search_fields = ['code_code', 'code_display', 'subject__name_family', 'subject__identifier_mrn']
    ordering_fields = ['performed_date_time']
    ordering = ['-performed_date_time']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProcedureSummarySerializer
        return ProcedureSerializer


class ImmunizationViewSet(viewsets.ModelViewSet):
    queryset = Immunization.objects.select_related('patient', 'encounter', 'performer').all()
    serializer_class = ImmunizationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'vaccine_code_code', 'primary_source']
    search_fields = ['vaccine_code_code', 'vaccine_code_display', 'patient__name_family',
                     'patient__identifier_mrn']
    ordering_fields = ['occurrence_date_time']
    ordering = ['-occurrence_date_time']

    def get_serializer_class(self):
        if self.action == 'list':
            return ImmunizationSummarySerializer
        return ImmunizationSerializer


class DiagnosticReportViewSet(viewsets.ModelViewSet):
    queryset = DiagnosticReport.objects.select_related('subject', 'encounter', 'performer').all()
    serializer_class = DiagnosticReportSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'category_code']
    search_fields = ['code_code', 'code_display', 'subject__name_family', 'subject__identifier_mrn']
    ordering_fields = ['effective_date_time', 'issued']
    ordering = ['-effective_date_time']

    def get_serializer_class(self):
        if self.action == 'list':
            return DiagnosticReportSummarySerializer
        return DiagnosticReportSerializer


class CarePlanViewSet(viewsets.ModelViewSet):
    queryset = CarePlan.objects.select_related('subject', 'encounter', 'author').all()
    serializer_class = CarePlanSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'intent', 'category_code']
    search_fields = ['title', 'description', 'subject__name_family', 'subject__identifier_mrn']
    ordering_fields = ['period_start', 'created']
    ordering = ['-created']

    def get_serializer_class(self):
        if self.action == 'list':
            return CarePlanSummarySerializer
        return CarePlanSerializer


@api_view(['GET'])
def fhir_statistics(request):
    """Get comprehensive FHIR database statistics"""
    stats = {
        'counts': {
            'patients': Patient.objects.count(),
            'active_patients': Patient.objects.filter(active=True, deceased_boolean=False).count(),
            'practitioners': Practitioner.objects.filter(active=True).count(),
            'organizations': Organization.objects.filter(active=True).count(),
            'encounters': Encounter.objects.count(),
            'conditions': Condition.objects.count(),
            'active_conditions': Condition.objects.filter(clinical_status_code='active').count(),
            'observations': Observation.objects.count(),
            'medications': MedicationRequest.objects.count(),
            'active_medications': MedicationRequest.objects.filter(status='active').count(),
            'allergies': AllergyIntolerance.objects.count(),
            'procedures': Procedure.objects.count(),
            'immunizations': Immunization.objects.count(),
        },
        'demographics': {
            'gender_distribution': list(
                Patient.objects.filter(active=True)
                .values('gender')
                .annotate(count=Count('id'))
                .order_by('gender')
            ),
            'age_groups': _get_age_groups(),
        },
        'clinical': {
            'top_conditions': list(
                Condition.objects.filter(clinical_status_code='active')
                .values('code_display')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            ),
            'top_medications': list(
                MedicationRequest.objects.filter(status='active')
                .values('medication_codeable_concept_display')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            ),
            'encounter_types': list(
                Encounter.objects.values('class_display')
                .annotate(count=Count('id'))
                .order_by('-count')
            ),
            'observation_categories': list(
                Observation.objects.values('category_display')
                .annotate(count=Count('id'))
                .order_by('-count')
            ),
        },
        'recent_activity': {
            'encounters_last_30_days': Encounter.objects.filter(
                period_start__gte=timezone.now() - timedelta(days=30)
            ).count(),
            'observations_last_30_days': Observation.objects.filter(
                effective_date_time__gte=timezone.now() - timedelta(days=30)
            ).count(),
        }
    }
    return Response(stats)


def _get_age_groups():
    """Calculate patient age distribution"""
    from django.db.models.functions import ExtractYear
    from django.db.models import F, Case, When, Value, CharField

    today = timezone.now().date()

    age_ranges = Patient.objects.filter(active=True, birth_date__isnull=False).annotate(
        age_group=Case(
            When(birth_date__gte=today - timedelta(days=18*365), then=Value('0-17 (Pediatric)')),
            When(birth_date__gte=today - timedelta(days=40*365), then=Value('18-39 (Young Adult)')),
            When(birth_date__gte=today - timedelta(days=65*365), then=Value('40-64 (Middle Age)')),
            default=Value('65+ (Senior)'),
            output_field=CharField()
        )
    ).values('age_group').annotate(count=Count('id')).order_by('age_group')

    return list(age_ranges)
