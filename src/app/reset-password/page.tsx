import Link from "next/link";
import PasswordRecoveryForm from "@/components/PasswordRecoveryForm";
export const metadata = { referrer: "no-referrer" };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return <main style={{ padding: 32 }}><h1>ลิงก์กู้คืนไม่ถูกต้อง</h1><p><Link href="/forgot-password">ขอลิงก์กู้คืนใหม่</Link></p></main>;
  return <PasswordRecoveryForm token={token} />;
}
