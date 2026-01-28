"""Patient serializers"""
from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Patient
        fields = '__all__'


class PatientSummarySerializer(serializers.ModelSerializer):
    conditions_count = serializers.SerializerMethodField()
    medications_count = serializers.SerializerMethodField()
    allergies_count = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = ['id', 'first', 'last', 'birthdate', 'gender', 'city', 'state',
                  'conditions_count', 'medications_count', 'allergies_count']

    def get_conditions_count(self, obj):
        return obj.conditions.count()

    def get_medications_count(self, obj):
        return obj.medications.count()

    def get_allergies_count(self, obj):
        return obj.allergies.count()
