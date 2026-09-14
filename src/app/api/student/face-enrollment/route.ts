import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { createHash } from 'node:crypto';
import { getStudentSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { faceSimilarity } from '@/lib/face-match';
import { getVerifiedFaceIdentity, recordStudentFaceAudit, studentIdentityRecord } from '@/lib/student-face-identity';
import { validateFacePoseTypes } from '@/lib/face-registration-rules.mjs';
import { isFaceEmbedding } from '@/lib/face-match';
import sharp from 'sharp';
import { imageDifferenceHash, imageHashDistance } from '@/lib/face-image-hash.mjs';

export const runtime = 'nodejs';
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const student = await getStudentSession();
  if (!student) return Response.json({ message: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ message: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const [account, identity] = await Promise.all([studentIdentityRecord(student), getVerifiedFaceIdentity(student.id)]);
  if (!account || !identity || !identity.livenessVerified)
    return Response.json({ message: 'กรุณายืนยันบัญชีและตรวจบุคคลจริงก่อนลงทะเบียน' }, { status: 403 });
  await recordStudentFaceAudit(student.id, 'FACE_ENROLLMENT_STARTED', identity.id, request);
  const rejectEnrollment = async (message: string, status: number) => {
    await recordStudentFaceAudit(student.id, 'FACE_ENROLLMENT_FAILED', identity.id, request);
    return Response.json({ message }, { status });
  };
  if (Number(request.headers.get('content-length') || 0) > MAX_TOTAL_BYTES)
    return rejectEnrollment('ข้อมูลภาพใหญ่เกินไป', 413);
  const form = await request.formData().catch(() => null);
  if (!form) return rejectEnrollment('ข้อมูลลงทะเบียนไม่ถูกต้อง', 400);
  const files = form.getAll('images').filter((item): item is File => item instanceof File);
  if (files.length !== 5 || form.getAll('images').length !== files.length)
    return rejectEnrollment('กรุณาถ่ายใบหน้าให้ครบ 5 มุม', 400);
  let embeddings: unknown, qualities: unknown, poses: unknown;
  try {
    embeddings = JSON.parse(String(form.get('embeddings')));
    qualities = JSON.parse(String(form.get('qualities')));
    poses = JSON.parse(String(form.get('poseTypes')));
  } catch { return rejectEnrollment('ข้อมูลใบหน้าหรือการยืนยันไม่ถูกต้อง', 400); }
  const validPoses = validateFacePoseTypes(poses, files.length);
  if (!Array.isArray(embeddings) || embeddings.length !== files.length || !embeddings.every(isFaceEmbedding)
    || embeddings.some((embedding) => embedding.length !== embeddings[0].length)
    || !Array.isArray(qualities) || qualities.length !== files.length
    || qualities.some((score) => typeof score !== 'number' || !Number.isFinite(score) || score < 0.55 || score > 1)
    || !validPoses.valid || !Array.isArray(validPoses.poses)
    || !['FRONT','LEFT','RIGHT','UP','DOWN'].every(pose => validPoses.poses?.includes(pose)))
    return rejectEnrollment('กรุณาถ่ายภาพใบหน้าชัดเจนและระบุมุมภาพให้ครบ', 400);
  const images = await Promise.all(files.map(async (file) => Buffer.from(await file.arrayBuffer())));
  if (images.reduce((sum, image) => sum + image.length, 0) > MAX_TOTAL_BYTES
    || files.some((file, index) => file.type !== 'image/jpeg' || images[index].length < 1000 || images[index].length > 2 * 1024 * 1024
      || images[index][0] !== 0xff || images[index][1] !== 0xd8 || images[index][2] !== 0xff))
    return rejectEnrollment('รองรับภาพจากกล้อง JPG ขนาด 1 KB–2 MB ต่อภาพ', 400);
  for (const image of images) {
    const metadata = await sharp(image, { limitInputPixels: 2_560_000 }).metadata().catch(() => null);
    if (!metadata || (metadata.width || 0) < 320 || (metadata.height || 0) < 240
      || (metadata.width || 0) > 1600 || (metadata.height || 0) > 1600)
      return rejectEnrollment('ความละเอียดภาพไม่เหมาะสม กรุณาถ่ายใหม่', 400);
    const stats = await sharp(image, { limitInputPixels: 2_560_000 }).stats().catch(() => null);
    if (!stats || stats.channels.slice(0, 3).reduce((sum, channel) => sum + channel.mean, 0) / 3 < 25)
      return rejectEnrollment('ภาพมืดเกินไป กรุณาถ่ายใหม่ในที่มีแสงเพียงพอ', 400);
    if (stats.sharpness < 0.8)
      return rejectEnrollment('ภาพเบลอเกินไป กรุณาถ่ายใหม่ในที่มีแสงเพียงพอ', 400);
  }
  const vectors = embeddings as number[][];
  if (vectors.slice(1).some(vector => faceSimilarity(vectors[0], vector) < 0.55))
    return rejectEnrollment('ภาพทั้ง 5 มุมอาจไม่ใช่บุคคลเดียวกัน กรุณาถ่ายใหม่', 422);
  const imageHashes = await Promise.all(images.map(async image => ({
    sha256: createHash('sha256').update(image).digest('hex'),
    dhash: await imageDifferenceHash(image),
  }))).catch(() => null);
  if (!imageHashes) return rejectEnrollment('ไม่สามารถตรวจสอบไฟล์ภาพได้ กรุณาถ่ายใหม่', 400);
  if (imageHashes.some((item, index) => imageHashes.slice(0, index).some(previous =>
    item.sha256 === previous.sha256 || imageHashDistance(item.dhash, previous.dhash) <= 4)))
    return rejectEnrollment('ภาพแต่ละมุมต้องเป็นภาพที่ถ่ายใหม่ ไม่ใช่ภาพเดิมซ้ำ', 422);
  await recordStudentFaceAudit(student.id, 'FACE_CAPTURE_COMPLETED', identity.id, request);

  const agent = request.headers.get('user-agent') || '';
  const auditAgent = agent.slice(0, 255) || null;
  const deviceType = /mobile|iphone|android/i.test(agent) ? 'โทรศัพท์มือถือ' : 'คอมพิวเตอร์ / โน้ตบุ๊ก';
  const browser = /Edg/.test(agent) ? 'Microsoft Edge' : /Chrome/.test(agent) ? 'Google Chrome' : /Firefox/.test(agent) ? 'Mozilla Firefox' : /Safari/.test(agent) ? 'Apple Safari' : null;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [owner] = await connection.execute<RowDataPacket[]>("SELECT id,email FROM students WHERE id=? AND status='ACTIVE' FOR UPDATE", [student.id]);
    if (!owner[0]) { await connection.rollback(); return Response.json({ message: 'บัญชีนักเรียนไม่พร้อมใช้งาน' }, { status: 403 }); }
    if (String(owner[0].email).toLowerCase() !== account.email.toLowerCase()) {
      await connection.rollback(); return Response.json({ message: 'ข้อมูลบัญชีนักเรียนเปลี่ยนไป กรุณายืนยันใหม่' }, { status: 403 });
    }
    const [proof] = await connection.execute<(RowDataPacket & { googleSub: string; verifiedEmail: string })[]>(
      `SELECT id,google_sub googleSub,verified_email verifiedEmail FROM student_face_identity_verifications
       WHERE id=? AND student_id=? AND status='VERIFIED' AND account_verified_at IS NOT NULL
         AND student_data_verified_at IS NOT NULL AND liveness_verified_at IS NOT NULL
         AND google_sub IS NOT NULL AND verified_email IS NOT NULL
         AND expires_at>NOW(3) AND used_at IS NULL FOR UPDATE`, [identity.id, student.id]);
    if (!proof[0]) { await connection.rollback(); return Response.json({ message: 'การยืนยันหมดอายุ กรุณาเริ่มใหม่' }, { status: 409 }); }
    const [emailOwners] = await connection.execute<(RowDataPacket & { studentId: number })[]>(
      'SELECT student_id studentId FROM student_face_email_bindings WHERE google_sub=? OR verified_email=? FOR UPDATE',
      [proof[0].googleSub, proof[0].verifiedEmail]);
    if (emailOwners.some(owner => Number(owner.studentId) !== student.id)) {
      await connection.rollback();
      await recordStudentFaceAudit(student.id, 'FACE_ENROLLMENT_FAILED', identity.id);
      return Response.json({ message: 'อีเมลหรือบัญชี Google นี้ผูกกับใบหน้าของนักเรียนคนอื่นแล้ว' }, { status: 409 });
    }
    const [otherFaces] = await connection.execute<(RowDataPacket & { studentId: number; embedding: string | number[]; imageSha256: string | null; imageDhash: string | null })[]>(
      `SELECT fs.student_id studentId, fs.embedding,fs.image_sha256 imageSha256,fs.image_dhash imageDhash FROM face_samples fs
       JOIN face_data fd ON fd.student_id=fs.student_id AND fd.status='READY'
       WHERE fs.student_id<>?`, [student.id]);
    const duplicate = otherFaces.some(row => {
      if (imageHashes.some(item => item.sha256 === row.imageSha256
        || (row.imageDhash && imageHashDistance(item.dhash, row.imageDhash) <= 4))) return true;
      try {
        const stored = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
        return isFaceEmbedding(stored) && vectors.some(vector => faceSimilarity(vector, stored) >= 0.78);
      } catch { return false; }
    });
    if (duplicate) {
      await connection.execute(
        `INSERT INTO audit_logs(user_id,action,entity,entity_id,description,ip_address,user_agent)
         VALUES(?,'FACE_ENROLLMENT_FAILED','student_face',?,'Possible duplicate profile',NULL,?)`, [student.id, identity.id, auditAgent]);
      await connection.commit();
      return Response.json({ message: 'ข้อมูลใบหน้านี้อาจลงทะเบียนกับบัญชีอื่นแล้ว กรุณาติดต่อผู้ดูแลระบบ' }, { status: 409 });
    }
    const [existing] = await connection.execute<(RowDataPacket & { id: number; status: string; registeredAt: Date; imageCount: number })[]>(
      'SELECT id,status,registered_at registeredAt,image_count imageCount FROM face_data WHERE student_id=? FOR UPDATE', [student.id]);
    if (existing[0]?.status === 'INACTIVE') {
      await connection.rollback();
      await recordStudentFaceAudit(student.id, 'FACE_ENROLLMENT_FAILED', identity.id, request);
      return Response.json({ message: 'ข้อมูลใบหน้าถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบก่อนลงทะเบียนใหม่' }, { status: 403 });
    }
    if (existing[0]) {
      await connection.execute(
        `INSERT INTO student_face_profile_history(student_id,previous_face_data_id,previous_registered_at,previous_image_count,replaced_by_verification_id)
         VALUES(?,?,?,?,?)`, [student.id, existing[0].id, existing[0].registeredAt, existing[0].imageCount, identity.id]);
      await connection.execute('DELETE FROM face_samples WHERE student_id=?', [student.id]);
      await connection.execute('DELETE FROM face_data WHERE id=? AND student_id=?', [existing[0].id, student.id]);
    }
    const sampleIds: number[] = [];
    for (let index = 0; index < files.length; index++) {
      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO face_samples(student_id,image_data,image_mime,embedding,quality_score,pose_type,image_sha256,image_dhash) VALUES(?,?,?,?,?,?,?,?)',
        [student.id, images[index], 'image/jpeg', JSON.stringify(embeddings[index]), qualities[index], (validPoses.poses as string[])[index], imageHashes[index].sha256, imageHashes[index].dhash]);
      sampleIds.push(result.insertId);
    }
    const [newProfile] = await connection.execute<ResultSetHeader>(
      `INSERT INTO face_data(student_id,reference_image_url,image_count,status,registered_by_id,registered_by_name,registered_by_role,device_type,browser,camera_type,identity_verification_id,verification_method,liveness_verified_at)
       VALUES(?,?,?,'READY',?,?,'STUDENT',?,?,?,?,? ,NOW(3))`,
      [student.id, `/api/student/face-image?id=${sampleIds[0]}`, files.length, student.id, student.name, deviceType, browser,
        typeof form.get('cameraType') === 'string' ? String(form.get('cameraType')).slice(0, 150) : null,
        identity.id, 'GOOGLE']);
    const [ownBinding] = await connection.execute<(RowDataPacket & { googleSub: string; verifiedEmail: string })[]>(
      'SELECT google_sub googleSub,verified_email verifiedEmail FROM student_face_email_bindings WHERE student_id=? FOR UPDATE', [student.id]);
    if (ownBinding[0] && (ownBinding[0].googleSub !== proof[0].googleSub
      || ownBinding[0].verifiedEmail !== proof[0].verifiedEmail)) {
      await connection.rollback();
      await recordStudentFaceAudit(student.id, 'FACE_ENROLLMENT_FAILED', identity.id);
      return Response.json({ message: 'ใบหน้านี้ผูกกับบัญชี Google อีกบัญชีแล้ว ไม่สามารถเปลี่ยนอีเมลเพื่อยืนยันซ้ำได้' }, { status: 409 });
    }
    if (ownBinding[0]) {
      await connection.execute(
        'UPDATE student_face_email_bindings SET google_sub=?,verified_email=?,face_data_id=? WHERE student_id=?',
        [proof[0].googleSub, proof[0].verifiedEmail, newProfile.insertId, student.id]);
    } else {
      await connection.execute(
        'INSERT INTO student_face_email_bindings(student_id,google_sub,verified_email,face_data_id) VALUES(?,?,?,?)',
        [student.id, proof[0].googleSub, proof[0].verifiedEmail, newProfile.insertId]);
    }
    await connection.execute("UPDATE student_face_identity_verifications SET status='USED',used_at=NOW(3) WHERE id=? AND student_id=?", [identity.id, student.id]);
    await connection.execute(
      `INSERT INTO audit_logs(user_id,action,entity,entity_id,description,ip_address,user_agent)
       VALUES(?,?,'student_face',?,'Student self-enrollment',NULL,?)`,
      [student.id, existing[0] ? 'FACE_PROFILE_REPLACED' : 'FACE_ENROLLMENT_SUCCESS', identity.id, auditAgent]);
    if (existing[0]) {
      await connection.execute(
        `INSERT INTO audit_logs(user_id,action,entity,entity_id,description,ip_address,user_agent)
         VALUES(?,'FACE_ENROLLMENT_SUCCESS','student_face',?,'Replacement profile active',NULL,?)`, [student.id, identity.id, auditAgent]);
    }
    await connection.commit();
    return Response.json({ message: existing[0] ? 'เปลี่ยนข้อมูลใบหน้าสำเร็จ' : 'ลงทะเบียนและยืนยันใบหน้าสำเร็จ', sampleCount: files.length }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error('student face enrollment failed', error);
    await recordStudentFaceAudit(student.id, 'FACE_ENROLLMENT_FAILED', identity.id).catch(() => {});
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY')
      return Response.json({ message: 'อีเมลหรือบัญชี Google นี้ถูกใช้ลงทะเบียนใบหน้าแล้ว' }, { status: 409 });
    return Response.json({ message: 'บันทึกข้อมูลใบหน้าไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  } finally { connection.release(); }
}
