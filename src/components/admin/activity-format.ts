// Turns raw audit_logs rows (English action codes, a few English descriptions)
// into what the dashboard's activity feed shows.

export type ActivityKind = "create" | "update" | "delete" | "attendance" | "account" | "face" | "warning" | "other";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "เพิ่มข้อมูล",
  UPDATE: "แก้ไขข้อมูล",
  DELETE: "ลบข้อมูล",
  PASSWORD_CHANGE: "เปลี่ยนรหัสผ่าน",
  ENROLL: "เพิ่มเข้าภาคเรียน",
  UNENROLL: "นำออกจากภาคเรียน",
  OPEN: "เปิดรอบเช็คชื่อ",
  CLOSE: "ปิดรอบเช็คชื่อ",
  STATUS_UPDATE: "แก้สถานะการเช็คชื่อ",
  UPSERT: "บันทึกการเช็คชื่อ",
  MARK_READ: "อ่านการแจ้งเตือน",
  APPROVE: "อนุมัติคำขอ",
  REJECT: "ปฏิเสธคำขอ",
  REJECT_PROFILE_REQUEST: "ปฏิเสธคำร้องแก้ไขข้อมูล",
  FACE_ENROLLMENT_STARTED: "ลงทะเบียนใบหน้า",
  FACE_ENROLLMENT_SUCCESS: "ลงทะเบียนใบหน้า",
  FACE_ENROLLMENT_FAILED: "ลงทะเบียนใบหน้าไม่สำเร็จ",
  IDENTITY_VERIFICATION_STARTED: "ยืนยันตัวตน",
  IDENTITY_VERIFICATION_SUCCESS: "ยืนยันตัวตน",
  STUDENT_DATA_VERIFIED: "ยืนยันตัวตน",
  LIVENESS_SUCCESS: "ตรวจใบหน้าจริง",
};

// Face self-enrollment steps are all stored with the same English description,
// so the step itself is what the feed should say.
const FACE_STEP_DESCRIPTIONS: Record<string, string> = {
  FACE_ENROLLMENT_STARTED: "นักเรียนเริ่มลงทะเบียนใบหน้า",
  FACE_ENROLLMENT_SUCCESS: "นักเรียนลงทะเบียนใบหน้าสำเร็จ",
  FACE_ENROLLMENT_FAILED: "นักเรียนลงทะเบียนใบหน้าไม่สำเร็จ",
  IDENTITY_VERIFICATION_STARTED: "นักเรียนเริ่มยืนยันตัวตนเพื่อลงทะเบียนใบหน้า",
  IDENTITY_VERIFICATION_SUCCESS: "นักเรียนยืนยันตัวตนสำเร็จ",
  STUDENT_DATA_VERIFIED: "ตรวจสอบข้อมูลนักเรียนก่อนลงทะเบียนใบหน้าแล้ว",
  LIVENESS_SUCCESS: "ตรวจสอบว่าเป็นใบหน้าจริงผ่านแล้ว",
};

// Specific English descriptions some routes store.
const DESCRIPTION_TRANSLATIONS: Record<string, string> = {
  "Possible duplicate profile": "ลงทะเบียนใบหน้าไม่สำเร็จ: อาจซ้ำกับใบหน้าของนักเรียนคนอื่น",
  "Replacement profile active": "ลงทะเบียนใบหน้าใหม่แทนข้อมูลเดิมแล้ว",
};

function kindOf(action: string, entity: string): ActivityKind {
  if (action.endsWith("_FAILED")) return "warning";
  if (entity === "student_face" || action.startsWith("FACE_") || action === "LIVENESS_SUCCESS") return "face";
  if (entity === "check_in_session" || entity === "attendance_record") return "attendance";
  if (action === "PASSWORD_CHANGE") return "account";
  if (action === "DELETE" || action === "UNENROLL") return "delete";
  if (action === "CREATE" || action === "ENROLL" || action === "APPROVE") return "create";
  if (action === "UPDATE" || action === "STATUS_UPDATE" || action === "UPSERT") return "update";
  return "other";
}

function describe(action: string, description: string) {
  if (DESCRIPTION_TRANSLATIONS[description]) return DESCRIPTION_TRANSLATIONS[description];
  if (FACE_STEP_DESCRIPTIONS[action] && /^[\x20-\x7E]*$/.test(description)) return FACE_STEP_DESCRIPTIONS[action];
  return description;
}

export function formatActivity(row: { action: string; entity: string; description: string }) {
  const action = row.action.trim().toUpperCase();
  return {
    label: ACTION_LABELS[action] ?? "กิจกรรมในระบบ",
    description: describe(action, row.description),
    kind: kindOf(action, row.entity),
  };
}
