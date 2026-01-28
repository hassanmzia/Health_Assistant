from django.apps import AppConfig

class PatientsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'healthcare_api.apps.patients'
    label = 'patients'
