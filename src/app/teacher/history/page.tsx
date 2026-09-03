import Link from "next/link";
const rows = [
  {
    id: 101,
    date: "3 ก.ย. 2569",
    course: "ว30201 วิทยาการคำนวณ",
    room: "ม.4/1",
    p: 31,
    l: 2,
    a: 2,
    leave: 1,
  },
  {
    id: 99,
    date: "2 ก.ย. 2569",
    course: "ว32102 การเขียนโปรแกรม",
    room: "ม.5/2",
    p: 28,
    l: 1,
    a: 2,
    leave: 1,
  },
  {
    id: 96,
    date: "1 ก.ย. 2569",
    course: "ว33101 โครงงานคอมพิวเตอร์",
    room: "ม.6/1",
    p: 27,
    l: 0,
    a: 1,
    leave: 1,
  },
  {
    id: 92,
    date: "31 ส.ค. 2569",
    course: "ว30203 เทคโนโลยีสารสนเทศ",
    room: "ม.4/3",
    p: 27,
    l: 2,
    a: 1,
    leave: 1,
  },
];
export default function History() {
  return (
    <>
      <div className="page-head">
        <div>
          <h2>ประวัติการเข้าเรียน</h2>
          <p>ค้นหาและตรวจสอบผลการเช็คชื่อย้อนหลัง</p>
        </div>
      </div>
      <section className="panel">
        <form className="filters">
          <select defaultValue="">
            <option value="">ทุกรายวิชา</option>
            <option>ว30201 วิทยาการคำนวณ</option>
            <option>ว32102 การเขียนโปรแกรม</option>
          </select>
          <input type="date" aria-label="วันที่เริ่มต้น" />
          <input type="date" aria-label="วันที่สิ้นสุด" />
          <input placeholder="ค้นหาชื่อหรือรหัสนักเรียน" />
          <button className="button primary">ค้นหา</button>
        </form>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>รายวิชา</th>
                <th>ห้อง</th>
                <th>เข้าเรียน</th>
                <th>สาย</th>
                <th>ขาด</th>
                <th>ลา</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>
                    <b>{r.course}</b>
                  </td>
                  <td>{r.room}</td>
                  <td>
                    <span className="status PRESENT">{r.p}</span>
                  </td>
                  <td>
                    <span className="status LATE">{r.l}</span>
                  </td>
                  <td>
                    <span className="status ABSENT">{r.a}</span>
                  </td>
                  <td>
                    <span className="status LEAVE">{r.leave}</span>
                  </td>
                  <td>
                    <Link
                      className="button secondary"
                      href={`/teacher/scan/${r.id}`}
                    >
                      ดูรายละเอียด
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
