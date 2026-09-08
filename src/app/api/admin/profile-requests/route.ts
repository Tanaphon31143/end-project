import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  }

  const [requests] = await db.execute<
    (RowDataPacket & {
      id: number;
      studentId: number;
      studentName: string;
      studentCode: string;
      fieldType: string;
      oldValue: string;
      newValue: string;
      reason: string;
      status: string;
      rejectionReason: string | null;
      attachmentName: string | null;
      attachmentMime: string | null;
      attachmentSize: number | null;
      hasAttachment: number;
      createdAt: string;
      reviewedAt: string | null;
    })[]
  >(
    `SELECT r.id,
            r.student_id studentId,
            s.full_name studentName,
            s.student_code studentCode,
            r.field_type fieldType,
            r.old_value oldValue,
            r.new_value newValue,
            r.reason,
            r.status,
            r.rejection_reason rejectionReason,
            r.attachment_name attachmentName,
            r.attachment_mime attachmentMime,
            r.attachment_size attachmentSize,
            (r.attachment_data IS NOT NULL) hasAttachment,
            DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') createdAt,
            DATE_FORMAT(r.reviewed_at, '%d/%m/%Y %H:%i') reviewedAt
     FROM profile_edit_requests r
     JOIN students s ON s.id = r.student_id
     ORDER BY (r.status = 'PENDING') DESC, r.created_at DESC`,
  );

  return NextResponse.json({
    requests: requests.map((r) => ({
      ...r,
      hasAttachment: Boolean(r.hasAttachment),
    })),
  });
}

export async function PATCH(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    requestId?: number;
    action?: "APPROVE" | "REJECT";
    rejectionReason?: string;
  };

  const requestId = Number(body.requestId);
  const action = body.action;
  const rejectionReason = (body.rejectionReason || "").trim();

  if (!Number.isInteger(requestId) || requestId < 1 || !action) {
    return NextResponse.json({ message: "ข้อมูลคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  if (action === "REJECT" && !rejectionReason) {
    return NextResponse.json(
      { message: "กรุณาระบุเหตุผลการปฏิเสธคำร้อง" },
      { status: 400 },
    );
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<
      (RowDataPacket & {
        id: number;
        studentId: number;
        fieldType: string;
        oldValue: string;
        newValue: string;
        status: string;
      })[]
    >(
      `SELECT id, student_id studentId, field_type fieldType,
              old_value oldValue, new_value newValue, status
       FROM profile_edit_requests
       WHERE id = ? FOR UPDATE`,
      [requestId],
    );

    const req = rows[0];
    if (!req) {
      await connection.rollback();
      return NextResponse.json({ message: "ไม่พบคำร้องที่ระบุ" }, { status: 404 });
    }

    if (req.status !== "PENDING") {
      await connection.rollback();
      return NextResponse.json(
        { message: `คำร้องนี้ได้รับการดำเนินการไปแล้ว (${req.status})` },
        { status: 409 },
      );
    }

    if (action === "APPROVE") {
      // 1. Transaction: Update user data in students table according to field_type
      switch (req.fieldType) {
        case "FULL_NAME":
          await connection.execute(
            `UPDATE students SET full_name = ? WHERE id = ?`,
            [req.newValue, req.studentId],
          );
          break;
        case "STUDENT_CODE":
          await connection.execute(
            `UPDATE students SET student_code = ? WHERE id = ?`,
            [req.newValue, req.studentId],
          );
          break;
        case "CLASS_NUMBER": {
          const num = parseInt(req.newValue, 10);
          await connection.execute(
            `UPDATE students SET class_number = ? WHERE id = ?`,
            [Number.isFinite(num) ? num : null, req.studentId],
          );
          break;
        }
        case "CLASSROOM": {
          // Find classroom id by name if numeric or text
          const [classrooms] = await connection.execute<RowDataPacket[]>(
            `SELECT id FROM classrooms WHERE name = ? OR id = ? LIMIT 1`,
            [req.newValue, parseInt(req.newValue, 10) || 0],
          );
          if (classrooms[0]) {
            await connection.execute(
              `UPDATE students SET class_id = ? WHERE id = ?`,
              [classrooms[0].id, req.studentId],
            );
          }
          break;
        }
        case "GRADE_LEVEL":
          // Optionally adjust class if level matches
          break;
      }

      // 2. Update Request status to APPROVED
      await connection.execute(
        `UPDATE profile_edit_requests
         SET status = 'APPROVED',
             reviewed_by_admin_id = ?,
             reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [admin.id, requestId],
      );

      // 3. Record Audit Log
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, description)
         VALUES (?, 'APPROVE_PROFILE_REQUEST', 'profile_edit_requests', ?, ?)`,
        [
          admin.id,
          String(requestId),
          `อนุมัติคำร้องแก้ไขข้อมูล ${req.fieldType} ของนักเรียน ID ${req.studentId} จาก "${req.oldValue}" เป็น "${req.newValue}"`,
        ],
      );

      await connection.commit();

      // 4. Create Notification for Student
      await createNotification({
        userId: req.studentId,
        type: "REQUEST_APPROVED",
        title: "คำร้องแก้ไขข้อมูลได้รับการอนุมัติ",
        message: `คำร้องขอแก้ไขข้อมูล ${req.fieldType} จาก "${req.oldValue}" เป็น "${req.newValue}" ได้รับการอนุมัติและปรับปรุงข้อมูลในระบบเรียบร้อยแล้ว`,
        relatedEntityType: "profile_edit_request",
        relatedEntityId: requestId,
        actionUrl: "/student/profile",
      });

      return NextResponse.json({
        ok: true,
        message: "อนุมัติคำร้องและปรับปรุงข้อมูลนักเรียนเรียบร้อยแล้ว",
      });
    } else {
      // REJECT
      await connection.execute(
        `UPDATE profile_edit_requests
         SET status = 'REJECTED',
             rejection_reason = ?,
             reviewed_by_admin_id = ?,
             reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [rejectionReason, admin.id, requestId],
      );

      // Record Audit Log
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, description)
         VALUES (?, 'REJECT_PROFILE_REQUEST', 'profile_edit_requests', ?, ?)`,
        [
          admin.id,
          String(requestId),
          `ปฏิเสธคำร้องแก้ไขข้อมูล ID ${requestId} ของนักเรียน ID ${req.studentId} เนื่องจาก: ${rejectionReason}`,
        ],
      );

      await connection.commit();

      // Create Notification for Student
      await createNotification({
        userId: req.studentId,
        type: "REQUEST_REJECTED",
        title: "คำร้องแก้ไขข้อมูลถูกปฏิเสธ",
        message: `คำร้องขอแก้ไขข้อมูล ${req.fieldType} ถูกปฏิเสธเนื่องจาก: ${rejectionReason}`,
        relatedEntityType: "profile_edit_request",
        relatedEntityId: requestId,
        actionUrl: "/student/profile",
      });

      return NextResponse.json({
        ok: true,
        message: "ปฏิเสธคำร้องและแจ้งเตือนนักเรียนเรียบร้อยแล้ว",
      });
    }
  } catch (err) {
    await connection.rollback();
    console.error("Admin review request failed", err);
    return NextResponse.json({ message: "เกิดข้อผิดพลาดในการประมวลผลคำร้อง" }, { status: 500 });
  } finally {
    connection.release();
  }
}
