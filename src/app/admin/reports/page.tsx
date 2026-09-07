import ReportsManager from "@/components/admin/reports/ReportsManager";
import { getReportData } from "@/lib/admin-data";
import "./reports.css";
export const dynamic="force-dynamic";
export default async function ReportsPage(){return <ReportsManager initialData={await getReportData()}/>}
