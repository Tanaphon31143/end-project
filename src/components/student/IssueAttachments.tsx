"use client";
import Image from 'next/image';
import { useRef, useState } from 'react';

export default function IssueAttachments({ reportId }: { reportId: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<Array<{ id: string | number; name: string }>>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function open() {
    dialog.current?.showModal();
    setLoading(true); setError(''); setSelected(0);
    try {
      const response = await fetch(`/api/student/reports/${reportId}/attachments`, { cache: 'no-store' });
      if (!response.ok) throw new Error('โหลดไฟล์แนบไม่สำเร็จ');
      setItems((await response.json()).attachments);
    } catch { setError('โหลดไฟล์แนบไม่สำเร็จ กรุณาลองใหม่'); }
    finally { setLoading(false); }
  }
  const item = items[selected];
  const url = item ? `/api/student/reports/${reportId}/attachments?id=${encodeURIComponent(item.id)}` : '';
  return <>
    <button type="button" className="button secondary" onClick={open}>ดูรูปแนบ</button>
    <dialog ref={dialog} className="issue-gallery" aria-label={`รูปแนบคำร้อง ${reportId}`}>
      <header><strong>รูปแนบคำร้อง #{reportId}</strong><button type="button" className="button secondary" onClick={() => dialog.current?.close()}>ปิด</button></header>
      {loading ? <p role="status">กำลังโหลดรูปแนบ...</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={open}>ลองใหม่</button></div> : !item ? <p>ไม่มีรูปแนบ</p> : <>
        <Image key={url} src={url} width={900} height={650} unoptimized alt={item.name} onError={() => setError('ไม่สามารถเปิดรูปนี้ได้')} />
        <nav aria-label="เลือกรูปแนบ">{items.map((entry, index) => <button type="button" className="button secondary" key={entry.id} aria-pressed={selected === index} onClick={() => setSelected(index)}>รูป {index + 1}</button>)}</nav>
        <a className="button primary" href={`${url}&download=1`}>ดาวน์โหลดรูป {selected + 1}</a>
      </>}
    </dialog>
  </>;
}
