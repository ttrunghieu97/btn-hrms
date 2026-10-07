#!/bin/sh
# GlitchTip auto-init — runs once on first start
set -e

echo "=== GlitchTip Init ==="

cd /code

# Run migrations
python manage.py migrate --noinput 2>&1 || true

# Determine admin credentials safely
ADMIN_EMAIL="${GLITCHTIP_ADMIN_EMAIL:-admin@btn-hrms.local}"
if [ -z "$GLITCHTIP_ADMIN_PASSWORD" ]; then
    GLITCHTIP_ADMIN_PASSWORD=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 24)
    echo "NOTICE: Generated random password for GlitchTip superuser ($ADMIN_EMAIL): $GLITCHTIP_ADMIN_PASSWORD"
fi
export GLITCHTIP_ADMIN_PASSWORD
export GLITCHTIP_ADMIN_EMAIL="$ADMIN_EMAIL"

# Create admin user if not exists
python manage.py shell -c "
import os
from django.contrib.auth import get_user_model
User = get_user_model()
email = os.environ.get('GLITCHTIP_ADMIN_EMAIL', 'admin@btn-hrms.local')
password = os.environ.get('GLITCHTIP_ADMIN_PASSWORD')
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(email, email, password)
    print(f'Admin user {email} created successfully')
else:
    print(f'Admin user {email} already exists')
" 2>/dev/null

# Create org + team + project + DSN key
python manage.py shell -c "
import os
from apps.organizations_ext.models import Organization, OrganizationUser, OrganizationOwner
from apps.teams.models import Team
from apps.projects.models import Project, ProjectKey
from django.contrib.auth import get_user_model

email = os.environ.get('GLITCHTIP_ADMIN_EMAIL', 'admin@btn-hrms.local')
User = get_user_model()
admin = User.objects.filter(email=email).first()

org, _ = Organization.objects.get_or_create(slug='btn-hrms', defaults={'name': 'BTN HRMS'})

if admin and not OrganizationUser.objects.filter(organization=org, user=admin).exists():
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
