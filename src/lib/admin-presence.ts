import "server-only";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export type LoggedInAccountRole = "admin" | "teacher" | "student";
export type LoggedInAccountIdentity = {
  role: LoggedInAccountRole;
  id: number;
};

type PresenceRow = RowDataPacket & {
  role: LoggedInAccountRole;
  id: number;
};

/** Returns enabled accounts with at least one unrevoked, unexpired session. */
export async function getLoggedInAccountIdentities(): Promise<LoggedInAccountIdentity[]> {
  const [rows] = await db.execute<PresenceRow[]>(
    `SELECT 'admin' role,a.id FROM admins a WHERE a.status='ACTIVE' AND EXISTS(SELECT 1 FROM auth_sessions s WHERE s.account_role='admin' AND s.account_id=a.id AND s.revoked_at IS NULL AND s.expires_at>NOW(3))
     UNION ALL
     SELECT 'teacher' role,t.id FROM teachers t WHERE t.status='ACTIVE' AND EXISTS(SELECT 1 FROM auth_sessions s WHERE s.account_role='teacher' AND s.account_id=t.id AND s.revoked_at IS NULL AND s.expires_at>NOW(3))
     UNION ALL
     SELECT 'student' role,st.id FROM students st WHERE st.status='ACTIVE' AND EXISTS(SELECT 1 FROM auth_sessions s WHERE s.account_role='student' AND s.account_id=st.id AND s.revoked_at IS NULL AND s.expires_at>NOW(3))`,
  );
  return rows.map((row) => ({ role: row.role, id: Number(row.id) }));
}
