#!/bin/bash
set -e

# Creates additional databases required by infra services (e.g. GlitchTip)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE glitchtip'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'glitchtip')\gexec
EOSQL
