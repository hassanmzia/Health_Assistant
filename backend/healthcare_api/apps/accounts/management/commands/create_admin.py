from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from healthcare_api.apps.accounts.models import UserProfile


class Command(BaseCommand):
    help = 'Create an admin user or promote an existing user to admin'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin')
        parser.add_argument('--email', type=str, default='admin@health.local')
        parser.add_argument('--password', type=str, default='Admin123!')
        parser.add_argument('--promote', type=str, help='Promote existing username to admin')

    def handle(self, *args, **options):
        if options['promote']:
            try:
                user = User.objects.get(username=options['promote'])
            except User.DoesNotExist:
                self.stderr.write(f"User '{options['promote']}' not found.")
                return
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = 'admin'
            profile.save()
            self.stdout.write(self.style.SUCCESS(
                f"User '{user.username}' promoted to admin."
            ))
            return

        username = options['username']
        email = options['email']
        password = options['password']

        user, created = User.objects.get_or_create(
            username=username,
            defaults={'email': email},
        )
        if created:
            user.set_password(password)
            user.is_staff = True
            user.save()
            self.stdout.write(f"Created user '{username}'")
        else:
            self.stdout.write(f"User '{username}' already exists")

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = 'admin'
        profile.save()

        self.stdout.write(self.style.SUCCESS(
            f"Admin account ready: username='{username}', role='admin'"
        ))
