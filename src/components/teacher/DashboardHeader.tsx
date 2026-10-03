import { RefreshButton } from "./RefreshButton";

export function DashboardHeader({
  name,
  date,
}: {
  name?: string | null;
  date: string;
}) {
  const displayName = name?.trim() || "";
  return (
    <header className="dashboard-welcome">
      <div className="dashboard-welcome-copy">
        <p className="dashboard-eyebrow">ภาพรวมการเข้าเรียน</p>
        <h2>
          สวัสดีครับ{" "}
          {displayName.startsWith("คุณครู")
            ? displayName
            : `คุณครู${displayName}`}
        </h2>
        <p className="dashboard-date">{date}</p>
      </div>
      <RefreshButton />
    </header>
  );
}
