import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export type AppRole = "admin" | "teacher" | "student";
export type AppSession = { id: number; role: AppRole; name: string; email?: string };

export function createSignedSession(session: AppSession, maxAgeMs = 8 * 60 * 60 * 1000) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + maxAgeMs })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function decodeSignedSession(value?: string): AppSession | null {
  if (!value) return null;
  try {
    const [payload, signature] = value.split(".");
    const secret = process.env.AUTH_SECRET;
    if (!payload || !signature || !secret) return null;
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    const a=Buffer.from(signature), b=Buffer.from(expected);
    if(a.length!==b.length||!timingSafeEqual(a,b)) return null;
    const data=JSON.parse(Buffer.from(payload,"base64url").toString());
    if(!["admin","teacher","student"].includes(data.role)||(data.exp&&data.exp<Date.now())) return null;
    return { id:Number(data.id), role:data.role, name:data.name||"ผู้ใช้งาน", email:data.email };
  } catch { return null; }
}

export async function getSession(){const store=await cookies();return decodeSignedSession(store.get("school_os_session")?.value)}
export async function getTeacherSession(){const session=await getSession();return session?.role==="teacher"?session:null}
export async function getAdminSession(){const session=await getSession();return session?.role==="admin"?session:null}
export async function getStudentSession(){const session=await getSession();return session?.role==="student"?session:null}
export function homeForRole(role:AppRole){return role==="admin"?"/admin/dashboard":role==="teacher"?"/teacher/dashboard":"/student"}
