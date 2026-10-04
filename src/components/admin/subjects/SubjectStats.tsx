import { BookOpen, BookOpenCheck, School } from "lucide-react";

type Props = {
  subjectCount: number;
  activeSubjectCount: number;
  classroomCount: number;
};

export function SubjectStats({
  subjectCount,
  activeSubjectCount,
  classroomCount,
}: Props) {
  const items = [
    {
      label: "จำนวนรายวิชาทั้งหมด",
      value: subjectCount,
      unit: "รายวิชา",
      tone: "amber",
      icon: BookOpen,
    },
    {
      label: "รายวิชาที่กำลังสอน",
      value: activeSubjectCount,
      unit: "รายวิชา",
      tone: "blue",
      icon: BookOpenCheck,
    },
    {
      label: "ชั้นเรียนที่เปิดสอน",
      value: classroomCount,
      unit: "ห้องเรียน",
      tone: "green",
      icon: School,
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
