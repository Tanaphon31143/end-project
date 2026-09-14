"use client";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return <section className="card card-pad" role="alert"><h2>โหลดคำร้องไม่สำเร็จ</h2><button type="button" className="button primary" onClick={retry}>ลองใหม่</button></section>;
}
