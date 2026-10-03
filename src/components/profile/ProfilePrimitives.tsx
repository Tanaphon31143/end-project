import type { ReactNode } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Clock3,
  Globe2,
  IdCard,
  LockKeyhole,
  Monitor,
  ShieldCheck,
  UserRound,
} from "lucide-react";

export function ProfilePageHeading() {
  return (
    <div className="account-profile-heading">
      <div>
        <h1>โปรไฟล์ของฉัน</h1>
        <p>จัดการข้อมูลส่วนตัวและความปลอดภัยของบัญชี</p>
      </div>
    </div>
  );
}

export function ProfileSection({
  title,
  description,
  icon,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`account-profile-section ${className}`}>
      <div className="account-profile-section-heading">
        <span className="account-profile-section-icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ProfileReadOnlyField({
  label,
  value,
  locked = true,
}: {
  label: string;
  value?: string | number | null;
  locked?: boolean;
}) {
  return (
    <div className="account-profile-field">
      <span className="account-profile-field-label">{label}</span>
      <div className="account-profile-readonly">
        <span>
          {value === undefined || value === null || value === ""
            ? "ไม่พบข้อมูล"
            : value}
        </span>
        {locked && <LockKeyhole size={15} aria-label="แก้ไขโดยผู้ดูแลระบบ" />}
      </div>
    </div>
  );
}

export function ProfileAccountCard({
  role,
  code,
  context,
  faceReady,
}: {
  role: "ครูผู้สอน" | "นักเรียน";
  code: string;
  context: string;
  faceReady?: boolean;
}) {
  const items = [
    { label: "ประเภทบัญชี", value: role, icon: <UserRound size={18} /> },
    {
      label: role === "ครูผู้สอน" ? "รหัสครู" : "รหัสนักเรียน",
      value: code,
      icon: <IdCard size={18} />,
    },
    {
      label: role === "ครูผู้สอน" ? "กลุ่มสาระ / แผนก" : "ชั้น / ห้อง",
      value: context,
      icon: <Building2 size={18} />,
    },
    {
      label: "สถานะบัญชี",
      value: "ใช้งานอยู่",
      icon: <ShieldCheck size={18} />,
      status: true,
    },
    {
      label: "วันที่สร้างบัญชี",
      value: "ไม่พบข้อมูล",
      icon: <CalendarDays size={18} />,
    },
    {
      label: "เข้าสู่ระบบล่าสุด",
      value: "ไม่พบข้อมูล",
      icon: <Clock3 size={18} />,
    },
    {
      label: "อุปกรณ์ล่าสุด",
      value: "ไม่พบข้อมูล",
      icon: <Monitor size={18} />,
    },
    {
      label: "เบราว์เซอร์ล่าสุด",
      value: "ไม่พบข้อมูล",
      icon: <Globe2 size={18} />,
    },
  ];
  if (faceReady !== undefined)
    items.splice(4, 0, {
      label: "ข้อมูลใบหน้า",
      value: faceReady ? "ลงทะเบียนใบหน้าแล้ว" : "ยังไม่ได้ลงทะเบียนใบหน้า",
      icon: <BadgeCheck size={18} />,
    });
  return (
    <ProfileSection
      title="ข้อมูลบัญชี"
      description="ข้อมูลสถานะและรายละเอียดบัญชีที่มีอยู่ในระบบ"
      icon={<ShieldCheck size={20} />}
      className="account-profile-account-card"
    >
      <div className="account-profile-account-grid">
        {items.map((item) => (
          <div className="account-profile-account-item" key={item.label}>
            <span className="account-profile-account-icon" aria-hidden="true">
              {item.icon}
            </span>
            <div>
              <span>{item.label}</span>
              <strong
                className={
                  "status" in item && item.status
                    ? "account-profile-green"
                    : undefined
                }
              >
                {item.value}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </ProfileSection>
  );
}
