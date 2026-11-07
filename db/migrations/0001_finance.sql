-- Rahavahti schema v0001: development branch only.
-- No real personal financial data until G1/G2 pass.
BEGIN;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE TABLE IF NOT EXISTS finance.accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL,
 name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id,id)
);
CREATE TABLE IF NOT EXISTS finance.import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL,
 account_id uuid NOT NULL,
 file_sha256 text NOT NULL CHECK (file_sha256 ~ '^[a-f0-9]{64}$'),
 filename text NOT NULL,
 imported_count integer NOT NULL DEFAULT 0 CHECK(imported_count >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(user_id,account_id) REFERENCES finance.accounts(user_id,id) ON DELETE RESTRICT,
 UNIQUE (user_id,account_id,file_sha256),
 UNIQUE(user_id,id)
);
CREATE TABLE IF NOT EXISTS finance.transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL,
 account_id uuid NOT NULL,
 import_id uuid NOT NULL,
 external_id text NOT NULL CHECK(length(external_id) BETWEEN 1 AND 255),
 booked_on date NOT NULL,
 amount_cents bigint NOT NULL,
 description text NOT NULL CHECK(length(description) BETWEEN 1 AND 1000),
 category text NOT NULL DEFAULT 'Muut',
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(user_id,account_id) REFERENCES finance.accounts(user_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(user_id,import_id) REFERENCES finance.import_batches(user_id,id) ON DELETE RESTRICT,
 UNIQUE (user_id,account_id,external_id)
);
CREATE INDEX IF NOT EXISTS finance_transactions_month_idx ON finance.transactions(user_id,booked_on DESC);
CREATE TABLE IF NOT EXISTS finance.budgets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL,
 month_key text NOT NULL CHECK(month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
 category text NOT NULL,
 limit_cents bigint NOT NULL CHECK(limit_cents >= 0),
 UNIQUE(user_id,month_key,category)
);
CREATE TABLE IF NOT EXISTS finance.debts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL,
 name text NOT NULL,
 principal_cents bigint CHECK(principal_cents >= 0),
 payment_cents bigint CHECK(payment_cents >= 0),
 apr_basis_points integer CHECK(apr_basis_points BETWEEN 0 AND 100000)
);
CREATE TABLE IF NOT EXISTS finance.audit_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id text NOT NULL,
 action text NOT NULL,
 entity_type text NOT NULL,
 entity_id text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_audit_user_idx ON finance.audit_events(user_id, created_at DESC);
-- Strong default-deny: no browser role gets direct access.
REVOKE ALL ON SCHEMA finance FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA finance FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA finance FROM PUBLIC;
-- Defense in depth. The application must additionally check the verified server session.
ALTER TABLE finance.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.audit_events ENABLE ROW LEVEL SECURITY;
-- No client-facing policies. Restrict database credentials to trusted server ONLY.
COMMIT;