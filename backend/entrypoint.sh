#!/bin/sh
set -e

echo "Creating migrations for all apps..."
python manage.py makemigrations accounts patients conditions medications allergies encounters audit agents hitl fhir --noinput 2>&1 || echo "Warning: makemigrations had issues, continuing..."

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Checking if FHIR data needs to be generated..."
FHIR_COUNT=$(python manage.py shell -c "
try:
    from healthcare_api.apps.fhir.models import Patient
    print(Patient.objects.count())
except Exception:
    print(0)
" 2>/dev/null | tail -1)

echo "FHIR patient count: $FHIR_COUNT"

if [ "$FHIR_COUNT" = "0" ] || [ -z "$FHIR_COUNT" ]; then
    echo "No FHIR data found. Generating sample data (100 patients)..."
    python manage.py generate_fhir_data --patients 100 --practitioners 20 --organizations 5
    echo "FHIR data generation complete."
else
    echo "FHIR data already exists ($FHIR_COUNT patients). Skipping generation."
fi

echo "Ensuring default admin account exists..."
python manage.py create_admin --username admin --email admin@health.local --password Admin123!

echo "Starting gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 4 --threads 2 healthcare_api.wsgi:application
