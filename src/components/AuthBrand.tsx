"use client";

import Image from "next/image";
import styles from "@/app/page.module.css";

export function AuthBrand({ compact = false }: { compact?: boolean }) {
  const className = compact
    ? `${styles.brandBlock} ${styles.recoveryBrand}`
    : styles.brandBlock;

  return (
    <div className={className}>
      <div className={styles.brandMark}>
        <Image
          className={styles.brandLogo}
          src="/school-logo.jpg"
          alt="ตราสัญลักษณ์โรงเรียนขุขันธ์"
          width={800}
          height={445}
          priority
        />
      </div>
      <div>
        <p className={styles.brandName}>ระบบเช็คชื่อนักเรียน</p>
        <p className={styles.brandCaption}>โรงเรียนขุขันธ์</p>
      </div>
    </div>
  );
}
