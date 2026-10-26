import { getAdminAnnouncements } from "@/lib/announcements";
import AnnouncementsManager from "@/components/admin/AnnouncementsManager";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  return <AnnouncementsManager initial={await getAdminAnnouncements()} />;
}
