'use client';

import Image from "next/image";
import styles from "./student.module.css";

const schedule = [
  ["08:30", "คณิตศาสตร์", "ห้อง 402", "มาแล้ว", "done"],
  ["10:00", "วิทยาศาสตร์", "ห้อง Lab 1", "ยังไม่เช็คชื่อ", "pending"],
  ["13:00", "ภาษาอังกฤษ", "ห้อง 305", "ยังไม่ถึงเวลา", "next"],
  ["14:30", "ศิลปะสร้างสรรค์", "ห้อง Art 2", "ยังไม่ถึงเวลา", "next"],
];

const notices = [
  ["📣", "ประกาศกิจกรรมกีฬาสีประจำปี", "โรงเรียน · วันนี้"],
  ["📚", "แจ้งกำหนดการสอบกลางภาค", "ฝ่ายวิชาการ · 2 วันที่แล้ว"],
  ["💙", "อย่าลืมเช็คชื่อก่อนเข้าเรียนทุกคาบ", "ระบบเช็คชื่อ · 3 วันที่แล้ว"],
];

export default function StudentPage() {
  return (
    <main className={styles.appShell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Image src="/school-logo.jpg" alt="โลโก้โรงเรียน" width={42} height={42} className={styles.logo} />
          <div><strong>School OS</strong><span>ระบบนักเรียน</span></div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.iconButton} aria-label="การแจ้งเตือน">♧<i /></button>
          <div className={styles.avatar}>น</div>
        </div>
      </header>

      <div className={styles.pageBody}>
        <section className={styles.welcome}><p>วันจันทร์ที่ 9 สิงหาคม 2569</p><h1>สวัสดี, น้องนที 👋</h1><span>ม.5/2 · รหัสนักเรียน 6501024</span></section>

        <section className={`${styles.attendanceCard} ${styles.card}`}>
          <div className={styles.cardTop}><div><span className={styles.eyebrow}>สถานะเช็คชื่อวันนี้</span><h2><b className={styles.statusDot} /> ยังไม่เช็คชื่อ</h2><p>กรุณาสแกนใบหน้าเพื่อยืนยันการเข้าเรียน</p></div><div className={styles.faceIcon}>◉</div></div>
          <button className={styles.scanButton}>⌾ <span>สแกนใบหน้าเพื่อเช็คชื่อ</span><b>→</b></button>
        </section>

        <section className={styles.statsGrid}>
          <div className={`${styles.card} ${styles.statCard}`}><div className={styles.progressRing}><strong>94%</strong></div><div><span className={styles.eyebrow}>การเข้าเรียนเดือนนี้</span><h3>ยอดเยี่ยมมาก!</h3><p>มาเรียน 17 จาก 18 วัน</p></div></div>
          <div className={`${styles.card} ${styles.miniStat}`}><span>⏱</span><strong>2</strong><p>ครั้งที่มาสาย</p><small>เดือนนี้</small></div>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.card}>
            <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ตารางเรียนวันนี้</span><h2>วันจันทร์ที่ 9 ส.ค.</h2></div><button className={styles.moreButton}>ดูทั้งหมด →</button></div>
            <div className={styles.schedule}>{schedule.map(([time, subject, room, state, type]) => <div className={styles.scheduleRow} key={time}><time>{time}</time><div className={styles.timeline}><i className={styles[type]} /></div><div className={styles.subject}><strong>{subject}</strong><span>⌂ {room}</span></div><em className={styles[type]}>{state}</em></div>)}</div>
          </section>

          <section className={`${styles.card} ${styles.calendarCard}`}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ปฏิทินเช็คชื่อ</span><h2>สิงหาคม 2569</h2></div><button className={styles.monthButton}>‹　›</button></div><div className={styles.weekdays}>{["จ","อ","พ","พฤ","ศ","ส","อา"].map(x => <span key={x}>{x}</span>)}</div><div className={styles.calendar}>{["", "", "", "", "", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"].map((day, i) => <span className={day === "9" ? styles.today : i % 7 === 0 || i % 7 === 6 ? styles.weekend : styles.present} key={`${day}-${i}`}>{day}</span>)}</div><div className={styles.legend}><span><i className={styles.present} /> มา</span><span><i className={styles.late} /> สาย</span><span><i className={styles.absent} /> ขาด</span></div></section>
        </div>

        <section className={`${styles.card} ${styles.noticeCard}`}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>อัปเดตล่าสุด</span><h2>ประกาศจากโรงเรียน</h2></div><button className={styles.moreButton}>ดูทั้งหมด →</button></div><div className={styles.noticeList}>{notices.map(([icon, title, meta]) => <article key={title}><span className={styles.noticeIcon}>{icon}</span><div><strong>{title}</strong><p>{meta}</p></div><span>›</span></article>)}</div></section>
      </div>

      <nav className={styles.bottomNav}>{[["⌂", "หน้าแรก"], ["⌾", "สแกนเช็คชื่อ"], ["◷", "ประวัติ"], ["▦", "ตารางเรียน"], ["♙", "โปรไฟล์"]].map(([icon, label], i) => <a className={i === 0 ? styles.active : ""} href="#" key={label}><span>{icon}</span>{label}</a>)}</nav>
    </main>
  );
}
