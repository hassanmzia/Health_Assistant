"""Healthcare API URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from healthcare_api.apps.agents.urls import observability_urlpatterns


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'healthy', 'service': 'healthcare-api'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/auth/', include('healthcare_api.apps.accounts.urls')),
    path('api/patients/', include('healthcare_api.apps.patients.urls')),
    path('api/conditions/', include('healthcare_api.apps.conditions.urls')),
    path('api/medications/', include('healthcare_api.apps.medications.urls')),
    path('api/allergies/', include('healthcare_api.apps.allergies.urls')),
    path('api/encounters/', include('healthcare_api.apps.encounters.urls')),
    path('api/audit/', include('healthcare_api.apps.audit.urls')),
    path('api/agents/', include('healthcare_api.apps.agents.urls')),
    path('api/hitl/', include('healthcare_api.apps.hitl.urls')),
    path('api/observability/', include(observability_urlpatterns)),
    path('api/fhir/', include('healthcare_api.apps.fhir.urls')),
]
