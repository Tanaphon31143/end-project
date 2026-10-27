import Link from "next/link";
import PasswordRecoveryForm from "@/components/PasswordRecoveryForm";
import { AuthBrand } from "@/components/AuthBrand";
import styles from "@/app/page.module.css";
export const metadata = { referrer: "no-referrer" };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return <main className={styles.recoveryPage}><section className={styles.loginCard} aria-labelledby="reset-link-error-title"><AuthBrand compact /><h1 id="reset-link-error-title">ลิงก์กู้คืนไม่ถูกต้อง</h1><p><Link href="/forgot-password">ขอลิงก์กู้คืนใหม่</Link></p></section></main>;
  return <PasswordRecoveryForm token={token} />;
}
