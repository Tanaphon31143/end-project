import { Megaphone } from "lucide-react";
import type { Announcement } from "@/lib/announcements";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import { EmptyState } from "@/components/portal/EmptyState";

/** The same school announcements students see, on the teacher dashboard. */
export function SchoolNewsPanel({ announcements }: { announcements: Announcement[] }) {
  return (
    <section id="school-news" className="panel dashboard-panel teacher-school-news" aria-labelledby="school-news-heading" tabIndex={-1}>
      <div className="dashboard-panel-head">
        <h3 id="school-news-heading">
          <span className="teacher-school-news-icon" aria-hidden="true"><Megaphone size={18} /></span>
          ข่าวสารจากโรงเรียน
        </h3>
        <span className="teacher-school-news-note">นักเรียนเห็นประกาศชุดเดียวกันนี้</span>
      </div>
      {announcements.length ? (
        <div className="teacher-school-news-list">
          {announcements.map((item) => <AnnouncementCard key={item.id} announcement={item} />)}
        </div>
      ) : (
        <EmptyState icon={Megaphone} title="ยังไม่มีประกาศจากโรงเรียน" description="เมื่อฝ่ายบริหารเผยแพร่ประกาศ จะแสดงที่นี่และบนแดชบอร์ดของนักเรียนพร้อมกัน" />
      )}
    </section>
  );
}
