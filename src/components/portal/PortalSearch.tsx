"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import "./PortalSearch.css";

type Result = { id: string; title: string; detail: string; href: string };
export default function PortalSearch({ role, menus = [] }: { role: "admin" | "teacher"; menus?: readonly (readonly [string, string])[] }) {
  const router = useRouter();
  const id = useId();
  const root = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<{ query: string; results: Result[]; error: string } | null>(null);
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const q = query.trim();
  const menuResults = menus.filter(([label]) => label.toLocaleLowerCase("th").includes(q.toLocaleLowerCase("th"))).map(([title, href]) => ({ id: href, title, href, detail: "เมนู" }));
  const loading = Boolean(q && data?.query !== q);
  const results = [...menuResults, ...(data?.query === q ? data.results : [])];
  useEffect(() => {
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        if (!controller.signal.aborted) setData({ query: q, results: body.results, error: "" });
      } catch {
        if (!controller.signal.aborted) setData({ query: q, results: [], error: "ค้นหาไม่สำเร็จ กรุณาลองใหม่" });
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, retry]);
  useEffect(() => {
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) { setOpen(false); setExpanded(false); } }
    function keys(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setExpanded(true); setOpen(true); requestAnimationFrame(() => input.current?.focus()); }
      if (event.key === "Escape") { setOpen(false); setExpanded(false); }
    }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", keys);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", keys); };
  }, []);
  function choose(result: Result) { setOpen(false); setExpanded(false); setQuery(""); setActive(-1); router.push(result.href); }
  return <form ref={root} className={`portal-search ${expanded ? "is-expanded" : ""}`} role="search" onSubmit={(event) => { event.preventDefault(); if (results[active < 0 ? 0 : active]) choose(results[active < 0 ? 0 : active]); }}>
    <button className="portal-search-toggle" type="button" aria-label={expanded ? "ปิดช่องค้นหา" : "เปิดช่องค้นหา"} aria-expanded={expanded} onClick={() => { setExpanded(!expanded); setOpen(!expanded); requestAnimationFrame(() => input.current?.focus()); }}><Search size={19} /></button>
    <div className="portal-search-input"><Search size={19} aria-hidden="true" /><input ref={input} aria-label={role === "admin" ? "ค้นหานักเรียน ครู รายวิชา ชั้นเรียน" : "ค้นหาเมนู นักเรียน รายวิชา"} placeholder={role === "admin" ? "ค้นหานักเรียน, ครู, รายวิชา..." : "ค้นหาเมนู, นักเรียน, รายวิชา..."} value={query} maxLength={100} role="combobox" aria-expanded={open} aria-controls={id} aria-autocomplete="list" aria-activedescendant={active >= 0 && results[active] ? `${id}-${active}` : undefined} autoComplete="off" onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(-1); }} onKeyDown={(event) => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setOpen(true); setActive((previous) => results.length ? (previous + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length : -1); } }} /><kbd>Ctrl K</kbd></div>
    {open && <div className="portal-search-results" id={id} role="listbox" aria-label="ผลการค้นหา">
      {!q && !results.length && <p>พิมพ์ชื่อหรือรหัสเพื่อค้นหา</p>}
      {results.map((result, index) => <button id={`${id}-${index}`} role="option" aria-selected={active === index} key={result.id} type="button" onClick={() => choose(result)}><strong>{result.title}</strong><small>{result.detail}</small></button>)}
      {loading && <p role="status">กำลังค้นหาข้อมูล...</p>}
      {data?.query === q && data.error && <p role="alert">{data.error} <button type="button" onClick={() => { setData(null); setRetry((value) => value + 1); }}>ลองใหม่</button></p>}
      {q && !loading && !data?.error && !results.length && <p role="status">ไม่พบข้อมูลที่ค้นหา</p>}
    </div>}
  </form>;
}
