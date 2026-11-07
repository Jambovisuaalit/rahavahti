-- Applies only after scoped role rahavahti_app_dev exists.
-- Session context MUST be assigned from validated Neon Auth session via SET LOCAL.
CREATE POLICY rahavahti_tenant_accounts ON finance.accounts TO rahavahti_app_dev USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));
CREATE POLICY rahavahti_tenant_import_batches ON finance.import_batches TO rahavahti_app_dev USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));
CREATE POLICY rahavahti_tenant_transactions ON finance.transactions TO rahavahti_app_dev USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));
CREATE POLICY rahavahti_tenant_budgets ON finance.budgets TO rahavahti_app_dev USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));
CREATE POLICY rahavahti_tenant_debts ON finance.debts TO rahavahti_app_dev USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));
CREATE POLICY rahavahti_tenant_audit_events ON finance.audit_events TO rahavahti_app_dev USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));
REVOKE UPDATE, DELETE ON finance.audit_events FROM rahavahti_app_dev;
