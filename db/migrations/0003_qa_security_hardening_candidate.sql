-- Security hardening candidate. QA migration ONLY, never automatically run on production.
-- Requires verification of all application credentials and explicit DBA review.
BEGIN;
-- Ensure owners cannot silently bypass tenant policies on these tables.
ALTER TABLE finance.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.import_batches FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.budgets FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.debts FORCE ROW LEVEL SECURITY;
ALTER TABLE finance.audit_events FORCE ROW LEVEL SECURITY;
-- Audit events must be append-only for the least-privileged application role.
REVOKE UPDATE, DELETE, TRUNCATE ON finance.audit_events FROM rahavahti_app_dev;
REVOKE UPDATE, DELETE, TRUNCATE ON finance.debt_audit_events_v2 FROM rahavahti_app_dev;
-- Explicitly revoke from PUBLIC: avoid accidental privileges granted to every role.
REVOKE UPDATE, DELETE, TRUNCATE ON finance.audit_events FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON finance.debt_audit_events_v2 FROM PUBLIC;
COMMIT;
-- NOTE: table owners, BYPASSRLS roles and privileged DDL users can still modify
-- audit records. This is not cryptographic immutability or WORM storage.
-- Acceptance additionally requires checking role inheritance and verifying
-- INSERT allowed, UPDATE/DELETE denied using the actual runtime DB role.
