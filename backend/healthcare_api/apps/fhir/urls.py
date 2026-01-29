"""
FHIR R4 API URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrganizationViewSet, PractitionerViewSet, PatientViewSet,
    EncounterViewSet, ConditionViewSet, ObservationViewSet,
    MedicationRequestViewSet, AllergyIntoleranceViewSet,
    ProcedureViewSet, ImmunizationViewSet, DiagnosticReportViewSet,
    CarePlanViewSet, fhir_statistics
)

router = DefaultRouter()
router.register('organizations', OrganizationViewSet, basename='fhir-organization')
router.register('practitioners', PractitionerViewSet, basename='fhir-practitioner')
router.register('patients', PatientViewSet, basename='fhir-patient')
router.register('encounters', EncounterViewSet, basename='fhir-encounter')
router.register('conditions', ConditionViewSet, basename='fhir-condition')
router.register('observations', ObservationViewSet, basename='fhir-observation')
router.register('medication-requests', MedicationRequestViewSet, basename='fhir-medication-request')
router.register('allergy-intolerances', AllergyIntoleranceViewSet, basename='fhir-allergy-intolerance')
router.register('procedures', ProcedureViewSet, basename='fhir-procedure')
router.register('immunizations', ImmunizationViewSet, basename='fhir-immunization')
router.register('diagnostic-reports', DiagnosticReportViewSet, basename='fhir-diagnostic-report')
router.register('care-plans', CarePlanViewSet, basename='fhir-care-plan')

urlpatterns = [
    path('', include(router.urls)),
    path('statistics/', fhir_statistics, name='fhir-statistics'),
]
