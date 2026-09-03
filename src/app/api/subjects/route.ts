import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getAdminSession } from "@/lib/auth";
import { getSubjectPageData } from "@/lib/admin-data";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type SubjectPayload = { id?: number; subjectCode?: unknown; subjectName?: unknown; teacherId?: unknown; gradeLevel?: unknown; classId?: unknown; semester?: unknown; academicYear?: unknown; credits?: unknown; studyDays?: unknown; startTime?: unknown; endTime?: unknown; location?: unknown; attendanceMode?: unknown; isActive?: unknown; description?: unknown };
const DAYS=["จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์","อาทิตย์"];

async function requireAdmin(){return Boolean(await getAdminSession())}
function text(value:unknown){return typeof value==="string"?value.trim():""}
function validate(body:SubjectPayload){
  const subjectCode=text(body.subjectCode); const subjectName=text(body.subjectName); const teacherId=Number(body.teacherId); const classId=Number(body.classId);
  const gradeLevel=text(body.gradeLevel); const semester=text(body.semester); const academicYear=text(body.academicYear); const credits=Number(body.credits);
  const studyDays=Array.isArray(body.studyDays)?body.studyDays.filter((d):d is string=>typeof d==="string"&&DAYS.includes(d)):[];
  const startTime=text(body.startTime); const endTime=text(body.endTime); const location=text(body.location); const attendanceMode=text(body.attendanceMode); const description=text(body.description);
  if(!subjectCode||!subjectName||!teacherId||!classId||!gradeLevel||!academicYear||!startTime||!endTime) return {error:"กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน"};
  if(!/^[A-Za-z0-9]+$/.test(subjectCode)) return {error:"รหัสวิชาต้องเป็นตัวอักษรภาษาอังกฤษและตัวเลขเท่านั้น"};
  if(!["1","2"].includes(semester)) return {error:"ภาคเรียนไม่ถูกต้อง"};
  if(!Number.isFinite(credits)||credits<0||Math.round(credits*2)!==credits*2) return {error:"หน่วยกิตต้องเพิ่มครั้งละ 0.5"};
  if(!studyDays.length) return {error:"กรุณาเลือกวันเรียนอย่างน้อย 1 วัน"};
  if(endTime<=startTime) return {error:"เวลาเลิกเรียนต้องมากกว่าเวลาเริ่มเรียน"};
  if(!["EVERY_PERIOD","FIRST_PERIOD"].includes(attendanceMode)) return {error:"รูปแบบการเช็คชื่อไม่ถูกต้อง"};
  if(description.length>255) return {error:"รายละเอียดต้องไม่เกิน 255 ตัวอักษร"};
  return {value:{subjectCode,subjectName,teacherId,gradeLevel,classId,semester:Number(semester),academicYear,credits,studyDays:studyDays.join(","),startTime,endTime,location,attendanceMode,isActive:body.isActive===false?0:1,description}};
}

export async function GET(){if(!(await requireAdmin()))return Response.json({message:"ไม่มีสิทธิ์ใช้งาน"},{status:401});return Response.json(await getSubjectPageData())}

export async function POST(request:Request){
  if(!(await requireAdmin()))return Response.json({message:"ไม่มีสิทธิ์ใช้งาน"},{status:401});
  const parsed=validate(await request.json() as SubjectPayload); if("error" in parsed)return Response.json({message:parsed.error},{status:400}); const v=parsed.value;
  try{
    const [classRows]=await db.execute<(RowDataPacket&{level:string})[]>("SELECT level FROM classrooms WHERE id=?",[v.classId]);
    if(!classRows[0]||classRows[0].level!==v.gradeLevel)return Response.json({message:"ชั้นเรียนไม่ตรงกับระดับชั้นที่เลือก"},{status:400});
    const [result]=await db.execute<ResultSetHeader>(`INSERT INTO subjects (subject_code,subject_name,teacher_id,grade_level,classroom_id,semester,academic_year,credits,study_days,start_time,end_time,location,attendance_mode,is_active,description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[v.subjectCode,v.subjectName,v.teacherId,v.gradeLevel,v.classId,v.semester,v.academicYear,v.credits,v.studyDays,v.startTime,v.endTime,v.location||null,v.attendanceMode,v.isActive,v.description||null]);
    return Response.json({id:result.insertId,message:"เพิ่มรายวิชาสำเร็จ"},{status:201});
  }catch(error){const e=error as {code?:string};return Response.json({message:e.code==="ER_DUP_ENTRY"?"รหัสวิชานี้มีอยู่แล้ว":"ไม่สามารถบันทึกรายวิชาได้"},{status:e.code==="ER_DUP_ENTRY"?409:500})}
}

export async function PUT(request:Request){
  if(!(await requireAdmin()))return Response.json({message:"ไม่มีสิทธิ์ใช้งาน"},{status:401}); const body=await request.json() as SubjectPayload; const id=Number(body.id);
  if(!id)return Response.json({message:"ไม่พบรายวิชา"},{status:400}); const parsed=validate(body); if("error" in parsed)return Response.json({message:parsed.error},{status:400}); const v=parsed.value;
  try{const [result]=await db.execute<ResultSetHeader>(`UPDATE subjects SET subject_code=?,subject_name=?,teacher_id=?,grade_level=?,classroom_id=?,semester=?,academic_year=?,credits=?,study_days=?,start_time=?,end_time=?,location=?,attendance_mode=?,is_active=?,description=? WHERE id=?`,[v.subjectCode,v.subjectName,v.teacherId,v.gradeLevel,v.classId,v.semester,v.academicYear,v.credits,v.studyDays,v.startTime,v.endTime,v.location||null,v.attendanceMode,v.isActive,v.description||null,id]);if(!result.affectedRows)return Response.json({message:"ไม่พบรายวิชา"},{status:404});return Response.json({message:"แก้ไขรายวิชาสำเร็จ"})}catch(error){const e=error as {code?:string};return Response.json({message:e.code==="ER_DUP_ENTRY"?"รหัสวิชานี้มีอยู่แล้ว":"ไม่สามารถแก้ไขรายวิชาได้"},{status:e.code==="ER_DUP_ENTRY"?409:500})}
}

export async function DELETE(request:Request){if(!(await requireAdmin()))return Response.json({message:"ไม่มีสิทธิ์ใช้งาน"},{status:401});const id=Number(new URL(request.url).searchParams.get("id"));if(!id)return Response.json({message:"ไม่พบรายวิชา"},{status:400});const [result]=await db.execute<ResultSetHeader>("DELETE FROM subjects WHERE id=?",[id]);if(!result.affectedRows)return Response.json({message:"ไม่พบรายวิชา"},{status:404});return Response.json({message:"ลบรายวิชาสำเร็จ"})}
