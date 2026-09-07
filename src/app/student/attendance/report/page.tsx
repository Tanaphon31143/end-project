import { Badge, PageTitle } from "@/components/student/UI";
import IssueForm from "@/components/student/IssueForm";
const issues = [
  [
    "29 ส.ค. 2569",
    "ฐานข้อมูลเบื้องต้น",
    "สแกนไม่ติด",
    "กำลังตรวจสอบ",
    "กำลังตรวจสอบภาพจากกล้อง",
  ],
  [
    "18 ส.ค. 2569",
    "การออกแบบเว็บไซต์",
    "เช็คชื่อผิดเวลา",
    "เสร็จสิ้น",
    "แก้ไขสถานะเป็นมาเรียนแล้ว",
  ],
  [
    "4 ส.ค. 2569",
    "คอมพิวเตอร์พื้นฐาน",
    "ระบบไม่เปิดกล้อง",
    "ปฏิเสธ",
    "ไม่พบข้อมูลการเข้าใช้งาน",
  ],
];
export default function Report() {
  return (
    <>
      <PageTitle
        eyebrow="ศูนย์ช่วยเหลือ"
        title="แจ้งปัญหาการเช็คชื่อ"
        description="ส่งรายละเอียดให้เจ้าหน้าที่ตรวจสอบและติดตามผลได้ที่หน้านี้"
      />
      <section className="card card-pad report-card">
        <h2>รายละเอียดปัญหา</h2>
        <p>กรอกข้อมูลให้ครบถ้วนเพื่อช่วยให้ตรวจสอบได้รวดเร็วขึ้น</p>
        <IssueForm />
      </section>
      <section className="card report-history">
        <div className="section-head">
          <div>
            <h2>ประวัติการแจ้งปัญหา</h2>
            <p>คำร้องทั้งหมด 3 รายการ</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่แจ้ง</th>
                <th>รายวิชา</th>
                <th>ประเภทปัญหา</th>
                <th>สถานะ</th>
                <th>ผลการดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((r) => (
                <tr key={r[0] + r[1]}>
                  <td>{r[0]}</td>
                  <td>
                    <strong>{r[1]}</strong>
                  </td>
                  <td>{r[2]}</td>
                  <td>
                    <Badge>{r[3]}</Badge>
                  </td>
                  <td>{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
