import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { searchPortal } from "@/lib/portal-search";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/");
  const q = (await searchParams).q?.trim().slice(0, 100) || "";
  const results = q ? await searchPortal(session, q) : [];
  return <section className="admin-page"><h1>ผลการค้นหา</h1><p>คำค้นหา: {q || "ยังไม่ได้ระบุ"}</p><div className="portal-search-page-results">{results.map((result) => <article id={result.id.replace(":", "-")} key={result.id}><h2>{result.title}</h2><p>{result.detail}</p><Link href={result.id.startsWith("student:") ? "/admin/students" : result.id.startsWith("teacher:") ? "/admin/teachers" : result.id.startsWith("subject:") ? "/admin/subjects" : result.href}>ไปยังหน้าจัดการ</Link></article>)}{!results.length && <p>ไม่พบข้อมูลที่ค้นหา</p>}</div></section>;
}
