import * as XLSX from "xlsx";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

const aliases: Record<string, string[]> = {
  student_code: [
    "student_code",
    "student code",
    "student id",
    "รหัสนักเรียน",
    "รหัส",
    "เลขประจำตัว",
    "เลขประจำตัวนักเรียน",
    "รหัสประจำตัว",
    "รหัสประจำตัวนักเรียน",
  ],
  prefix: ["prefix", "คำนำหน้า", "คำนำหน้าชื่อ"],
  first_name: ["first_name", "first name", "ชื่อ", "ชื่อจริง", "ชื่อนักเรียน"],
  last_name: ["last_name", "last name", "นามสกุล", "สกุล"],
  full_name: [
    "full_name",
    "full name",
    "ชื่อ-นามสกุล",
    "ชื่อสกุล",
    "ชื่อ-สกุล",
    "ชื่อ-ชื่อสกุล",
    "ชื่อและนามสกุล",
    "ชื่อและชื่อสกุล",
  ],
  number: ["number", "no", "ลำดับ", "ลำดับที่", "เลขที่"],
  phone: ["phone", "เบอร์โทร", "เบอร์โทรศัพท์", "เบอร์โทรนักเรียน", "โทรศัพท์"],
  email: ["email", "e-mail", "อีเมล"],
  guardian_name: [
    "guardian_name",
    "guardian name",
    "ชื่อผู้ปกครอง",
    "ผู้ปกครอง",
  ],
  guardian_phone: [
    "guardian_phone",
    "guardian phone",
    "เบอร์ผู้ปกครอง",
    "โทรศัพท์ผู้ปกครอง",
  ],
};
const normalize = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-.\/]+/g, "");
const canonical = (value: unknown) =>
  Object.entries(aliases).find(([, names]) =>
    names.some((name) => normalize(name) === normalize(value)),
  )?.[0];
