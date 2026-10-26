import { Download, Paperclip } from "lucide-react";
import type { Announcement, AnnouncementAttachment } from "@/lib/announcements";
import AnnouncementContent from "@/components/announcements/AnnouncementContent";
import styles from "./StudentAnnouncementCard.module.css";

function formatFileSize(size: number) {
  if (size < 1024) return `${size} ไบต์`;
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentLabel(file: AnnouncementAttachment) {
  if (file.type === "application/pdf") return "PDF";
  return "รูปภาพ";
}

export default function StudentAnnouncementCard({
  announcement,
}: {
  announcement: Announcement;
}) {
  return (
    <article className={styles.announcement}>
      <h3>{announcement.title}</h3>
      <time>{announcement.createdAt}</time>
      <AnnouncementContent
        message={announcement.message}
        className={styles.message}
        compact
      />
      {announcement.attachments.length > 0 && (
        <ul className={styles.attachments} aria-label="ไฟล์แนบประกาศ">
          {announcement.attachments.map((file) => (
            <li key={file.id} className={styles.attachment}>
              <Paperclip size={15} aria-hidden="true" />
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.fileDetails}>
                {attachmentLabel(file)} · {formatFileSize(file.size)}
              </span>
              <a href={`${file.url}?download=1`} className={styles.download}>
                <Download size={15} aria-hidden="true" />
                <span>ดาวน์โหลด</span>
                <span className={styles.visuallyHidden}>{file.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
