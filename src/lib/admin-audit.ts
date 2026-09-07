import "server-only";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

export type AdminAuditAction = "CREATE" | "UPDATE" | "DELETE" | "PASSWORD_CHANGE";

export async function recordAdminAudit(
  request: Request,
  action: AdminAuditAction,
  entity: string,
  entityId: string | number | null,
  description: string,
) {
  const session = await getAdminSession();
  if (!session) return;
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  try {
    await db.execute(
      "INSERT INTO audit_logs(user_id,action,entity,entity_id,description,ip_address,user_agent) VALUES(?,?,?,?,?,?,?)",
      [session.id, action, entity, entityId == null ? null : String(entityId), description, ipAddress, request.headers.get("user-agent")?.slice(0, 255) || null],
    );
  } catch (error) {
    // การบันทึก Log ต้องไม่ทำให้คำสั่งหลักของผู้ดูแลระบบล้มเหลว
    console.error("Unable to write admin audit log", error);
  }
}
