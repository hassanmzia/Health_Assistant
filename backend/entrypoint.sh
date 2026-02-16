#!/bin/sh
set -e

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Starting gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 4 --threads 2 healthcare_api.wsgi:application
