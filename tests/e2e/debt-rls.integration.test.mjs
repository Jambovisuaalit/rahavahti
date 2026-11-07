import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

/**
 * Run only against an isolated Neon development branch.
 * Required: QA_DEBTS_DATABASE_URL, QA_AUTH_USER_A_ID, QA_AUTH_USER_B_ID.
 * Never use a privileged DATABASE_URL here.
 * Transactions deliberately roll back synthetic data after every test.
 */
const connectionString = process.env.QA_DEBTS_DATABASE_URL;
const userA = process.env.QA_AUTH_USER_A_ID;
const userB = process.env.QA_AUTH_USER_B_ID;
if (!connectionString || !userA || !userB || userA === userB) {
  throw Error("QA credentials and two distinct Neon Auth IDs are required");
}
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: true }, max: 1 });
const uid = randomUUID();
const bid = randomUUID();
const nameA = "QA-ONLY-A-" + uid;
const nameB = "QA-ONLY-B-" + uid;

async function asUser(client, ownerId) {
  await client.query("SELECT set_config('app.current_user_id', $1, true)", [ownerId]);
}
async function insertDebt(client, id, ownerId, creditor) {
  return client.query(
    `INSERT INTO finance.user_debts_v2
    (id, owner_id, creditor, debt_type, balance_cents, annual_rate_bps,
     monthly_fee_cents, minimum_payment_cents)
    VALUES ($1,$2,$3,'consumer_loan',100000,1200,0,5000)`,
    [id, ownerId, creditor]
  );
}

test("RLS / IDOR / audit: two authenticated identity contexts", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const role = (await client.query(`
      SELECT current_user AS role, rolsuper, rolbypassrls
      FROM pg_roles WHERE rolname = current_user`)).rows[0];
    assert.equal(role.rolsuper, false, "QA role cannot be superuser");
    assert.equal(role.rolbypassrls, false, "QA role cannot BYPASSRLS");
    const owner = (await client.query(`
      SELECT pg_get_userbyid(relowner) AS owner
      FROM pg_class WHERE oid='finance.user_debts_v2'::regclass`)).rows[0].owner;
    assert.notEqual(role.role, owner, "QA role cannot own debt table");

    await asUser(client, userA);
    assert.equal((await insertDebt(client, uid, userA, nameA)).rowCount, 1);
    await asUser(client, userB);
    assert.equal((await insertDebt(client, bid, userB, nameB)).rowCount, 1);

    await asUser(client, userA);
    assert.equal((await client.query("SELECT id FROM finance.user_debts_v2 WHERE id=$1",[uid])).rowCount,1);
    assert.equal((await client.query("SELECT id FROM finance.user_debts_v2 WHERE id=$1",[bid])).rowCount,0,
      "A must not read B's debt");
    assert.equal((await client.query("UPDATE finance.user_debts_v2 SET balance_cents=1 WHERE id=$1 RETURNING id",[bid])).rowCount,0,
      "A must not update B's debt");
    assert.equal((await client.query("DELETE FROM finance.user_debts_v2 WHERE id=$1 RETURNING id",[bid])).rowCount,0,
      "A must not delete B's debt");

    const updated = await client.query("UPDATE finance.user_debts_v2 SET balance_cents=90000 WHERE id=$1 RETURNING balance_cents",[uid]);
    assert.equal(Number(updated.rows[0].balance_cents),90000);
    const audited = await client.query(
      "INSERT INTO finance.debt_audit_events_v2(owner_id,action,debt_id,outcome) VALUES($1,'update',$2,'ok')",
      [userA,uid]
    );
    assert.equal(audited.rowCount,1,"Successful change must create audit record");
    const rights=(await client.query(`
      SELECT has_table_privilege(current_user,'finance.debt_audit_events_v2','UPDATE') AS can_update,
             has_table_privilege(current_user,'finance.debt_audit_events_v2','DELETE') AS can_delete`)).rows[0];
    assert.equal(rights.can_update,false);
    assert.equal(rights.can_delete,false);

    await asUser(client, "");
    assert.equal((await client.query("SELECT id FROM finance.user_debts_v2 WHERE id = ANY($1::uuid[])",[[uid,bid]])).rowCount,0,
      "Anonymous owner context must see no debt");

    await asUser(client,userB);
    assert.equal((await client.query("SELECT id FROM finance.user_debts_v2 WHERE id=$1",[bid])).rowCount,1);
    assert.equal((await client.query("SELECT id FROM finance.user_debts_v2 WHERE id=$1",[uid])).rowCount,0);
  } finally {
    try { await client.query("ROLLBACK"); } finally { client.release(); await pool.end(); }
  }
});
