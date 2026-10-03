import Link from "next/link";
import {
  CalendarPlus,
  Check,
  ClipboardCheck,
  Settings,
  UserRound,
} from "lucide-react";

type Activity = {
  id: string;
  action: string;
  entity: string;
  description: string;
  createdAt: string;
};

const activityVisuals = [
  { Icon: Check, tone: "success" },
  { Icon: UserRound, tone: "primary" },
  { Icon: ClipboardCheck, tone: "violet" },
  { Icon: CalendarPlus, tone: "neutral" },
  { Icon: Settings, tone: "danger" },
] as const;

export function ActivityTimeline({ rows }: { rows: Activity[] }) {
  return (
    <section className="dashboard-card activity-card">
      <div className="dashboard-section-head">
        <div className="dashboard-section-title">
          <span className="section-icon amber"><CalendarPlus size={18} /></span>
          <div><h2>กิจกรรมล่าสุด</h2><p>รายการดำเนินการล่าสุดในระบบ</p></div>
        </div>
        <Link className="card-head-link activity-view-all" href="/admin/reports">
          ดูทั้งหมด
        </Link>
      </div>
      {rows.length ? (
        <div className="activity-timeline">
          {rows.map((row, index) => {
            const { Icon, tone } = activityVisuals[index % activityVisuals.length];
            const [date, time] = row.createdAt.split(" ");
            return (
              <div className="activity-item" key={row.id}>
                <span className={`activity-icon tone-${tone}`} aria-hidden="true">
                  <Icon size={11} strokeWidth={2.5} />
                </span>
                <div><strong>{row.description}</strong><span>{row.action} · {date}</span></div>
                <time>{time || date}</time>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dashboard-empty-state">ยังไม่มีกิจกรรมล่าสุด</div>
      )}
    </section>
  );
}
