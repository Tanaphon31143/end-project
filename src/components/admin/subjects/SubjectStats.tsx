import { BookOpen, Clock3, School, UserRound } from "lucide-react";

type Props = {
  pendingRequests: number;
  subjectCount: number;
  classroomCount: number;
  teacherCount: number;
};

export function SubjectStats({
  pendingRequests,
  subjectCount,
  classroomCount,
  teacherCount,
}: Props) {
  const items = [
    {
      label: "คำขอรอตรวจสอบ",
      value: pendingRequests,
      unit: "รายการ",
      tone: "amber",
      icon: Clock3,
    },
    {
      label: "รายวิชาทั้งหมด",
      value: subjectCount,
      unit: "รายวิชา",
      tone: "blue",
      icon: BookOpen,
    },
    {
      label: "ชั้นเรียนที่เปิดสอน",
      value: classroomCount,
      unit: "ห้องเรียน",
      tone: "green",
      icon: School,
    },
    {
      label: "ครูผู้สอนทั้งหมด",
      value: teacherCount,
      unit: "คน",
      tone: "violet",
      icon: UserRound,
    },
  ] as const;

  return (
    <section className="subject-stats" aria-label="สรุปข้อมูลรายวิชา">
      {items.map(({ label, value, unit, tone, icon: Icon }) => (
        <article className={`subject-stat subject-stat--${tone}`} key={label}>
          <span className="subject-stat-icon" aria-hidden="true">
            <Icon size={20} />
          </span>
          <div>
            <p>{label}</p>
            <strong>{value.toLocaleString("th-TH")}</strong>
            <span>{unit}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
