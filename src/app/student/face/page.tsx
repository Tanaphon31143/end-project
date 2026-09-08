import Image from "next/image";
import { redirect } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Cpu,
  Globe,
  Info,
  Laptop,
  ScanFace,
  ShieldCheck,
  Smartphone,
  SunMedium,
  UserCheck,
  XCircle,
} from "lucide-react";
import { PageTitle } from "@/components/student/UI";
import { getStudentSession } from "@/lib/auth";
import { getStudentFaceData, type FaceSampleItem } from "@/lib/student-data";

export const dynamic = "force-dynamic";

function getPoseLabel(poseType: FaceSampleItem["poseType"]): string {
  switch (poseType) {
    case "FRONT":
      return "หน้าตรง";
    case "LEFT":
      return "หันซ้าย";
    case "RIGHT":
      return "หันขวา";
    case "UP":
      return "เงยหน้า";
    case "DOWN":
      return "ก้มหน้า";
    default:
      return "ไม่ระบุมุมภาพ";
  }
}

function getPoseClass(poseType: FaceSampleItem["poseType"]): string {
  switch (poseType) {
    case "FRONT":
      return "pose-front";
    case "LEFT":
    case "RIGHT":
      return "pose-side";
    case "UP":
    case "DOWN":
      return "pose-tilt";
    default:
      return "pose-unknown";
  }
}

