import type { ReactNode } from "react";
import { Eye, KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";

export function PageIntro({
  title,
  description,
  action = "เพิ่มข้อมูล",
}: {
  title: string;
  description: string;
  action?: string;
}) {
  return (
    <div className="page-intro">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button className="admin-button primary">
        <Plus size={18} />
        {action}
      </button>
    </div>
  );
}

export function FilterBar({
  search = "ค้นหา...",
  filters = [],
}: {
  search?: string;
  filters?: string[];
}) {
  return (
    <div className="admin-filters">
      <label>
        <Search size={18} />
        <input aria-label={search} placeholder={search} />
      </label>
      {filters.map((filter) => (
        <select aria-label={filter} key={filter} defaultValue="">
          <option value="">{filter}</option>
          <option>ทั้งหมด</option>
        </select>
      ))}
      <button className="admin-button secondary">ค้นหา</button>
    </div>
  );
}

export type Column<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
};
export function AdminTable<T extends { id: string }>({
  title,
  subtitle,
  columns,
  rows,
  actions = ["ดู", "แก้ไข", "ลบ"],
}: {
  title: string;
  subtitle?: string;
  columns: Column<T>[];
  rows: T[];
  actions?: string[];
}) {
  const icons: Record<string, ReactNode> = {
    ดู: <Eye size={16} />,
    แก้ไข: <Pencil size={16} />,
    เปลี่ยนรหัสผ่าน: <KeyRound size={16} />,
    ลบ: <Trash2 size={16} />,
  };
  return (
    <section className="dashboard-card admin-table-card">
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <span className="row-count">ทั้งหมด {rows.length} รายการ</span>
      </div>
      <div className="admin-data-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)}>{col.label}</th>
              ))}
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={String(col.key)}>
                    {col.render ? col.render(row) : String(row[col.key])}
                  </td>
                ))}
                <td>
                  <div className="table-actions">
                    {actions.map((action) => (
                      <button
                        className={action === "ลบ" ? "danger" : ""}
                        aria-label={action}
                        title={action}
                        key={action}
                      >
                        {icons[action]}
                        <span>{action}</span>
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PersonCell({
  initials,
  name,
  detail,
}: {
  initials: string;
  name: string;
  detail?: string;
}) {
  return (
    <div className="person-cell">
      <span>{initials}</span>
      <div>
        <b>{name}</b>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}
export function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "orange" | "red" | "purple" | "gray";
}) {
  return <span className={`data-badge ${tone}`}>{children}</span>;
}
