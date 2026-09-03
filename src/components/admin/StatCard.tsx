import type { IconComponent } from "./types";

type Props = { icon: IconComponent; title: string; value: string; unit: string; note: string; tone: "blue" | "green" | "purple" | "orange" };

export function StatCard({ icon: Icon, title, value, unit, note, tone }: Props) {
  return (
    <article className="admin-stat-card">
      <div className="stat-card-main">
        <div className="stat-card-copy">
          <p className="stat-card-title">{title}</p>
          <p className="stat-card-value"><strong>{value}</strong><span>{unit}</span></p>
        </div>
        <div className={`stat-icon stat-icon-${tone}`}><Icon size={22} strokeWidth={2.2} /></div>
      </div>
      <p className="stat-card-note">{note}</p>
    </article>
  );
}
