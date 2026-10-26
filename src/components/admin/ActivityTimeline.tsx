import Link from "next/link";
import {
  CalendarPlus,
  ClipboardCheck,
  KeyRound,
  Pencil,
  Plus,
  ScanFace,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { formatActivity, type ActivityKind } from "./activity-format";

type Activity = {
  id: string;
  action: string;
  entity: string;
  description: string;
  createdAt: string;
};

const activityVisuals = {
  create: { Icon: Plus, tone: "success" },
  update: { Icon: Pencil, tone: "primary" },
  delete: { Icon: Trash2, tone: "danger" },
  attendance: { Icon: ClipboardCheck, tone: "violet" },
  account: { Icon: KeyRound, tone: "primary" },
  face: { Icon: ScanFace, tone: "violet" },
  warning: { Icon: TriangleAlert, tone: "danger" },
  other: { Icon: CalendarPlus, tone: "neutral" },
} satisfies Record<ActivityKind, { Icon: typeof Plus; tone: string }>;

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
          {rows.map((row) => {
            const activity = formatActivity(row);
            const { Icon, tone } = activityVisuals[activity.kind];
            const [date, time] = row.createdAt.split(" ");
            return (
              <div className="activity-item" key={row.id}>
                <span className={`activity-icon tone-${tone}`} aria-hidden="true">
                  <Icon size={11} strokeWidth={2.5} />
                </span>
                <div><strong>{activity.description}</strong><span>{activity.label} · {date}</span></div>
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
