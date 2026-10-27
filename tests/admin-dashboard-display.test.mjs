import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(path, context = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, ...context });
  return exports;
}

const { nameInitials } = load("../src/lib/name-initials.ts");
const { formatActivity } = load("../src/components/admin/activity-format.ts");

test("avatar initials skip Thai and English titles", () => {
  assert.equal(nameInitials("นายดนัย เทพชุมพล"), "ดท");
  assert.equal(nameInitials("ด.ช.สมพงษ์ โสเพียร"), "สส");
  assert.equal(nameInitials("ด.ญ.มาลี ศรีสุข"), "มศ");
  assert.equal(nameInitials("เด็กหญิงณัฐธิดา แก้วใส"), "ณก");
  assert.equal(nameInitials("นางสาวพิมพ์ ใจดี"), "พจ", "นางสาว must not be read as นาง + สาว…");
  assert.equal(nameInitials("นางมาลี ศรีสุข"), "มศ");
  assert.equal(nameInitials("Mr. John Smith"), "JS");
});

test("avatar initials never start with a Thai leading vowel or mark", () => {
  assert.equal(nameInitials("นางสาวเกียรติสุดา ใจดี"), "กจ");
  assert.equal(nameInitials("ไพโรจน์"), "พ");
  assert.equal(nameInitials("นาย"), "น", "a bare title is kept rather than emptied");
  assert.equal(nameInitials("   "), "?");
});

test("every avatar that shows initials uses the shared helper", () => {
  const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
  assert.match(read("../src/components/admin/users/ProfileAvatar.tsx"), /\{nameInitials\(name\)\}/);
  assert.match(read("../src/components/admin/users/UsersManager.tsx"), /initials=\{nameInitials\(user\.name\)\}/);
  assert.match(read("../src/lib/teacher-data.ts"), /initials: nameInitials\(teacher\.fullName\)/);
  assert.match(read("../src/lib/student-data.ts"), /initials: nameInitials\(item\.name\)/);
  for (const path of ["../src/components/admin/users/ProfileAvatar.tsx", "../src/components/admin/users/UsersManager.tsx", "../src/components/admin/RecentAttendanceTable.tsx"]) {
    assert.doesNotMatch(read(path), /name\.(?:trim\(\)\.)?slice\(0, ?2\)/, `${path} still slices the raw name`);
  }
});

test("activity rows get Thai labels and an icon that matches what happened", () => {
  const close = formatActivity({ action: "CLOSE", entity: "check_in_session", description: "ปิดรอบเช็คชื่อ ว30201 และบันทึกขาดเรียน 40 คน" });
  assert.equal(close.label, "ปิดรอบเช็คชื่อ");
  assert.equal(close.kind, "attendance");
  assert.equal(close.description, "ปิดรอบเช็คชื่อ ว30201 และบันทึกขาดเรียน 40 คน");

  assert.equal(formatActivity({ action: "CREATE", entity: "teacher", description: "x" }).label, "เพิ่มข้อมูล");
  assert.equal(formatActivity({ action: "CREATE", entity: "teacher", description: "x" }).kind, "create");
  assert.equal(formatActivity({ action: "DELETE", entity: "subject", description: "x" }).kind, "delete");
  assert.equal(formatActivity({ action: "PASSWORD_CHANGE", entity: "user", description: "x" }).kind, "account");
  assert.equal(formatActivity({ action: "SOMETHING_NEW", entity: "x", description: "x" }).label, "กิจกรรมในระบบ");
});

test("English face-enrollment descriptions are shown in Thai", () => {
  const started = formatActivity({ action: "IDENTITY_VERIFICATION_STARTED", entity: "student_face", description: "Student self-enrollment" });
  assert.equal(started.description, "นักเรียนเริ่มยืนยันตัวตนเพื่อลงทะเบียนใบหน้า");
  assert.equal(started.kind, "face");
  const failed = formatActivity({ action: "FACE_ENROLLMENT_FAILED", entity: "student_face", description: "Possible duplicate profile" });
  assert.match(failed.description, /^ลงทะเบียนใบหน้าไม่สำเร็จ/);
  assert.equal(failed.kind, "warning");
  assert.doesNotMatch(`${started.label} ${started.description}`, /[A-Za-z]{3,}/, "visible text stays Thai");
});

test("dashboard queries: school-time BE dates, no per-absence flood, term room", () => {
  const source = fs.readFileSync(new URL("../src/lib/admin-data.ts", import.meta.url), "utf8");
  const activity = source.match(/`SELECT CAST\(log_id AS CHAR\) id[^`]*`/)?.[0];
  assert.ok(activity, "activity query not found");
  assert.match(activity, /created_at \+ INTERVAL 7 HOUR/);
  assert.match(activity, /YEAR\(created_at \+ INTERVAL 7 HOUR\)\+543/);
  assert.match(activity, /NOT \(entity='attendance_record' AND COALESCE\(description,''\) LIKE 'ปิดรอบ%'\)/);

  const recent = source.match(/`SELECT st\.student_code id,st\.full_name name[^`]*`/)?.[0];
  assert.ok(recent, "recent attendance query not found");
  assert.match(recent, /c\.id=COALESCE\(cs\.classroom_id,sb\.classroom_id,st\.class_id\)/);
  assert.doesNotMatch(recent, /c\.id=st\.class_id/);

  assert.match(source, /COUNT\(\*\) recorded FROM attendance_records WHERE attendance_date BETWEEN/);
});

test("announcement times are handed out in Bangkok time and shown as Thai dates", () => {
  const lib = fs.readFileSync(new URL("../src/lib/announcements.ts", import.meta.url), "utf8");
  assert.match(lib, /createdAt: bangkokIsoFromUtcSql\(row\.createdAt\) \?\? String\(row\.createdAt \?\? ""\)/);
  const card = fs.readFileSync(new URL("../src/components/student/dashboard/StudentAnnouncementCard.tsx", import.meta.url), "utf8");
  assert.match(card, /\{formatPostedAt\(announcement\.createdAt\)\}/);
  assert.match(card, /timeZone: "Asia\/Bangkok"/);
});

test("the attendance chart shows an empty state only when the range has no records at all", () => {
  const source = fs.readFileSync(new URL("../src/components/admin/AttendanceChart.tsx", import.meta.url), "utf8");
  assert.match(source, /const hasRecords = visibleData\.some\(\(day\) => day\.recorded > 0\)/);
  assert.match(source, /!hasRecords \?/);
});
