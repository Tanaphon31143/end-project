import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, House, SearchX, type LucideIcon } from "lucide-react";
import "./UserManagementUI.css";

export function ManagementPageHeader({ title, description, section, action, tone = "light" }: { title: string; description: string; section?: string; action?: ReactNode; tone?: "light" | "dark" }) {
  return <header className={`um-heading um-heading-${tone}`}>
    {!section&&<Image src="/images/khukhan-signature.webp" width={174} height={58} alt="Khukhan School" className="um-school-signature"/>}
    <nav aria-label="ตำแหน่งหน้าจัดการผู้ใช้งาน" className="um-breadcrumb"><Link href="/admin/dashboard" aria-label="แดชบอร์ด"><House size={16} /></Link><ChevronRight size={14}/>{section ? <><Link href="/admin/users">จัดการผู้ใช้งาน</Link><ChevronRight size={14}/><span aria-current="page">{section}</span></> : <span aria-current="page">จัดการผู้ใช้งาน</span>}</nav>
    <div className="um-heading-row"><div><h1>{title}</h1><p>{description}</p></div>{action && <div className="um-heading-action">{action}</div>}</div>
  </header>;
}

type SummaryTrend = { label: string; description: string; direction: "up" | "down" | "flat"; series: number[] };
type SummaryItem = { label: string; value: ReactNode; unit?: string; icon: LucideIcon; tone?: "blue" | "green" | "purple" | "amber" | "rose"; note?: string; ratio?: number; trend?: SummaryTrend };

function SummaryChart({series}:{series:number[]}) {
  const max=Math.max(1,...series);
  const points=series.map((value,index)=>[index*140/Math.max(1,series.length-1),56-value/max*48]);
  const line=points.map(([x,y],index)=>index===0?`M ${x} ${y}`:`C ${(points[index-1][0]+x)/2} ${points[index-1][1]}, ${(points[index-1][0]+x)/2} ${y}, ${x} ${y}`).join(' ');
  return <svg className="um-stat-chart" viewBox="0 0 140 64" preserveAspectRatio="none" aria-hidden="true"><path d={line+' L 140 64 L 0 64 Z'} className="um-chart-fill"/><path d={line} className="um-chart-line"/></svg>;
}

export function ManagementSummary({items,variant="standard"}:{items:SummaryItem[];variant?:"standard"|"users"|"teacher"}) {
  return <section className={`um-summary um-summary-${variant}`} aria-label="สรุปข้อมูล">{items.map(({label,value,unit,icon:Icon,tone="blue",note,ratio,trend})=><article className={`um-stat um-stat-${tone}${trend?' um-stat-has-chart':''}`} key={label}>
    <span className="um-stat-icon"><Icon size={30} strokeWidth={1.8}/></span>
    <div className="um-stat-copy"><h2>{label}</h2><p><strong>{value}</strong>{unit&&<span>{unit}</span>}</p>{note&&<small>{note}</small>}</div>
    {typeof ratio==='number'&&<span className="um-stat-ring" role="img" aria-label={`${label} ${Math.round(ratio*100)} เปอร์เซ็นต์`}><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26"/><circle cx="32" cy="32" r="26" pathLength="100" strokeDasharray={`${Math.max(0,Math.min(100,ratio*100))} 100`}/></svg><b>{Math.round(ratio*100)}%</b></span>}
    {trend&&<><div className="um-stat-trend"><span className={`um-trend-badge um-trend-${trend.direction}`}>{trend.direction==='up'?<ArrowUp size={13}/>:trend.direction==='down'?<ArrowDown size={13}/>:null}{trend.label}</span><small>{trend.description}</small></div><SummaryChart series={trend.series}/></>}
  </article>)}</section>;
}

export function ManagementPagination({page,pageSize,total,onPageChange,onPageSizeChange,label="รายการ"}:{page:number;pageSize:number;total:number;onPageChange:(page:number)=>void;onPageSizeChange:(size:number)=>void;label?:string}) {
  const pages=Math.max(1,Math.ceil(total/pageSize));
  const current=Math.min(Math.max(1,page),pages);
  const first=Math.max(1,Math.min(current-1,pages-2));
  const numbers=Array.from({length:Math.min(3,pages)},(_,i)=>first+i);
  return <nav className="um-pagination" aria-label={`แบ่งหน้า${label}`}><p aria-live="polite">แสดง {total ? (current-1)*pageSize+1 : 0}–{Math.min(current*pageSize,total)} จาก {total.toLocaleString("th-TH")} {label}</p><div><button type="button" className="um-page-button" aria-label="หน้าก่อนหน้า" disabled={current===1} onClick={()=>onPageChange(current-1)}><ChevronLeft size={17}/></button>{numbers.map(n=><button type="button" className={`um-page-button ${n===current?"is-active":""}`} key={n} aria-label={`หน้า ${n}`} aria-current={n===current?"page":undefined} onClick={()=>onPageChange(n)}>{n}</button>)}<button type="button" className="um-page-button" aria-label="หน้าถัดไป" disabled={current===pages} onClick={()=>onPageChange(current+1)}><ChevronRight size={17}/></button><select aria-label="จำนวนรายการต่อหน้า" value={pageSize} onChange={e=>onPageSizeChange(Number(e.target.value))}>{[10,20,50].map(size=><option key={size} value={size}>{size} / หน้า</option>)}</select></div></nav>;
}

export function ManagementEmpty({title,description="ลองเปลี่ยนคำค้นหาหรือตัวกรอง"}:{title:string;description?:string}) {
  return <div className="um-empty"><SearchX size={32}/><h3>{title}</h3><p>{description}</p></div>;
}

export function exportManagementCsv(filename:string,headers:string[],rows:(string|number)[][]) {
  const escape=(value:string|number)=>{const text=String(value);return `"${(/^[\s]*[=+@-]/.test(text)?"'"+text:text).replaceAll('"','""')}"`;};
  const csv="\uFEFF"+[headers,...rows].map(row=>row.map(escape).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}