const SUPPORTED_FILE = /\.(xlsx|xls|xlsm|xlsb|csv)$/i;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const form = await request.formData(),
    file = form.get("file"),
    classId = Number(form.get("classId"));
  if (!classId)
    return Response.json({ message: "กรุณาเลือกห้องเรียน" }, { status: 400 });
  if (!(file instanceof File))
    return Response.json({ message: "กรุณาเลือกไฟล์ Excel" }, { status: 400 });
  if (!SUPPORTED_FILE.test(file.name))
    return Response.json(
      { message: "รองรับไฟล์ .xlsx, .xls, .xlsm, .xlsb หรือ .csv เท่านั้น" },
      { status: 400 },
    );
  if (file.size > MAX_FILE_SIZE)
    return Response.json(
      { message: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" },
      { status: 400 },
    );
  const [room] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM classrooms WHERE id=?",
    [classId],
  );
  if (!room.length)
    return Response.json(
      { message: "ไม่พบห้องเรียนที่เลือก" },
      { status: 400 },
    );

  let matrix: unknown[][];
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet)
      return Response.json(
        { message: "ไฟล์ไม่มีแผ่นงานสำหรับนำเข้า" },
        { status: 400 },
      );
    matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], {
      header: 1,
      defval: "",
      raw: false,
    });
  } catch {
    return Response.json(
      {
        message:
          "ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าไฟล์ไม่เสียหายหรือดาวน์โหลดไฟล์ตัวอย่าง",
      },
      { status: 400 },
    );
  }
  let headerIndex = -1,
    bestScore = 0;
  for (const [index, row] of matrix.slice(0, 30).entries()) {
    const score = new Set(row.map(canonical).filter(Boolean)).size;
    if (score > bestScore) {
      bestScore = score;
      headerIndex = index;
    }
  }
  if (headerIndex < 0)
    return Response.json(
      {
        message:
          "ไม่พบหัวคอลัมน์ที่รู้จัก กรุณาตรวจสอบว่าไฟล์มีหัวตาราง เช่น รหัสนักเรียน ชื่อ หรือเลขที่",
      },
      { status: 400 },
    );
  const sourceHeaders = matrix[headerIndex].map((value) =>
      String(value ?? "").trim(),
    ),
    headers = matrix[headerIndex].map(canonical);
  const detectedColumns = sourceHeaders.filter(
    (value, index) => value && headers[index],
  );
  const raw = matrix
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => String(cell).trim()))
    .map((row) => {
      const record: Record<string, unknown> = {};
      headers.forEach((key, i) => {
        if (key) record[key] = row[i];
      });
      return record;
    });
  if (!raw.length)
    return Response.json(
      { message: "ไม่พบข้อมูลนักเรียนในไฟล์" },
      { status: 400 },
    );
  if (raw.length > 500)
    return Response.json(
      { message: "รองรับสูงสุด 500 รายการต่อไฟล์" },
      { status: 400 },
    );

  const codes = raw
      .map((x) => String(x.student_code ?? "").trim())
      .filter(Boolean),
    numbers = raw
      .map((x) => Number(String(x.number ?? "").trim()))
      .filter((number) => Number.isInteger(number) && number > 0);
  const [existingCodes] = codes.length
    ? await db.query<(RowDataPacket & { student_code: string })[]>(
        "SELECT student_code FROM students WHERE student_code IN (?)",
        [codes],
      )
    : [[]];
  const [existingNumbers] = numbers.length
    ? await db.query<(RowDataPacket & { class_number: number })[]>(
        "SELECT class_number FROM students WHERE class_id=? AND class_number IN (?)",
        [classId, numbers],
      )
    : [[]];
  const dbCodes = new Set(existingCodes.map((x) => x.student_code)),
    dbNumbers = new Set(existingNumbers.map((x) => Number(x.class_number))),
    seenCodes = new Set<string>(),
    seenNumbers = new Set<number>();
  const rows = raw.map((record, index) => {
    const studentCode = String(record.student_code ?? "").trim(),
      prefix = String(record.prefix ?? "").trim();
    const firstName = String(record.first_name ?? "").trim(),
      lastName = String(record.last_name ?? "").trim(),
      suppliedFullName = String(record.full_name ?? "").trim();
    const fullName =
      suppliedFullName ||
      `${prefix}${firstName}${lastName ? ` ${lastName}` : ""}`.trim();
    const numberText = String(record.number ?? "")
        .trim()
        .replace(/,/g, ""),
      number =
        /^\d+$/.test(numberText) && Number(numberText) > 0
          ? Number(numberText)
          : null;
    const email = String(record.email ?? "")
        .trim()
        .toLowerCase(),
      errors: string[] = [];
    if (!studentCode) errors.push("กรุณาระบุรหัสนักเรียน");
    else if (seenCodes.has(studentCode))
      errors.push("รหัสนักเรียนซ้ำภายในไฟล์");
    else if (dbCodes.has(studentCode))
      errors.push("รหัสนักเรียนนี้มีอยู่ในระบบแล้ว");
    if (!fullName) errors.push("กรุณาระบุชื่อ");
    if (numberText && !number) errors.push("เลขที่ต้องเป็นตัวเลขจำนวนเต็ม");
    else if (number && (seenNumbers.has(number) || dbNumbers.has(number)))
      errors.push("เลขที่ซ้ำในห้องเดียวกัน");
    if (email && !/^\S+@\S+\.\S+$/.test(email))
      errors.push("รูปแบบอีเมลไม่ถูกต้อง");
    if (studentCode) seenCodes.add(studentCode);
    if (number) seenNumbers.add(number);
    return {
      id: index + 1,
      studentCode,
      prefix,
      firstName,
      lastName,
      fullName,
      number,
      phone: String(record.phone ?? "").trim(),
      email,
      guardianName: String(record.guardian_name ?? "").trim(),
      guardianPhone: String(record.guardian_phone ?? "").trim(),
      valid: !errors.length,
      errors,
    };
  });
  return Response.json({
    rows,
    detectedColumns,
    summary: {
      total: rows.length,
      valid: rows.filter((x) => x.valid).length,
      invalid: rows.filter((x) => !x.valid).length,
    },
  });
}
