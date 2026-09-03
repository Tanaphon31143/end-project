export default function Profile() {
  return (
    <>
      <div className="page-head">
        <div>
          <h2>โปรไฟล์ของฉัน</h2>
          <p>จัดการข้อมูลส่วนตัวและความปลอดภัยของบัญชี</p>
        </div>
      </div>
      <div className="profile-grid">
        <aside className="panel profile-card">
          <div className="profile-photo">สจ</div>
          <h3>นายสมชาย ใจดี</h3>
          <p>ครูชำนาญการ</p>
          <p>รหัสครู T-0042</p>
        </aside>
        <div className="stack">
          <form className="panel">
            <div className="panel-head">
              <div>
                <h3>ข้อมูลส่วนตัว</h3>
                <span className="muted">
                  ชื่อและรหัสครูแก้ไขได้โดยผู้ดูแลระบบเท่านั้น
                </span>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>ชื่อ</label>
                <input defaultValue="สมชาย" disabled />
              </div>
              <div className="field">
                <label>นามสกุล</label>
                <input defaultValue="ใจดี" disabled />
              </div>
              <div className="field">
                <label>อีเมล</label>
                <input type="email" defaultValue="somchai@school.ac.th" />
              </div>
              <div className="field">
                <label>เบอร์โทร</label>
                <input defaultValue="089-123-4567" />
              </div>
            </div>
            <div className="form-actions">
              <button className="button primary">บันทึกการเปลี่ยนแปลง</button>
            </div>
          </form>
          <form className="panel">
            <div className="panel-head">
              <h3>เปลี่ยนรหัสผ่าน</h3>
            </div>
            <div className="form-grid">
              <div className="field full">
                <label>รหัสผ่านเดิม</label>
                <input type="password" autoComplete="current-password" />
              </div>
              <div className="field">
                <label>รหัสผ่านใหม่</label>
                <input type="password" autoComplete="new-password" />
              </div>
              <div className="field">
                <label>ยืนยันรหัสผ่านใหม่</label>
                <input type="password" autoComplete="new-password" />
              </div>
            </div>
            <div className="form-actions">
              <button className="button primary">เปลี่ยนรหัสผ่าน</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
