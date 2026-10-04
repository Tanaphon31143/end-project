import {
  BookOpen,
  Check,
  Clock3,
  Hash,
  RefreshCw,
  School,
  UserRound,
  X,
} from "lucide-react";
import type { SubjectRequest } from "@/lib/subject-requests";

const days = [
  "",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
];

type ReviewAction = "APPROVE" | "REJECT" | "REQUEST_CHANGES";

type Props = {
  request: SubjectRequest;
  remark: string;
  busy: boolean;
  disabled: boolean;
  onRemarkChange: (value: string) => void;
  onReview: (action: ReviewAction) => void;
};

export function SubjectRequestCard({
  request,
  remark,
  busy,
  disabled,
  onRemarkChange,
  onReview,
}: Props) {
  const details = [
    { label: "รหัสวิชา", value: request.subjectCode, icon: Hash },
    { label: "ครูผู้สอน", value: request.teacherName, icon: UserRound },
    { label: "ชั้นเรียน", value: request.classroomName, icon: School },
    {
      label: "ภาคเรียน",
      value: `${request.semester}/${request.academicYear}`,
      icon: BookOpen,
    },
    { label: "ส่งคำขอเมื่อ", value: request.createdAt, icon: Clock3 },
  ];

  return (
    <article className="subject-request-card" aria-busy={busy}>
      <header className="subject-request-card-head">
        <div>
          <div className="subject-request-title-row">
            <h3>{request.subjectName}</h3>
            <span className="subject-request-status">รออนุมัติ</span>
          </div>
          <p>คำขอเปิดรายวิชาจากครูเพื่อจัดการเรียนการสอน</p>
        </div>
      </header>

      <div className="subject-request-layout">
        <div className="subject-request-overview">
          <dl className="subject-request-details">
            {details.map(({ label, value, icon: Icon }) => (
              <div key={label}>
                <Icon size={16} aria-hidden="true" />
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          {request.description && (
            <div className="subject-request-description">
              <span>รายละเอียดจากครู</span>
              <p>{request.description}</p>
            </div>
          )}
        </div>

        <div className="subject-request-review">
          <div className="subject-request-remark">
            <div className="subject-request-schedule-wrap">
              <table className="subject-request-schedule-table">
                <thead>
                  <tr>
                    <th>วันเรียน</th>
                    <th>เวลาเริ่ม</th>
                    <th>เวลาสิ้นสุด</th>
                    <th>คาบเรียน / ห้อง</th>
                  </tr>
                </thead>
                <tbody>
                  {request.schedules.map((schedule, index) => (
                    <tr key={`${schedule.dayOfWeek}-${schedule.startTime}-${index}`}>
                      <td>{days[schedule.dayOfWeek] || "ยังไม่ระบุ"}</td>
                      <td>{schedule.startTime}</td>
                      <td>{schedule.endTime}</td>
                      <td>{schedule.periodName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="subject-request-remark-heading">
              <label htmlFor={`subject-request-remark-${request.id}`}>
                ความเห็นถึงครู
              </label>
              <small>จำเป็นเมื่อขอแก้ไขหรือไม่อนุมัติ</small>
            </div>
            <textarea
              id={`subject-request-remark-${request.id}`}
              maxLength={500}
              rows={3}
              value={remark}
              disabled={disabled}
              onChange={(event) => onRemarkChange(event.target.value)}
              placeholder="เขียนเหตุผลหรือรายละเอียดที่ต้องการให้ครูแก้ไข"
            />
          </div>

          <div className="subject-request-actions">
            <button
              type="button"
              className="request-changes"
              disabled={disabled}
              onClick={() => onReview("REQUEST_CHANGES")}
            >
              <RefreshCw size={15} aria-hidden="true" />
              ขอแก้ไขข้อมูล
            </button>
            <button
              type="button"
              className="request-reject"
              disabled={disabled}
              onClick={() => onReview("REJECT")}
            >
              <X size={15} aria-hidden="true" />
              ไม่อนุมัติ
            </button>
            <button
              type="button"
              className="request-approve"
              disabled={disabled}
              onClick={() => onReview("APPROVE")}
            >
              <Check size={15} aria-hidden="true" />
              {busy ? "กำลังบันทึก…" : "อนุมัติรายวิชา"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
