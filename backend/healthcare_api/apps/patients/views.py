"""Patient views"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Patient
from .serializers import PatientSerializer, PatientSummarySerializer


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['gender', 'city', 'state', 'race', 'ethnicity']
    search_fields = ['first', 'last', 'city']
    ordering_fields = ['last', 'first', 'birthdate']

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientSummarySerializer
        return PatientSerializer

    @action(detail=True, methods=['get'])
    def full_record(self, request, pk=None):
        """Get patient with all related records"""
        patient = self.get_object()
        data = PatientSerializer(patient).data
        data['conditions'] = list(patient.conditions.values())
        data['medications'] = list(patient.medications.values())
        data['allergies'] = list(patient.allergies.values())
        data['encounters'] = list(patient.encounters.values())
        return Response(data)

    @action(detail=False, methods=['get'])
    def search_by_name(self, request):
        """Search patients by first and last name"""
        first = request.query_params.get('first', '')
        last = request.query_params.get('last', '')
        queryset = self.queryset
        if first:
            queryset = queryset.filter(first__icontains=first)
        if last:
            queryset = queryset.filter(last__icontains=last)
        serializer = PatientSummarySerializer(queryset[:100], many=True)
        return Response(serializer.data)
