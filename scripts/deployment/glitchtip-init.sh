#!/bin/sh
# GlitchTip auto-init — runs once on first start
set -e

echo "=== GlitchTip Init ==="

cd /code

# Run migrations
python manage.py migrate --noinput 2>&1 || true

# Create admin user if not exists
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@btn-hrms.local').exists():
    User.objects.create_superuser('admin@btn-hrms.local', 'admin@btn-hrms.local', 'admin123')
    print('Admin created')
else:
    print('Admin exists')
" 2>/dev/null

# Create org + team + project + DSN key
python manage.py shell -c "
from apps.organizations_ext.models import Organization, OrganizationUser, OrganizationOwner
from apps.teams.models import Team
from apps.projects.models import Project, ProjectKey
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(email='admin@btn-hrms.local').first()

org, _ = Organization.objects.get_or_create(slug='btn-hrms', defaults={'name': 'BTN HRMS'})

if not OrganizationUser.objects.filter(organization=org, user=admin).exists():
    ou = OrganizationUser.objects.create(organization=org, user=admin, role=50)
    OrganizationOwner.objects.get_or_create(organization=org, organization_user=ou)
    print('OrgUser + Owner created')

team, _ = Team.objects.get_or_create(organization=org, slug='btn-hrms')
proj, _ = Project.objects.get_or_create(organization=org, slug='btn-hrms-web',
    defaults={'name': 'btn-hrms-web', 'platform': 'javascript'})
key, _ = ProjectKey.objects.get_or_create(project=proj)
print(f'DSN: {key.dsn()}')
" 2>/dev/null

echo "=== GlitchTip Init Complete ==="
