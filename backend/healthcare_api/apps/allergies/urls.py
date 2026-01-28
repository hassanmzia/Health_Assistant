"""Allergies URLs"""
from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Allergy


@api_view(['GET'])
def list_allergies(request):
    patient_id = request.query_params.get('patient')
    queryset = Allergy.objects.all()
    if patient_id:
        queryset = queryset.filter(patient_id=patient_id)
    data = list(queryset[:100].values())
    return Response(data)


urlpatterns = [
    path('', list_allergies, name='list_allergies'),
]
