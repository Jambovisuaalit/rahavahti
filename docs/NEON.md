# Neon backend

Neon project: `hidden-wave-87825800` (`rahavahti`), region `aws-eu-central-1`, PostgreSQL 17.

## Architecture
Next.js server-side route handlers -> Neon PostgreSQL. Neon Auth is the selected identity provider but is **not yet provisioned or tested**. Browser clients must never receive `DATABASE_URL` or database credentials. No Supabase dependency.

## HOLD gates
1. Implement and verify Neon Auth session handling.
2. Create isolated schema for users, accounts, transactions, import batches and audit logs.
3. Enforce per-user authorization server-side, and add negative cross-user tests.
4. Implement idempotent CSV imports and rollback.
5. Confirm backups, retention, privacy, integration tests and release approvals before real personal finance data.

Neon project creation alone does not constitute a production-ready backend. Never commit credentials or personal finance data.
