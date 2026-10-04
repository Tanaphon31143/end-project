"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import type { SubjectRecord } from "./types";
import { ScheduleDetailModal } from "./ScheduleDetailModal";

const PAGE_SIZE = 10;

export default function SubjectTable({
  subjects,
  onEdit,
  onDelete,
  busyId,
}: {
  subjects: SubjectRecord[];
  onEdit: (subject: SubjectRecord) => void;
  onDelete: (subject: SubjectRecord) => void;
  busyId: number | null;
}) {
  const [selectedSubject, setSelectedSubject] = useState<SubjectRecord | null>(null);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(subjects.length / PAGE_SIZE));
  const effectivePage = Math.min(page, pageCount);
  const visibleSubjects = useMemo(
    () => subjects.slice((effectivePage - 1) * PAGE_SIZE, effectivePage * PAGE_SIZE),
    [effectivePage, subjects],
  );

  return (
    <>
      <div className="subjects-table-wrap">
        <table className="subjects-data-table">
          <thead>
            <tr>
              <th className="th-num">#</th>
              <th className="th-code">รหัสวิชา</th>
              <th className="th-name">ชื่อรายวิชา</th>
              <th className="th-teacher">ครูผู้สอน</th>
              <th className="th-class">ชั้นเรียน</th>
              <th className="th-periods">จำนวนคาบ</th>
              <th className="th-term">ภาคเรียน</th>
              <th className="th-actions">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {visibleSubjects.length ? (
              visibleSubjects.map((subject, index) => (
                <tr key={subject.databaseId}>
                  <td className="td-num">{(effectivePage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="td-code">
                    <button
                      type="button"
                      className="subject-code-button"
                      onClick={() => setSelectedSubject(subject)}
                    >
                      {subject.subjectCode}
                    </button>
                  </td>
                  <td className="td-name">
                    <div className="subject-title-cell">
                      <strong className="subject-title-text">{subject.subjectName}</strong>
                      <span className="subject-students-count">
                        {subject.studentCount.toLocaleString("th-TH")} นักเรียน
                      </span>
                    </div>
                  </td>
                  <td className="td-teacher">
                    <span className="subject-teacher-name">{subject.teacherName || "ยังไม่ระบุ"}</span>
                  </td>
                  <td className="td-class">
                    <span className="subject-class-tag">{subject.className || "—"}</span>
                  </td>
                  <td className="td-periods">
                    <span className="subject-periods-tag">
                      {weeklyPeriodCount(subject).toLocaleString("th-TH")} {subject.scheduleSource === "SCHEDULE" ? "คาบ/สัปดาห์" : "วัน/สัปดาห์"}
                    </span>
                  </td>
                  <td className="td-term">
                    <span className="subject-term-tag">
                      {subject.semester}/{subject.academicYear}
                    </span>
                  </td>
                  <td className="td-actions">
                    <div className="subject-row-actions">
                      <button
                        type="button"
                        className="subject-detail-button"
                        onClick={() => setSelectedSubject(subject)}
                        aria-label={`ดูรายละเอียด ${subject.subjectName}`}
                      >
                        ดูรายละเอียด
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                      <details className="subject-row-menu">
                        <summary aria-label={`เปิดเมนูจัดการ ${subject.subjectName}`}>
                          <MoreVertical size={16} aria-hidden="true" />
                        </summary>
                        <div className="subject-row-menu-panel">
                          <button type="button" onClick={() => onEdit(subject)}>
                            <Pencil size={14} aria-hidden="true" /> แก้ไขรายวิชา
                          </button>
                          <button type="button" onClick={() => onEdit(subject)}>
                            <UserRoundCog size={14} aria-hidden="true" /> เปลี่ยนครูผู้สอน
                          </button>
                          <button
                            type="button"
                            className="danger"
                            disabled={busyId === subject.databaseId}
                            onClick={() => onDelete(subject)}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            {busyId === subject.databaseId ? "กำลังลบ…" : "ลบรายวิชา"}
                          </button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8}>
                  <div className="subject-empty">
                    <span>ไม่พบรายวิชาที่ตรงกับตัวกรอง</span>
                    <p>ลองเปลี่ยนคำค้นหา ชั้นเรียน หรือภาคเรียน แล้วค้นหาอีกครั้ง</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {subjects.length > 0 && (
        <footer className="subjects-pagination">
          <span>แสดง {PAGE_SIZE.toLocaleString("th-TH")} รายการต่อหน้า</span>
          <div>
            <span>
              {(effectivePage - 1) * PAGE_SIZE + 1}–{Math.min(effectivePage * PAGE_SIZE, subjects.length)} จาก {subjects.length.toLocaleString("th-TH")} รายการ
            </span>
            <button type="button" aria-label="หน้าก่อนหน้า" disabled={effectivePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <b aria-current="page">{effectivePage}</b>
            <button type="button" aria-label="หน้าถัดไป" disabled={effectivePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </footer>
      )}

      <ScheduleDetailModal
        subject={selectedSubject}
        onClose={() => setSelectedSubject(null)}
        onEdit={(subject) => {
          setSelectedSubject(null);
          onEdit(subject);
        }}
        onDelete={(subject) => {
          setSelectedSubject(null);
          onDelete(subject);
        }}
        busy={selectedSubject?.databaseId === busyId}
      />
    </>
  );
}

function weeklyPeriodCount(subject: SubjectRecord) {
  if (subject.scheduleSource === "SCHEDULE" && subject.schedules.length) return subject.schedules.length;
  return subject.studyDays.length;
}
