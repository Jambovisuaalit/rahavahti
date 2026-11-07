-- Apply only after finance.user_debts_v2 and finance.debt_audit_events_v2 exist.
-- Development-branch migration. Review before production.
CREATE OR REPLACE FUNCTION finance.audit_user_debt_change_v2()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, finance AS $$
DECLARE
  event_owner text;
  event_debt uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    event_owner := OLD.owner_id;
    event_debt := OLD.id;
  ELSE
    event_owner := NEW.owner_id;
    event_debt := NEW.id;
  END IF;
  INSERT INTO finance.debt_audit_events_v2(owner_id,action,debt_id,outcome)
  VALUES(event_owner,lower(TG_OP),event_debt,'ok');
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION finance.audit_user_debt_change_v2() FROM PUBLIC;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='user_debts_v2_audit_changes' AND tgrelid='finance.user_debts_v2'::regclass) THEN
  CREATE TRIGGER user_debts_v2_audit_changes
  AFTER INSERT OR UPDATE OR DELETE ON finance.user_debts_v2
  FOR EACH ROW EXECUTE FUNCTION finance.audit_user_debt_change_v2();
 END IF;
END
$$;

-- The application may mutate debts, but must not fabricate or erase audit records.
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON finance.debt_audit_events_v2 FROM rahavahti_rls_qa;
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON finance.debt_audit_events_v2 FROM rahavahti_debts_app;

-- Important: only connect as an actual NO-BYPASSRLS role, never rahavahti_owner.
-- RLS owner_id is set from a *server-verified* Neon Auth session inside the same transaction.
-- A client-supplied app.current_user_id is not an authenticated identity.
