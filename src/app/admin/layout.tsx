import type { Metadata } from "next";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import "./dashboard/admin.css";
import "../portal-ui.css";
import "../responsive.css";

export const metadata: Metadata = {
  title: "แดชบอร์ดผู้ดูแลระบบ | โรงเรียนขุขันธ์",
  description: "ระบบบริหารการเช็คชื่อด้วยการสแกนใบหน้าสำหรับผู้ดูแลระบบ",
};

export default async function AdminRouteLayout({ children }: LayoutProps<"/admin">) {
  const admin = await getAdminSession();
  if (!admin) redirect("/");
  return <AdminLayout adminName={admin.name}>{children}</AdminLayout>;
}
