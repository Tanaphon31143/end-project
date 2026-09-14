import Image from "next/image";
import { redirect } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Cpu,
  Globe,
  Laptop,
  ScanFace,
  ShieldCheck,
  SunMedium,
  UserCheck,
  XCircle,
} from "lucide-react";
import { PageTitle } from "@/components/student/UI";
import { getStudentSession } from "@/lib/auth";
import { getStudentFaceData, type FaceSampleItem } from "@/lib/student-data";
import SelfFaceEnrollment from "@/components/student/SelfFaceEnrollment";
import { getVerifiedFaceIdentity, studentIdentityRecord } from "@/lib/student-face-identity";

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

function getRegistrantRole(role: string | null) {
  if (role === "ADMIN") return "ผู้ดูแลระบบ";
  if (role === "TEACHER") return "ครูผู้สอน";
  if (role === "STUDENT") return "นักเรียนลงทะเบียนเอง";
  return "ไม่มีข้อมูล";
}

export default async function FacePage({ searchParams }: {
  searchParams: Promise<{ identity?: string }>;
}) {
  const session = await getStudentSession();
  if (!session) redirect("/");
  const params = await searchParams;

  const [face, identity, account] = await Promise.all([
    getStudentFaceData(session.id), getVerifiedFaceIdentity(session.id), studentIdentityRecord(session),
  ]);
  const ready = face?.status === "READY";

  return (
    <>
      <PageTitle
        eyebrow="ความปลอดภัยทางชีวมิติ"
        title="ข้อมูลใบหน้า"
        description="ข้อมูลนี้ใช้ยืนยันตัวตนสำหรับการเช็คชื่อด้วยการสแกนใบหน้าเท่านั้น"
      />
      {params.identity && params.identity !== 'verified' && <div className="card card-pad" role="alert">
        {params.identity === 'email-mismatch'
          ? 'บัญชี Google ที่เลือกไม่ตรงกับอีเมลของบัญชีนักเรียน กรุณาเลือกบัญชีที่ถูกต้อง'
          : params.identity === 'bound'
            ? 'บัญชี Google นี้ผูกกับข้อมูลใบหน้าบัญชีอื่นแล้ว หรือบัญชีนักเรียนนี้ผูก Google บัญชีอื่นอยู่'
            : params.identity === 'google-unverified'
              ? 'อีเมล Google นี้ยังไม่ผ่านการยืนยัน กรุณาเลือกบัญชีอื่น'
              : params.identity === 'student'
                ? 'ไม่พบ Session หรือนักเรียนที่ใช้งานได้ กรุณาเข้าสู่ระบบใหม่'
                : 'ยืนยันบัญชี Google ไม่สำเร็จหรือหมดเวลา กรุณาลองใหม่'}
      </div>}

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
              identity ? "กำลังยืนยันตัวตนและลงทะเบียน" : "ยังไม่ได้ยืนยันตัวตน"
            )}
          </h2>
          <p>
            {ready
              ? `ระบบมีภาพใบหน้าอ้างอิง ${face.imageCount} มุมภาพ พร้อมใช้งานยืนยันตัวตนในทุกคาบเรียน`
              : face
                ? "ข้อมูลใบหน้าเดิมถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งาน"
                : identity
                  ? "ยืนยันบัญชีแล้ว กรุณาตรวจบุคคลจริงและถ่ายภาพใบหน้า 5 มุม"
                  : "กรุณายืนยันตัวตนก่อนลงทะเบียนใบหน้า"}
          </p>
        </div>
      </section>

      {!account && <div className="card card-pad" role="alert">
        บัญชีนักเรียนไม่พร้อมใช้งานหรืออีเมลใน session ไม่ตรงกับข้อมูลนักเรียน กรุณาเข้าสู่ระบบใหม่
      </div>}
      {account && face?.status !== 'INACTIVE' && <SelfFaceEnrollment
        verified={Boolean(identity)} hasFace={Boolean(face)} resume={params.identity === 'verified'}
        studentName={account.studentName} studentCode={account.studentCode} email={account.email}
      />}

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
                <ScanFace size={20} />
              </div>
              <div className="audit-content">
                <span>เจ้าของข้อมูลใบหน้า</span>
                <strong>{face.studentName}</strong>
                <small>รหัสนักเรียน: {face.studentCode}</small>
              </div>
            </div>

            <div className="audit-item">
              <div className="audit-icon">
                <UserCheck size={20} />
              </div>
              <div className="audit-content">
                <span>ผู้ลงทะเบียน</span>
                <strong>{face.registeredByName || "ไม่มีข้อมูล"}</strong>
                <small>ผู้ดำเนินการ: {getRegistrantRole(face.registeredByRole)}</small>
              </div>
            </div>

            <div className="audit-item">
              <div className="audit-icon">
                <Laptop size={20} />
              </div>
              <div className="audit-content">
                <span>อุปกรณ์ที่ใช้บันทึก</span>
                <strong>{face.deviceType || "ไม่มีข้อมูล"}</strong>
                <small>{face.deviceName || "ไม่มีข้อมูล"}</small>
              </div>
            </div>

            <div className="audit-item">
              <div className="audit-icon">
                <Globe size={20} />
              </div>
              <div className="audit-content">
                <span>เบราว์เซอร์ / ระบบ</span>
                <strong>{face.browser || "ไม่มีข้อมูล"}</strong>
                <small>ระบบปฏิบัติการ: {face.operatingSystem || "ไม่มีข้อมูล"}</small>
              </div>
            </div>

            <div className="audit-item">
              <div className="audit-icon">
                <Camera size={20} />
              </div>
              <div className="audit-content">
                <span>กล้องที่ใช้บันทึก</span>
                <strong>{face.cameraType || "ไม่มีข้อมูล"}</strong>
                <small>ชื่อกล้องจากอุปกรณ์ในวันลงทะเบียน</small>
              </div>
            </div>

            <div className="audit-item">
              <div className="audit-icon">
                <ShieldCheck size={20} />
              </div>
              <div className="audit-content">
                <span>วิธีและผลการยืนยัน</span>
                <strong>{face.verificationMethod === 'GOOGLE' ? 'Google Account' : 'ข้อมูลเดิมไม่มีวิธีการยืนยัน'}</strong>
                <small>{face.verifiedEmail ? `อีเมลที่ยืนยัน: ${face.verifiedEmail} · ` : ''}Liveness: {face.livenessVerifiedAt ? `ผ่านเมื่อ ${face.livenessVerifiedAt}` : 'ไม่มีข้อมูล'}</small>
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
              มุมของภาพใหม่บันทึกจากขั้นตอนลงทะเบียน ส่วนภาพเดิมที่ไม่มีข้อมูลจะแสดงว่า “ไม่ระบุมุมภาพ”
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
              คุณสามารถถ่ายภาพใบหน้า 5 มุมด้วยตนเอง
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
