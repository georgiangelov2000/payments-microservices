-- =====================================
-- USERS (VARIABLE-DRIVEN)
-- =====================================

CREATE USER :"DB_READ_USER"
WITH PASSWORD :'DB_READ_PASSWORD';

CREATE USER :"DB_RW_USER"
WITH PASSWORD :'DB_RW_PASSWORD';


-- =====================================
-- DATABASE ACCESS
-- =====================================

GRANT CONNECT ON DATABASE :"POSTGRES_DB" TO :"DB_READ_USER";
GRANT CONNECT ON DATABASE :"POSTGRES_DB" TO :"DB_RW_USER";


-- =====================================
-- SCHEMA ACCESS
-- =====================================

GRANT USAGE ON SCHEMA public TO :"DB_READ_USER";
GRANT USAGE ON SCHEMA public TO :"DB_RW_USER";


-- =====================================
-- TABLE PERMISSIONS
-- =====================================

-- READ ONLY
GRANT SELECT
ON ALL TABLES IN SCHEMA public
TO :"DB_READ_USER";

-- READ + WRITE (NO DELETE)
GRANT SELECT, INSERT, UPDATE
ON ALL TABLES IN SCHEMA public
TO :"DB_RW_USER";


-- =====================================
-- SEQUENCES (REQUIRED FOR BIGSERIAL)
-- =====================================

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO :"DB_RW_USER";


-- =====================================
-- DEFAULT PRIVILEGES (FUTURE OBJECTS)
-- =====================================

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO :"DB_READ_USER";

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE ON TABLES TO :"DB_RW_USER";

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO :"DB_RW_USER";
