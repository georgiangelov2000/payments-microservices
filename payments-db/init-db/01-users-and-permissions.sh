#!/bin/bash
set -e

echo "Creating database users and permissions..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL

-- =====================================
-- USERS
-- =====================================

DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_RW_USER}') THEN
        CREATE USER ${DB_RW_USER} WITH PASSWORD '${DB_RW_PASSWORD}';
    END IF;
END
\$\$;

-- =====================================
-- DATABASE ACCESS
-- =====================================

GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${DB_RW_USER};

-- =====================================
-- SCHEMA ACCESS
-- =====================================

-- READ + WRITE USER (NEEDED FOR MIGRATIONS)
GRANT USAGE, CREATE ON SCHEMA public TO ${DB_RW_USER};

-- =====================================
-- TABLE PERMISSIONS
-- =====================================

-- READ + WRITE (NO DELETE)
GRANT SELECT, INSERT, UPDATE
ON ALL TABLES IN SCHEMA public
TO ${DB_RW_USER};

-- =====================================
-- SEQUENCES (BIGSERIAL / IDENTITY)
-- =====================================

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO ${DB_RW_USER};

-- =====================================
-- DEFAULT PRIVILEGES (FUTURE OBJECTS)
-- =====================================


ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE ON TABLES TO ${DB_RW_USER};

-- Sequences created later
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO ${DB_RW_USER};

EOSQL

echo "Database users and permissions created successfully."
