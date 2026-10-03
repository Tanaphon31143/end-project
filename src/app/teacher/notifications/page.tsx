import { redirect } from "next/navigation";
import { getTeacherSession } from "@/lib/auth";
import { getTeacherNotifications } from "@/lib/teacher-data";

export default async function TeacherNotificationsPage() {
  const session = await getTeacherSession();
  if (!session) redirect("/");
  const notifications = await getTeacherNotifications(session.id);
  return (
    <section className="page-section teacher-notification-history">
      <div className="page-heading"><div><span className="eyebrow">กล่องข้อความ</span><h1>ประวัติการแจ้งเตือน</h1><p>ติดตามความเคลื่อนไหวและกิจกรรมของรายวิชา</p></div></div>
      <div className="card shared-notif-history-card">
        {notifications.length ? notifications.map((item) => (
          <a className={`shared-notif-item ${item.isRead ? "is-read" : "is-unread"}`} href={item.href} key={item.id}>
            <span className="shared-notif-icon shared-notif-info">i</span>
            <span className="shared-notif-content"><span className="shared-notif-meta"><span className="shared-notif-category shared-notif-info">แจ้งเตือน</span><time>{item.createdAt}</time></span><strong>{item.title}</strong><span className="shared-notif-description">{item.detail}</span><span className="shared-notif-detail">กดเพื่อดูรายละเอียด</span></span>
          </a>
        )) : <p className="shared-notif-empty">ไม่มีการแจ้งเตือนใหม่</p>}
      </div>
    </section>
  );
}