export default async function FacePage() {
  const session = await getStudentSession();
  if (!session) redirect("/");

  const face = await getStudentFaceData(session.id);
  const ready = face?.status === "READY";

  return (
    <>
      <PageTitle
        eyebrow="ความปลอดภัยทางชีวมิติ"
        title="ข้อมูลใบหน้า"
        description="ข้อมูลนี้ใช้ยืนยันตัวตนสำหรับการเช็คชื่อด้วยการสแกนใบหน้าเท่านั้น"
      />

      {/* Status Overview Card */}
      <section className={`card face-status ${ready ? "is-ready" : "is-pending"}`}>
        <div className="face-status-icon">
          {ready ? <ShieldCheck size={32} /> : <XCircle size={32} />}
        </div>
        <div className="face-status-info">
          <span>สถานะข้อมูลใบหน้า</span>
          <h2>
            {ready ? (
              <>
                <CheckCircle2 size={22} /> พร้อมใช้งานสำหรับการเช็คชื่อ
              </>
            ) : face?.status === "INACTIVE" ? (
              "ถูกปิดการใช้งานชั่วคราว"
            ) : (
              "ยังไม่พร้อมใช้งาน"
            )}
          </h2>
          <p>
            {ready
              ? `ระบบมีภาพใบหน้าอ้างอิง ${face.imageCount} มุมภาพ พร้อมใช้งานยืนยันตัวตนในทุกคาบเรียน`
              : face
                ? "ข้อมูลใบหน้าต้องได้รับการเปิดใช้งานโดยผู้ดูแลระบบ"
                : "ยังไม่มีข้อมูลใบหน้าในระบบ กรุณาติดต่อครูผู้สอนหรือฝ่ายวิชาการเพื่อลงทะเบียน"}
          </p>
        </div>
      </section>

      {/* Registration Details & Metadata Grid */}
      {face && (
        <section className="card card-pad face-audit-card">
          <div className="section-head">
            <div>
              <h2>รายละเอียดการลงทะเบียน</h2>
              <p>บันทึกประวัติและอุปกรณ์ที่ใช้ลงทะเบียนใบหน้าเพื่อความโปร่งใสและปลอดภัย</p>
            </div>
          </div>
          <div className="face-audit-grid">
            <div className="audit-item">
              <div className="audit-icon">
                <UserCheck size={20} />
              </div>
              <div className="audit-content">
                <span>ผู้ลงทะเบียน</span>
                <strong>{face.registeredByName}</strong>
                <small>บทบาท: {face.registeredByRole === "ADMIN" ? "ผู้ดูแลระบบ (Admin)" : "ครูผู้สอน (Teacher)"}</small>
              </div>
            </div>

            <div className="audit-item">
              <div className="audit-icon">
                <Laptop size={20} />
              </div>
              <div className="audit-content">
                <span>อุปกรณ์ที่ใช้บันทึก</span>
                <strong>{face.deviceType}</strong>
                <small>{face.deviceName}</small>
              </div>
            </div>

            <div className="audit-item">
              <div className="audit-icon">
                <Globe size={20} />
              </div>
              <div className="audit-content">
                <span>เบราว์เซอร์ / ระบบ</span>
                <strong>{face.browser}</strong>
                <small>สภาพแวดล้อมที่บันทึกข้อมูล</small>
              </div>
            </div>

            <div className="audit-item">
              <div className="audit-icon">
                <Camera size={20} />
              </div>
              <div className="audit-content">
                <span>กล้องที่ใช้บันทึก</span>
                <strong>{face.cameraType}</strong>
                <small>อุปกรณ์ตรวจจับภาพ</small>
              </div>
            </div>

            <div className="audit-item">
              <div className="audit-icon">
                <ShieldCheck size={20} />
              </div>
              <div className="audit-content">
                <span>IP Address ที่ลงทะเบียน</span>
                <strong>{face.registrationIp}</strong>
                <small>นโยบายความเป็นส่วนตัว (Masked IP)</small>
              </div>
            </div>

            <div className="audit-item">
              <div className="audit-icon">
                <Cpu size={20} />
              </div>
              <div className="audit-content">
                <span>วันเวลาบันทึกและอัปเดต</span>
                <strong>ลงทะเบียน: {face.registeredAt}</strong>
                <small>อัปเดตล่าสุด: {face.updatedAt}</small>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Face Gallery with Real Pose Types */}
      <section className="card face-gallery-wrap">
        <div className="section-head">
          <div>
            <h2>ภาพใบหน้าที่ลงทะเบียน ({face?.samples.length || 0} ภาพ)</h2>
            <p>
              แสดงมุมภาพที่บันทึกจริงจากฐานข้อมูล (ห้ามเรียงตามลำดับ Array หากไม่ระบุมุมภาพจะแสดงข้อความชัดเจน)
            </p>
          </div>
        </div>

        {face?.samples && face.samples.length > 0 ? (
          <div className="face-gallery">
            {face.samples.map((sample) => {
              const label = getPoseLabel(sample.poseType);
              const badgeCls = getPoseClass(sample.poseType);
              return (
                <article key={sample.id} className="face-item-card">
                  <div className="face-placeholder has-image">
                    <Image
                      src={`/api/student/face-image?id=${sample.id}`}
                      alt={`ภาพมุม ${label}`}
                      width={320}
                      height={320}
                      unoptimized
                    />
                    <span className={`face-pose-tag ${badgeCls}`}>{label}</span>
                  </div>
                  <div className="face-item-foot">
                    <strong>มุมภาพ: {label}</strong>
                    {sample.qualityScore > 0 && (
                      <small>คะแนนคุณภาพ: {(sample.qualityScore * 100).toFixed(0)}%</small>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="face-empty">
            <span>
              <ScanFace size={44} />
            </span>
            <h3>ยังไม่มีภาพใบหน้าที่ลงทะเบียน</h3>
            <p>
              ผู้ดูแลระบบจะบันทึกภาพใบหน้า 3–5 มุมภาพ
              <br />
              (หน้าตรง, หันซ้าย, หันขวา, เงยหน้า, ก้มหน้า) เพื่อใช้ยืนยันตัวตน
            </p>
          </div>
        )}
      </section>

      {/* Tips */}
      <section className="card tips">
        <div className="tips-icon">
          <SunMedium size={24} />
        </div>
        <div>
          <h2>คำแนะนำในการสแกนใบหน้าเข้าเรียน</h2>
          <ul>
            <li>อยู่ในบริเวณที่มีแสงสว่างเพียงพอ หลีกเลี่ยงการย้อนแสงหรือเงามืด</li>
            <li>ถอดหน้ากากอนามัย หมวก หรือแว่นตาดำที่บดบังใบหน้าก่อนเริ่มสแกน</li>
            <li>วางใบหน้าให้อยู่กึ่งกลางกรอบ และมองตรงไปที่กล้องขณะระบบประมวลผล</li>
            <li>ระบบมีการตรวจจับบุคคลจริง (Liveness Detection) เพื่อป้องกันการใช้ภาพถ่ายหลอกกล้อง</li>
          </ul>
        </div>
      </section>
    </>
  );
}
