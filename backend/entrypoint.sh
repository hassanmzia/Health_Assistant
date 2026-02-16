#!/bin/sh
set -e

echo "Creating migrations for all apps..."
python manage.py makemigrations accounts patients conditions medications allergies encounters audit agents hitl fhir --noinput

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Checking if FHIR data needs to be generated..."
python manage.py shell -c "
from healthcare_api.apps.fhir.models import Patient
count = Patient.objects.count()
print(f'Current patient count: {count}')
if count == 0:
    print('NO_DATA')
else:
    print('HAS_DATA')
" 2>/dev/null | grep -q "NO_DATA" && {
    echo "No FHIR data found. Generating sample data..."
    python manage.py generate_fhir_data --patients 100 --practitioners 20 --organizations 5
    echo "FHIR data generation complete."
} || {
    echo "FHIR data already exists. Skipping generation."
}

echo "Starting gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 4 --threads 2 healthcare_api.wsgi:application
