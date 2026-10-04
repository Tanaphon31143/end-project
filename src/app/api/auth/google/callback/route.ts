import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { createSession, getStudentSession, type AppRole } from "@/lib/auth";
import { completeStudentFaceIdentity, failStudentFaceIdentity } from "@/lib/student-face-identity";
import { exchangeCodeForTokens, getGoogleUserInfo } from "@/lib/google-auth";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

type Account = RowDataPacket & {
  id: number;
  email: string;
  full_name: string;
  role: AppRole;
  status: string;
  profile_image: Buffer | null;
  profile_image_mime: string | null;
};

type OAuthBinding = RowDataPacket & {
  accountId: number;
  role: AppRole;
};

/**
 * Fetch avatar image from Google URL and return buffer + mime type
 */
async function fetchGoogleAvatar(url?: string): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mime: contentType.split(";")[0].trim(),
    };
  } catch (err) {
    console.warn("Failed to download Google avatar:", err);
    return null;
  }
}

/**
 * Generate a unique student_code for newly registered students.
 * e.g., G31143 or STU + 6 random digits
 */
async function generateUniqueStudentCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const candidate = `G${randomNum}`;
    const [existing] = await db.execute<RowDataPacket[]>(
      "SELECT id FROM students WHERE student_code = ? LIMIT 1",
      [candidate],
    );
    if (existing.length === 0) {
      return candidate;
    }
  }
  return `G${Date.now().toString().slice(-6)}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");

  const homeUrl = new URL("/", request.url);

  // Read and verify google_oauth_state cookie
  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;
  const pendingFaceIdentity = cookieStore.get("student_face_identity_pending")?.value;

  if (error) {
    console.warn("Google OAuth callback error:", error);
    if (pendingFaceIdentity) await failStudentFaceIdentity(await getStudentSession(), pendingFaceIdentity, request);
    const destination = pendingFaceIdentity ? new URL('/student/face?identity=failed', request.url) : homeUrl;
    if (!pendingFaceIdentity) destination.searchParams.set("error", "google_access_denied");
    const res = NextResponse.redirect(destination);
    res.cookies.delete("google_oauth_state");
    res.cookies.delete("student_face_identity_pending");
    return res;
  }

  if (!code || !state || !storedState || state !== storedState) {
    console.warn("State mismatch or missing parameters in Google callback");
    if (pendingFaceIdentity) await failStudentFaceIdentity(await getStudentSession(), pendingFaceIdentity, request);
    const destination = pendingFaceIdentity ? new URL('/student/face?identity=failed', request.url) : homeUrl;
    if (!pendingFaceIdentity) destination.searchParams.set("error", "google_state_mismatch");
    const res = NextResponse.redirect(destination);
    res.cookies.delete("google_oauth_state");
    res.cookies.delete("student_face_identity_pending");
    return res;
  }

  try {
    const tokens = await exchangeCodeForTokens(code, request.url);
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    if (pendingFaceIdentity) {
      const identityResult = await completeStudentFaceIdentity(
        await getStudentSession(), pendingFaceIdentity, googleUser.sub || '', googleUser.email || '', googleUser.email_verified === true, request);
      const faceUrl = new URL('/student/face', request.url);
      faceUrl.searchParams.set('identity', identityResult.verified ? 'verified' : identityResult.reason || 'failed');
      const response = NextResponse.redirect(faceUrl);
      response.cookies.delete('google_oauth_state');
      response.cookies.delete('student_face_identity_pending');
      return response;
    }

    const email = googleUser.email ? googleUser.email.trim().toLowerCase() : "";
    const googleSub = googleUser.sub?.trim() ?? "";
    if (!email || googleUser.email_verified !== true || !googleSub || googleSub.length > 255) {
      homeUrl.searchParams.set("error", "google_email_unverified");
      const res = NextResponse.redirect(homeUrl);
      res.cookies.delete("google_oauth_state");
      return res;
    }

    const [bindings] = await db.execute<OAuthBinding[]>(
      `SELECT account_id accountId, account_role role
       FROM oauth_accounts WHERE provider='google' AND provider_subject=? LIMIT 1`,
      [googleSub],
    );
    const binding = bindings[0];
    let account: Account | undefined;
    let shouldCreateBinding = false;
    if (binding) {
      const table = binding.role === "admin" ? "admins" : binding.role === "teacher" ? "teachers" : "students";
      const imageColumns = binding.role === "admin"
        ? "NULL AS profile_image, NULL AS profile_image_mime"
        : "profile_image, profile_image_mime";
      const [rows] = await db.execute<Account[]>(
        `SELECT id,email,full_name,? AS role,status,${imageColumns}
         FROM ${table} WHERE id=? LIMIT 1`,
        [binding.role, binding.accountId],
      );
      account = rows[0];
    } else {
      const [rows] = await db.execute<Account[]>(
        `SELECT id,email,full_name,'admin' role,status,NULL profile_image,NULL profile_image_mime FROM admins WHERE email=?
         UNION ALL SELECT id,email,full_name,'teacher',status,profile_image,profile_image_mime FROM teachers WHERE email=?
         UNION ALL SELECT id,email,full_name,'student',status,profile_image,profile_image_mime FROM students WHERE email=?
         LIMIT 1`,
        [email, email, email],
      );
      account = rows[0];
      if (account && account.role !== "student") {
        homeUrl.searchParams.set("error", "google_link_required");
        const res = NextResponse.redirect(homeUrl);
        res.cookies.delete("google_oauth_state");
        return res;
      }
      shouldCreateBinding = true;
    }

    // 2. If user exists, link/update avatar if not already set, and keep existing role (Admin/Teacher/Student)
    if (account) {
      if (account.status !== "ACTIVE") {
        homeUrl.searchParams.set("error", "google_account_inactive");
        const res = NextResponse.redirect(homeUrl);
        res.cookies.delete("google_oauth_state");
        return res;
      }

      // If user has no profile image and Google provides one, update it
      if (!account.profile_image && googleUser.picture) {
        const avatar = await fetchGoogleAvatar(googleUser.picture);
        if (avatar) {
          if (account.role === "student") {
            await db.execute(
              "UPDATE students SET profile_image = ?, profile_image_mime = ? WHERE id = ?",
              [avatar.buffer, avatar.mime, account.id],
            );
          } else if (account.role === "teacher") {
            await db.execute(
              "UPDATE teachers SET profile_image = ?, profile_image_mime = ? WHERE id = ?",
              [avatar.buffer, avatar.mime, account.id],
            );
          }
        }
      }
    } else {
      // 3. If user does NOT exist, create a new user with default role STUDENT
      // Never create ADMIN or TEACHER automatically
      const fullName = (googleUser.name || googleUser.given_name || email.split("@")[0]).trim().slice(0, 150);
      const studentCode = await generateUniqueStudentCode();
      const randomPassword = randomBytes(24).toString("hex");
      const passwordHash = hashPassword(randomPassword);

      const avatar = await fetchGoogleAvatar(googleUser.picture);

      const [insertResult] = await db.execute<ResultSetHeader>(
        `INSERT INTO students (email, full_name, student_code, password_hash, status, profile_image, profile_image_mime)
         VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
        [
          email,
          fullName,
          studentCode,
          passwordHash,
          avatar ? avatar.buffer : null,
          avatar ? avatar.mime : null,
        ],
      );

      account = {
        id: insertResult.insertId,
        email,
        full_name: fullName,
        role: "student",
        status: "ACTIVE",
        profile_image: avatar ? avatar.buffer : null,
        profile_image_mime: avatar ? avatar.mime : null,
      } as Account;
    }

    if (shouldCreateBinding) {
      await db.execute(
        `INSERT INTO oauth_accounts
          (provider, provider_subject, account_role, account_id, verified_email)
         VALUES ('google', ?, ?, ?, ?)`,
        [googleSub, account.role, account.id, email],
      );
    }

    // 4. Redirect based on strict role mapping:
    // ADMIN -> /admin/dashboard
    // TEACHER -> /teacher/dashboard
    // STUDENT -> /student/dashboard
    let destination = "/student/dashboard";
    if (account.role === "admin") {
      destination = "/admin/dashboard";
    } else if (account.role === "teacher") {
      destination = "/teacher/dashboard";
    } else {
      destination = "/student/dashboard";
    }

    const maxAge = 7 * 86400; // 7 days session
    const redirectUrl = new URL(destination, request.url);
    const response = NextResponse.redirect(redirectUrl);

    // Set signed session cookie
    response.cookies.set(
      "school_os_session",
      await createSession(
        {
          id: account.id,
          role: account.role,
          name: account.full_name,
          email: account.email,
        },
        maxAge * 1000,
      ),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge,
      },
    );

    // Clean up legacy cookies
    response.cookies.set("school_user", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });
    response.cookies.delete("google_oauth_state");

    return response;
  } catch (err) {
    console.error("Error during Google authentication callback:", err);
    if (pendingFaceIdentity) await failStudentFaceIdentity(await getStudentSession(), pendingFaceIdentity, request).catch(() => {});
    const destination = pendingFaceIdentity ? new URL('/student/face?identity=failed', request.url) : homeUrl;
    if (!pendingFaceIdentity) destination.searchParams.set("error", "google_auth_failed");
    const res = NextResponse.redirect(destination);
    res.cookies.delete("google_oauth_state");
    res.cookies.delete("student_face_identity_pending");
    return res;
  }
}
