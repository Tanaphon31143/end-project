"use client";

export default function StudentError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <section className="card card-pad" role="alert">
    <h2>โหลดข้อมูลไม่สำเร็จ</h2>
    <p>กรุณาลองใหม่ หากยังพบปัญหาให้ติดต่อผู้ดูแลระบบ</p>
    <button type="button" className="button primary" onClick={retry}>ลองใหม่</button>
  </section>;
}
